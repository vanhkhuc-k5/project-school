/**
 * Express Application Setup & Middleware Orchestration
 * G49 — Environment Separation
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

/**
 * Create Express application with environment-specific settings
 */
export function createApp() {
  const app = express();

  // =============================================================================
  // SECURITY HEADERS (Production-grade)
  // =============================================================================
  if (config.IS_PRODUCTION) {
    app.use((req, res, next) => {
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      // XSS protection
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      // Strict transport security
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      // Content security policy (adjust as needed)
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      // Referrer policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      // Remove powered-by header
      res.removeHeader('X-Powered-By');
      next();
    });
  }

  // =============================================================================
  // REQUEST ID TRACKING (First middleware)
  // =============================================================================
  app.use(requestIdMiddleware);

  // =============================================================================
  // CORS CONFIGURATION (Environment-specific)
  // =============================================================================
  const corsOptions = {
    origin: config.IS_PRODUCTION 
      ? config.CORS_ORIGINS  // Strict in production
      : config.CORS_ORIGINS, // Configured origins in other envs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Id-Token'],
    credentials: config.IS_PRODUCTION, // Require credentials in production
    maxAge: 86400, // 24 hours for preflight cache
  };

  // Development: more permissive for local testing
  if (config.IS_DEVELOPMENT) {
    corsOptions.origin = (origin, callback) => {
      // Allow requests with no origin (curl, Postman, etc.)
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
  // BODY PARSING
  // =============================================================================
  // JSON body parser with size limit
  app.use(express.json({ limit: '10mb' }));
  
  // URL-encoded body parser
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // =============================================================================
  // REQUEST LOGGING (Environment-specific verbosity)
  // =============================================================================
  app.use(requestLogger);

  // =============================================================================
  // ROUTES
  // =============================================================================
  registerRoutes(app);

  // =============================================================================
  // HEALTH CHECK ENDPOINT
  // =============================================================================
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'EduPortal Modular Monolith Backend',
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      time: new Date().toISOString(),
      requestId: req.id,
    });
  });

  // Detailed health check for monitoring
  app.get('/api/health/detailed', (req, res) => {
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
      },
      features: {
        aiTutor: config.AI_TUTOR_ENABLED,
        aiProvider: config.AI_PROVIDER,
      },
      requestId: req.id,
    });
  });

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
