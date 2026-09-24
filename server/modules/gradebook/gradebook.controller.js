// =============================================================================
// Gradebook Controller — HTTP Handlers for G20/G21 Production Gradebook
// =============================================================================
import * as service from './gradebook.service.js';
import { requirePermission } from '../../shared/auth/index.js';
import { AppError } from '../../shared/errors/index.js';

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function buildResponse(data, meta = {}) {
  return { success: true, data, meta };
}

function extractUser(req) {
  return {
    userId: req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id || 'sch_bacau',
    role: req.user?.role,
  };
}

// ---------------------------------------------------------------------------
// GRADE CATEGORIES
// ---------------------------------------------------------------------------

export async function listCategories(req, res) {
  const { schoolId } = extractUser(req);
  const { isActive } = req.query;

  const filters = {};
  if (schoolId) filters.schoolId = schoolId;
  if (isActive !== undefined) filters.isActive = isActive === 'true';

  const categories = await service.listCategories(filters);
  res.json(buildResponse(categories));
}

export async function createCategory(req, res) {
  const { userId, schoolId } = extractUser(req);
  requirePermission(req, 'grade.create');

  const category = await service.createCategory({ data: req.body, schoolId, teacherId: userId });
  res.status(201).json(buildResponse(category));
}

export async function updateCategory(req, res) {
  requirePermission(req, 'grade.update');
  const { id } = req.params;

  const category = await service.updateCategory({ id, data: req.body });
  res.json(buildResponse(category));
}

// ---------------------------------------------------------------------------
// GRADE ENTRIES
// ---------------------------------------------------------------------------

export async function listGrades(req, res) {
  const { userId, role } = extractUser(req);
  requirePermission(req, 'grade.read');

  const filters = { ...req.query };

  // Teachers and students can only see their own scope
  if (role === 'teacher') {
    filters.teacherId = userId;
  } else if (role === 'student') {
    filters.studentId = req.user?.studentId || userId;
  }
  // Admin can see all (no filter added)

  const result = await service.listGrades({ filters });
  res.json(buildResponse(result.grades, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  }));
}

export async function getGradeById(req, res) {
  requirePermission(req, 'grade.read');
  const { id } = req.params;

  const grade = await service.getGradeById(id);
  res.json(buildResponse(grade));
}

export async function createGrade(req, res) {
  const { userId, schoolId } = extractUser(req);
  requirePermission(req, 'grade.create');

  const grade = await service.createGrade({
    data: req.body,
    teacherId: userId,
    schoolId: schoolId || req.body.schoolId,
  });
  res.status(201).json(buildResponse(grade));
}

export async function updateGrade(req, res) {
  requirePermission(req, 'grade.update');
  const { id } = req.params;

  const grade = await service.updateGrade({ id, data: req.body });
  res.json(buildResponse(grade));
}

export async function publishGrade(req, res) {
  requirePermission(req, 'grade.publish');
  const { userId } = extractUser(req);
  const { id } = req.params;

  const grade = await service.publishGrade({ id, publishedBy: userId });
  res.json(buildResponse(grade));
}

export async function batchPublishGrades(req, res) {
  requirePermission(req, 'grade.publish');
  const { userId } = extractUser(req);

  const results = await service.batchPublishGrades({
    gradeIds: req.body.gradeIds,
    publishedBy: userId,
  });
  res.json(buildResponse(results));
}

// ---------------------------------------------------------------------------
// GRADE CALCULATION
// ---------------------------------------------------------------------------

export async function computeStudentGrade(req, res) {
  requirePermission(req, 'grade.read');
  const { userId, schoolId } = extractUser(req);
  const { studentId, academicYearId, semesterId, subjectId } = req.body;

  if (!academicYearId || !semesterId) {
    throw AppError.badRequest('academicYearId và semesterId là bắt buộc.');
  }

  const result = await service.computeStudentGrade({
    studentId: studentId || userId,
    academicYearId,
    semesterId,
    subjectId: subjectId || null,
    teacherId: userId,
    schoolId: schoolId || req.body.schoolId,
  });

  res.json(buildResponse(result));
}

export async function batchComputeGrades(req, res) {
  requirePermission(req, 'grade.read');
  const { userId, schoolId } = extractUser(req);
  const { studentIds, academicYearId, semesterId, subjectId } = req.body;

  if (!academicYearId || !semesterId) {
    throw AppError.badRequest('academicYearId và semesterId là bắt buộc.');
  }

  const results = await service.batchComputeGrades({
    studentIds,
    academicYearId,
    semesterId,
    subjectId: subjectId || null,
    teacherId: userId,
    schoolId: schoolId || req.body.schoolId,
  });

  res.json(buildResponse(results));
}

// ---------------------------------------------------------------------------
// CALCULATION CONFIG
// ---------------------------------------------------------------------------

