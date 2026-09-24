import { Router } from 'express';
import { teacherAssignmentsController } from './teacher-assignments.controller.js';
import { authenticateToken } from '../../shared/auth/index.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  createTeacherAssignmentSchema,
  updateTeacherAssignmentSchema,
  queryTeacherAssignmentsSchema,
} from './teacher-assignments.schema.js';

const router = Router();

// All teacher assignment endpoints require authentication
router.use(authenticateToken);

/**
 * Teacher "My Classes"
 */
router.get(
  '/my-classes',
  requirePermission(PERMISSIONS.TEACHER_ASSIGNMENT_READ),
  teacherAssignmentsController.getMyClasses
);

/**
 * Assignment Management Endpoints
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.TEACHER_ASSIGNMENT_READ),
  validateRequest({ query: queryTeacherAssignmentsSchema }),
  teacherAssignmentsController.getAssignments
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.TEACHER_ASSIGNMENT_READ),
  teacherAssignmentsController.getAssignmentById
);

router.post(
  '/',
  requirePermission(PERMISSIONS.TEACHER_ASSIGNMENT_MANAGE),
  validateRequest({ body: createTeacherAssignmentSchema }),
  teacherAssignmentsController.createAssignment
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.TEACHER_ASSIGNMENT_MANAGE),
  validateRequest({ body: updateTeacherAssignmentSchema }),
  teacherAssignmentsController.updateAssignment
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.TEACHER_ASSIGNMENT_MANAGE),
  teacherAssignmentsController.deleteAssignment
);

export const teacherAssignmentsRoutes = router;
