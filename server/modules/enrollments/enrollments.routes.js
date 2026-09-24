import { Router } from 'express';
import { enrollmentsController } from './enrollments.controller.js';
import { authenticateToken } from '../../shared/auth/index.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  enrollStudentSchema,
  transferStudentSchema,
  withdrawStudentSchema,
  bulkEnrollSchema,
  enrollmentQuerySchema,
} from './enrollments.schema.js';

const router = Router();

// All enrollment routes require authentication
router.use(authenticateToken);

/**
 * Lifecycle Mutations (Restricted to Admin / Management)
 */
router.post(
  '/enroll',
  requirePermission(PERMISSIONS.ENROLLMENT_MANAGE),
  validateRequest({ body: enrollStudentSchema }),
  enrollmentsController.enrollStudent
);

router.post(
  '/transfer',
  requirePermission(PERMISSIONS.ENROLLMENT_MANAGE),
  validateRequest({ body: transferStudentSchema }),
  enrollmentsController.transferStudent
);

router.post(
  '/withdraw',
  requirePermission(PERMISSIONS.ENROLLMENT_MANAGE),
  validateRequest({ body: withdrawStudentSchema }),
  enrollmentsController.withdrawStudent
);

router.post(
  '/bulk',
  requirePermission(PERMISSIONS.ENROLLMENT_MANAGE),
  validateRequest({ body: bulkEnrollSchema }),
  enrollmentsController.bulkEnroll
);

/**
 * Enrollment Queries
 */
router.get(
  '/students/:studentId/history',
  requirePermission(PERMISSIONS.ENROLLMENT_READ),
  enrollmentsController.getStudentHistory
);

router.get(
  '/students/:studentId/current',
  requirePermission(PERMISSIONS.ENROLLMENT_READ),
  enrollmentsController.getStudentCurrent
);

router.get(
  '/classes/:classId/roster',
  requirePermission(PERMISSIONS.ENROLLMENT_READ),
  validateRequest({ query: enrollmentQuerySchema }),
  enrollmentsController.getClassRoster
);

export default router;
