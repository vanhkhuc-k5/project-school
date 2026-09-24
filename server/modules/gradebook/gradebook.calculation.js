// =============================================================================
// Grade Calculation Engine — Deterministic, Reproducible Grade Calculation
// G20 — Production Gradebook
//
// Design Principles:
//   1. Pure function: given the same inputs → same outputs every time
//   2. Category weights are NEVER hardcoded — read from DB config at calculation time
//   3. All intermediate values are stored in snapshots (never recomputed on-the-fly)
//   4. Historical snapshots are immutable — never updated or deleted
//   5. Config changes produce new config rows (never mutate existing)
//   6. Only DRAFT grades participate in computation; published grades are frozen
// =============================================================================

/**
 * @typedef {Object} GradeEntry
 * @property {string} id
 * @property {string} gradeCategoryId
 * @property {number} rawScore
 * @property {number} maxScore
 * @property {number} weight       - weight within the category (0.0–1.0)
 * @property {string} status        - 'draft' | 'published'
 */

/**
 * @typedef {Object} CategoryConfig
 * @property {string} code
 * @property {string} name
 * @property {number} weight       - fraction of final grade for this category (e.g. 0.10)
 * @property {number} minEntries  - minimum entries required in this category
 */

/**
 * @typedef {Object} CalculationResult
 * @property {number} finalScore     - weighted average across categories, scaled to scaleFactor
 * @property {Object} categoryAverages - { [categoryCode]: { average, entryCount, maxPossible, weight } }
 * @property {Object} categoryWeights - frozen copy of weights used
 * @property {number} scaleFactor
 * @property {string[]} warnings
 */

// ---------------------------------------------------------------------------
// STEP 1 — Validate prerequisites
// ---------------------------------------------------------------------------

/**
 * Validates that a student has enough entries in each category to produce
 * a meaningful average. Issues warnings but never throws.
 *
 * @param {GradeEntry[]} grades
 * @param {CategoryConfig[]} categories
 * @param {string} warnings[]
 * @returns {string[]} updated warnings array
 */
