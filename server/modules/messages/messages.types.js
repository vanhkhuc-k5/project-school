// =============================================================================
// Messages Module — Type Constants
// G27 — Safe Parent/Teacher Messaging
// =============================================================================

/**
 * Valid message sender/receiver roles.
 */
export const MESSAGE_ROLES = Object.freeze({
  PARENT: 'parent',
  TEACHER: 'teacher',
  ADMIN: 'admin',
});

/** Array of all valid roles. */
export const ALL_MESSAGE_ROLES = Object.values(MESSAGE_ROLES);

/**
 * Conversation status values.
 */
export const CONVERSATION_STATUS = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
});

/** Message content limits. */
export const MESSAGE_LIMITS = Object.freeze({
  CONTENT_MAX: 2000,
  SUBJECT_MAX: 255,
});

/**
 * Human-readable labels for roles.
 */
export const ROLE_LABELS = Object.freeze({
  [MESSAGE_ROLES.PARENT]: 'Phụ huynh',
  [MESSAGE_ROLES.TEACHER]: 'Giáo viên',
  [MESSAGE_ROLES.ADMIN]: 'Quản trị',
});
