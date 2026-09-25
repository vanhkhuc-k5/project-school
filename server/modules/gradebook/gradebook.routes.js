// =============================================================================
// Gradebook Routes — Express Router for G20/G21 Production Gradebook
// =============================================================================
import { Router } from 'express';
import { authenticateToken } from '../../shared/auth/index.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { validateRequest } from '../../shared/validation/index.js';
import * as ctrl from './gradebook.controller.js';
import {
  createGradeCategorySchema,
  updateGradeCategorySchema,
  createGradeSchema,
  updateGradeSchema,
  batchPublishGradesSchema,
  createGradeConfigSchema,
  queryGradesSchema,
  querySnapshotsSchema,
} from './gradebook.schema.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------
router.get(
  '/categories',
  requirePermission('grade.read'),
  ctrl.listCategories
);

router.post(
  '/categories',
  requirePermission('grade.create'),
  validateRequest({ body: createGradeCategorySchema }),
  ctrl.createCategory
);

router.patch(
  '/categories/:id',
  requirePermission('grade.update'),
  validateRequest({ body: updateGradeCategorySchema }),
  ctrl.updateCategory
);

// ---------------------------------------------------------------------------
// GRADES
// ---------------------------------------------------------------------------

// GET /api/gradebook/grades — list grades with optional filters
router.get(
  '/grades',
  requirePermission('grade.read'),
  validateRequest({ query: queryGradesSchema }),
  ctrl.listGrades
);

// GET /api/gradebook/grades/:id — get single grade
router.get(
  '/grades/:id',
  requirePermission('grade.read'),
  ctrl.getGradeById
);

// POST /api/gradebook/grades — create a new grade entry
router.post(
  '/grades',
  requirePermission('grade.create'),
  validateRequest({ body: createGradeSchema }),
  ctrl.createGrade
);

// PATCH /api/gradebook/grades/:id — update a draft grade
router.patch(
  '/grades/:id',
  requirePermission('grade.update'),
  validateRequest({ body: updateGradeSchema }),
  ctrl.updateGrade
);

// POST /api/gradebook/grades/:id/publish — publish a single grade
router.post(
  '/grades/:id/publish',
  requirePermission('grade.publish'),
  ctrl.publishGrade
);

// POST /api/gradebook/grades/publish/batch — batch publish grades
router.post(
  '/grades/publish/batch',
  requirePermission('grade.publish'),
  validateRequest({ body: batchPublishGradesSchema }),
  ctrl.batchPublishGrades
);

// ---------------------------------------------------------------------------
// CALCULATION
// ---------------------------------------------------------------------------

// POST /api/gradebook/calculate/student — compute grade for one student
router.post(
  '/calculate/student',
  requirePermission('grade.read'),
  ctrl.computeStudentGrade
);

// POST /api/gradebook/calculate/batch — compute grades for multiple students
router.post(
  '/calculate/batch',
  requirePermission('grade.read'),
  ctrl.batchComputeGrades
);

// ---------------------------------------------------------------------------
// CALCULATION CONFIGS
// ---------------------------------------------------------------------------

router.get(
  '/configs',
  requirePermission('grade.read'),
  ctrl.listCalculationConfigs
);

router.post(
  '/configs',
  requirePermission('grade.create'),
  validateRequest({ body: createGradeConfigSchema }),
  ctrl.createCalculationConfig
);

// ---------------------------------------------------------------------------
// SNAPSHOTS (immutable audit trail)
// ---------------------------------------------------------------------------

router.get(
  '/snapshots',
  requirePermission('grade.read'),
  validateRequest({ query: querySnapshotsSchema }),
  ctrl.listSnapshots
);

// ---------------------------------------------------------------------------
// TEACHER GRADING WORKFLOW (G21)
// ---------------------------------------------------------------------------

// GET /api/gradebook/class/:classId/students — open class gradebook
router.get(
  '/class/:classId/students',
  requirePermission('grade.read'),
  ctrl.openClassGradebook
);

// POST /api/gradebook/grades/draft — save draft grade
router.post(
  '/grades/draft',
  requirePermission('grade.create'),
  ctrl.saveDraftGrade
);

// POST /api/gradebook/grades/bulk — bulk-enter grades
router.post(
  '/grades/bulk',
  requirePermission('grade.create'),
  ctrl.bulkEnterGrades
);

// POST /api/gradebook/grades/:id/unlock — unlock published grade
router.post(
  '/grades/:id/unlock',
  requirePermission('grade.update'),
  ctrl.unlockGrade
);

// GET /api/gradebook/audit — get grade audit trail
router.get(
  '/audit',
  requirePermission('grade.read'),
  ctrl.getGradeAudit
);

// ---------------------------------------------------------------------------
// TT22 ACADEMIC EVALUATION — CLASS SUMMARY & REPORT CARD
// ---------------------------------------------------------------------------

// GET /api/gradebook/classes/:classId/summary
router.get(
  '/classes/:classId/summary',
  requirePermission('grade.read'),
  ctrl.getClassAcademicSummary
);

// GET /api/gradebook/students/:studentId/report-card
router.get(
  '/students/:studentId/report-card',
  requirePermission('grade.read'),
  ctrl.getStudentReportCard
);

// POST /api/gradebook/classes/:classId/lock
router.post(
  '/classes/:classId/lock',
  requirePermission('grade.publish'),
  ctrl.lockClassGradebook
);

export { router as gradebookRoutes };
