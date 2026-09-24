// =============================================================================
// Leadership Service — Business Logic Layer
// G32 — Principal / Vice Principal Dashboard
// =============================================================================
import * as repo from './leadership.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { 
  getDateRangeForPeriod, 
  TIME_PERIODS, 
  THRESHOLDS,
  ALERT_SEVERITY,
  ALERT_CATEGORIES 
} from './leadership.types.js';

/**
 * Leadership Service
 * Business logic for school leadership views
 */
export const leadershipService = {
  /**
   * Get comprehensive leadership dashboard
   */
  async getLeadershipDashboard({ schoolId, academicYearId, semesterId, period = TIME_PERIODS.THIS_MONTH }) {
    if (!schoolId) {
      throw AppError.badRequest('Thiếu schoolId');
    }

    const { start, end } = getDateRangeForPeriod(period);

    // Fetch all metrics in parallel
    const [
      enrollmentByGrade,
      attendanceSummary,
      attendanceByGrade,
      gradesBySubject,
      gradeDistribution,
      classPerformance,
      lowAttendanceClasses,
      atRiskStudents,
      pendingLeaveRequests,
      pendingAnnouncements,
      subjectCoverage,
    ] = await Promise.all([
      repo.leadershipRepo.getEnrollmentByGrade(schoolId, academicYearId),
      repo.leadershipRepo.getAttendanceSummary(schoolId, start, end),
      repo.leadershipRepo.getAttendanceByGrade(schoolId, start, end),
      repo.leadershipRepo.getGradesBySubject(schoolId, academicYearId, semesterId),
      repo.leadershipRepo.getGradeDistribution(schoolId, academicYearId),
      repo.leadershipRepo.getClassPerformance(schoolId, academicYearId),
      repo.leadershipRepo.getLowAttendanceClasses(schoolId, THRESHOLDS.ATTENDANCE_LOW),
      repo.leadershipRepo.getAtRiskStudents(schoolId, THRESHOLDS.GRADE_FAILING),
      repo.leadershipRepo.getPendingLeaveRequests(schoolId, 10),
      repo.leadershipRepo.getPendingAnnouncements(schoolId, 10),
      repo.leadershipRepo.getSubjectCoverage(schoolId),
    ]);

    // Generate operational alerts
    const alerts = this._generateAlerts({
      attendanceSummary,
      attendanceByGrade,
      lowAttendanceClasses,
      atRiskStudents,
      pendingLeaveRequests,
      pendingAnnouncements,
    });

    // Calculate totals
    const totalEnrollment = enrollmentByGrade.reduce(
      (sum, g) => sum + parseInt(g.active_students || 0, 10), 0
    );
    const totalClasses = enrollmentByGrade.reduce(
      (sum, g) => sum + parseInt(g.class_count || 0, 10), 0
    );

    return {
      // Summary overview
      overview: {
        totalEnrollment,
        totalClasses,
        attendanceRate: parseFloat(attendanceSummary.present_rate || 0),
        period,
        dateRange: { start, end },
      },

      // Enrollment
      enrollment: {
        byGrade: enrollmentByGrade.map(g => ({
          grade: g.grade_level,
          activeStudents: parseInt(g.active_students || 0, 10),
          pendingStudents: parseInt(g.pending_students || 0, 10),
          classCount: parseInt(g.class_count || 0, 10),
        })),
      },

      // Attendance
      attendance: {
        summary: {
          totalRecords: parseInt(attendanceSummary.total_records || 0, 10),
          present: parseInt(attendanceSummary.present || 0, 10),
          absent: parseInt(attendanceSummary.absent || 0, 10),
          late: parseInt(attendanceSummary.late || 0, 10),
          excused: parseInt(attendanceSummary.excused || 0, 10),
          presentRate: parseFloat(attendanceSummary.present_rate || 0),
        },
        byGrade: attendanceByGrade.map(g => ({
          grade: g.grade_level,
          total: parseInt(g.total || 0, 10),
          present: parseInt(g.present || 0, 10),
          presentRate: parseFloat(g.present_rate || 0),
        })),
      },

      // Academic Performance
      academic: {
        bySubject: gradesBySubject.map(s => ({
          subject: s.subject,
          subjectId: s.subject_id,
          avgScore: parseFloat(s.avg_score || 0).toFixed(2),
          studentCount: parseInt(s.student_count || 0, 10),
        })),
        distribution: gradeDistribution.map(d => ({
          grade: d.grade,
          count: parseInt(d.count || 0, 10),
        })),
      },

      // Class Performance (aggregate view - no student names)
      classPerformance: classPerformance.map(c => ({
        classId: c.class_id,
        className: c.class_name,
        gradeLevel: c.grade_level,
        avgScore: c.avg_score ? parseFloat(c.avg_score).toFixed(2) : null,
        studentCount: parseInt(c.student_count || 0, 10),
        minScore: c.min_score ? parseFloat(c.min_score).toFixed(2) : null,
        maxScore: c.max_score ? parseFloat(c.max_score).toFixed(2) : null,
      })),

      // Operational Alerts
      alerts: alerts,

      // Pending Approvals
      pendingApprovals: {
        leaveRequests: pendingLeaveRequests.map(lr => ({
          id: lr.id,
          studentId: lr.student_id,
          studentName: lr.student_name, // Authorized: leadership can see student names
          className: lr.class_name,
          startDate: lr.start_date,
          endDate: lr.end_date,
          reason: lr.reason?.substring(0, 50) + (lr.reason?.length > 50 ? '...' : ''),
          createdAt: lr.created_at,
        })),
        announcements: pendingAnnouncements.map(a => ({
          id: a.id,
          title: a.title,
          priority: a.priority,
          scope: a.scope,
          authorName: a.author_name,
          createdAt: a.created_at,
        })),
        total: pendingLeaveRequests.length + pendingAnnouncements.length,
      },

      // Staff Coverage
      staffCoverage: {
        subjects: subjectCoverage.map(s => ({
          department: s.department || 'Chung',
          subject: s.subject,
          teacherCount: parseInt(s.teacher_count || 0, 10),
          classCount: parseInt(s.class_count || 0, 10),
        })),
      },

      // Metadata
      meta: {
        schoolId,
        academicYearId,
        semesterId,
        period,
        generatedAt: new Date().toISOString(),
      },
    };
  },

  /**
   * Generate operational alerts based on metrics
   */
  _generateAlerts({
    attendanceSummary,
    attendanceByGrade,
    lowAttendanceClasses,
    atRiskStudents,
    pendingLeaveRequests,
    pendingAnnouncements,
  }) {
    const alerts = [];

    // Check overall attendance rate
    const overallRate = parseFloat(attendanceSummary.present_rate || 0);
    if (overallRate < THRESHOLDS.ATTENDANCE_LOW) {
      alerts.push({
        id: 'alert-attendance-critical',
        category: ALERT_CATEGORIES.ATTENDANCE,
        severity: ALERT_SEVERITY.CRITICAL,
        title: 'Tỷ lệ điểm danh thấp',
        message: `Tỷ lệ điểm danh toàn trường: ${overallRate}% (dưới ngưỡng ${THRESHOLDS.ATTENDANCE_LOW}%)`,
      });
    } else if (overallRate < THRESHOLDS.ATTENDANCE_WARNING) {
      alerts.push({
        id: 'alert-attendance-warning',
        category: ALERT_CATEGORIES.ATTENDANCE,
        severity: ALERT_SEVERITY.WARNING,
        title: 'Tỷ lệ điểm danh cần cải thiện',
        message: `Tỷ lệ điểm danh toàn trường: ${overallRate}% (dưới ngưỡng ${THRESHOLDS.ATTENDANCE_WARNING}%)`,
      });
    }

    // Check low attendance by grade
    attendanceByGrade.forEach(g => {
      const rate = parseFloat(g.present_rate || 0);
      if (rate < THRESHOLDS.ATTENDANCE_LOW) {
        alerts.push({
          id: `alert-grade-${g.grade_level}`,
          category: ALERT_CATEGORIES.ATTENDANCE,
          severity: ALERT_SEVERITY.WARNING,
          title: `Khối ${g.grade_level} có tỷ lệ điểm danh thấp`,
          message: `Tỷ lệ: ${rate}%`,
        });
      }
    });

    // Low attendance classes
    if (lowAttendanceClasses.length > 0) {
      alerts.push({
        id: 'alert-low-attendance-classes',
        category: ALERT_CATEGORIES.ATTENDANCE,
        severity: ALERT_SEVERITY.WARNING,
        title: `${lowAttendanceClasses.length} lớp có tỷ lệ điểm danh dưới ${THRESHOLDS.ATTENDANCE_LOW}%`,
        message: lowAttendanceClasses
          .slice(0, 3)
          .map(c => `${c.class_name}: ${c.present_rate}%`)
          .join(', '),
      });
    }

    // At-risk students
    if (atRiskStudents.length > 0) {
      alerts.push({
        id: 'alert-at-risk-students',
        category: ALERT_CATEGORIES.ACADEMIC,
        severity: ALERT_SEVERITY.WARNING,
        title: `${atRiskStudents.length} học sinh có nguy cơ thấp bài`,
        message: 'Điểm trung bình dưới ngưỡng chấp nhận',
      });
    }

    // Pending approvals
    if (pendingLeaveRequests.length > 0) {
      alerts.push({
        id: 'alert-pending-leaves',
        category: ALERT_CATEGORIES.OPERATIONS,
        severity: ALERT_SEVERITY.INFO,
        title: `${pendingLeaveRequests.length} đơn xin nghỉ chờ duyệt`,
        message: 'Có đơn nghỉ phép cần được xử lý',
      });
    }

    if (pendingAnnouncements.length > 0) {
      alerts.push({
        id: 'alert-pending-announcements',
        category: ALERT_CATEGORIES.OPERATIONS,
        severity: ALERT_SEVERITY.INFO,
        title: `${pendingAnnouncements.length} thông báo chờ xuất bản`,
        message: 'Có thông báo ở trạng thái nháp cần xử lý',
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  },

  /**
   * Get detailed class view (requires explicit permission)
   */
  async getClassDetail({ schoolId, classId }) {
    if (!schoolId) {
      throw AppError.badRequest('Thiếu schoolId');
    }
    if (!classId) {
      throw AppError.badRequest('Thiếu classId');
    }

    // This would return more detailed class info
    // including student-level data if explicitly authorized
    const performance = await repo.leadershipRepo.getClassPerformance(schoolId);
    const classData = performance.find(c => c.class_id === classId);

    if (!classData) {
      throw AppError.notFound('Không tìm thấy lớp học');
    }

    return {
      classId: classData.class_id,
      className: classData.class_name,
      gradeLevel: classData.grade_level,
      avgScore: classData.avg_score ? parseFloat(classData.avg_score).toFixed(2) : null,
      // Note: Student-level details would require additional permission checks
      // and are not included in this aggregate view
    };
  },
};
