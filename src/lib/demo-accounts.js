/**
 * Demo Accounts Configuration
 *
 * Controls which demo accounts are displayed on the login page.
 * Credentials are NEVER hardcoded in production builds.
 *
 * Environment strategy:
 *   - Development  (.env): Show dev accounts (local SQLite)
 *   - Staging      (.env.staging): Show staging accounts (Neon PostgreSQL)
 *   - Production    (.env.production): No demo accounts unless explicitly enabled
 */

const NODE_ENV = import.meta.env?.NODE_ENV || 'development';
const DEMO_ENABLED = import.meta.env?.VITE_DEMO_ACCOUNTS_ENABLED;
const DEMO_MODE = import.meta.env?.VITE_DEMO_MODE;

// Only show demo accounts in development/staging unless explicitly enabled
const isDemoEnabled =
  NODE_ENV === 'development' ||
  NODE_ENV === 'staging' ||
  DEMO_ENABLED === 'true' ||
  DEMO_MODE === 'true';

/**
 * Dev accounts — local SQLite database seed data.
 * These accounts only work against the local dev backend.
 */
const DEV_ACCOUNTS = {
  student: { code: 'teststudent1', pass: 'devpassword123', name: 'Em Nguyễn Văn Test (Lớp 10A)' },
  teacher: { code: 'testteacher1', pass: 'devpassword123', name: 'Thầy Đỗ Văn Test (Tổ Toán học)' },
  parent:  { code: 'testparent1',  pass: 'devpassword123', name: 'Ông Nguyễn Văn Phụ Huynh (PH em Test)' },
  admin:   { code: 'testadmin',    pass: 'devpassword123', name: 'Admin Test Dev (Quản trị)' },
  leadership: { code: 'testadmin', pass: 'devpassword123', name: 'Admin Test Dev (Ban Giám Hiệu)' },
};

/**
 * Staging accounts — Neon PostgreSQL staging database.
 * These accounts only work against the staging backend.
 * Password for all staging accounts: Staging@2026
 */
const STAGING_ACCOUNTS = {
  student:    { code: 'stg_student',    pass: 'Staging@2026', name: 'Học sinh Staging' },
  teacher:    { code: 'stg_teacher',    pass: 'Staging@2026', name: 'Giáo viên Staging' },
  parent:     { code: 'stg_parent',     pass: 'Staging@2026', name: 'Phụ huynh Staging' },
  admin:      { code: 'stg_admin',      pass: 'Staging@2026', name: 'Admin Staging (Quản trị)' },
  leadership: { code: 'stg_leadership', pass: 'Staging@2026', name: 'Ban Giám Hiệu Staging' },
};

/**
 * Production accounts — NEVER exposed by default.
 * Only enabled when VITE_DEMO_ACCOUNTS_ENABLED=true in production.
 */
const PRODUCTION_ACCOUNTS = {};

/**
 * Returns the demo accounts for the current environment.
 * Returns null if demo accounts are not enabled.
 */
export function getDemoAccounts() {
  if (!isDemoEnabled) return null;

  switch (NODE_ENV) {
    case 'staging':
      return STAGING_ACCOUNTS;
    case 'production':
      // Production requires explicit opt-in
      return DEMO_ENABLED === 'true' ? STAGING_ACCOUNTS : null;
    case 'development':
    default:
      return DEV_ACCOUNTS;
  }
}

/**
 * Returns the demo label shown on the login page.
 */
export function getDemoLabel() {
  switch (NODE_ENV) {
    case 'staging':
      return 'Tài khoản kiểm thử Staging (Dành cho ban thẩm định)';
    case 'production':
      return 'Tài khoản Demo (Chỉ môi trường thử nghiệm)';
    case 'development':
    default:
      return 'Tài khoản kiểm thử hệ thống (Dành cho ban thẩm định)';
  }
}

/**
 * Returns the placeholder text for the identifier field.
 */
export function getIdentifierPlaceholder(role) {
  const env = NODE_ENV;
  const isDev = env === 'development';
  const isStaging = env === 'staging';

  const devPlaceholder = `VD: test${role}1 hoặc email ${role}`;
  const stagingPlaceholder = `VD: stg_${role} hoặc email ${role}`;

  if (isStaging) return stagingPlaceholder;
  return devPlaceholder;
}
