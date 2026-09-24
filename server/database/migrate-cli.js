#!/usr/bin/env node
/**
 * CLI runner for PostgreSQL Migrations
 * Usage:
 *   node server/database/migrate-cli.js          (runs pending migrations)
 *   node server/database/migrate-cli.js status   (shows status table)
 */

import { runMigrations, getMigrationStatus } from '../shared/database/migrator.js';
import { pool } from '../shared/database/connection.js';

async function main() {
  const command = process.argv[2] || 'migrate';

  console.log('========================================================================');
  console.log('                 EDUPORTAL POSTGRESQL MIGRATION RUNNER                  ');
  console.log('========================================================================\n');

  try {
    if (command === 'status') {
      const statusList = await getMigrationStatus();
      console.log('Version | Status  | Migration Name                        | Applied At');
      console.log('--------+---------+---------------------------------------+---------------------------');
      for (const item of statusList) {
        const statusText = item.applied ? 'APPLIED' : 'PENDING';
        const dateText = item.appliedAt ? new Date(item.appliedAt).toISOString() : '---';
        console.log(
          `${item.version.padEnd(7)} | ${statusText.padEnd(7)} | ${item.name.padEnd(37)} | ${dateText}`
        );
      }
      console.log('\n✅ Migration status check complete.\n');
    } else {
      const result = await runMigrations();
      if (result.applied.length === 0) {
        console.log('\n✨ Database is up to date. No pending migrations.\n');
      } else {
        console.log(`\n🎉 Successfully applied ${result.applied.length} migration(s).\n`);
      }
    }
  } catch (err) {
    console.error('\n❌ Migration execution failed:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
