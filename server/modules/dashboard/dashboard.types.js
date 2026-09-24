// =============================================================================
// Dashboard Types — Domain Constants
// G31 — Admin Dashboard Real Operational Metrics
// =============================================================================

/**
 * Dashboard metric categories.
 */
export const METRIC_CATEGORIES = Object.freeze({
  ENROLLMENT: 'enrollment',
  ACADEMIC: 'academic',
  ATTENDANCE: 'attendance',
  OPERATIONS: 'operations',
  SECURITY: 'security',
});

/**
 * Time period options for date-scoped queries.
 */
export const TIME_PERIODS = Object.freeze({
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  THIS_SEMESTER: 'this_semester',
  THIS_YEAR: 'this_year',
});

/**
 * Get date range for time period.
 */
export function getDateRangeForPeriod(period, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const start = new Date(date);
  const end = new Date(date);

  switch (period) {
    case TIME_PERIODS.TODAY:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case TIME_PERIODS.THIS_WEEK: {
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case TIME_PERIODS.THIS_MONTH:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case TIME_PERIODS.THIS_SEMESTER: {
      // Approximate semester as 6 months
      start.setMonth(start.getMonth() - 4);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case TIME_PERIODS.THIS_YEAR:
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Format date for display.
 */
export function formatDateForDisplay(date) {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Attendance status constants.
 */
export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
});

/**
 * Leave request status constants.
 */
export const LEAVE_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

/**
 * User status constants.
 */
export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOCKED: 'locked',
});
