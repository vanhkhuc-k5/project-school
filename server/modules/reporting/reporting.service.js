/**
 * G34 — Reporting Service
 * Business logic for report generation
 * 
 * Transforms repository data into stable DTOs
 */

import { reportingRepository } from './reporting.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { createReportMeta } from './reporting.types.js';

export const reportingService = {
  // =========================================================================
  // STUDENT ACADEMIC RECORD
  // =========================================================================

  /**
   * Get complete academic record for a student
   * Includes grades by subject, attendance summary, and individual entries
   */
  async getStudentAcademicRecord(user, query) {
    const { studentId, schoolId, academicYearId, semesterId, page, limit } = query;

    // Authorization: Student can only view own record
    // Parent can view child's record (requires relationship check)
    // Admin/Teacher/DepartmentHead can view any student in their scope
    if (!schoolId) {
      throw new AppError('Thiếu thông tin trường học', 400, 'MISSING_SCHOOL');
    }

    const record = await reportingRepository.getStudentAcademicRecord(
      schoolId,
      studentId,
      { academicYearId, semesterId, page, limit }
    );

    if (!record) {
      throw new AppError('Không tìm thấy học sinh', 404, 'STUDENT_NOT_FOUND');
    }

    return {
      ...record,
      meta: createReportMeta({ schoolId, academicYearId, semesterId }),
    };
  },

  // =========================================================================
  // CLASS GRADE REPORT
  // =========================================================================

  /**
   * Get grade report for a class
   * Includes student rankings and subject averages
   */
  async getClassGradeReport(user, query) {
    const { classId, schoolId, academicYearId, semesterId, page, limit } = query;

    if (!schoolId) {
      throw new AppError('Thiếu thông tin trường học', 400, 'MISSING_SCHOOL');
    }
    if (!classId) {
      throw new AppError('Thiếu mã lớp học', 400, 'MISSING_CLASS');
    }

    const report = await reportingRepository.getClassGradeReport(
      schoolId,
      classId,
      { academicYearId, semesterId, page, limit }
    );

    if (!report) {
      throw new AppError('Không tìm thấy lớp học', 404, 'CLASS_NOT_FOUND');
    }

    return {
      ...report,
      meta: createReportMeta({ schoolId, academicYearId, semesterId }),
    };
  },

  // =========================================================================
  // ATTENDANCE REPORT
  // =========================================================================

  /**
   * Get attendance report - by class, student, or school-wide
   */
  async getAttendanceReport(user, query) {
    const { schoolId, classId, studentId, gradeLevel, startDate, endDate, page, limit } = query;

    if (!schoolId) {
      throw new AppError('Thiếu thông tin trường học', 400, 'MISSING_SCHOOL');
    }

    const report = await reportingRepository.getAttendanceReport(schoolId, {
      classId,
      studentId,
      gradeLevel,
      startDate,
      endDate,
      page,
      limit,
    });

    return {
      ...report,
      meta: createReportMeta({ schoolId }),
    };
  },

  // =========================================================================
  // ASSIGNMENT REPORT
  // =========================================================================

  /**
   * Get assignment report - for teachers or department heads
   */
  async getAssignmentReport(user, query) {
    const { schoolId, classId, subjectId, teacherId, status, startDate, endDate, page, limit } = query;

    if (!schoolId) {
      throw new AppError('Thiếu thông tin trường học', 400, 'MISSING_SCHOOL');
    }

    // Teachers can only see their own assignments unless department head
    // This is enforced at the route level with proper permission checks

    const report = await reportingRepository.getAssignmentReport(schoolId, {
      classId,
      subjectId,
      teacherId,
      status,
      startDate,
      endDate,
      page,
      limit,
    });

    return {
      ...report,
      meta: createReportMeta({ schoolId }),
    };
  },

  // =========================================================================
  // ENROLLMENT REPORT
  // =========================================================================

  /**
   * Get enrollment report - summary by academic year
   */
  async getEnrollmentReport(user, query) {
    const { schoolId, academicYearId, gradeLevel } = query;

    if (!schoolId) {
      throw new AppError('Thiếu thông tin trường học', 400, 'MISSING_SCHOOL');
    }

    const report = await reportingRepository.getEnrollmentReport(schoolId, {
      academicYearId,
      gradeLevel,
    });

    if (!report) {
      throw new AppError('Không có dữ liệu tuyển sinh', 404, 'NO_ENROLLMENT_DATA');
    }

    return {
      ...report,
      meta: createReportMeta({ schoolId, academicYearId }),
    };
  },

  // =========================================================================
  // TUITION REPORT
  // =========================================================================

  /**
   * Get tuition report - summary by class
   * Only available if tuition module is enabled
   */
  async getTuitionReport(user, query) {
    const { schoolId, academicYearId, classId } = query;

    if (!schoolId) {
      throw new AppError('Thiếu thông tin trường học', 400, 'MISSING_SCHOOL');
    }

    // Check if tuition module is available
    const hasTuitionPermission = user?.permissions?.includes('tuition.read') || 
                                  user?.role === 'admin' || 
                                  user?.role === 'school_admin' ||
                                  user?.role === 'super_admin';

    if (!hasTuitionPermission) {
      throw new AppError('Bạn không có quyền xem báo cáo học phí', 403, 'FORBIDDEN');
    }

    const report = await reportingRepository.getTuitionReport(schoolId, {
      academicYearId,
      classId,
    });

    return {
      ...report,
      meta: createReportMeta({ schoolId, academicYearId }),
    };
  },

  // =========================================================================
  // SUMMARY DASHBOARD
  // =========================================================================

  /**
   * Get a summary dashboard with key metrics
   */
  async getReportingDashboard(user, query) {
    const { schoolId, academicYearId, semesterId } = query;

    if (!schoolId) {
      throw new AppError('Thiếu thông tin trường học', 400, 'MISSING_SCHOOL');
    }

    // Fetch key metrics in parallel for performance
    const [
      enrollmentReport,
      attendanceReport,
    ] = await Promise.all([
      reportingRepository.getEnrollmentReport(schoolId, { academicYearId }),
      reportingRepository.getAttendanceReport(schoolId, {}),
    ]);

    return {
      enrollment: enrollmentReport?.totals || { totalStudents: 0, totalClasses: 0 },
      attendance: attendanceReport?.summary?.[0] || { attendanceRate: 0 },
      meta: createReportMeta({ schoolId, academicYearId, semesterId }),
    };
  },
};
