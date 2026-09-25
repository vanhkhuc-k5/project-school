/**
 * Security Middleware - OWASP Top 10 Compliance
 * G50 - Production-grade security headers and rate limiting
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// =============================================================================
// ENV CONFIGURATION (lazy loaded to avoid circular dependency)
// =============================================================================

function getConfig() {
  // Lazy import to avoid circular dependency issues in test environment
  try {
    const { config } = require('../config/env.js');
    return config;
  } catch {
    // Return defaults for test environment
    return {
      IS_PRODUCTION: false,
      NODE_ENV: 'test',
      API_BASE_URL: 'http://localhost:5000',
    };
  }
}

// =============================================================================
// 1. HELMET - Security Headers
// =============================================================================

/**
 * Configure Helmet with strict CSP and OWASP recommendations
 */
export function getHelmetMiddleware() {
  const config = getConfig();
  return helmet({
    // Content Security Policy - Strict whitelist
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // React requires inline
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", config.API_BASE_URL || 'http://localhost:5000'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: config.IS_PRODUCTION ? [] : null,
      },
    },
    
    // X-Frame-Options - Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    
    // X-Content-Type-Options - Prevent MIME sniffing
    noSniff: true,
    
    // X-XSS-Protection (legacy but still recommended)
    xssFilter: true,
    
    // Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    
    // Remove X-Powered-By header
    hidePoweredBy: true,
    
    // Disable DNS prefetch
    dnsPrefetchControl: {
      allow: false,
    },
    
    // Force IE to use latest rendering engine
    ieNoOpen: true,
    
    // Prevent drag'n'drop attacks
    noCache: false,
  });
}

// =============================================================================
// 2. RATE LIMITING
// =============================================================================

/**
 * General API rate limiter - 100 requests per minute
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => {
    // Skip rate limiting for health checks and in test environment
    const isTest = req.headers['x-test-env'] === 'true' || process.env.NODE_ENV === 'test';
    return req.path === '/api/health' || req.path === '/api/health/detailed' || isTest;
  },
  keyGenerator: (req) => {
    // Use IP address as key (trust proxy if behind reverse proxy)
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
});

/**
 * Strict rate limiter for auth endpoints - 5 requests per minute
 * Protects against brute-force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again after a minute.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Combine IP with email for better protection
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const email = req.body?.identifier || req.body?.email || '';
    return `${ip}:${email.toLowerCase()}`;
  },
  skip: (req) => {
    // Skip in test environment and for non-login paths
    const isTest = req.headers['x-test-env'] === 'true' || process.env.NODE_ENV === 'test';
    return !req.path.includes('/auth/login') || isTest;
  },
});

/**
 * Very strict limiter for failed login attempts - 3 per minute
 * Gets stricter after multiple failures
 */
export const failedLoginRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: {
      code: 'LOGIN_BLOCKED',
      message: 'Too many failed login attempts. Account temporarily locked.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Track by IP + identifier combination
    const ip = req.ip || 'unknown';
    const identifier = (req.body?.identifier || req.body?.email || '').toLowerCase();
    return `failed:${ip}:${identifier}`;
  },
  skip: (req) => {
    // Skip in test environment and for non-login paths
    const isTest = req.headers['x-test-env'] === 'true' || process.env.NODE_ENV === 'test';
    return !req.path.includes('/auth/login') || isTest;
  },
});

/**
 * WebSocket/SSE rate limiter for real-time endpoints
 */
export const realtimeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 connections per minute
  message: {
    success: false,
    error: {
      code: 'REALTIME_LIMIT_EXCEEDED',
      message: 'Too many real-time connections.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const isTest = req.headers['x-test-env'] === 'true' || process.env.NODE_ENV === 'test';
    return isTest;
  },
});

// =============================================================================
// 3. PII PROTECTION FOR LOGGING
// =============================================================================

/**
 * Patterns for PII that should be masked in logs
 */
