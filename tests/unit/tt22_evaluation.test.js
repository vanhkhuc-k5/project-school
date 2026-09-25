// =============================================================================
// Unit Tests — TT22 Academic Evaluation Engine (Circular 22/2021/TT-BGDĐT)
// =============================================================================

import { describe, test, expect } from '../helpers/testClient.js';
import {
  computeDTBmhk,
  computeDTBmcn,
  buildSubjectScore,
  classifyAcademicPerformance,
  classifyConduct,
  determineHonorTitle,
  evaluateStudentTT22,
  computeClassSummary,
  generateVerificationCode,
  TT22_TEST_HELPERS,
  roundTT22,
} from '../../server/modules/gradebook/tt22.engine.js';

export async function runTT22UnitTests() {
  await describe('Unit Test: TT22 Academic Evaluation Engine', () => {

    // ── Round & Basic Helpers ─────────────────────────────────────────────
    test('roundTT22: rounds to 1 decimal place', () => {
      expect(roundTT22(8.333)).toBe(8.3);
      expect(roundTT22(8.357)).toBe(8.4);
      expect(roundTT22(8.35)).toBe(8.4);
      expect(roundTT22(5.0)).toBe(5.0);
      expect(roundTT22(0)).toBe(0);
    });

    // ── ĐTBmhk Computation ──────────────────────────────────────────────
    test('computeDTBmhk: with 2 TX + GK + CK', () => {
      // Formula: (sumTX + GK*2 + CK*3) / (countTX + 5)
      // (7+9 + 8*2 + 9*3) / (2+5) = (16 + 16 + 27) / 7 = 59/7 ≈ 8.43
      const result = computeDTBmhk([7, 9], 8, 9);
      expect(Math.abs(result - 8.4) < 0.1).toBe(true);
    });

    test('computeDTBmhk: with 1 TX + GK + CK', () => {
      const result = computeDTBmhk([8], 7, 8);
      expect(Math.abs(result - 7.7) < 0.1).toBe(true);
    });

    test('computeDTBmhk: null when no TX scores', () => {
      expect(computeDTBmhk([], null, null)).toBeNull();
      expect(computeDTBmhk(null, null, null)).toBeNull();
    });

    test('computeDTBmhk: missing GK or CK treated as 0', () => {
      const result = computeDTBmhk([9], null, 8);
      expect(Math.abs(result - 5.5) < 0.1).toBe(true);
    });

    // ── ĐTBmcn Computation ───────────────────────────────────────────────
    test('computeDTBmcn: weighted average HK1 and HK2', () => {
      expect(computeDTBmcn(6.5, 8.0)).toBe(7.5);
      expect(computeDTBmcn(8.5, 9.0)).toBe(8.8);
      expect(computeDTBmcn(5.0, 6.0)).toBe(5.7);
    });

    test('computeDTBmcn: null if either semester missing', () => {
      expect(computeDTBmcn(null, 8.0)).toBeNull();
      expect(computeDTBmcn(6.5, null)).toBeNull();
      expect(computeDTBmcn(null, null)).toBeNull();
    });

    // ── Academic Classification: Mức Tốt ─────────────────────────────────
    test('classifyAcademicPerformance: Mức Tốt — all conditions met', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, hk1Score: 8.0, hk2Score: 9.0, yearlyScore: 8.7, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, hk1Score: 8.5, hk2Score: 8.5, yearlyScore: 8.5, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, hk1Score: 7.5, hk2Score: 8.0, yearlyScore: 7.8, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 8.0, yearlyScore: 7.7, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, hk1Score: 8.5, hk2Score: 9.0, yearlyScore: 8.8, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '8', subjectName: 'CN', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.5, yearlyScore: 8.3, gradingResult: null },
        { subjectId: '9', subjectName: 'GT', isGradingSubject: false, hk1Score: 7.5, hk2Score: 7.5, yearlyScore: 7.5, gradingResult: null },
        { subjectId: '10', subjectName: 'TD', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'dat' },
      ];
      const result = classifyAcademicPerformance(subjects);
      expect(result.classification).toBe('Tot');
    });

    test('classifyAcademicPerformance: Mức Tốt fails if only 5 subjects ≥ 8.0', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '8', subjectName: 'CN', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '9', subjectName: 'GT', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '10', subjectName: 'TD', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'dat' },
      ];
      const result = classifyAcademicPerformance(subjects);
      expect(result.classification).not.toBe('Tot');
    });

    // ── Academic Classification: Mức Khá ─────────────────────────────────
    test('classifyAcademicPerformance: Mức Khá — conditions met', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, hk1Score: 6.5, hk2Score: 6.5, yearlyScore: 6.5, gradingResult: null },
        { subjectId: '8', subjectName: 'CN', isGradingSubject: false, hk1Score: 6.5, hk2Score: 6.5, yearlyScore: 6.5, gradingResult: null },
        { subjectId: '9', subjectName: 'GT', isGradingSubject: false, hk1Score: 6.5, hk2Score: 6.5, yearlyScore: 6.5, gradingResult: null },
        { subjectId: '10', subjectName: 'TD', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'dat' },
      ];
      const result = classifyAcademicPerformance(subjects);
      expect(result.classification).toBe('Kha');
    });

    // ── Academic Classification: Mức Đạt ─────────────────────────────────
    test('classifyAcademicPerformance: Mức Đạt — max 1 grading subject Chưa đạt', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, hk1Score: 6.0, hk2Score: 6.0, yearlyScore: 6.0, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, hk1Score: 6.0, hk2Score: 6.0, yearlyScore: 6.0, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, hk1Score: 6.0, hk2Score: 6.0, yearlyScore: 6.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, hk1Score: 5.5, hk2Score: 5.5, yearlyScore: 5.5, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, hk1Score: 5.0, hk2Score: 5.5, yearlyScore: 5.3, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, hk1Score: 5.0, hk2Score: 5.0, yearlyScore: 5.0, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, hk1Score: 5.0, hk2Score: 5.0, yearlyScore: 5.0, gradingResult: null },
        { subjectId: '8', subjectName: 'CN', isGradingSubject: false, hk1Score: 4.0, hk2Score: 4.0, yearlyScore: 4.0, gradingResult: null },
        { subjectId: '9', subjectName: 'GT', isGradingSubject: false, hk1Score: 5.0, hk2Score: 5.0, yearlyScore: 5.0, gradingResult: null },
        { subjectId: '10', subjectName: 'TD', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'chua_dat' },
        { subjectId: '11', subjectName: 'NH', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'dat' },
      ];
      const result = classifyAcademicPerformance(subjects);
      expect(result.classification).toBe('Dat');
    });

    test('classifyAcademicPerformance: Mức Đạt fails if 2 grading subjects Chưa đạt', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '8', subjectName: 'CN', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '9', subjectName: 'TD', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'chua_dat' },
        { subjectId: '10', subjectName: 'NH', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'chua_dat' },
      ];
      const result = classifyAcademicPerformance(subjects);
      expect(result.classification).toBe('ChuaDat');
    });

    // ── Academic Classification: Mức Chưa đạt ────────────────────────────
    test('classifyAcademicPerformance: Mức Chưa đạt — subject below 3.5', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, hk1Score: 3.0, hk2Score: 3.0, yearlyScore: 3.0, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 7.0, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '8', subjectName: 'TD', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'dat' },
      ];
      const result = classifyAcademicPerformance(subjects);
      expect(result.classification).toBe('ChuaDat');
    });

    // ── Conduct Classification ──────────────────────────────────────────
    test('classifyConduct: Tốt with high attendance', () => {
      expect(classifyConduct(95, 0)).toBe('Tot');
    });

    test('classifyConduct: Khá with good attendance', () => {
      expect(classifyConduct(80, 2)).toBe('Kha');
    });

    test('classifyConduct: Đạt with moderate attendance', () => {
      expect(classifyConduct(65, 0)).toBe('Dat');
    });

    test('classifyConduct: null with many violations', () => {
      expect(classifyConduct(50, 5)).toBeNull();
      expect(classifyConduct(95, 5)).toBeNull();
    });

    // ── Honor Title ─────────────────────────────────────────────────────
    test('determineHonorTitle: Xuất sắc — Tốt HL + Tốt RL + ≥6 môn ≥9.0', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, yearlyScore: 9.5, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, yearlyScore: 9.5, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '8', subjectName: 'TD', isGradingSubject: false, yearlyScore: 8.0, gradingResult: null },
      ];
      const result = determineHonorTitle('Tot', 'Tot', subjects);
      expect(result.title).toBe('XuatSac');
    });

    test('determineHonorTitle: Giỏi — Tốt HL + Tốt RL but only 5 subjects ≥9.0', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, yearlyScore: 9.5, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, yearlyScore: 9.0, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, yearlyScore: 7.0, gradingResult: null },
        { subjectId: '8', subjectName: 'TD', isGradingSubject: false, yearlyScore: 8.0, gradingResult: null },
      ];
      const result = determineHonorTitle('Tot', 'Tot', subjects);
      expect(result.title).toBe('Gioi');
    });

    test('determineHonorTitle: No title if HL is not Tốt', () => {
      const subjects = [{ subjectId: '1', subjectName: 'Toán', isGradingSubject: false, yearlyScore: 9.5, gradingResult: null }];
      const result = determineHonorTitle('Kha', 'Tot', subjects);
      expect(result.title).toBeNull();
    });

    test('determineHonorTitle: No title if RL is not Tốt', () => {
      const subjects = [{ subjectId: '1', subjectName: 'Toán', isGradingSubject: false, yearlyScore: 9.5, gradingResult: null }];
      const result = determineHonorTitle('Tot', 'Kha', subjects);
      expect(result.title).toBeNull();
    });

    // ── Full Evaluation ──────────────────────────────────────────────────
    test('evaluateStudentTT22: full evaluation with all fields', () => {
      const subjects = [
        { subjectId: '1', subjectName: 'Toán', isGradingSubject: false, hk1Score: 8.0, hk2Score: 9.0, yearlyScore: 8.7, gradingResult: null },
        { subjectId: '2', subjectName: 'Văn', isGradingSubject: false, hk1Score: 8.5, hk2Score: 8.5, yearlyScore: 8.5, gradingResult: null },
        { subjectId: '3', subjectName: 'Anh', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '4', subjectName: 'Lý', isGradingSubject: false, hk1Score: 7.5, hk2Score: 8.0, yearlyScore: 7.8, gradingResult: null },
        { subjectId: '5', subjectName: 'Hóa', isGradingSubject: false, hk1Score: 7.0, hk2Score: 8.0, yearlyScore: 7.7, gradingResult: null },
        { subjectId: '6', subjectName: 'Sử', isGradingSubject: false, hk1Score: 8.5, hk2Score: 9.0, yearlyScore: 8.8, gradingResult: null },
        { subjectId: '7', subjectName: 'Địa', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.0, yearlyScore: 8.0, gradingResult: null },
        { subjectId: '8', subjectName: 'CN', isGradingSubject: false, hk1Score: 8.0, hk2Score: 8.5, yearlyScore: 8.3, gradingResult: null },
        { subjectId: '9', subjectName: 'GT', isGradingSubject: false, hk1Score: 7.5, hk2Score: 7.5, yearlyScore: 7.5, gradingResult: null },
        { subjectId: '10', subjectName: 'TD', isGradingSubject: true, hk1Score: null, hk2Score: null, yearlyScore: null, gradingResult: 'dat' },
      ];
      const result = evaluateStudentTT22({
        studentId: 'stu_001',
        studentName: 'Nguyễn Văn A',
        studentCode: 'STU001',
        subjectScores: subjects,
        attendanceRate: 95,
        violationCount: 0,
      });
      expect(result.academicClassification).toBe('Tot');
      expect(result.conductRating).toBe('Tot');
      expect(result.honorTitle).toBe('Gioi');
      expect(result.yearlyGPA).toBe(8.1); // (8.7+8.5+8.0+7.8+7.7+8.8+8.0+8.3+7.5)/9 = 73.3/9 ≈ 8.14
      expect(result.academicClassificationLabel).toBe('Tốt');
      expect(result.honorTitleLabel).toBe('Học sinh Giỏi');
    });

    // ── Class Summary ───────────────────────────────────────────────────
    test('computeClassSummary: aggregates correctly', () => {
      const evaluations = [
        { academicClassification: 'Tot', conductRating: 'Tot', honorTitle: 'Gioi', yearlyGPA: 8.5 },
        { academicClassification: 'Tot', conductRating: 'Tot', honorTitle: 'Gioi', yearlyGPA: 8.0 },
        { academicClassification: 'Kha', conductRating: 'Tot', honorTitle: null, yearlyGPA: 7.0 },
        { academicClassification: 'Dat', conductRating: 'Dat', honorTitle: null, yearlyGPA: 6.0 },
        { academicClassification: 'ChuaDat', conductRating: null, honorTitle: null, yearlyGPA: 3.5 },
      ];
      const summary = computeClassSummary(evaluations);
      expect(summary.totalStudents).toBe(5);
      expect(summary.academicDistribution.Tot).toBe(2);
      expect(summary.academicDistribution.Kha).toBe(1);
      expect(summary.academicDistribution.Dat).toBe(1);
      expect(summary.academicDistribution.ChuaDat).toBe(1);
      expect(summary.honorDistribution.Gioi).toBe(2);
      expect(summary.classificationRate).toBe(80);
    });

    test('computeClassSummary: empty class', () => {
      const summary = computeClassSummary([]);
      expect(summary.totalStudents).toBe(0);
      expect(summary.classificationRate).toBeNull();
    });

    // ── Verification Code ────────────────────────────────────────────────
    test('generateVerificationCode: deterministic output', () => {
      const code1 = generateVerificationCode('stu_001', 'AY2025', 8.5, {
        classification: 'Tot', conduct: 'Tot', honor: 'Gioi',
      });
      const code2 = generateVerificationCode('stu_001', 'AY2025', 8.5, {
        classification: 'Tot', conduct: 'Tot', honor: 'Gioi',
      });
      expect(code1).toBe(code2);
      expect(code1.length).toBe(8);
    });

    test('generateVerificationCode: different inputs → different output', () => {
      const code1 = generateVerificationCode('stu_001', 'AY2025', 8.5, {
        classification: 'Tot', conduct: 'Tot', honor: 'Gioi',
      });
      const code2 = generateVerificationCode('stu_002', 'AY2025', 8.5, {
        classification: 'Tot', conduct: 'Tot', honor: 'Gioi',
      });
      expect(code1).not.toBe(code2);
    });

    // ── TT22 Test Helper ────────────────────────────────────────────────
    test('TT22_TEST_HELPERS.makeSubjectGrades: builds valid input', () => {
      const grades = TT22_TEST_HELPERS.makeSubjectGrades({
        subjectId: 'subj_toan',
        subjectName: 'Toán',
        hk1TX: [7, 8, 9],
        hk1GK: 8,
        hk1CK: 9,
        hk2TX: [8, 9],
        hk2GK: 9,
        hk2CK: 10,
      });
      expect(grades.hk1Grades.length).toBe(5);
      expect(grades.hk2Grades.length).toBe(4);
    });
  });
}
