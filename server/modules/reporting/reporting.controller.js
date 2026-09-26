/**
 * G34 — Reporting Controller
 * HTTP request handlers for report endpoints
 */

import { reportingService } from './reporting.service.js';
import {
  studentAcademicRecordSchema,
  classGradeReportSchema,
  attendanceReportSchema,
  assignmentReportSchema,
  enrollmentReportSchema,
  tuitionReportSchema,
  dashboardSchema,
} from './reporting.schema.js';

export const reportingController = {
  // =========================================================================
  // STUDENT ACADEMIC RECORD
  // =========================================================================

  /**
   * GET /reports/students/:studentId/academic-record
   * Get complete academic record for a student
   */
  async getStudentAcademicRecord(req, res, next) {
    try {
      const { studentId } = req.params;
      const query = studentAcademicRecordSchema.parse({
        ...req.query,
        studentId,
      });

      const report = await reportingService.getStudentAcademicRecord(req.user, {
        ...query,
        schoolId: req.schoolId,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // CLASS GRADE REPORT
  // =========================================================================

  /**
   * GET /reports/classes/:classId/grades
   * Get grade report for a class
   */
  async getClassGradeReport(req, res, next) {
    try {
      const { classId } = req.params;
      const query = classGradeReportSchema.parse(req.query);

      const report = await reportingService.getClassGradeReport(req.user, {
        ...query,
        classId,
        schoolId: req.schoolId,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // ATTENDANCE REPORT
  // =========================================================================

  /**
   * GET /reports/attendance
   * Get attendance report with filters
   */
  async getAttendanceReport(req, res, next) {
    try {
      const query = attendanceReportSchema.parse(req.query);

      const report = await reportingService.getAttendanceReport(req.user, {
        ...query,
        schoolId: req.schoolId,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // ASSIGNMENT REPORT
  // =========================================================================

  /**
   * GET /reports/assignments
   * Get assignment summary report
   */
  async getAssignmentReport(req, res, next) {
    try {
      const query = assignmentReportSchema.parse(req.query);

      const report = await reportingService.getAssignmentReport(req.user, {
        ...query,
        schoolId: req.schoolId,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // ENROLLMENT REPORT
  // =========================================================================

  /**
   * GET /reports/enrollment
   * Get enrollment summary report
   */
  async getEnrollmentReport(req, res, next) {
    try {
      const query = enrollmentReportSchema.parse(req.query);

      const report = await reportingService.getEnrollmentReport(req.user, {
        ...query,
        schoolId: req.schoolId,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // TUITION REPORT
  // =========================================================================

  /**
   * GET /reports/tuition
   * Get tuition summary report
   */
  async getTuitionReport(req, res, next) {
    try {
      const query = tuitionReportSchema.parse(req.query);

      const report = await reportingService.getTuitionReport(req.user, {
        ...query,
        schoolId: req.schoolId,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // DASHBOARD SUMMARY
  // =========================================================================

  /**
   * GET /reports/dashboard
   * Get summary dashboard with key metrics
   */
  async getDashboard(req, res, next) {
    try {
      const query = dashboardSchema.parse(req.query);

      const report = await reportingService.getReportingDashboard(req.user, {
        ...query,
        schoolId: req.schoolId,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },
};
