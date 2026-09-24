/**
 * Schools Module Routes
 */

import express from 'express';
import { schoolsController } from './schools.controller.js';
import { updateSchoolProfileSchema } from './schools.schema.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
  requireAnyPermission,
} from '../../shared/auth/index.js';

const router = express.Router();

router.use(authenticateToken);

// 1. Get school profile (any authenticated school staff/admin)
router.get(
  '/profile',
  requireAnyPermission('school.manage', 'class.read', 'user.read', 'student.read', 'teacher.read'),
  schoolsController.getProfile
);

// 2. Update school profile (restricted to admin & principal with school.manage)
router.put(
  '/profile',
  requireRole('admin', 'school_admin', 'super_admin', 'principal', 'vice_principal'),
  requirePermission('school.manage'),
  validateRequest({ body: updateSchoolProfileSchema }),
  schoolsController.updateProfile
);

export default router;
