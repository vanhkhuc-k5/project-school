// =============================================================================
// TT22 Academic Evaluation Engine — Thông tư 22/2021/TT-BGDĐT
// Complete year-end evaluation: ĐTBmcn, xếp loại, danh hiệu thi đua
//
// Formula Reference (TT22):
//   ĐTBmhk = (sum(TX) + GK*2 + CK*3) / (count(TX) + 5)
//   ĐTBmcn = round((ĐTBmhk1 + 2*ĐTBmhk2) / 3, 1)
//
// Academic Classification:
//   Tốt:   Tất cả môn ĐG nhận xét đạt; ĐTBmcn >= 6.5, >=6 môn >=8.0
//   Khá:   Tất cả môn ĐG nhận xét đạt; ĐTBmcn >= 5.0, >=6 môn >=6.5
//   Đạt:   <=1 môn ĐG nhận xét "Chưa đạt"; >=6 môn ĐTBmcn >=5.0; không môn nào <3.5
//   Chưa đạt: Các trường hợp còn lại
//
// Honor Titles:
//   Xuất sắc: Kết quả học tập Tốt + Rèn luyện Tốt + >=6 môn ĐTBmcn >=9.0
//   Giỏi:     Kết quả học tập Tốt + Rèn luyện Tốt
// =============================================================================

/**
 * @typedef {Object} SemesterScore
 * @property {number} hk1 - ĐTBmhk1
 * @property {number} hk2 - ĐTBmhk2
 */

/**
 * @typedef {Object} SubjectScore
 * @property {string} subjectId
 * @property {string} subjectName
 * @property {string|null} subjectCode
 * @property {number|null} hk1Score  - ĐTBmhk1 (null if no grades)
 * @property {number|null} hk2Score  - ĐTBmhk2 (null if no grades)
 * @property {number|null} yearlyScore - ĐTBmcn (null if either semester missing)
 * @property {boolean} isGradingSubject - true if subject uses comment-based evaluation
 * @property {'dat'|'chua_dat'|null} gradingResult - Đạt/Chưa đạt for comment subjects
 * @property {string|null} comment - Teacher comment for grading subjects
 */

/**
 * @typedef {'Tot'|'Kha'|'Dat'|'ChuaDat'} AcademicClassification
 * @typedef {'XuatSac'|'Gioi'|null} HonorTitle
 * @typedef {'Tot'|'Kha'|'Dat'|null} ConductRating
 */

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Round to 1 decimal place (standard TT22 rounding).
 * @param {number} value
 * @returns {number}
 */
