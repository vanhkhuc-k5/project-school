/**
 * Academic Years & Semesters Module Routes
 */

import express from 'express';
import { academicYearsController } from './academic-years.controller.js';
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  createSemesterSchema,
  updateSemesterSchema,
} from './academic-years.schema.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
} from '../../shared/auth/index.js';

const router = express.Router();

router.use(authenticateToken);

// 1. Read operations (available to authenticated school members)
router.get('/current', academicYearsController.getCurrentCycle);
router.get('/', academicYearsController.listAcademicYears);
router.get('/:id', academicYearsController.getAcademicYearById);

// 2. Administrative mutations (strictly enforced server-side RBAC)
const requireAdminRole = requireRole('admin', 'school_admin', 'super_admin', 'principal', 'vice_principal');
const requireSchoolManage = requirePermission('school.manage');

// Create academic year
router.post(
  '/',
  requireAdminRole,
  requireSchoolManage,
  validateRequest({ body: createAcademicYearSchema }),
  academicYearsController.createAcademicYear
);

// Update academic year
router.put(
  '/:id',
  requireAdminRole,
  requireSchoolManage,
  validateRequest({ body: updateAcademicYearSchema }),
  academicYearsController.updateAcademicYear
);

// Set as current academic year
router.patch(
  '/:id/set-current',
  requireAdminRole,
  requireSchoolManage,
  academicYearsController.setCurrentAcademicYear
);

// Delete academic year
router.delete(
  '/:id',
  requireAdminRole,
  requireSchoolManage,
  academicYearsController.deleteAcademicYear
);

// 3. Semesters
// Create semester
router.post(
  '/:yearId/semesters',
  requireAdminRole,
  requireSchoolManage,
  validateRequest({ body: createSemesterSchema }),
  academicYearsController.createSemester
);

// Update semester
router.put(
  '/:yearId/semesters/:id',
  requireAdminRole,
  requireSchoolManage,
  validateRequest({ body: updateSemesterSchema }),
  academicYearsController.updateSemester
);

// Set as current semester
router.patch(
  '/:yearId/semesters/:id/set-current',
  requireAdminRole,
  requireSchoolManage,
  academicYearsController.setCurrentSemester
);

// Delete semester
router.delete(
  '/:yearId/semesters/:id',
  requireAdminRole,
  requireSchoolManage,
  academicYearsController.deleteSemester
);

export default router;
