// =============================================================================
// Notification Types — Domain Constants for G26 Notification Center
// =============================================================================

/**
 * Valid notification types.
 * These are the only values allowed in notifications.type.
 * Adding a new type here makes it available everywhere — no copy-pasted SQL.
 */
export const NOTIFICATION_TYPES = Object.freeze({
  ASSIGNMENT_PUBLISHED: 'ASSIGNMENT_PUBLISHED',
  ASSIGNMENT_DUE_SOON: 'ASSIGNMENT_DUE_SOON',
  GRADE_PUBLISHED: 'GRADE_PUBLISHED',
  STUDENT_ABSENT: 'STUDENT_ABSENT',
  ANNOUNCEMENT_PUBLISHED: 'ANNOUNCEMENT_PUBLISHED',
  LEAVE_REQUEST_UPDATED: 'LEAVE_REQUEST_UPDATED',
  TUITION_STATUS_CHANGED: 'TUITION_STATUS_CHANGED',
});

/** Array of all valid types — useful for validation. */
export const ALL_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPES);

/**
 * Human-readable labels for UI display.
 * Maps type → Vietnamese label.
 */
export const NOTIFICATION_LABELS = Object.freeze({
  [NOTIFICATION_TYPES.ASSIGNMENT_PUBLISHED]: 'Bài tập mới',
  [NOTIFICATION_TYPES.ASSIGNMENT_DUE_SOON]: 'Nhắc hạn nộp',
  [NOTIFICATION_TYPES.GRADE_PUBLISHED]: 'Điểm mới',
  [NOTIFICATION_TYPES.STUDENT_ABSENT]: 'Vắng mặt',
  [NOTIFICATION_TYPES.ANNOUNCEMENT_PUBLISHED]: 'Thông báo mới',
  [NOTIFICATION_TYPES.LEAVE_REQUEST_UPDATED]: 'Đơn nghỉ phép',
  [NOTIFICATION_TYPES.TUITION_STATUS_CHANGED]: 'Học phí',
});

/**
 * Icon names for UI rendering (Lucide icon set).
 */
export const NOTIFICATION_ICONS = Object.freeze({
  [NOTIFICATION_TYPES.ASSIGNMENT_PUBLISHED]: 'FileText',
  [NOTIFICATION_TYPES.ASSIGNMENT_DUE_SOON]: 'Clock',
  [NOTIFICATION_TYPES.GRADE_PUBLISHED]: 'Award',
  [NOTIFICATION_TYPES.STUDENT_ABSENT]: 'UserX',
  [NOTIFICATION_TYPES.ANNOUNCEMENT_PUBLISHED]: 'Megaphone',
  [NOTIFICATION_TYPES.LEAVE_REQUEST_UPDATED]: 'ClipboardCheck',
  [NOTIFICATION_TYPES.TUITION_STATUS_CHANGED]: 'Receipt',
});