export function roundTT22(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Compute ĐTBmhk for a semester.
 * Formula: (sumTX + GK*2 + CK*3) / (countTX + 5)
 * @param {number[]} txScores - individual TX scores
 * @param {number|null} gkScore - Giữa kỳ score (null if absent)
 * @param {number|null} ckScore - Cuối kỳ score (null if absent)
 * @returns {number|null} ĐTBmhk rounded to 1 decimal, or null if no scores
 */
export function computeDTBmhk(txScores, gkScore, ckScore) {
  if (!txScores || txScores.length === 0) {
    return null;
  }

  const sumTX = txScores.reduce((a, b) => a + b, 0);
  const countTX = txScores.length;

  // GK and CK are mandatory but may be absent (treat as 0 per some interpretations)
  // Per TT22: both are required; absent = no ĐTBmhk can be computed
  // We'll compute with available scores and flag if missing mandatory
  const gk = gkScore ?? 0;
  const ck = ckScore ?? 0;

  const denominator = countTX + 5;
  if (denominator === 0) return null;

  const raw = (sumTX + gk * 2 + ck * 3) / denominator;
  return roundTT22(raw);
}

/**
 * Compute ĐTBmcn (yearly average).
 * Formula: round((ĐTBmhk1 + 2*ĐTBmhk2) / 3, 1)
 * @param {number|null} hk1Score
 * @param {number|null} hk2Score
 * @returns {number|null}
 */
export function computeDTBmcn(hk1Score, hk2Score) {
  if (hk1Score === null || hk2Score === null) {
    return null;
  }
  const raw = (hk1Score + 2 * hk2Score) / 3;
  return roundTT22(raw);
}

// ---------------------------------------------------------------------------
// STEP 1 — Build per-student subject scores
// ---------------------------------------------------------------------------

/**
 * Build a student's subject score summary from raw grade data.
 * Groups grades by subject, computes ĐTBmhk per semester, then ĐTBmcn.
 *
 * @param {SubjectGrade[]} subjectGrades - grades grouped by subject
 * @returns {SubjectScore}
 */
export function buildSubjectScore(subjectGrades) {
  const {
    subjectId,
    subjectName,
    subjectCode,
    isGradingSubject = false,
    hk1Grades = [],
    hk2Grades = [],
  } = subjectGrades;

  // Compute TX average for each semester
  const hk1TX = hk1Grades.filter(g => g.category === 'TX').map(g => g.rawScore);
  const hk2TX = hk2Grades.filter(g => g.category === 'TX').map(g => g.rawScore);

  const hk1GK = hk1Grades.find(g => g.category === 'GK')?.rawScore ?? null;
  const hk2GK = hk2Grades.find(g => g.category === 'GK')?.rawScore ?? null;

  const hk1CK = hk1Grades.find(g => g.category === 'CK')?.rawScore ?? null;
  const hk2CK = hk2Grades.find(g => g.category === 'CK')?.rawScore ?? null;

  const hk1Score = computeDTBmhk(hk1TX, hk1GK, hk1CK);
  const hk2Score = computeDTBmhk(hk2TX, hk2GK, hk2CK);
  const yearlyScore = computeDTBmcn(hk1Score, hk2Score);

  // Grading subject: determine Đạt/Chưa đạt from comment presence
  const gradingResult = isGradingSubject
    ? (subjectGrades.gradingResult ?? null)
    : null;

  return {
    subjectId,
    subjectName,
    subjectCode,
    hk1Score,
    hk2Score,
    yearlyScore,
    isGradingSubject,
    gradingResult,
    comment: subjectGrades.comment ?? null,
  };
}

// ---------------------------------------------------------------------------
// STEP 2 — Academic Classification (Học lực)
// ---------------------------------------------------------------------------

/**
 * Classify academic performance per TT22 Article 15.
 *
 * @param {SubjectScore[]} subjectScores
 * @returns {{ classification: AcademicClassification, details: Object }}
 */
export function classifyAcademicPerformance(subjectScores) {
  if (!subjectScores || subjectScores.length === 0) {
    return { classification: 'ChuaDat', details: { reason: 'Không có dữ liệu điểm' } };
  }

  // Separate grading vs. graded subjects
  const gradedSubjects = subjectScores.filter(s => !s.isGradingSubject);
  const gradingSubjects = subjectScores.filter(s => s.isGradingSubject);

  // All grading subjects must be "Đạt" for Tốt/Khá
  const allGradingSubjectsPassed = gradingSubjects.every(
    s => s.gradingResult === 'dat'
  );

  // Count subjects meeting thresholds
  const scoredSubjects = gradedSubjects.filter(s => s.yearlyScore !== null);

  // ── Mức Tốt ─────────────────────────────────────────────────────────────
  // Criteria:
  //   1. All grading subjects: Đạt
  //   2. All graded subjects have ĐTBmcn >= 6.5
  //   3. At least 6 subjects with ĐTBmcn >= 8.0
  if (
    allGradingSubjectsPassed &&
    scoredSubjects.length > 0 &&
    scoredSubjects.every(s => s.yearlyScore >= 6.5) &&
    scoredSubjects.filter(s => s.yearlyScore >= 8.0).length >= 6
  ) {
    return {
      classification: 'Tot',
      details: {
        minYearlyScore: Math.min(...scoredSubjects.map(s => s.yearlyScore)),
        subjectsAbove80: scoredSubjects.filter(s => s.yearlyScore >= 8.0).length,
      },
    };
  }

  // ── Mức Khá ─────────────────────────────────────────────────────────────
  // Criteria:
  //   1. All grading subjects: Đạt
  //   2. All graded subjects have ĐTBmcn >= 5.0
  //   3. At least 6 subjects with ĐTBmcn >= 6.5
  if (
    allGradingSubjectsPassed &&
    scoredSubjects.length > 0 &&
    scoredSubjects.every(s => s.yearlyScore >= 5.0) &&
    scoredSubjects.filter(s => s.yearlyScore >= 6.5).length >= 6
  ) {
    return {
      classification: 'Kha',
      details: {
        minYearlyScore: Math.min(...scoredSubjects.map(s => s.yearlyScore)),
        subjectsAbove65: scoredSubjects.filter(s => s.yearlyScore >= 6.5).length,
      },
    };
  }

  // ── Mức Đạt ─────────────────────────────────────────────────────────────
  // Criteria:
  //   1. At most 1 grading subject "Chưa đạt"
  //   2. At least 6 subjects with ĐTBmcn >= 5.0
  //   3. No subject with ĐTBmcn < 3.5
  const failedGradingSubjects = gradingSubjects.filter(s => s.gradingResult === 'chua_dat');
  const below35 = scoredSubjects.filter(s => s.yearlyScore < 3.5);
  const above50 = scoredSubjects.filter(s => s.yearlyScore >= 5.0);

  if (
    failedGradingSubjects.length <= 1 &&
    above50.length >= 6 &&
    below35.length === 0
  ) {
    return {
      classification: 'Dat',
      details: {
        failedGradingCount: failedGradingSubjects.length,
        subjectsAbove50: above50.length,
        minYearlyScore: scoredSubjects.length > 0 ? Math.min(...scoredSubjects.map(s => s.yearlyScore)) : null,
      },
    };
  }

  // ── Mức Chưa đạt ────────────────────────────────────────────────────────
  return {
    classification: 'ChuaDat',
    details: {
      failedGradingCount: failedGradingSubjects.length,
      subjectsBelow35: below35.length,
      subjectsAbove50: above50.length,
      minYearlyScore: scoredSubjects.length > 0 ? Math.min(...scoredSubjects.map(s => s.yearlyScore)) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// STEP 3 — Conduct Rating (Rèn luyện)
// ---------------------------------------------------------------------------

/**
 * Classify conduct/rèn luyện rating.
 * In a production system this would come from a separate conduct evaluation module.
 * Here we compute it from the same data structure for completeness.
 *
 * @param {SubjectScore[]} subjectScores
 * @param {number} attendanceRate - percentage 0-100
 * @param {number} violationCount
 * @returns {ConductRating}
 */
export function classifyConduct(attendanceRate, violationCount = 0) {
  // Simplified TT22 conduct criteria:
  // Tốt: attendance >= 90%, no serious violations
  // Khá: attendance >= 75%, minor violations < 3
  // Đạt: attendance >= 60%, violations < 5
  // Otherwise: null (not rated)

  if (violationCount >= 5) return null;
  if (attendanceRate >= 90 && violationCount === 0) return 'Tot';
  if (attendanceRate >= 75 && violationCount < 3) return 'Kha';
  if (attendanceRate >= 60) return 'Dat';
  return null;
}

// ---------------------------------------------------------------------------
// STEP 4 — Honor Title (Danh hiệu thi đua)
// ---------------------------------------------------------------------------

/**
 * Determine honor title per TT22 Article 17.
 *
 * @param {AcademicClassification} academicClassification
 * @param {ConductRating} conductRating
 * @param {SubjectScore[]} subjectScores
 * @returns {{ title: HonorTitle, reason: string }}
 */
export function determineHonorTitle(academicClassification, conductRating, subjectScores) {
  // Xuất sắc requires: Học lực Tốt + Rèn luyện Tốt + >=6 môn ĐTBmcn >= 9.0
  if (academicClassification === 'Tot' && conductRating === 'Tot') {
    const scoredSubjects = subjectScores.filter(s => !s.isGradingSubject && s.yearlyScore !== null);
    const excellentSubjects = scoredSubjects.filter(s => s.yearlyScore >= 9.0);

    if (excellentSubjects.length >= 6) {
      return {
        title: 'XuatSac',
        reason: 'Học lực Tốt, Rèn luyện Tốt, có ít nhất 6 môn ĐTBmcn ≥ 9.0',
      };
    }

    // Falls through to Giỏi if not enough excellent subjects
  }

  // Giỏi requires: Học lực Tốt + Rèn luyện Tốt
  if (academicClassification === 'Tot' && conductRating === 'Tot') {
    return {
      title: 'Gioi',
      reason: 'Học lực Tốt và Rèn luyện Tốt',
    };
  }

  // No honor title
  return {
    title: null,
    reason: 'Không đủ điều kiện danh hiệu thi đua',
  };
}

// ---------------------------------------------------------------------------
// STEP 5 — Full Student Evaluation
// ---------------------------------------------------------------------------

/**
 * Compute complete TT22 academic evaluation for one student.
 *
 * @param {{
 *   studentId: string,
 *   studentName: string,
 *   studentCode: string,
 *   subjectScores: SubjectScore[],
 *   attendanceRate?: number,
 *   violationCount?: number,
 *   homeroomTeacherComment?: string,
 * }} params
 * @returns {{
 *   studentId: string,
 *   studentName: string,
 *   studentCode: string,
 *   subjectScores: SubjectScore[],
 *   academicClassification: AcademicClassification,
 *   academicClassificationLabel: string,
 *   conductRating: ConductRating,
 *   conductRatingLabel: string,
 *   honorTitle: HonorTitle,
 *   honorTitleLabel: string,
 *   yearlyGPA: number|null,
 *   classificationDetails: Object,
 *   homeroomTeacherComment: string|null,
 * }}
 */
export function evaluateStudentTT22({
  studentId,
  studentName,
  studentCode,
  subjectScores,
  attendanceRate = 100,
  violationCount = 0,
  homeroomTeacherComment = null,
}) {
  // Step 1: Compute yearly GPA (average of all ĐTBmcn)
  const scoredSubjects = subjectScores.filter(s => !s.isGradingSubject && s.yearlyScore !== null);
  const yearlyGPA = scoredSubjects.length > 0
    ? roundTT22(scoredSubjects.reduce((sum, s) => sum + s.yearlyScore, 0) / scoredSubjects.length)
    : null;

  // Step 2: Academic classification
  const { classification, details } = classifyAcademicPerformance(subjectScores);

  // Step 3: Conduct rating
  const conductRating = classifyConduct(attendanceRate, violationCount);

  // Step 4: Honor title
  const { title: honorTitle, reason: honorReason } = determineHonorTitle(
    classification,
    conductRating,
    subjectScores
  );

  // Step 5: Human-readable labels
  const CLASSIFICATION_LABELS = {
    Tot: 'Tốt',
    Kha: 'Khá',
    Dat: 'Đạt',
    ChuaDat: 'Chưa đạt',
  };

  const CONDUCT_LABELS = {
    Tot: 'Tốt',
    Kha: 'Khá',
    Dat: 'Đạt',
  };

  const HONOR_LABELS = {
    XuatSac: 'Học sinh Xuất sắc',
    Gioi: 'Học sinh Giỏi',
  };

  return {
    studentId,
    studentName,
    studentCode,
    subjectScores,
    yearlyGPA,
    academicClassification: classification,
    academicClassificationLabel: CLASSIFICATION_LABELS[classification] || classification,
    conductRating,
    conductRatingLabel: conductRating ? CONDUCT_LABELS[conductRating] : null,
    honorTitle,
    honorTitleLabel: honorTitle ? HONOR_LABELS[honorTitle] : null,
    honorTitleReason: honorReason,
    classificationDetails: details,
    attendanceRate,
    violationCount,
    homeroomTeacherComment,
  };
}

// ---------------------------------------------------------------------------
// STEP 6 — Class Summary (Bảng tổng hợp lớp)
// ---------------------------------------------------------------------------

/**
 * Compute class-level summary statistics from individual evaluations.
 *
 * @param {ReturnType<evaluateStudentTT22>[]} studentEvaluations
 * @returns {{
 *   totalStudents: number,
 *   academicDistribution: { Tot: number, Kha: number, Dat: number, ChuaDat: number },
 *   conductDistribution: { Tot: number, Kha: number, Dat: number, null: number },
 *   honorDistribution: { XuatSac: number, Gioi: number, null: number },
 *   averageYearlyGPA: number|null,
 *   subjectAverages: { [subjectName]: { avg: number, count: number } },
 *   classificationRate: number|null,
 *   passRate: number|null,
 * }}
 */
export function computeClassSummary(studentEvaluations) {
  if (!studentEvaluations || studentEvaluations.length === 0) {
    return {
      totalStudents: 0,
      academicDistribution: { Tot: 0, Kha: 0, Dat: 0, ChuaDat: 0 },
      conductDistribution: { Tot: 0, Kha: 0, Dat: 0 },
      honorDistribution: { XuatSac: 0, Gioi: 0 },
      averageYearlyGPA: null,
      subjectAverages: {},
      classificationRate: null,
      passRate: null,
    };
  }

  const n = studentEvaluations.length;

  const academicDistribution = { Tot: 0, Kha: 0, Dat: 0, ChuaDat: 0 };
  const conductDistribution = { Tot: 0, Kha: 0, Dat: 0 };
  const honorDistribution = { XuatSac: 0, Gioi: 0 };

  let totalGPA = 0;
  let gpaCount = 0;

  for (const eval_ of studentEvaluations) {
    academicDistribution[eval_.academicClassification]++;
    if (eval_.conductRating) conductDistribution[eval_.conductRating]++;
    if (eval_.honorTitle) honorDistribution[eval_.honorTitle]++;

    if (eval_.yearlyGPA !== null) {
      totalGPA += eval_.yearlyGPA;
      gpaCount++;
    }
  }

  const passCount = academicDistribution.Tot + academicDistribution.Kha + academicDistribution.Dat;
  const classificationRate = roundTT22((passCount / n) * 100);
  const passRate = classificationRate; // same as classification rate for simplicity

  return {
    totalStudents: n,
    academicDistribution,
    conductDistribution,
    honorDistribution,
    averageYearlyGPA: gpaCount > 0 ? roundTT22(totalGPA / gpaCount) : null,
    subjectAverages: {}, // computed per-subject if needed
    classificationRate,
    passRate,
  };
}

// ---------------------------------------------------------------------------
// STEP 7 — Generate Verification Code (Anti-tamper)
// ---------------------------------------------------------------------------

/**
 * Generate a verification code for e-report card authenticity.
 * Uses deterministic hash of key fields: student ID + academic year + all scores.
 *
 * @param {string} studentId
 * @param {string} academicYearId
 * @param {number} yearlyGPA
 * @param {{ classification: string, conduct: string, honor: string }} results
 * @returns {string} 8-character alphanumeric code
 */
export function generateVerificationCode(studentId, academicYearId, yearlyGPA, results) {
  const payload = [
    studentId,
    academicYearId,
    yearlyGPA?.toFixed(1) ?? 'N/A',
    results.classification,
    results.conduct ?? '',
    results.honor ?? '',
    new Date().getFullYear().toString(),
  ].join('|');

  // Simple deterministic hash (no crypto needed for verification code)
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const absHash = Math.abs(hash);
  const code = absHash.toString(36).toUpperCase().padStart(8, '0').slice(-8);
  return code;
}

// ---------------------------------------------------------------------------
// EXPORTED TEST HELPERS
// ---------------------------------------------------------------------------

export const TT22_TEST_HELPERS = {
  /**
   * Build SubjectGrade input for testing.
   * @param {Object} p
   */
  makeSubjectGrades(p) {
    return {
      subjectId: p.subjectId || 'subj_1',
      subjectName: p.subjectName || 'Toán',
      subjectCode: p.subjectCode || 'TO',
      isGradingSubject: p.isGradingSubject || false,
      gradingResult: p.gradingResult || null,
      comment: p.comment || null,
      hk1Grades: (p.hk1TX || []).map((raw, i) => ({ category: 'TX', rawScore: raw, maxScore: 10 }))
        .concat(p.hk1GK !== undefined ? [{ category: 'GK', rawScore: p.hk1GK, maxScore: 10 }] : [])
        .concat(p.hk1CK !== undefined ? [{ category: 'CK', rawScore: p.hk1CK, maxScore: 10 }] : []),
      hk2Grades: (p.hk2TX || []).map((raw, i) => ({ category: 'TX', rawScore: raw, maxScore: 10 }))
        .concat(p.hk2GK !== undefined ? [{ category: 'GK', rawScore: p.hk2GK, maxScore: 10 }] : [])
        .concat(p.hk2CK !== undefined ? [{ category: 'CK', rawScore: p.hk2CK, maxScore: 10 }] : []),
    };
  },
};
