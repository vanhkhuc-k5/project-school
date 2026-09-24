/**
 * Deterministic PostgreSQL Migration Engine
 * Reads, verifies, and applies versioned SQL migrations inside atomic transactions.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool, isPostgresConfigured } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

/**
 * Computes SHA-256 hash of a file's content
 * @param {string} content
 * @returns {string}
 */
function computeChecksum(content) {
  return crypto.createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * Ensures schema_migrations tracking table exists in PostgreSQL.
 * @param {import('pg').PoolClient} client
 */
async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Retrieve all currently applied migrations from the database.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<Array<{ version: string, name: string, checksum: string, applied_at: string }>>}
 */
async function getAppliedMigrations(client) {
  const res = await client.query('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC');
  return res.rows;
}

/**
 * Runs all pending migrations.
 * @returns {Promise<{ applied: string[], total: number }>}
 */
export async function runMigrations() {
  if (!isPostgresConfigured() || !pool) {
    throw new Error('[MIGRATOR] Cannot run migrations: PostgreSQL (DATABASE_URL) is not configured.');
  }

  const client = await pool.connect();
  const appliedList = [];

  try {
    await ensureMigrationTable(client);
    const applied = await getAppliedMigrations(client);
    const appliedMap = new Map(applied.map((m) => [m.version, m]));

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      throw new Error(`[MIGRATOR] Migrations directory not found: ${MIGRATIONS_DIR}`);
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`⚡ [MIGRATOR] Found ${files.length} migration files in ${MIGRATIONS_DIR}`);

    for (const file of files) {
      const versionMatch = file.match(/^(\d+)/);
      if (!versionMatch) {
        console.warn(`⚠️ [MIGRATOR] Skipping non-versioned migration file: ${file}`);
        continue;
      }

      const version = versionMatch[1];
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      const checksum = computeChecksum(sqlContent);

      const existing = appliedMap.get(version);

      if (existing) {
        if (existing.checksum !== checksum) {
          console.warn(
            `⚠️ [MIGRATOR WARNING] Migration ${file} (v${version}) checksum mismatch!\n` +
              `  Expected (DB):   ${existing.checksum}\n` +
              `  Calculated (FS): ${checksum}\n` +
              `  Ensure applied migration files are not altered in place.`
          );
        }
        continue;
      }

      // Execute new migration in an atomic transaction
      console.log(`⏳ [MIGRATOR] Applying migration ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [version, file, checksum]
        );
        await client.query('COMMIT');
        appliedList.push(file);
        console.log(`✅ [MIGRATOR] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ [MIGRATOR ERROR] Failed to apply ${file}:`, err.message);
        throw err;
      }
    }

    return { applied: appliedList, total: files.length };
  } finally {
    client.release();
  }
}

/**
 * Returns migration status comparing filesystem with database.
 */
export async function getMigrationStatus() {
  if (!isPostgresConfigured() || !pool) {
    throw new Error('[MIGRATOR] Cannot inspect status: PostgreSQL (DATABASE_URL) is not configured.');
  }

  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    const applied = await getAppliedMigrations(client);
    const appliedMap = new Map(applied.map((m) => [m.version, m]));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    return files.map((file) => {
      const versionMatch = file.match(/^(\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      const isApplied = appliedMap.has(version);
      const record = appliedMap.get(version);

      return {
        version,
        name: file,
        applied: isApplied,
        appliedAt: record?.applied_at || null,
        checksum: record?.checksum || null,
      };
    });
  } finally {
    client.release();
  }
}
