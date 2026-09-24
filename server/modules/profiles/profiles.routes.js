/**
 * Profiles Module Routing
 * Wires HTTP routes with validation schemas and RBAC authorization.
 */

import express from 'express';
import { profilesController } from './profiles.controller.js';
import {
  createTeacherProfileSchema,
  updateTeacherProfileSchema,
  createStudentProfileSchema,
  updateStudentProfileSchema,
  assignGuardianSchema,
  createParentProfileSchema,
  updateParentProfileSchema,
  profileQuerySchema,
} from './profiles.schema.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
} from '../../shared/auth/index.js';

const router = express.Router();

// Enforce authentication across all profile endpoints
router.use(authenticateToken);

// ========================================================================
// 1. TEACHER PROFILES
// ========================================================================
router.get('/teachers/me', profilesController.getMyTeacherProfile);
router.put(
  '/teachers/me',
  validateRequest({ body: updateTeacherProfileSchema }),
  profilesController.updateMyTeacherProfile
);

router.get(
  '/teachers',
  requirePermission('teacher.read'),
  validateRequest({ query: profileQuerySchema }),
  profilesController.listTeachers
);

router.get(
  '/teachers/:id',
  requirePermission('teacher.read'),
  profilesController.getTeacherById
);

router.post(
  '/teachers',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('teacher.manage'),
  validateRequest({ body: createTeacherProfileSchema }),
  profilesController.createTeacherProfile
);

router.put(
  '/teachers/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('teacher.manage'),
  validateRequest({ body: updateTeacherProfileSchema }),
  profilesController.updateTeacherProfile
);

// ========================================================================
// 2. STUDENT PROFILES
// ========================================================================
router.get('/students/me', profilesController.getMyStudentProfile);

router.get(
  '/students',
  requirePermission('student.read'),
  validateRequest({ query: profileQuerySchema }),
  profilesController.listStudents
);

router.get(
  '/students/:id',
  requirePermission('student.read'),
  profilesController.getStudentById
);

router.post(
  '/students',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('user.create'),
  validateRequest({ body: createStudentProfileSchema }),
  profilesController.createStudentProfile
);

router.put(
  '/students/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('student.update'),
  validateRequest({ body: updateStudentProfileSchema }),
  profilesController.updateStudentProfile
);

// Guardian Management
router.get(
  '/students/:id/guardians',
  requirePermission('student.read'),
  profilesController.getStudentGuardians
);

router.post(
  '/students/:id/guardians',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('student.update'),
  validateRequest({ body: assignGuardianSchema }),
  profilesController.assignStudentGuardian
);

router.delete(
  '/students/:id/guardians/:parentId',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('student.update'),
  profilesController.removeStudentGuardian
);

// ========================================================================
// 3. PARENT PROFILES
// ========================================================================
router.get('/parents/me', profilesController.getMyParentProfile);

router.get(
  '/parents',
  requirePermission('user.read'),
  validateRequest({ query: profileQuerySchema }),
  profilesController.listParents
);

router.get(
  '/parents/:id',
  requirePermission('user.read'),
  profilesController.getParentById
);

router.post(
  '/parents',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('user.create'),
  validateRequest({ body: createParentProfileSchema }),
  profilesController.createParentProfile
);

router.put(
  '/parents/:id',
  requireRole('admin', 'school_admin', 'super_admin', 'principal'),
  requirePermission('user.update'),
  validateRequest({ body: updateParentProfileSchema }),
  profilesController.updateParentProfile
);

router.get(
  '/parents/:id/children',
  requirePermission('student.read'),
  profilesController.getParentChildren
);

export default router;
