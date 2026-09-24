import './server/shared/database/connection.js';
import { pgQuery } from './server/shared/database/connection.js';

async function migrate() {
  try {
    await pgQuery(`
      ALTER TABLE grades ADD COLUMN IF NOT EXISTS class_id TEXT;
    `);
    console.log('Added class_id column');
    await pgQuery(`
      ALTER TABLE grades ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;
    `);
    console.log('Added locked_at column');
    await pgQuery(`
      ALTER TABLE grades ADD COLUMN IF NOT EXISTS locked_by TEXT;
    `);
    console.log('Added locked_by column');
    console.log('Migration complete');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
}

migrate();
