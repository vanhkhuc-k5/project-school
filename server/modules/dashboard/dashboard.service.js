// =============================================================================
// Dashboard Service — Business Logic Layer
// G31 — Admin Dashboard Real Operational Metrics
// =============================================================================
import * as repo from './dashboard.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { getDateRangeForPeriod, TIME_PERIODS } from './dashboard.types.js';

/**
 * Dashboard Service
 * Orchestrates real-time operational metrics
 */
export const dashboardService = {
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics({ schoolId, academicYearId, period = TIME_PERIODS.TODAY }) {
    if (!schoolId) {
      throw AppError.badRequest('Thiếu schoolId');
    }

    // Fetch all metrics in parallel for efficiency
    const [
      activeStudents,
      activeTeachers,
      activeParents,
      classesCount,
      attendanceToday,
      assignmentsSummary,
      pendingLeaveRequests,
      pendingAnnouncements,
      recentAnnouncements,
      recentAuditLogs,
      lockedAccounts,
      failedLogins,
      enrollmentByGrade,
    ] = await Promise.all([
      repo.dashboardRepo.getActiveStudentsCount(schoolId, academicYearId),
      repo.dashboardRepo.getActiveTeachersCount(schoolId),
      repo.dashboardRepo.getActiveParentsCount(schoolId),
      repo.dashboardRepo.getClassesCount(schoolId, academicYearId),
      repo.dashboardRepo.getAttendanceToday(schoolId),
      repo.dashboardRepo.getAssignmentsSummary(schoolId, academicYearId),
      repo.dashboardRepo.getPendingLeaveRequestsCount(schoolId),
      repo.dashboardRepo.getPendingAnnouncementsCount(schoolId),
      repo.dashboardRepo.getRecentAnnouncements(schoolId, 5),
      repo.dashboardRepo.getRecentAuditLogs(schoolId, 10),
      repo.dashboardRepo.getLockedAccountsCount(schoolId),
      repo.dashboardRepo.getRecentFailedLoginsCount(schoolId),
      repo.dashboardRepo.getEnrollmentByGrade(schoolId),
    ]);

    // Calculate attendance percentages
    const totalAttendance = attendanceToday.total || 1;
    const attendanceRates = {
      present: Math.round((attendanceToday.present / totalAttendance) * 100),
      absent: Math.round((attendanceToday.absent / totalAttendance) * 100),
      late: Math.round((attendanceToday.late / totalAttendance) * 100),
      excused: Math.round((attendanceToday.excused / totalAttendance) * 100),
    };

    // Total pending items
    const totalPendingItems = pendingLeaveRequests + pendingAnnouncements;

    // Security issues count
    const securityIssues = lockedAccounts + failedLogins;

    // Format enrollment by grade
    const gradeBreakdown = enrollmentByGrade.map(row => ({
      grade: row.grade_level,
      students: parseInt(row.student_count || 0, 10),
    }));

    // Format recent audit logs
    const recentActivity = recentAuditLogs.map(log => ({
      id: log.id,
      text: log.action,
      actor: log.actor_name,
      time: log.created_at,
      badge: log.badge,
      badgeType: log.badge_type,
    }));

    return {
      // Quick Stats Cards (top metric cards)
      quickStats: {
        students: {
          total: activeStudents,
          label: 'Học sinh đang học',
          icon: 'users',
        },
        teachers: {
          total: activeTeachers,
          label: 'Giáo viên đang giảng dạy',
          icon: 'briefcase',
        },
        parents: {
          total: activeParents,
          label: 'Phụ huynh hoạt động',
          icon: 'family',
        },
        classes: {
          total: classesCount,
          label: 'Lớp học đang hoạt động',
          icon: 'layers',
        },
      },

      // Attendance Summary
      attendance: {
        date: new Date().toISOString().split('T')[0],
        summary: {
          total: attendanceToday.total,
          present: attendanceToday.present,
          absent: attendanceToday.absent,
          late: attendanceToday.late,
          excused: attendanceToday.excused,
        },
        rates: {
          present: Math.round((attendanceToday.present / (attendanceToday.total || 1)) * 100),
          absent: Math.round((attendanceToday.absent / (attendanceToday.total || 1)) * 100),
          late: Math.round((attendanceToday.late / (attendanceToday.total || 1)) * 100),
          excused: Math.round((attendanceToday.excused / (attendanceToday.total || 1)) * 100),
        },
      },

      // Assignments Status
      assignments: {
        total: assignmentsSummary.total,
        draft: assignmentsSummary.draft,
        published: assignmentsSummary.published,
        closed: assignmentsSummary.closed,
        overdue: assignmentsSummary.overdue,
      },

      // Pending Operations (for backward compatibility with G31 tests)
      pendingOperations: {
        leaveRequests: pendingLeaveRequests,
        pendingAnnouncements: pendingAnnouncements,
        total: pendingLeaveRequests + pendingAnnouncements,
      },

      // Action Center (Tasks needing attention)
      actionCenter: {
        classesWithoutHomeroom: await repo.dashboardRepo.getClassesWithoutHomeroom(schoolId),
        teachersWithoutAssignment: await repo.dashboardRepo.getTeachersWithoutAssignment(schoolId),
        studentsWithoutParent: await repo.dashboardRepo.getStudentsWithoutParent(schoolId),
        excessiveAbsence: await repo.dashboardRepo.getStudentsWithExcessiveAbsence(schoolId),
      },

      // Alerts (priority-organized)
      alerts: await repo.dashboardRepo.getSystemAlerts(schoolId),

      // Data Quality Summary
      dataQuality: await repo.dashboardRepo.getDataQualitySummary(schoolId),

      // Recent Announcements
      recentAnnouncements: recentAnnouncements.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content?.substring(0, 100) + (a.content?.length > 100 ? '...' : ''),
        priority: a.priority,
        scope: a.scope,
        author: a.author_name,
        publishedAt: a.published_at,
      })),

      // Recent Activity (Audit Logs)
      recentActivity,

      // Security Overview
      security: {
        lockedAccounts,
        failedLogins,
        totalIssues: lockedAccounts + failedLogins,
      },

      // Grade Breakdown
      gradeBreakdown,

      // Metadata
      meta: {
        schoolId,
        academicYearId,
        period,
        generatedAt: new Date().toISOString(),
      },
    };
  },

  /**
   * Get attendance trends for a period
   */
  async getAttendanceTrends({ schoolId, period = TIME_PERIODS.THIS_WEEK }) {
    if (!schoolId) {
      throw AppError.badRequest('Thiếu schoolId');
    }

    const { start, end } = getDateRangeForPeriod(period);
    const trends = await repo.dashboardRepo.getAttendanceTrends(schoolId, start, end);

    return {
      period,
      startDate: start,
      endDate: end,
      data: trends.map(row => ({
        date: row.date,
        total: parseInt(row.total || 0, 10),
        present: parseInt(row.present || 0, 10),
        absent: parseInt(row.absent || 0, 10),
        late: parseInt(row.late || 0, 10),
        presentRate: row.total > 0 
          ? Math.round((parseInt(row.present || 0, 10) / parseInt(row.total, 10)) * 100) 
          : 0,
      })),
    };
  },
};
