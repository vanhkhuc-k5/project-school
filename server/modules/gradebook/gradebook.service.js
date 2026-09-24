// =============================================================================
// Gradebook Service — Business Logic Layer for G20/G21 Production Gradebook
// =============================================================================
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../../shared/database/connection.js';
import { AppError } from '../../shared/errors/index.js';
import * as repo from './gradebook.repository.js';
import { calculateGradebook } from './gradebook.calculation.js';
import { notifyGradePublished } from '../notifications/notifications.service.js';

// ---------------------------------------------------------------------------
// CATEGORY MANAGEMENT
// ---------------------------------------------------------------------------

export async function listCategories(filters = {}) {
  return repo.listCategories(filters);
}

export async function createCategory({ data, schoolId, _teacherId }) {
  // Check for duplicate code within school
  const existing = await repo.getCategoryByCode({ schoolId, code: data.code });
  if (existing) {
    throw AppError.conflict('Mã loại điểm đã tồn tại trong trường này.');
  }
  const id = await repo.createCategory({ data, schoolId });
  return { id, ...data };
}

export async function updateCategory({ id, data }) {
  const existing = await repo.getCategoryById(id);
  if (!existing) throw AppError.notFound('Loại điểm không tồn tại.');

  // Check duplicate code on rename
  if (data.code && data.code !== existing.code) {
    const duplicate = await repo.getCategoryByCode({
      schoolId: existing.school_id,
      code: data.code,
    });
    if (duplicate) throw AppError.conflict('Mã loại điểm đã tồn tại.');
  }

  await repo.updateCategory({ id, data });
  return { id, ...existing, ...data };
}

// ---------------------------------------------------------------------------
// GRADE ENTRY MANAGEMENT
// ---------------------------------------------------------------------------

export async function listGrades({ filters = {} }) {
  return repo.listGrades({ filters });
}

export async function getGradeById(id) {
  const grade = await repo.getGradeById(id);
  if (!grade) throw AppError.notFound('Điểm không tồn tại.');
  return grade;
}

export async function createGrade({ data, teacherId, schoolId }) {
  // _teacherId reserved for audit trail / future authorization checks
  // Validate maxScore > 0
  const maxScore = data.maxScore ?? 10.0;
  if (maxScore <= 0) throw AppError.badRequest('maxScore phải lớn hơn 0.');

  // Validate rawScore <= maxScore
  if (data.rawScore > maxScore) {
    throw AppError.badRequest('Điểm không được lớn hơn điểm tối đa.');
  }

  // Validate weight 0–1
  const weight = data.weight ?? 1.0;
  if (weight < 0 || weight > 1) throw AppError.badRequest('weight phải từ 0 đến 1.');

  // If gradeCategoryId provided, verify it exists
  if (data.gradeCategoryId) {
    const cat = await repo.getCategoryById(data.gradeCategoryId);
    if (!cat) throw AppError.notFound('Loại điểm không tồn tại.');
  }

  const id = await repo.createGrade({ data, teacherId, schoolId });
  return { id, ...data };
}

export async function updateGrade({ id, data }) {
  const existing = await repo.getGradeById(id);
  if (!existing) throw AppError.notFound('Điểm không tồn tại.');

  // Cannot edit a published grade
  if (existing.status === 'published') {
    throw AppError.forbidden('Không thể chỉnh sửa điểm đã công bố. Cần mở khóa trước.');
  }

  // Validate maxScore > 0
  const maxScore = data.maxScore ?? existing.max_score;
  if (maxScore <= 0) throw AppError.badRequest('maxScore phải lớn hơn 0.');

  // Validate rawScore <= maxScore
  const rawScore = data.rawScore ?? existing.raw_score;
  if (rawScore > maxScore) {
    throw AppError.badRequest('Điểm không được lớn hơn điểm tối đa.');
  }

  await repo.updateGrade({ id, data });
  return repo.getGradeById(id);
}

