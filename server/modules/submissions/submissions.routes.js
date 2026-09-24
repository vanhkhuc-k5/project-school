// =============================================================================
// Submission Routes — Express router for G19 Assignment Submission Workflow
// =============================================================================
import { Router } from 'express';
import { authenticateToken } from '../../shared/auth/index.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  saveDraftSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
  querySubmissionsSchema,
  queryStudentAssignmentsSchema,
} from './submissions.schema.js';
import {
  listStudentAssignments,
  getAssignmentDetail,
  saveDraft,
  submitAssignment,
  getSubmissionHistory,
  listAssignmentSubmissions,
  gradeSubmission,
} from './submissions.controller.js';

const router = Router();

// All submission endpoints require authentication
router.use(authenticateToken);

// Student-facing endpoints
router.get(
  '/assignments',
  requirePermission(PERMISSIONS.ASSIGNMENT_READ),
  validateRequest({ query: queryStudentAssignmentsSchema }),
  listStudentAssignments
);

router.get(
  '/assignments/:id',
  requirePermission(PERMISSIONS.ASSIGNMENT_READ),
  getAssignmentDetail
);

router.post(
  '/assignments/:id/draft',
  requirePermission(PERMISSIONS.ASSIGNMENT_SUBMIT),
  validateRequest({ body: saveDraftSchema }),
  saveDraft
);

router.post(
  '/assignments/:id/submit',
  requirePermission(PERMISSIONS.ASSIGNMENT_SUBMIT),
  validateRequest({ body: submitAssignmentSchema }),
  submitAssignment
);

router.get(
  '/history',
  requirePermission(PERMISSIONS.ASSIGNMENT_READ),
  validateRequest({ query: querySubmissionsSchema }),
  getSubmissionHistory
);

// Teacher/Admin-facing endpoints
router.get(
  '/assignments/:id/students',
  requirePermission(PERMISSIONS.ASSIGNMENT_GRADE),
  listAssignmentSubmissions
);

router.post(
  '/grade',
  requirePermission(PERMISSIONS.ASSIGNMENT_GRADE),
  validateRequest({ body: gradeSubmissionSchema }),
  gradeSubmission
);

export { router as submissionsRoutes };
