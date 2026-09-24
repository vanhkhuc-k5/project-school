/**
 * Centralized Database Connection Hub
 * Authoritative connection manager for PostgreSQL (Neon Cloud)
 * and strictly guarded offline fallback.
 */

import pg from 'pg';
import { config } from '../../config/env.js';
import { db } from '../../db.js';

const { Pool } = pg;

// ============================================================
// CRITICAL: Database Safety Guardrails
// ============================================================

/**
 * Production database URL patterns that should NEVER be used in test environments.
 * These patterns indicate Neon Cloud production databases.
 */
const DANGEROUS_PRODUCTION_PATTERNS = [
  'neon.tech',      // Neon Cloud production
  'neondb',         // Neon database name
  'ep-',            // Neon endpoint prefix
  'aws.neon',       // Neon AWS hosting
];

/**
 * Validates that the current database URL is safe for the current environment.
 * This prevents catastrophic mistakes like running tests against production.
 */
function validateDatabaseSafety() {
  const isTestEnvironment = config.NODE_ENV === 'test';
  const isProductionEnvironment = config.NODE_ENV === 'production';

  // In test environment, we always use SQLite in-memory (DB_PATH=:memory:) — PostgreSQL is never used
  if (isTestEnvironment) {
    console.log('🧪 [DB GUARD] Test environment — using isolated in-memory SQLite (PostgreSQL skipped)');
    return true;
  }

  // Warn if using production patterns in non-production
  if (!isProductionEnvironment && !isTestEnvironment && config.DATABASE_URL) {
    const isDangerousUrl = DANGEROUS_PRODUCTION_PATTERNS.some(
      pattern => config.DATABASE_URL.includes(pattern)
    );

    if (isDangerousUrl) {
      console.warn('⚠️ [DB GUARD] WARNING: Using production database pattern in non-production environment.');
      console.warn('⚠️ [DB GUARD] This is acceptable for local development but ensure this is intentional.');
    }
  }

  return true;
}

// Validate database safety on module load
validateDatabaseSafety();

// ============================================================
// Connection Pool Setup
// ============================================================

export const isPostgresConfigured = () => {
  // Never use PostgreSQL in test mode — use the isolated in-memory SQLite
  if (config.NODE_ENV === 'test') return false;
  return Boolean(config.DATABASE_URL && config.DATABASE_URL.startsWith('postgres'));
};

export const pool = isPostgresConfigured()
  ? new Pool({
      connectionString: config.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: config.NODE_ENV === 'test' ? 5 : 10,  // Smaller pool for tests
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('⚠️ [POSTGRES POOL] Unexpected error on idle client:', err.message);
  });
}

/**
 * Execute a parameterized query against PostgreSQL
 * @param {string} text
 * @param {any[]} [params=[]]
 */
export async function query(text, params = []) {
  if (!pool) {
    if (config.NODE_ENV === 'production') {
      throw new Error('[CRITICAL] PostgreSQL pool unavailable in production environment.');
    }
    throw new Error('PostgreSQL Pool is not configured. Run with valid DATABASE_URL.');
  }
  return pool.query(text, params);
}

/**
 * Verifies database health and connectivity.
 * Fails early if in production and database is unreachable.
 */
export async function verifyDatabaseHealth() {
  if (!isPostgresConfigured() || !pool) {
    if (config.NODE_ENV === 'production') {
      throw new Error('[FATAL] DATABASE_URL is required in production environment.');
    }
    console.warn('⚠️ [DATABASE HEALTH] Running in offline mode without PostgreSQL.');
    return false;
  }

  try {
    const res = await pool.query('SELECT 1 as connected, NOW() as current_time');
    return res.rows.length === 1 && Number(res.rows[0].connected) === 1;
  } catch (err) {
    console.error('❌ [DATABASE HEALTH] Failed to connect to PostgreSQL:', err.message);
    if (config.NODE_ENV === 'production') {
      throw new Error(`[FATAL] Production database connection failed: ${err.message}`, { cause: err });
    }
    return false;
  }
}

export { db };
export const pgQuery = query;