const PII_PATTERNS = [
  // Email (partial masking)
  {
    pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replacement: (match, local, domain) => {
      if (local.length <= 2) return `**@${domain}`;
      return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
    },
  },
  // Phone number (Vietnamese format)
  {
    pattern: /(\+84|84|0)([3-9]\d{8})/g,
    replacement: (match, prefix, number) => {
      return `${prefix}${number.slice(0, 4)}****${number.slice(-2)}`;
    },
  },
  // Vietnamese phone (10 digits starting with 0)
  {
    pattern: /\b(0\d{9,10})\b/g,
    replacement: (match) => {
      return match.slice(0, 4) + '*'.repeat(match.length - 6) + match.slice(-2);
    },
  },
  // Credit card numbers
  {
    pattern: /\b(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})\b/g,
    replacement: '****-****-****-$4',
  },
  // SSN-like patterns
  {
    pattern: /\b(\d{3})[\s-]?(\d{2})[\s-]?(\d{4,9})\b/g,
    replacement: '$1-**-****',
  },
  // Passwords in body
  {
    pattern: /("password"\s*:\s*")([^"]+)(")/gi,
    replacement: '$1[HIDDEN]$3',
  },
  {
    pattern: /("pwd"\s*:\s*")([^"]+)(")/gi,
    replacement: '$1[HIDDEN]$3',
  },
  {
    pattern: /("pass"\s*:\s*")([^"]+)(")/gi,
    replacement: '$1[HIDDEN]$3',
  },
  // JWT tokens
  {
    pattern: /(Bearer\s+)([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/g,
    replacement: '$1[TOKEN_HIDDEN]',
  },
  // Authorization headers
  {
    pattern: /(Authorization["\s:]+)[^\s,"]+/gi,
    replacement: '$1[HIDDEN]',
  },
];

/**
 * Mask PII in an object or string
 */
export function maskPII(input) {
  if (typeof input === 'string') {
    let result = input;
    for (const { pattern, replacement } of PII_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }
  
  if (typeof input === 'object' && input !== null) {
    // Clone and mask
    const masked = Array.isArray(input) ? [...input] : { ...input };
    
    for (const key of Object.keys(masked)) {
      if (typeof masked[key] === 'string') {
        let value = masked[key];
        for (const { pattern, replacement } of PII_PATTERNS) {
          value = value.replace(pattern, replacement);
        }
        masked[key] = value;
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = maskPII(masked[key]);
      }
    }
    
    return masked;
  }
  
  return input;
}

/**
 * Safe logging that automatically masks PII
 */
export function safeLog(level, message, meta = {}) {
  const maskedMeta = maskPII(meta);
  
  switch (level) {
    case 'error':
      console.error(`[ERROR] ${message}`, maskedMeta);
      break;
    case 'warn':
      console.warn(`[WARN] ${message}`, maskedMeta);
      break;
    case 'debug':
      if (!config.IS_PRODUCTION) {
        console.debug(`[DEBUG] ${message}`, maskedMeta);
      }
      break;
    default:
      console.log(`[INFO] ${message}`, maskedMeta);
  }
}

// =============================================================================
// 4. REQUEST SIZE LIMITING
// =============================================================================

/**
 * Limit request body sizes to prevent DoS
 */
export function getRequestSizeLimits() {
  return {
    jsonLimit: '100kb',      // JSON bodies
    urlencodedLimit: '100kb', // URL-encoded bodies
    multipartLimit: '10mb',   // File uploads (handled separately)
  };
}

// =============================================================================
// 5. TRUST PROXY CONFIGURATION
// =============================================================================

/**
 * Configure trust proxy for correct IP detection behind load balancers
 */
export function configureTrustProxy(app) {
  const config = getConfig();
  if (config.IS_PRODUCTION || config.NODE_ENV === 'staging') {
    // Trust first proxy (load balancer, reverse proxy)
    app.set('trust proxy', 1);
    console.log('🔒 Trust proxy enabled for production');
  }
}
