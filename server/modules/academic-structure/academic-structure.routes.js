/**
 * Academic Structure Module Routing
 * Defines REST endpoints for Departments, Subjects, and Classes with
 * validation schemas and granular RBAC authorization.
 */

import express from 'express';
import { academicStructureController } from './academic-structure.controller.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  queryDepartmentSchema,
  createSubjectSchema,
  updateSubjectSchema,
  querySubjectSchema,
  createClassSchema,
  updateClassSchema,
  queryClassSchema,
} from './academic-structure.schema.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
} from '../../shared/auth/index.js';

const router = express.Router();

// Enforce authentication across all academic structure endpoints
router.use(authenticateToken);

// ========================================================================
// 1. DEPARTMENTS ENDPOINTS
// ========================================================================
router.get(
  '/departments',
  requirePermission('class.read'),
  validateRequest({ query: queryDepartmentSchema }),
  academicStructureController.listDepartments
);

router.get(
  '/departments/:id',
  requirePermission('class.read'),
  academicStructureController.getDepartmentById
);

router.post(
  '/departments',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  validateRequest({ body: createDepartmentSchema }),
  academicStructureController.createDepartment
);

router.put(
  '/departments/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  validateRequest({ body: updateDepartmentSchema }),
  academicStructureController.updateDepartment
);

router.delete(
  '/departments/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  academicStructureController.deleteDepartment
);

// ========================================================================
// 2. SUBJECTS ENDPOINTS
// ========================================================================
router.get(
  '/subjects',
  requirePermission('class.read'),
  validateRequest({ query: querySubjectSchema }),
  academicStructureController.listSubjects
);

router.get(
  '/subjects/:id',
  requirePermission('class.read'),
  academicStructureController.getSubjectById
);

router.post(
  '/subjects',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  validateRequest({ body: createSubjectSchema }),
  academicStructureController.createSubject
);

router.put(
  '/subjects/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  validateRequest({ body: updateSubjectSchema }),
  academicStructureController.updateSubject
);

router.delete(
  '/subjects/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  academicStructureController.deleteSubject
);

// ========================================================================
// 3. CLASSES ENDPOINTS
// ========================================================================
router.get(
  '/classes',
  requirePermission('class.read'),
  validateRequest({ query: queryClassSchema }),
  academicStructureController.listClasses
);

router.get(
  '/classes/:id',
  requirePermission('class.read'),
  academicStructureController.getClassById
);

router.get(
  '/classes/:id/students',
  requirePermission('class.read'),
  academicStructureController.getClassStudents
);

router.post(
  '/classes',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  validateRequest({ body: createClassSchema }),
  academicStructureController.createClass
);

router.put(
  '/classes/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  validateRequest({ body: updateClassSchema }),
  academicStructureController.updateClass
);

router.patch(
  '/classes/:id/archive',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  academicStructureController.archiveClass
);

router.delete(
  '/classes/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('class.manage'),
  academicStructureController.deleteClass
);

export default router;
