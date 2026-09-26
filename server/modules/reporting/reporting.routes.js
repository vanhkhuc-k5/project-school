/**
 * G34 — Reporting Routes
 * REST endpoints for report generation
 * 
 * All reports require authentication and proper permissions.
 * Reports are scoped to the user's school.
 */

import { Router } from 'express';
import { reportingController } from './reporting.controller.js';
import { authenticateToken } from '../../shared/auth/index.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  studentAcademicRecordSchema,
  classGradeReportSchema,
  attendanceReportSchema,
  assignmentReportSchema,
  enrollmentReportSchema,
  tuitionReportSchema,
  dashboardSchema,
} from './reporting.schema.js';

const router = Router();

// All reporting endpoints require authentication
router.use(authenticateToken);

// ========================================================================
// REPORT DASHBOARD
// ========================================================================

/**
 * GET /reports/dashboard
 * Summary dashboard with key metrics
 */
router.get(
  '/dashboard',
  requirePermission(
    PERMISSIONS.GRADE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.CLASS_READ
  ),
  validateRequest({ query: dashboardSchema }),
  reportingController.getDashboard
);

// ========================================================================
// STUDENT ACADEMIC RECORD
// ========================================================================

/**
 * GET /reports/students/:studentId/academic-record
 * Complete academic record for a student
 */
router.get(
  '/students/:studentId/academic-record',
  requirePermission(PERMISSIONS.GRADE_READ),
  validateRequest({ query: studentAcademicRecordSchema }),
  reportingController.getStudentAcademicRecord
);

// ========================================================================
// CLASS GRADE REPORT
// ========================================================================

/**
 * GET /reports/classes/:classId/grades
 * Grade report for a specific class
 */
router.get(
  '/classes/:classId/grades',
  requirePermission(PERMISSIONS.GRADE_READ, PERMISSIONS.CLASS_READ),
  validateRequest({ query: classGradeReportSchema }),
  reportingController.getClassGradeReport
);

// ========================================================================
// ATTENDANCE REPORT
// ========================================================================

/**
 * GET /reports/attendance
 * Attendance report with filters
 */
router.get(
  '/attendance',
  requirePermission(PERMISSIONS.ATTENDANCE_READ),
  validateRequest({ query: attendanceReportSchema }),
  reportingController.getAttendanceReport
);

// ========================================================================
// ASSIGNMENT REPORT
// ========================================================================

/**
 * GET /reports/assignments
 * Assignment summary report
 */
router.get(
  '/assignments',
  requirePermission(PERMISSIONS.ASSIGNMENT_READ),
  validateRequest({ query: assignmentReportSchema }),
  reportingController.getAssignmentReport
);

// ========================================================================
// ENROLLMENT REPORT
// ========================================================================

/**
 * GET /reports/enrollment
 * Enrollment summary report
 */
router.get(
  '/enrollment',
  requirePermission(PERMISSIONS.ENROLLMENT_READ),
  validateRequest({ query: enrollmentReportSchema }),
  reportingController.getEnrollmentReport
);

// ========================================================================
// TUITION REPORT
// ========================================================================

/**
 * GET /reports/tuition
 * Tuition collection report (requires tuition.read permission)
 */
router.get(
  '/tuition',
  requirePermission(PERMISSIONS.TUITION_READ),
  validateRequest({ query: tuitionReportSchema }),
  reportingController.getTuitionReport
);

export const reportingRoutes = router;
