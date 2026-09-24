/**
 * Department Head Module Routes
 * G33: Domain-scoped REST endpoints for department heads.
 * 
 * Department Head access is STRICTLY scoped to their own department.
 * They CANNOT access other departments, school-wide admin endpoints,
 * or perform cross-department operations.
 */

import { Router } from 'express';
import { departmentHeadController } from './department-head.controller.js';
import { authenticateToken } from '../../shared/auth/index.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  queryDepartmentTeachersSchema,
  queryDepartmentSubjectsSchema,
  queryDepartmentClassesSchema,
  queryDepartmentPerformanceSchema,
  queryDepartmentAssignmentsSchema,
  queryDepartmentStudentsSchema,
} from './department-head.schema.js';

const router = Router();

// All department head endpoints require authentication
router.use(authenticateToken);

/**
 * GET /department-head/overview
 * Department dashboard overview — automatically scoped to user's department.
 */
router.get(
  '/overview',
  requirePermission(PERMISSIONS.DEPARTMENT_HEAD_READ),
  departmentHeadController.getOverview
);

/**
 * GET /department-head/:departmentId/teachers
 * List all teachers in the department.
 * SCOPED: Only returns teachers belonging to the specified department.
 */
router.get(
  '/:departmentId/teachers',
  requirePermission(PERMISSIONS.TEACHER_READ),
  validateRequest({ query: queryDepartmentTeachersSchema }),
  departmentHeadController.listTeachers
);

/**
 * GET /department-head/:departmentId/subjects
 * List all subjects in the department.
 * SCOPED: Only returns subjects belonging to the specified department.
 */
router.get(
  '/:departmentId/subjects',
  requirePermission(PERMISSIONS.CLASS_READ),
  validateRequest({ query: queryDepartmentSubjectsSchema }),
  departmentHeadController.listSubjects
);

/**
 * GET /department-head/:departmentId/classes
 * List classes where department's subjects are taught.
 * SCOPED: Only returns classes with department's subjects.
 */
router.get(
  '/:departmentId/classes',
  requirePermission(PERMISSIONS.CLASS_READ),
  validateRequest({ query: queryDepartmentClassesSchema }),
  departmentHeadController.listClasses
);

/**
 * GET /department-head/:departmentId/performance
 * Performance statistics by subject and class.
 * SCOPED: Only aggregates data for department's subjects.
 */
router.get(
  '/:departmentId/performance',
  requirePermission(PERMISSIONS.GRADE_READ),
  validateRequest({ query: queryDepartmentPerformanceSchema }),
  departmentHeadController.getPerformance
);

/**
 * GET /department-head/:departmentId/assignments
 * List all assignments for department's subjects.
 * SCOPED: Only returns assignments for department's subjects.
 */
router.get(
  '/:departmentId/assignments',
  requirePermission(PERMISSIONS.ASSIGNMENT_READ),
  validateRequest({ query: queryDepartmentAssignmentsSchema }),
  departmentHeadController.listAssignments
);

/**
 * GET /department-head/:departmentId/students
 * List students in department's classes.
 * SCOPED: Only returns students enrolled in classes with department's subjects.
 */
router.get(
  '/:departmentId/students',
  requirePermission(PERMISSIONS.STUDENT_READ),
  validateRequest({ query: queryDepartmentStudentsSchema }),
  departmentHeadController.listStudents
);

/**
 * PATCH /department-head/:departmentId
 * Update department info (description only).
 * SCOPED: Only allows updating the department the user is head of.
 */
router.patch(
  '/:departmentId',
  requirePermission(PERMISSIONS.DEPARTMENT_HEAD_MANAGE),
  departmentHeadController.updateDepartment
);

export const departmentHeadRoutes = router;