export async function publishGrade({ id, publishedBy, role }) {
  const existing = await repo.getGradeById(id);
  if (!existing) throw AppError.notFound('Điểm không tồn tại.');
  if (existing.status === 'published') {
    throw AppError.conflict('Điểm đã được công bố rồi.');
  }

  // Authorization check
  if (role === 'teacher') {
    const authorized = await repo.isTeacherAuthorized({
      teacherId: publishedBy,
      classId: existing.class_id || existing.classId,
      subjectId: existing.subject_id || existing.subjectId,
      semesterId: existing.semester_id || existing.semesterId,
    });
    if (!authorized) {
      throw AppError.forbidden('Bạn không có quyền công bố điểm này.');
    }
  }

  const now = new Date().toISOString();

  if (isPostgresConfigured()) {
    await pgQuery(`
      UPDATE grades SET status = 'published', published_at = $1, published_by = $2, updated_at = $1
      WHERE id = $3 AND status = 'draft'
    `, [now, publishedBy, id]);
  } else {
    db.prepare(`
      UPDATE grades SET status = 'published', published_at = ?, published_by = ?, updated_at = ?
      WHERE id = ? AND status = 'draft'
    `).run(now, publishedBy, now, id);
  }

  // Audit log — publication
  await repo.createAuditLog({
    gradeId: id,
    studentId: existing.student_id,
    subject: existing.subject,
    schoolId: existing.school_id,
    actorId: publishedBy,
    actorName: null,
    actorRole: role,
    action: 'published',
    previousRawScore: parseFloat(existing.raw_score ?? existing.score),
    previousMaxScore: parseFloat(existing.max_score ?? 10),
    previousStatus: existing.status,
    previousFeedback: existing.teacher_feedback,
    newRawScore: parseFloat(existing.raw_score ?? existing.score),
    newMaxScore: parseFloat(existing.max_score ?? 10),
    newStatus: 'published',
    newFeedback: existing.teacher_feedback,
    assignmentId: existing.assignment_id,
    gradeCategoryId: existing.grade_category_id,
    academicYearId: existing.academic_year_id,
    semesterId: existing.semester_id,
  });

  // G26: Notify the student that their grade is published
  try {
    const publishedGrade = await repo.getGradeById(id);
    if (publishedGrade?.student_id) {
      await notifyGradePublished({
        grade: {
          id: publishedGrade.id,
          subject: publishedGrade.subject || publishedGrade.subject_name || 'Bài kiểm tra',
          rawScore: parseFloat(publishedGrade.raw_score ?? publishedGrade.score ?? 0),
          maxScore: parseFloat(publishedGrade.max_score ?? 10),
          subjectId: publishedGrade.subject_id,
          classId: publishedGrade.class_id,
          academicYearId: publishedGrade.academic_year_id,
          semesterId: publishedGrade.semester_id,
        },
        student: { id: publishedGrade.student_id, name: null },
      });
    }
  } catch (notifErr) {
    console.error('[NotificationService] notifyGradePublished failed:', notifErr.message);
  }

  return repo.getGradeById(id);
}

