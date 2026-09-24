// =============================================================================
// Assignment Routes — Express router for G18 Assignment Authoring
// =============================================================================
import { Router } from 'express';
import { authenticateToken } from '../../shared/auth/index.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  queryAssignmentsSchema,
  publishAssignmentSchema,
  gradeSubmissionSchema,
} from './assignments.schema.js';
import {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  publishAssignment,
  deleteAssignment,
  listGradingQueue,
  gradeSubmission,
} from './assignments.controller.js';

const router = Router();

// All endpoints require authentication
router.use(authenticateToken);

// List teacher's assignments
router.get(
  '/',
  requirePermission(PERMISSIONS.ASSIGNMENT_READ),
  validateRequest({ query: queryAssignmentsSchema }),
  listAssignments
);

// Grading queue
router.get(
  '/grading-queue',
  requirePermission(PERMISSIONS.ASSIGNMENT_GRADE),
  listGradingQueue
);

// Grade a submission
router.post(
  '/grade',
  requirePermission(PERMISSIONS.ASSIGNMENT_GRADE),
  validateRequest({ body: gradeSubmissionSchema }),
  gradeSubmission
);

// Get single assignment
router.get(
  '/:id',
  requirePermission(PERMISSIONS.ASSIGNMENT_READ),
  getAssignmentById
);

// Create assignment
router.post(
  '/',
  requirePermission(PERMISSIONS.ASSIGNMENT_CREATE),
  validateRequest({ body: createAssignmentSchema }),
  createAssignment
);

// Update draft assignment
router.put(
  '/:id',
  requirePermission(PERMISSIONS.ASSIGNMENT_CREATE),
  validateRequest({ body: updateAssignmentSchema }),
  updateAssignment
);

// Publish draft assignment
router.post(
  '/:id/publish',
  requirePermission(PERMISSIONS.ASSIGNMENT_CREATE),
  validateRequest({ body: publishAssignmentSchema }),
  publishAssignment
);

// Delete draft assignment
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ASSIGNMENT_CREATE),
  deleteAssignment
);

export const assignmentsRoutes = router;