export async function listCalculationConfigs(req, res) {
  requirePermission(req, 'grade.read');
  const { schoolId } = extractUser(req);

  const configs = await service.listCalculationConfigs({
    schoolId: schoolId || req.query.schoolId,
    academicYearId: req.query.academicYearId,
    semesterId: req.query.semesterId,
  });
  res.json(buildResponse(configs));
}

export async function createCalculationConfig(req, res) {
  requirePermission(req, 'grade.create');
  const { userId } = extractUser(req);

  const id = await service.createCalculationConfig({
    data: req.body,
    createdBy: userId,
  });
  res.status(201).json(buildResponse({ id }));
}

// ---------------------------------------------------------------------------
// SNAPSHOTS
// ---------------------------------------------------------------------------

export async function listSnapshots(req, res) {
  requirePermission(req, 'grade.read');
  const { studentId, role } = extractUser(req);

  const filters = { ...req.query };
  // Students can only see their own snapshots
  if (role === 'student') {
    filters.studentId = req.user?.studentId || studentId;
  }

  const result = await service.listSnapshots(filters);
  res.json(buildResponse(result.snapshots, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  }));
}

// ---------------------------------------------------------------------------
// TEACHER GRADING WORKFLOW (G21)
// ---------------------------------------------------------------------------

/**
 * GET /api/gradebook/class/:classId/students
 * Open class gradebook — list students in class + all their grades.
 * Authorization: teacher must have teaching assignment for this class.
 */
export async function openClassGradebook(req, res) {
  requirePermission(req, 'grade.read');
  const { userId, role } = extractUser(req);
  const { classId } = req.params;
  const { academicYearId, semesterId, subjectId } = req.query;

  if (!classId) throw AppError.badRequest('classId là bắt buộc.');

  const result = await service.openClassGradebook({
    teacherId: userId,
    classId,
    academicYearId: academicYearId || undefined,
    semesterId: semesterId || undefined,
    subjectId: subjectId || undefined,
    role,
  });

  // Build gradebook matrix: student → grades grouped by category
  const gradeMap = new Map();
  for (const g of (result.grades || [])) {
    if (!gradeMap.has(g.student_id)) gradeMap.set(g.student_id, []);
    gradeMap.get(g.student_id).push(g);
  }

  const gradebook = result.students.map((s) => ({
    studentId: s.student_id,
    name: s.name,
    studentCode: s.student_code,
    grades: gradeMap.get(s.student_id) || [],
  }));

  res.json(buildResponse({
    classId,
    students: gradebook,
    totalStudents: gradebook.length,
    academicYearId,
    semesterId,
    subjectId,
  }));
}

/**
 * POST /api/gradebook/grades/draft
 * Save draft grade — creates new grade or updates existing.
 */
export async function saveDraftGrade(req, res) {
  requirePermission(req, 'grade.create');
  const { userId, schoolId, role } = extractUser(req);

  const grade = await service.saveDraftGrade({
    data: req.body,
    teacherId: userId,
    teacherName: req.user?.name || 'GV',
    actorRole: role,
    schoolId: schoolId || req.body.schoolId,
    role,
  });

  res.status(201).json(buildResponse(grade));
}

/**
 * POST /api/gradebook/grades/bulk
 * Bulk-enter simple scores for multiple students.
 */
export async function bulkEnterGrades(req, res) {
  requirePermission(req, 'grade.create');
  const { userId, schoolId, role } = extractUser(req);
  const { studentIds, subject, subjectId, classId, gradeCategoryId, rawScores, maxScore = 10, weight = 1.0, gradingPeriod = 'regular', academicYearId, semesterId } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw AppError.badRequest('studentIds phải là mảng không rỗng.');
  }
  if (!subject) throw AppError.badRequest('subject là bắt buộc.');

  const results = await service.bulkEnterGrades({
    studentIds, subject, subjectId, classId, gradeCategoryId, rawScores,
    maxScore, weight, gradingPeriod, academicYearId, semesterId,
    teacherId: userId,
    teacherName: req.user?.name || 'GV',
    actorRole: role,
    schoolId: schoolId || req.body.schoolId,
    role,
  });

  res.status(201).json(buildResponse({ results }));
}

/**
 * POST /api/gradebook/grades/:id/unlock
 * Unlock a published grade for correction (admin only).
 */
export async function unlockGrade(req, res) {
  requirePermission(req, 'grade.update');
  const { userId, role } = extractUser(req);
  const { id } = req.params;
  const { reason } = req.body;

  const grade = await service.unlockGrade({
    gradeId: id,
    unlockedBy: userId,
    reason,
    role,
  });

  res.json(buildResponse(grade));
}

/**
 * GET /api/gradebook/audit
 * Get audit trail for grades.
 */
export async function getGradeAudit(req, res) {
  requirePermission(req, 'grade.read');
  const logs = await service.getGradeAuditLogs({ filters: req.query });
  res.json(buildResponse(logs));
}
