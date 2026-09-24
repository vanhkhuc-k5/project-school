import { config } from './config/env.js';
import { createApp } from './app/app.js';
import { verifyDatabaseHealth, pool } from './shared/database/index.js';

const PORT = config.PORT;

// Global error handlers for server stability
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [PROCESS] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  console.error('❌ [PROCESS] Uncaught Exception:', error);
  // For critical errors, exit gracefully
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    console.error('❌ [PROCESS] Database connection error - exiting gracefully');
    process.exit(1);
  }
});

// Graceful shutdown handler
let server = null;

async function gracefulShutdown(signal) {
  console.log(`\n🛑 [SERVER] Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('🛑 [SERVER] HTTP server closed');
    });
  }
  
  // Close database pool
  if (pool) {
    try {
      await pool.end();
      console.log('🛑 [DATABASE] Connection pool closed');
    } catch (err) {
      console.error('❌ [DATABASE] Error closing pool:', err.message);
    }
  }
  
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function start() {
  try {
    // 1. Verify PostgreSQL health (fail-fast in production)
    const dbHealthy = await verifyDatabaseHealth();
    if (!dbHealthy && config.IS_PRODUCTION) {
      console.error('❌ [SERVER] Cannot start in production without healthy database');
      process.exit(1);
    }

    // 2. Create application instance
    const app = createApp();

    // 4. Start listening
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ [SERVER] EduPortal Backend running on http://127.0.0.1:${PORT}`);
      console.log(`📊 [ENV] NODE_ENV=${config.NODE_ENV}, IS_TEST=${config.IS_TEST}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ [SERVER] Port ${PORT} is already in use`);
        process.exit(1);
      }
      console.error('❌ [SERVER] Server error:', error);
    });

  } catch (error) {
    console.error('❌ [SERVER] Failed to start:', error.message);
    process.exit(1);
  }
}

start();