export async function batchPublishGrades({ gradeIds, publishedBy, role }) {
  const results = [];
  for (const id of gradeIds) {
    try {
      const grade = await publishGrade({ id, publishedBy, role });
      results.push({ id, success: true, grade });
    } catch (err) {
      results.push({ id, success: false, error: err.message });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// GRADE CALCULATION (Deterministic, Reproducible)
// ---------------------------------------------------------------------------

/**
 * Compute a student's final grade for a given academic period.
 *
 * Key design: we always use a FROZEN CONFIG to ensure reproducibility.
 * The config is stored alongside the snapshot so future changes to
 * grade_categories.weight do NOT affect historical results.
 *
 * @param {{ studentId, academicYearId, semesterId, subjectId, teacherId? }} params
 * @returns {{ finalScore, categoryAverages, snapshotId, warnings }}
 */
export async function computeStudentGrade({ studentId, academicYearId, semesterId, subjectId, teacherId, schoolId }) {
  // 1. Get the latest calculation config for this period
  const config = await repo.getLatestConfig({ schoolId, academicYearId, semesterId });
  if (!config) throw AppError.notFound('Chưa có cấu hình tính điểm cho học kỳ này.');

  // 2. Get all grades for this student in this period
  const grades = await repo.getGradesForCalculation({ studentId, academicYearId, semesterId, subjectId });
  if (!grades || grades.length === 0) {
    throw AppError.badRequest('Không có điểm nào cho học sinh này trong học kỳ này.');
  }

  // 3. Get category definitions
  const categories = await repo.listCategories({ schoolId, isActive: true });
  if (!categories || categories.length === 0) {
    throw AppError.badRequest('Không có danh mục điểm nào được cấu hình.');
  }

  // 4. Build calculation inputs
  const categoryWeights = config.categoryWeights || {};
  const minEntries = config.minEntries || {};
  const scaleFactor = config.scale_factor || 10.0;

  // Normalize grades to the format expected by the calculation engine
  const normalizedGrades = grades.map((g) => ({
    id: g.id,
    gradeCategoryId: g.category_code || g.grade_category_id || '',
    rawScore: parseFloat(g.raw_score ?? g.score ?? 0),
    maxScore: parseFloat(g.max_score ?? 10),
    weight: parseFloat(g.weight ?? 1.0),
    status: g.status || 'draft',
  }));

  const normalizedCategories = categories.map((c) => ({
    code: c.code,
    name: c.name,
    weight: parseFloat(categoryWeights[c.code] ?? c.weight ?? 0),
    minEntries: parseInt(minEntries[c.code] ?? c.min_entries_per_semester ?? 1, 10),
  }));

  // 5. RUN CALCULATION (pure function — deterministic)
  const result = calculateGradebook({
    grades: normalizedGrades,
    categories: normalizedCategories,
    categoryWeights,
    minEntries,
    scaleFactor,
  });

  // 6. Get the next version number for this student/term
  const existingSnapshots = await repo.listSnapshots({
    filters: { studentId, academicYearId, semesterId, subjectId },
  });
  const nextVersion = (existingSnapshots.snapshots?.length || 0) + 1;

  // 7. Save immutable snapshot
  const snapshotId = await repo.createSnapshot({
    data: {
      studentId,
      schoolId: schoolId || grades[0]?.school_id,
      academicYearId,
      semesterId,
      subjectId,
      configSnapshot: { categoryWeights, minEntries, scaleFactor },
      categoryAverages: result.categoryAverages,
      finalScore: result.finalScore,
      scaleFactor,
      version: nextVersion,
      computedBy: teacherId,
    },
  });

  return {
    finalScore: result.finalScore,
    categoryAverages: result.categoryAverages,
    categoryWeights,
    scaleFactor,
    snapshotId,
    version: nextVersion,
    warnings: result.warnings,
    calculationDate: new Date().toISOString(),
  };
}

/**
 * Compute grades for multiple students (batch).
 * Used by the teacher to compute final grades for a class.
 */
export async function batchComputeGrades({ studentIds, academicYearId, semesterId, subjectId, teacherId, schoolId }) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw AppError.badRequest('Danh sách học sinh trống.');
  }

  const results = [];
  for (const studentId of studentIds) {
    try {
      const result = await computeStudentGrade({
        studentId, academicYearId, semesterId, subjectId, teacherId, schoolId,
      });
      results.push({ studentId, success: true, ...result });
    } catch (err) {
      results.push({ studentId, success: false, error: err.message });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// CALCULATION CONFIG MANAGEMENT
// ---------------------------------------------------------------------------

export async function listCalculationConfigs(filters = {}) {
  return repo.listConfigs(filters);
}

export async function createCalculationConfig({ data, createdBy }) {
  // Validate: weights must be defined for all active categories
  if (!data.categoryWeights || Object.keys(data.categoryWeights).length === 0) {
    throw AppError.badRequest('categoryWeights không được để trống.');
  }
  return repo.createCalculationConfig({ data, createdBy });
}

// ---------------------------------------------------------------------------
// SNAPSHOTS
// ---------------------------------------------------------------------------

export async function listSnapshots(filters = {}) {
  return repo.listSnapshots(filters);
}

// ---------------------------------------------------------------------------
// TEACHER GRADING WORKFLOW (G21)
// ---------------------------------------------------------------------------

/**
 * Open class gradebook — returns all students in the class with their grades
 * for a given subject/semester, filtered by teacher's authorization.
 */
export async function openClassGradebook({ teacherId, classId, academicYearId, semesterId, subjectId, role }) {
  // Admin/school_leader can access any class
  if (role === 'admin' || role === 'school_leader') {
    const students = await repo.getClassStudents({ classId, academicYearId, semesterId });
    const grades = await repo.getClassGrades({ classId, academicYearId, semesterId, subjectId });
    return { students, grades };
  }

  // Teacher: verify authorization
  const authorized = await repo.isTeacherAuthorized({ teacherId, classId, subjectId, semesterId });
  if (!authorized) {
    throw AppError.forbidden('Bạn không có quyền nhập điểm cho lớp này.');
  }

  const students = await repo.getClassStudents({ classId, academicYearId, semesterId });
  const grades = await repo.getClassGrades({ classId, academicYearId, semesterId, subjectId });
  return { students, grades };
}

/**
 * Save draft grade — create or update.
 * Validates score bounds and authorization.
 */
export async function saveDraftGrade({ data, teacherId, teacherName, actorRole, schoolId, role }) {
  // Validate score bounds
  const maxScore = data.maxScore ?? 10.0;
  if (data.rawScore < 0) throw AppError.badRequest('Điểm không được âm.');
  if (data.rawScore > maxScore) {
    throw AppError.badRequest('Điểm không được lớn hơn điểm tối đa.');
  }

  // Authorization: if teacher, verify class/subject assignment
  if (role === 'teacher') {
    // classId is REQUIRED for authorization - no classId means no authorization
    if (!data.classId) {
      throw AppError.forbidden('classId là bắt buộc để xác thực quyền nhập điểm.');
    }
    const authorized = await repo.isTeacherAuthorized({
      teacherId,
      classId: data.classId,
      subjectId: data.subjectId,
      semesterId: data.semesterId,
    });
    if (!authorized) {
      throw AppError.forbidden('Bạn không có quyền nhập điểm cho lớp/môn này.');
    }
  }

  return repo.saveDraftGrade({ data, teacherId, teacherName, actorRole, schoolId });
}

/**
 * Unlock a published grade for correction.
 */
export async function unlockGrade({ gradeId, unlockedBy, reason, role }) {
  // Only admin or school_leader can unlock (or teacher with explicit privilege)
  if (role === 'teacher') {
    throw AppError.forbidden('Chỉ quản trị viên mới có quyền mở khóa điểm đã công bố.');
  }
  return repo.unlockGrade({ gradeId, unlockedBy, reason });
}

/**
 * Bulk-enter simple scores for multiple students.
 */
export async function bulkEnterGrades({ studentIds, subject, subjectId, classId, gradeCategoryId, rawScores, maxScore, weight, gradingPeriod, academicYearId, semesterId, teacherId, teacherName, actorRole, schoolId, role }) {
  // Authorization
  if (role === 'teacher') {
    const authorized = await repo.isTeacherAuthorized({ teacherId, classId, subjectId, semesterId });
    if (!authorized) {
      throw AppError.forbidden('Bạn không có quyền nhập điểm cho lớp/môn này.');
    }
  }

  return repo.bulkEnterGrades({
    studentIds, subject, subjectId, classId, gradeCategoryId, rawScores,
    maxScore, weight, gradingPeriod, academicYearId, semesterId,
    teacherId, teacherName, actorRole, schoolId,
  });
}

/**
 * Get audit trail for grades.
 */
export async function getGradeAuditLogs(filters = {}) {
  return repo.getAuditLogs({ filters });
}

// ---------------------------------------------------------------------------
// PARENT PORTAL — READ-ONLY PUBLISHED GRADES
// ---------------------------------------------------------------------------

/**
 * Returns published grades for a student, formatted for parent portal consumption.
 * Used by GET /api/parent/grades and GET /api/parent/grades-detail.
 * Only returns published grades — draft grades are never exposed to parents.
 *
 * @param {{ studentId, schoolId, period, requestingUserId }} params
 * @returns {{ overallGpa, classRank, subjects[], tests[] }}
 */
export async function getStudentGradesForParent({ studentId, schoolId, period, requestingUserId: _requestingUserId }) {
  if (!studentId) throw AppError.badRequest('Thiếu studentId');

  const _isYear = period === 'year';
  const _isSemester2 = period === 'hk2';

  // Map period string to semester number for filtering
  const semesterNum = period === 'hk1' ? 1 : period === 'hk2' ? 2 : null;

  let grades = [];
  if (isPostgresConfigured()) {
    // Use only columns that exist in grades table
    // Note: g.school_id is TEXT, g.semester is INTEGER
    let sql = `
      SELECT g.id, g.student_id, g.subject, g.test_name, g.score, g.max_score,
             g.teacher_name, g.status, g.published_at, g.graded_at,
             g.school_id, g.academic_year_id, g.semester_id,
             s.name as subject_name
      FROM grades g
      LEFT JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = $1
        AND g.status = 'published'
        AND (COALESCE($2::text, '') = '' OR g.school_id = $2::text OR g.school_id IS NULL)
    `;
    const params = [studentId, schoolId];

    // Filter by semester number if period is specified
    // g.semester is INTEGER (1, 2), g.semester_id is TEXT (UUID or 'hk1'/'hk2')
    if (semesterNum !== null) {
      sql += ` AND (g.semester = $3 OR CAST(g.semester_id AS TEXT) = $3::text)`;
      params.push(semesterNum);
    }

    sql += ` ORDER BY s.name ASC, g.graded_at ASC`;

    const res = await pgQuery(sql, params);
    grades = res.rows;
  } else {
    // SQLite - use existing columns only
    let sql = `
      SELECT g.id, g.student_id, g.subject, g.test_name, g.score, g.max_score,
             g.teacher_name, g.status, g.published_at, g.graded_at,
             g.school_id, g.academic_year_id, g.semester_id
      FROM grades g
      WHERE g.student_id = ?
        AND g.status = 'published'
        AND (? IS NULL OR g.school_id = ? OR g.school_id IS NULL)
    `;
    const params = [studentId, schoolId, schoolId];

    // Filter by semester number if period is specified
    // g.semester is INTEGER (1, 2)
    if (semesterNum !== null) {
      sql += ` AND (g.semester = ? OR CAST(g.semester_id AS TEXT) = ?)`;
      params.push(semesterNum, semesterNum.toString());
    }

    sql += ` ORDER BY g.subject ASC, g.graded_at ASC`;

    grades = db.prepare(sql).all(...params);
  }

  if (!grades || grades.length === 0) {
    return {
      overallGpa: 0,
      classRank: null,
      subjects: [],
      tests: [],
      studentInfo: null,
    };
  }

  // Compute GPA (average of subject averages)
  const subjectMap = {};
  for (const g of grades) {
    const key = g.subject_id || g.subject_name || g.subject || 'Unknown';
    if (!subjectMap[key]) {
      subjectMap[key] = {
        subjectId: g.subject_id,
        subjectName: g.subject_name || g.subject || 'Môn học',
        subjectCode: g.subject_code || '',
        teacherName: g.teacher_name || '',
        className: g.class_name || '',
        scores: [],
        categoryScores: {},
      };
    }
    const normalizedScore = (parseFloat(g.raw_score || g.score) / parseFloat(g.max_score || 10)) * 10;
    subjectMap[key].scores.push({
      id: g.id,
      categoryCode: g.category_code || g.grade_category_id,
      categoryName: g.category_name || 'Bài kiểm tra',
      rawScore: parseFloat(g.raw_score || g.score),
      maxScore: parseFloat(g.max_score || 10),
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      weight: parseFloat(g.weight || 1.0),
      status: g.status,
      teacherFeedback: g.teacher_feedback || g.feedback || '',
      gradedAt: g.graded_at || g.updated_at || g.created_at,
      testName: g.description || g.test_name || g.category_name || 'Bài kiểm tra',
    });
  }

  const subjectAverages = Object.values(subjectMap).map((sub) => {
    if (sub.scores.length === 0) return { ...sub, average: 0 };
    const sum = sub.scores.reduce((acc, s) => acc + s.normalizedScore, 0);
    const avg = Math.round((sum / sub.scores.length) * 100) / 100;
    return { ...sub, average: avg };
  });

  const overallGpa = subjectAverages.length > 0
    ? Math.round((subjectAverages.reduce((acc, s) => acc + s.average, 0) / subjectAverages.length) * 100) / 100
    : 0;

  const studentInfo = grades[0] ? {
    className: grades[0].class_name || '',
    enrolledAt: grades[0].enrolled_at,
  } : null;

  return {
    overallGpa,
    classRank: null, // Computed separately if needed
    subjects: subjectAverages,
    tests: grades.map(g => ({
      id: g.id,
      subjectName: g.subject_name || g.subject || 'Môn học',
      testName: g.description || g.test_name || g.category_name || 'Bài kiểm tra',
      category: g.category_name || 'Bài kiểm tra',
      rawScore: parseFloat(g.raw_score || g.score),
      maxScore: parseFloat(g.max_score || 10),
      normalizedScore: Math.round(((parseFloat(g.raw_score || g.score) / parseFloat(g.max_score || 10)) * 10) * 100) / 100,
      teacherFeedback: g.teacher_feedback || g.feedback || '',
      teacherName: g.teacher_name || '',
      gradedAt: g.graded_at || g.updated_at || g.created_at,
    })),
    studentInfo,
  };
}
