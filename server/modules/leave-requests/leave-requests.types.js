// =============================================================================
// Leave Requests Types — Domain Constants
// G28 — Student Leave Requests Lifecycle
// =============================================================================

/**
 * Valid leave request statuses.
 */
export const LEAVE_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

/** Array of all valid statuses. */
export const ALL_LEAVE_STATUSES = Object.values(LEAVE_STATUS);

/**
 * Valid reason types.
 */
export const REASON_TYPES = Object.freeze({
  SICKNESS: 'sickness',
  FAMILY_EVENT: 'family_event',
  APPOINTMENT: 'appointment',
  OTHER: 'other',
});

/** Array of all valid reason types. */
export const ALL_REASON_TYPES = Object.values(REASON_TYPES);

/**
 * Valid reviewer roles (who can approve/reject).
 */
export const REVIEWER_ROLES = Object.freeze({
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'school_admin',
  HOMEROOM_TEACHER: 'homeroom_teacher',
  VICE_PRINCIPAL: 'vice_principal',
  PRINCIPAL: 'principal',
});

/**
 * Human-readable labels for status.
 */
export const STATUS_LABELS = Object.freeze({
  [LEAVE_STATUS.DRAFT]: 'Bản nháp',
  [LEAVE_STATUS.PENDING]: 'Đang chờ duyệt',
  [LEAVE_STATUS.APPROVED]: 'Đã duyệt',
  [LEAVE_STATUS.REJECTED]: 'Từ chối',
  [LEAVE_STATUS.CANCELLED]: 'Đã hủy',
});

/**
 * Human-readable labels for reason types.
 */
export const REASON_LABELS = Object.freeze({
  [REASON_TYPES.SICKNESS]: 'Ốm đau',
  [REASON_TYPES.FAMILY_EVENT]: 'Việc gia đình',
  [REASON_TYPES.APPOINTMENT]: 'Hẹn khám bệnh',
  [REASON_TYPES.OTHER]: 'Khác',
});

/**
 * Status display colors for UI.
 */
export const STATUS_COLORS = Object.freeze({
  [LEAVE_STATUS.DRAFT]: '#9CA3AF',
  [LEAVE_STATUS.PENDING]: '#3B82F6',
  [LEAVE_STATUS.APPROVED]: '#10B981',
  [LEAVE_STATUS.REJECTED]: '#EF4444',
  [LEAVE_STATUS.CANCELLED]: '#6B7280',
});

/**
 * Valid status transitions.
 * Maps current status -> allowed next statuses.
 */
export const STATUS_TRANSITIONS = Object.freeze({
  [LEAVE_STATUS.DRAFT]: [LEAVE_STATUS.PENDING, LEAVE_STATUS.CANCELLED],
  [LEAVE_STATUS.PENDING]: [LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED, LEAVE_STATUS.CANCELLED],
  [LEAVE_STATUS.APPROVED]: [],
  [LEAVE_STATUS.REJECTED]: [],
  [LEAVE_STATUS.CANCELLED]: [],
});
