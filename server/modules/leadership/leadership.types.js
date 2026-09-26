// =============================================================================
// Leadership Types — Domain Constants
// G32 — Principal / Vice Principal Dashboard
// =============================================================================

/**
 * Leadership view types.
 */
export const LEADERSHIP_VIEWS = Object.freeze({
  ENROLLMENT: 'enrollment',
  ATTENDANCE: 'attendance',
  ACADEMIC: 'academic',
  OPERATIONS: 'operations',
  COVERAGE: 'coverage',
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
    case TIME_PERIODS.THIS_SEMESTER:
      start.setMonth(start.getMonth() - 4);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
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
 * Alert severity levels.
 */
export const ALERT_SEVERITY = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
});

/**
 * Alert categories for operational alerts.
 */
export const ALERT_CATEGORIES = Object.freeze({
  ATTENDANCE: 'attendance',
  ACADEMIC: 'academic',
  STAFF: 'staff',
  ENROLLMENT: 'enrollment',
  SYSTEM: 'system',
});

/**
 * Performance thresholds for alerts.
 */
export const THRESHOLDS = Object.freeze({
  ATTENDANCE_LOW: 85,      // Alert if attendance < 85%
  ATTENDANCE_WARNING: 90,  // Warning if attendance < 90%
  GRADE_FAILING: 5.0,      // Alert if average < 5.0
  GRADE_WARNING: 6.5,      // Warning if average < 6.5
  CLASS_SIZE_MIN: 20,      // Warning if class < 20 students
  CLASS_SIZE_MAX: 50,      // Warning if class > 50 students
});

/**
 * Get severity color for UI.
 */
export function getAlertSeverityColor(severity) {
  switch (severity) {
    case ALERT_SEVERITY.CRITICAL:
      return 'red';
    case ALERT_SEVERITY.WARNING:
      return 'amber';
    case ALERT_SEVERITY.INFO:
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * Get severity label in Vietnamese.
 */
export function getAlertSeverityLabel(severity) {
  switch (severity) {
    case ALERT_SEVERITY.CRITICAL:
      return 'Nghiêm trọng';
    case ALERT_SEVERITY.WARNING:
      return 'Cảnh báo';
    case ALERT_SEVERITY.INFO:
      return 'Thông tin';
    default:
      return 'Không xác định';
  }
}
