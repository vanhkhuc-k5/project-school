import { Router } from 'express';
import {
  authenticateToken,
  enforceTenantScoping,
  requirePermission,
  PERMISSIONS,
} from '../../shared/auth/index.js';
import { attendanceController } from './attendance.controller.js';

const router = Router();

// All attendance endpoints require authentication and tenant context
router.use(authenticateToken);
router.use(enforceTenantScoping);

// Student personal attendance
router.get(
  ['/student', '/my-history'],
  requirePermission(PERMISSIONS.ATTENDANCE_READ),
  attendanceController.getStudentAttendance
);

// Parent child attendance
router.get(
  ['/parent/child/:id', '/parent/:id'],
  requirePermission(PERMISSIONS.ATTENDANCE_READ),
  attendanceController.getParentChildAttendance
);

// Class roster with existing records pre-filled (for teacher UI)
router.get(
  '/roster',
  requirePermission(PERMISSIONS.ATTENDANCE_READ),
  attendanceController.getRoster
);

// Session query (by class & date)
router.get(
  ['/sessions', '/session'],
  requirePermission(PERMISSIONS.ATTENDANCE_READ),
  attendanceController.getSession
);

// Take / save attendance session atomically
router.post(
  ['/sessions', '/take'],
  requirePermission(PERMISSIONS.ATTENDANCE_TAKE),
  attendanceController.takeAttendance
);

// Correct single record
router.patch(
  '/records/:id',
  requirePermission(PERMISSIONS.ATTENDANCE_CORRECT),
  attendanceController.correctRecord
);

// Aggregate attendance reporting (Admin / BGH / Dept Head)
router.get(
  ['/report', '/stats'],
  requirePermission(PERMISSIONS.ATTENDANCE_REPORT),
  attendanceController.getReport
);

export default router;
