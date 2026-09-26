/**
 * E2E Test Server — EduPortal
 * Dedicated isolated server for Playwright browser tests.
 * 
 * Architecture:
 *   1. Set test env vars BEFORE any server module imports
 *   2. Initialize test database (schema + test fixtures) — isolated from production
 *   3. Start Express app bound to in-memory DB
 *   4. Handle graceful shutdown
 * 
 * This server MUST NOT call seedDatabase() or any production seed scripts.
 */

// =============================================================================
// STEP 1: Set environment BEFORE any server module imports
// =============================================================================
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'e2e-test-jwt-secret-for-playwright-tests';

// =============================================================================
// STEP 2: Dynamic imports (after env vars are set)
// =============================================================================
const [
  { createApp },
  { db, initSchema },
  { initializeTestFixtures },
] = await Promise.all([
  import('../../server/app/app.js'),
  import('../../server/db.js'),
  import('../fixtures/testFixtures.js'),
]);

// =============================================================================
// STEP 3: Initialize test database
// =============================================================================
console.log('🔧 [E2E] Initializing isolated test database (in-memory SQLite)...');

try {
  initSchema();
  initializeTestFixtures();
  console.log('✅ [E2E] Test database initialized with fixtures');
} catch (err) {
  console.error('❌ [E2E] Failed to initialize test database:', err.message);
  process.exit(1);
}

// =============================================================================
// STEP 4: Create Express app
// =============================================================================
const app = createApp();

const PORT = 5000;
let server;

function startServer() {
  return new Promise((resolve, reject) => {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ [E2E] Test server listening on http://127.0.0.1:${PORT}`);
      resolve();
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ [E2E] Port ${PORT} is already in use`);
        reject(error);
      } else {
        console.error('❌ [E2E] Server error:', error);
        reject(error);
      }
    });
  });
}

// =============================================================================
// STEP 5: Graceful shutdown
// =============================================================================
async function gracefulShutdown(signal) {
  console.log(`\n🛑 [E2E] Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log('🛑 [E2E] HTTP server closed');
  }
  
  // Close database connection
  if (db && db.close) {
    try {
      db.close();
      console.log('🛑 [E2E] Database connection closed');
    } catch (err) {
      console.error('❌ [E2E] Error closing database:', err.message);
    }
  }
  
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// STEP 6: Start server
// =============================================================================
startServer().catch((err) => {
  console.error('❌ [E2E] Failed to start server:', err.message);
  process.exit(1);
});
