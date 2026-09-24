// =============================================================================
// Unit Tests — Gradebook Calculation Engine (G43)
// Wrapper for gradebook calculation tests
// =============================================================================

import { describe, test, expect } from '../helpers/testClient.js';
import {
  calculateGradebook,
  validateCategoryCoverage,
  computeCategoryAverages,
  applyCategoryWeights,
  TEST_HELPERS,
} from '../../server/modules/gradebook/gradebook.calculation.js';

const { makeGrades, makeCategories } = TEST_HELPERS;

function approx(actual, expected, tolerance = 0.01) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ≈${expected}, got ${actual}`);
  }
}

// Wrapper function for runner compatibility
export async function runGradebookCalculationUnitTests() {
  await describe('Unit Test: Gradebook Calculation Engine', () => {
    
    test('Equal-weight entries in a category', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 8, max: 10, status: 'draft' },
        { cat: 'MIENG', raw: 9, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.10, minEntries: 1 },
      ]);
      const weights = { MIENG: 0.10 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries });
      approx(result.categoryAverages.MIENG.normalizedAverage, 85, 0.1);
    });

    test('Weighted entries within a category', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 8, max: 10, weight: 1.0, status: 'draft' },
        { cat: 'MIENG', raw: 10, max: 10, weight: 2.0, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.10, minEntries: 1 },
      ]);
      const weights = { MIENG: 0.10 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries });
      approx(result.categoryAverages.MIENG.normalizedAverage, 93.33, 0.1);
    });

    test('Varying maxScores normalized to percentage', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 8, max: 10, status: 'draft' },
        { cat: 'MIENG', raw: 5, max: 5, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.10, minEntries: 1 },
      ]);
      const weights = { MIENG: 0.10 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries });
      approx(result.categoryAverages.MIENG.normalizedAverage, 90, 0.1);
    });

    test('Missing category produces null average', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 8, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.10, minEntries: 1 },
        { code: '15P', name: '15 phút', weight: 0.10, minEntries: 2 },
      ]);
      const weights = { MIENG: 0.10, '15P': 0.10 };
      const minEntries = { MIENG: 1, '15P': 2 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries });
      expect(result.categoryAverages.MIENG.normalizedAverage).not.toBeNull();
      expect(result.categoryAverages['15P'].normalizedAverage).toBeNull();
      expect(result.categoryAverages['15P'].entryCount).toBe(0);
    });

    test('Published grades excluded from calculation', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 8, max: 10, status: 'published' },
        { cat: 'MIENG', raw: 9, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.10, minEntries: 1 },
      ]);
      const weights = { MIENG: 0.10 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries });
      approx(result.categoryAverages.MIENG.normalizedAverage, 90, 0.1);
      expect(result.categoryAverages.MIENG.entryCount).toBe(1);
    });

    test('Single category final score equals category average (scale 10)', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 9, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 1.0, minEntries: 1 },
      ]);
      const weights = { MIENG: 1.0 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries, scaleFactor: 10 });
      approx(result.finalScore, 9.0, 0.01);
    });

    test('Two categories with equal weights (50/50)', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 8, max: 10, status: 'draft' },
        { cat: '15P', raw: 10, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.5, minEntries: 1 },
        { code: '15P', name: '15 phút', weight: 0.5, minEntries: 1 },
      ]);
      const weights = { MIENG: 0.5, '15P': 0.5 };
      const minEntries = { MIENG: 1, '15P': 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries, scaleFactor: 10 });
      approx(result.finalScore, 9.0, 0.01);
    });

    test('Five categories with realistic Vietnamese weights', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 8, max: 10, status: 'draft' },
        { cat: 'MIENG', raw: 9, max: 10, status: 'draft' },
        { cat: '15P', raw: 7, max: 10, status: 'draft' },
        { cat: '15P', raw: 8, max: 10, status: 'draft' },
        { cat: '1TIET', raw: 7, max: 10, status: 'draft' },
        { cat: 'GIUA_KY', raw: 8, max: 10, status: 'draft' },
        { cat: 'CUOI_KY', raw: 9, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.10, minEntries: 1 },
        { code: '15P', name: '15 phút', weight: 0.10, minEntries: 2 },
        { code: '1TIET', name: '1 tiết', weight: 0.20, minEntries: 1 },
        { code: 'GIUA_KY', name: 'Giữa kỳ', weight: 0.25, minEntries: 1 },
        { code: 'CUOI_KY', name: 'Cuối kỳ', weight: 0.35, minEntries: 1 },
      ]);
      const weights = { MIENG: 0.10, '15P': 0.10, '1TIET': 0.20, GIUA_KY: 0.25, CUOI_KY: 0.35 };
      const minEntries = { MIENG: 1, '15P': 2, '1TIET': 1, GIUA_KY: 1, CUOI_KY: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries, scaleFactor: 10 });
      approx(result.finalScore, 8.15, 0.05);
    });

    test('Scale factor 4.0 (GPA scale)', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 9, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 1.0, minEntries: 1 },
      ]);
      const weights = { MIENG: 1.0 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries, scaleFactor: 4.0 });
      approx(result.finalScore, 3.6, 0.01);
      expect(result.scaleFactor).toBe(4.0);
    });

    test('Reproducibility — same inputs yield same outputs', () => {
      const run1 = calculateGradebook({
        grades: makeGrades([{ cat: 'MIENG', raw: 8, max: 10, status: 'draft' }]),
        categories: makeCategories([{ code: 'MIENG', weight: 0.10, minEntries: 1 }]),
        categoryWeights: { MIENG: 0.10 },
        minEntries: { MIENG: 1 },
        scaleFactor: 10,
      });

      const run2 = calculateGradebook({
        grades: makeGrades([{ cat: 'MIENG', raw: 8, max: 10, status: 'draft' }]),
        categories: makeCategories([{ code: 'MIENG', weight: 0.10, minEntries: 1 }]),
        categoryWeights: { MIENG: 0.10 },
        minEntries: { MIENG: 1 },
        scaleFactor: 10,
      });

      expect(run1.finalScore).toBe(run2.finalScore);
    });

    test('Category weights frozen in result', () => {
      const weights = { MIENG: 0.10, '15P': 0.20 };
      const result = calculateGradebook({
        grades: makeGrades([{ cat: 'MIENG', raw: 8, max: 10, status: 'draft' }]),
        categories: makeCategories([{ code: 'MIENG', weight: 0.10, minEntries: 1 }]),
        categoryWeights: weights,
        minEntries: { MIENG: 1 },
        scaleFactor: 10,
      });

      expect(result.categoryWeights.MIENG).toBe(0.10);
      expect(result.categoryWeights['15P']).toBe(0.20);
    });

    test('Empty grades list returns zero with warning', () => {
      const result = calculateGradebook({
        grades: [],
        categories: makeCategories([{ code: 'MIENG', weight: 0.10, minEntries: 1 }]),
        categoryWeights: { MIENG: 0.10 },
        minEntries: { MIENG: 1 },
        scaleFactor: 10,
      });

      expect(result.finalScore).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('Insufficient entries warning generated', () => {
      const grades = makeGrades([
        { cat: '15P', raw: 8, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: '15P', name: '15 phút', weight: 0.10, minEntries: 2 },
      ]);

      const warnings = validateCategoryCoverage(grades, categories, []);
      const hasWarning = warnings.some((w) => w.includes('15 phút'));
      expect(hasWarning).toBe(true);
    });

    test('Entry count excludes published grades', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 7, max: 10, status: 'draft' },
        { cat: 'MIENG', raw: 9, max: 10, status: 'draft' },
        { cat: 'MIENG', raw: 8, max: 10, status: 'published' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 1.0, minEntries: 1 },
      ]);
      const weights = { MIENG: 1.0 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries });
      expect(result.categoryAverages.MIENG.entryCount).toBe(2);
      approx(result.categoryAverages.MIENG.normalizedAverage, 80, 0.1);
    });

    test('Contribution field computed correctly', () => {
      const grades = makeGrades([
        { cat: 'MIENG', raw: 10, max: 10, status: 'draft' },
      ]);
      const categories = makeCategories([
        { code: 'MIENG', name: 'Miệng', weight: 0.20, minEntries: 1 },
      ]);
      const weights = { MIENG: 0.20 };
      const minEntries = { MIENG: 1 };

      const result = calculateGradebook({ grades, categories, categoryWeights: weights, minEntries, scaleFactor: 10 });
      expect(result.categoryAverages.MIENG.contribution).toBe(20);
    });
  });
}