export function validateCategoryCoverage(grades, categories, warnings = []) {
  const covered = new Map();

  // Count published + draft grades per category
  for (const grade of grades) {
    if (grade.status === 'draft') {
      const cat = grade.gradeCategoryId;
      if (!covered.has(cat)) covered.set(cat, 0);
      covered.set(cat, covered.get(cat) + 1);
    }
  }

  for (const cat of categories) {
    const count = covered.get(cat.code) || 0;
    if (count < (cat.minEntries || 0)) {
      warnings.push(
        `Danh mục "${cat.name}" có ${count}/${cat.minEntries} điểm tối thiểu. Kết quả có thể chưa đại diện.`
      );
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// STEP 2 — Compute category averages
// ---------------------------------------------------------------------------

/**
 * For each category, compute the average raw score from all DRAFT grades.
 * If maxScore varies within the category, normalize to percentage first.
 *
 * @param {GradeEntry[]} grades
 * @param {CategoryConfig[]} categories
 * @returns {{ [categoryCode]: { rawAverage, normalizedAverage, entryCount, maxPossible } }}
 */
export function computeCategoryAverages(grades, gradesByCategory, categories) {
  const result = {};

  for (const cat of categories) {
    const entries = gradesByCategory.get(cat.code) || [];

    // Only include DRAFT grades (published = frozen, not recomputed)
    const draftEntries = entries.filter((e) => e.status === 'draft');

    if (draftEntries.length === 0) {
      result[cat.code] = {
        rawAverage: null,
        normalizedAverage: null,
        entryCount: 0,
        maxPossible: 0,
      };
      continue;
    }

    // Weighted average within category: weight_i / sum(weights_i) * percentage_i
    let weightedSum = 0;
    let totalWeight = 0;

    for (const entry of draftEntries) {
      const pct = (entry.rawScore / entry.maxScore) * 100;
      const w = entry.weight || 1.0;
      weightedSum += w * pct;
      totalWeight += w;
    }

    const normalizedAverage = totalWeight > 0 ? weightedSum / totalWeight : null;

    result[cat.code] = {
      rawAverage: null,          // not directly meaningful when maxScores differ
      normalizedAverage,          // 0–100 percentage
      entryCount: draftEntries.length,
      maxPossible: 0,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// STEP 3 — Apply category weights and compute final score
// ---------------------------------------------------------------------------

/**
 * Apply category-level weights to normalized category averages to produce
 * the final weighted score, scaled to the target scale factor.
 *
 * @param {{ [categoryCode]: { normalizedAverage, entryCount, maxPossible } }} categoryAverages
 * @param {{ [categoryCode]: number }} categoryWeights - fractions summing to ~1.0
 * @param {CategoryConfig[]} categories
 * @param {number} scaleFactor - typically 10.0 (Thang 10) or 4.0 (GPA)
 * @param {string[]} warnings
 * @returns {{ finalScore: number, categoryAverages: Object, warnings: string[] }}
 */
export function applyCategoryWeights(
  categoryAverages,
  categoryWeights,
  categories,
  scaleFactor = 10.0,
  warnings = []
) {
  let weightedSum = 0;
  let totalWeight = 0;

  const enriched = {};

  for (const cat of categories) {
    const catKey = cat.code;
    const avg = categoryAverages[catKey];
    const catWeight = categoryWeights[catKey] ?? 0;

    if (!avg || avg.normalizedAverage === null) {
      enriched[catKey] = {
        ...avg,
        categoryWeight: catWeight,
        contribution: null,
      };
      warnings.push(`Danh mục "${cat.name}" không có điểm — bỏ qua.`);
      continue;
    }

    const contribution = catWeight * avg.normalizedAverage;
    weightedSum += contribution;
    totalWeight += catWeight;

    enriched[catKey] = {
      ...avg,
      categoryWeight: catWeight,
      contribution,
    };
  }

  // Scale from 0–100 percentage to target scale (e.g. 0–10)
  const finalScore = totalWeight > 0
    ? parseFloat(((weightedSum / totalWeight) * (scaleFactor / 100)).toFixed(2))
    : 0;

  return { finalScore, categoryAverages: enriched, warnings };
}

// ---------------------------------------------------------------------------
// STEP 4 — Full deterministic calculation
// ---------------------------------------------------------------------------

/**
 * Main entry point. Pure function — same inputs always produce same outputs.
 *
 * @param {GradeEntry[]} grades         - all grades for a student
 * @param {CategoryConfig[]} categories - category definitions with weights
 * @param {{ [categoryCode]: number }} categoryWeights - frozen weight snapshot
 * @param {{ [categoryCode]: number }} minEntries - frozen min-entry snapshot
 * @param {number} scaleFactor
 * @returns {CalculationResult}
 */
export function calculateGradebook({
  grades,
  categories,
  categoryWeights,
  _minEntries,
  scaleFactor = 10.0,
}) {
  if (!Array.isArray(grades) || grades.length === 0) {
    return {
      finalScore: 0,
      categoryAverages: {},
      categoryWeights,
      scaleFactor,
      warnings: ['Không có điểm nào để tính.'],
    };
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    return {
      finalScore: 0,
      categoryAverages: {},
      categoryWeights,
      scaleFactor,
      warnings: ['Không có cấu hình danh mục điểm.'],
    };
  }

  // Group grades by category code
  const gradesByCategory = new Map();
  for (const cat of categories) {
    gradesByCategory.set(cat.code, []);
  }
  for (const grade of grades) {
    const cat = categories.find((c) => c.code === grade.gradeCategoryId);
    const key = cat?.code || '__uncategorized__';
    if (!gradesByCategory.has(key)) gradesByCategory.set(key, []);
    gradesByCategory.get(key).push(grade);
  }

  const warnings = [];

  // Validate
  validateCategoryCoverage(grades, categories, warnings);

  // Compute category averages
  const categoryAverages = computeCategoryAverages(grades, gradesByCategory, categories);

  // Apply weights
  const { finalScore, categoryAverages: enriched, warnings: w2 } = applyCategoryWeights(
    categoryAverages,
    categoryWeights,
    categories,
    scaleFactor,
    warnings
  );

  return {
    finalScore,
    categoryAverages: enriched,
    categoryWeights,
    scaleFactor,
    warnings: w2,
  };
}

// ---------------------------------------------------------------------------
// UNIT TEST HELPERS — pure, deterministic, no DB required
// ---------------------------------------------------------------------------

export const TEST_HELPERS = {
  /**
   * Build GradeEntry objects from simple arrays for testing.
   * @param {Array<{cat: string, raw: number, max: number, weight?: number, status?: string}> entries
   */
  makeGrades(entries) {
    return entries.map((e, i) => ({
      id: `g${i + 1}`,
      gradeCategoryId: e.cat,
      rawScore: e.raw,
      maxScore: e.max ?? 10,
      weight: e.weight ?? 1.0,
      status: e.status ?? 'draft',
    }));
  },

  /**
   * Build CategoryConfig objects.
   * @param {Array<{code: string, name: string, weight: number, minEntries?: number}> cats
   */
  makeCategories(cats) {
    return cats.map((c) => ({
      code: c.code,
      name: c.name || c.code,
      weight: c.weight ?? 0,
      minEntries: c.minEntries ?? 0,
    }));
  },
};
