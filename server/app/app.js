/**
 * Express Application Setup & Middleware Orchestration
 * G49 — Environment Separation
 * G50 — OWASP Top 10 Security Hardening
 *
 * IMPORTANT: The app singleton is NOT exported here to allow callers to
 * control initialization order (e.g., setting DB_PATH before importing app).
 * Import `createApp()` and call it AFTER setting environment variables.
 */

import express from 'express';
import cors from 'cors';
import { requestLogger, logger } from '../shared/logging/index.js';
import { errorHandler, notFoundHandler, requestIdMiddleware } from '../shared/errors/index.js';
import { registerRoutes } from './routes.js';
import { config } from '../config/env.js';
import {
  getHelmetMiddleware,
  apiRateLimiter,
  authRateLimiter,
  configureTrustProxy,
  getRequestSizeLimits,
  maskPII,
} from '../middleware/security.js';

/**
 * Format uptime seconds to human readable string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Create Express application with environment-specific settings
 */
export function createApp() {
  const app = express();

  // =============================================================================
  // TRUST PROXY (First - for correct IP detection)
  // =============================================================================
  configureTrustProxy(app);

  // =============================================================================
  // SECURITY HEADERS - Helmet (OWASP Top 10)
  // =============================================================================
  app.use(getHelmetMiddleware());

  // =============================================================================
  // REQUEST ID TRACKING (First middleware)
  // =============================================================================
  app.use(requestIdMiddleware);

  // =============================================================================
  // RATE LIMITING (OWASP Top 10 - Brute Force Protection)
  // =============================================================================
  app.use('/api', apiRateLimiter); // 100 req/min for general API

  // =============================================================================
  // CORS CONFIGURATION (Environment-specific)
  // =============================================================================
  const corsOptions = {
    origin: config.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Id-Token'],
    credentials: true,
    maxAge: 86400, // 24 hours for preflight cache
  };

  // Development: more permissive for local testing
  if (config.IS_DEVELOPMENT) {
    corsOptions.origin = (origin, callback) => {
      if (!origin || config.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS: Unknown origin ${origin} - allowing anyway in development`);
        callback(null, true);
      }
    };
  }

  app.use(cors(corsOptions));

  // =============================================================================
  // BODY PARSING (With size limits)
  // =============================================================================
  const sizeLimits = getRequestSizeLimits();
  app.use(express.json({ limit: sizeLimits.jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: sizeLimits.urlencodedLimit }));

  // =============================================================================
  // REQUEST LOGGING (Environment-specific verbosity)
  // =============================================================================
  app.use(requestLogger);

  // =============================================================================
  // PUBLIC HEALTH CHECK ENDPOINTS (must be before apiRouter)
  // =============================================================================
  app.get('/api/health', async (_req, res) => {
    const startTime = Date.now();
    
    try {
      // Check database connectivity
      let dbStatus = 'healthy';
      let dbLatency = 0;
      
      try {
        const dbStart = Date.now();
        // Import dynamically to avoid circular deps
        const { db, pool, isPostgresConfigured } = await import('../shared/database/index.js');
        if (typeof isPostgresConfigured === 'function' && isPostgresConfigured() && pool) {
          await pool.query('SELECT 1');
        } else if (db && typeof db.prepare === 'function') {
          db.prepare('SELECT 1').get();
        } else if (db && typeof db.get === 'function') {
          db.get('SELECT 1');
        }
        dbLatency = Date.now() - dbStart;
      } catch (_dbErr) {
        dbStatus = 'unhealthy';
      }
      
      const memoryUsage = process.memoryUsage();
      const uptimeSeconds = process.uptime();
      
      const healthData = {
        status: dbStatus === 'healthy' ? 'ok' : 'degraded',
        service: 'EduPortal Modular Monolith Backend',
        environment: config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: Math.floor(uptimeSeconds),
          human: formatUptime(uptimeSeconds),
        },
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
        checkDuration: Date.now() - startTime,
      };
      
      const statusCode = dbStatus === 'healthy' ? 200 : 503;
      res.status(statusCode).json(healthData);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        service: 'EduPortal Backend',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Detailed health check for monitoring dashboards
  app.get('/api/health/detailed', async (req, res) => {
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'ok',
      environment: config.NODE_ENV,
      isProduction: config.IS_PRODUCTION,
      isStaging: config.IS_STAGING,
      isTest: config.IS_TEST,
      isDevelopment: config.IS_DEVELOPMENT,
      database: {
        usingPostgres: config.isPostgresConfigured(),
        usingSqlite: config.isSqliteOnly(),
        type: config.isPostgresConfigured() ? 'postgresql' : 'sqlite',
      },
      features: {
        aiTutor: config.AI_TUTOR_ENABLED,
        aiProvider: config.AI_PROVIDER,
      },
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      uptime: {
        seconds: process.uptime(),
        human: formatUptime(process.uptime()),
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
      security: {
        helmet: true,
        rateLimiting: true,
        piiMasking: true,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  });

  // =============================================================================
  // ROUTES
  // =============================================================================
  registerRoutes(app);

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware (must be registered last)
  app.use(errorHandler);

  // =============================================================================
  // STARTUP LOGGING
  // =============================================================================
  logger.info('Express application created', {
    environment: config.NODE_ENV,
    port: config.PORT,
    isProduction: config.IS_PRODUCTION,
  });

  return app;
}
