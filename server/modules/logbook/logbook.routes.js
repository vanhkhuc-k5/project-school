// =============================================================================
// Logbook Routes — Express Router
// Implements: Digital Class Logbook, Conduct Evaluation, Discipline Records
// Role-based access:
//   - teacher: create/update own entries, manage conduct
//   - class_monitor: create discipline records
//   - principal/vice_principal/school_admin: read all entries, approve
// =============================================================================
import express from 'express';
import { authenticateToken, requireRole, requirePermission } from '../../shared/auth/auth.middleware.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  createLogbookEntrySchema,
  updateLogbookEntrySchema,
  signLogbookEntrySchema,
  queryLogbookEntriesSchema,
  createConductEvaluationSchema,
  updateConductEvaluationSchema,
  batchUpdateConductSchema,
  queryConductEvaluationsSchema,
  createDisciplineRecordSchema,
  updateDisciplineRecordSchema,
  queryDisciplineRecordsSchema,
  saveSeatingArrangementSchema,
} from './logbook.schema.js';
import {
  // Logbook entries
  listLogbookEntries,
  getLogbookEntry,
  createLogbookEntry,
  updateLogbookEntry,
  signLogbookEntry,
  submitLogbookEntry,
  getWeeklySummary,
  // Conduct evaluations
  listConductEvaluations,
  getClassConductSummary,
  updateConductEvaluation,
  batchUpdateConductEvaluations,
  // Discipline records
  listDisciplineRecords,
  createDisciplineRecord,
  updateDisciplineRecord,
  getGroupDisciplineSummary,
  // Seating
  getSeatingArrangement,
  saveSeatingArrangement,
  // Reference
  getReferenceLabels,
} from './logbook.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE DATA (all authenticated users)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/reference/labels', getReferenceLabels);

// ─────────────────────────────────────────────────────────────────────────────
// LOGBOOK ENTRIES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/logbook/entries — List logbook entries
router.get(
  '/entries',
  requirePermission('homeroom.read'),
  validateRequest({ query: queryLogbookEntriesSchema }),
  listLogbookEntries
);

// GET /api/logbook/entries/:id — Get single entry
router.get(
  '/entries/:id',
  requirePermission('homeroom.read'),
  getLogbookEntry
);

// POST /api/logbook/entries — Create logbook entry
router.post(
  '/entries',
  requirePermission('homeroom.write'),
  validateRequest({ body: createLogbookEntrySchema }),
  createLogbookEntry
);

// PATCH /api/logbook/entries/:id — Update logbook entry
router.patch(
  '/entries/:id',
  requirePermission('homeroom.write'),
  validateRequest({ body: updateLogbookEntrySchema }),
  updateLogbookEntry
);

// POST /api/logbook/entries/:id/sign — Sign logbook entry
router.post(
  '/entries/:id/sign',
  requirePermission('homeroom.write'),
  validateRequest({ body: signLogbookEntrySchema }),
  signLogbookEntry
);

// POST /api/logbook/entries/:id/submit — Submit entry for review
router.post(
  '/entries/:id/submit',
  requirePermission('homeroom.write'),
  submitLogbookEntry
);

// GET /api/logbook/class/:classId/weekly-summary — Get weekly summary
router.get(
  '/class/:classId/weekly-summary',
  requirePermission('homeroom.read'),
  getWeeklySummary
);

// ─────────────────────────────────────────────────────────────────────────────
// CONDUCT EVALUATIONS (TT22)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/logbook/conduct — List conduct evaluations
router.get(
  '/conduct',
  requirePermission('homeroom.read'),
  validateRequest({ query: queryConductEvaluationsSchema }),
  listConductEvaluations
);

// GET /api/logbook/conduct/class/:classId/summary — Get class conduct summary
router.get(
  '/conduct/class/:classId/summary',
  requirePermission('homeroom.read'),
  getClassConductSummary
);

// PATCH /api/logbook/conduct/:id — Update conduct evaluation
router.patch(
  '/conduct/:id',
  requirePermission('homeroom.write'),
  validateRequest({ body: updateConductEvaluationSchema }),
  updateConductEvaluation
);

// POST /api/logbook/conduct/batch — Batch update evaluations
router.post(
  '/conduct/batch',
  requirePermission('homeroom.write'),
  validateRequest({ body: batchUpdateConductSchema }),
  batchUpdateConductEvaluations
);

// ─────────────────────────────────────────────────────────────────────────────
// DISCIPLINE RECORDS (Class Monitor / Group Leader)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/logbook/discipline — List discipline records
router.get(
  '/discipline',
  requirePermission('homeroom.read'),
  validateRequest({ query: queryDisciplineRecordsSchema }),
  listDisciplineRecords
);

// POST /api/logbook/discipline — Create discipline record
router.post(
  '/discipline',
  // Allow class monitors and teachers to create discipline records
  (req, res, next) => {
    const allowedRoles = ['teacher', 'class_monitor', 'group_leader', 'school_admin', 'super_admin'];
    if (allowedRoles.includes(req.user?.role)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Không có quyền ghi nhận vi phạm nề nếp',
      });
    }
  },
  validateRequest({ body: createDisciplineRecordSchema }),
  createDisciplineRecord
);

// PATCH /api/logbook/discipline/:id — Update discipline record
router.patch(
  '/discipline/:id',
  requirePermission('homeroom.write'),
  validateRequest({ body: updateDisciplineRecordSchema }),
  updateDisciplineRecord
);

// GET /api/logbook/discipline/class/:classId/group-summary — Get group discipline summary
router.get(
  '/discipline/class/:classId/group-summary',
  requirePermission('homeroom.read'),
  getGroupDisciplineSummary
);

// ─────────────────────────────────────────────────────────────────────────────
// SEATING ARRANGEMENTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/logbook/seating/:classId — Get seating arrangement
router.get(
  '/seating/:classId',
  requirePermission('homeroom.read'),
  getSeatingArrangement
);

// POST /api/logbook/seating — Save seating arrangement
router.post(
  '/seating',
  requirePermission('homeroom.write'),
  validateRequest({ body: saveSeatingArrangementSchema }),
  saveSeatingArrangement
);

export default router;
