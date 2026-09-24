import { Router } from 'express';
import {
  authenticateToken,
  enforceTenantScoping,
  requirePermission,
  PERMISSIONS,
} from '../../shared/auth/index.js';
import { timetableController } from './timetable.controller.js';

const router = Router();

// All timetable endpoints require valid authentication and tenant context
router.use(authenticateToken);
router.use(enforceTenantScoping);

// Student Schedule
router.get(
  ['/student', '/slots/student'],
  requirePermission(PERMISSIONS.TIMETABLE_READ),
  timetableController.getStudentTimetable
);

// Teacher Schedule
router.get(
  ['/teacher', '/slots/teacher'],
  requirePermission(PERMISSIONS.TIMETABLE_READ),
  timetableController.getTeacherTimetable
);

// Parent Child Schedule
router.get(
  ['/parent/child/:studentId', '/parent/:studentId'],
  requirePermission(PERMISSIONS.TIMETABLE_READ),
  timetableController.getParentChildTimetable
);

// General Query Slots
router.get(
  ['/', '/slots'],
  requirePermission(PERMISSIONS.TIMETABLE_READ),
  timetableController.getSlots
);

// Get Slot By ID
router.get(
  ['/:id', '/slots/:id'],
  requirePermission(PERMISSIONS.TIMETABLE_READ),
  timetableController.getSlotById
);

// Create Slot (Admin / BGH / Dept Head)
router.post(
  ['/', '/slots'],
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  timetableController.createSlot
);

// Update Slot (PATCH & PUT)
router.patch(
  ['/:id', '/slots/:id'],
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  timetableController.updateSlot
);
router.put(
  ['/:id', '/slots/:id'],
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  timetableController.updateSlot
);

// Delete Slot
router.delete(
  ['/:id', '/slots/:id'],
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  timetableController.deleteSlot
);

export default router;
