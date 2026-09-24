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
      classesCount,
      attendanceToday,
      pendingLeaveRequests,
      pendingAnnouncements,
      recentAnnouncements,
      lockedAccounts,
      failedLogins,
      enrollmentByGrade,
    ] = await Promise.all([
      repo.dashboardRepo.getActiveStudentsCount(schoolId, academicYearId),
      repo.dashboardRepo.getActiveTeachersCount(schoolId),
      repo.dashboardRepo.getClassesCount(schoolId, academicYearId),
      repo.dashboardRepo.getAttendanceToday(schoolId),
      repo.dashboardRepo.getPendingLeaveRequestsCount(schoolId),
      repo.dashboardRepo.getPendingAnnouncementsCount(schoolId),
      repo.dashboardRepo.getRecentAnnouncements(schoolId, 5),
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

    return {
      // Quick Stats Cards
      quickStats: {
        students: {
          total: activeStudents,
          label: 'Học sinh đang học',
        },
        teachers: {
          total: activeTeachers,
          label: 'Giáo viên đang giảng dạy',
        },
        classes: {
          total: classesCount,
          label: 'Lớp học đang hoạt động',
        },
      },

      // Attendance Today
      attendance: {
        date: new Date().toISOString().split('T')[0],
        summary: {
          total: attendanceToday.total,
          present: attendanceToday.present,
          absent: attendanceToday.absent,
          late: attendanceToday.late,
          excused: attendanceToday.excused,
        },
        rates: attendanceRates,
      },

      // Pending Operations
      pendingOperations: {
        leaveRequests: pendingLeaveRequests,
        pendingAnnouncements: pendingAnnouncements,
        total: totalPendingItems,
      },

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

      // Security Overview
      security: {
        lockedAccounts,
        failedLogins,
        totalIssues: securityIssues,
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
