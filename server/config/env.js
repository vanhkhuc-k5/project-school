import dotenv from 'dotenv';

/**
 * Validates and normalizes environment configuration.
 * Supports: development, test, staging, production
 */
export function validateEnv(envSource = process.env) {
  const nodeEnv = (envSource.NODE_ENV || 'development').trim().toLowerCase();
  const isProduction = nodeEnv === 'production';
  const isStaging = nodeEnv === 'staging';
  const isTest = nodeEnv === 'test';
  const isDevelopment = !isProduction && !isStaging && !isTest;

  // =============================================================================
  // 1. SERVER CONFIGURATION
  // =============================================================================
  const rawPort = envSource.PORT || '5000';
  const port = parseInt(rawPort, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`[ENV CONFIG ERROR] Invalid PORT: "${rawPort}". Must be a number between 1 and 65535.`);
  }

  // =============================================================================
  // 2. JWT SECRET VALIDATION
  // =============================================================================
  let jwtSecret = envSource.JWT_SECRET?.trim();
  const DEV_FALLBACK_KEY = 'dev_jwt_secret_for_local_testing_only_32char';
  const TEST_FALLBACK_KEY = 'test_jwt_secret_for_automated_testing_only_32chars';
  const STAGING_FALLBACK_KEY = 'staging_fallback_jwt_secret_change_in_production';

  if (isProduction) {
    if (!jwtSecret) {
      throw new Error(
        '[CRITICAL SECURITY ERROR] In production, JWT_SECRET must be explicitly set in the environment.'
      );
    }
    if (jwtSecret.length < 32) {
      throw new Error(
        `[CRITICAL SECURITY ERROR] In production, JWT_SECRET must have at least 32 characters (found ${jwtSecret.length}).`
      );
    }
    if ([DEV_FALLBACK_KEY, TEST_FALLBACK_KEY, STAGING_FALLBACK_KEY].includes(jwtSecret)) {
      throw new Error(
        '[CRITICAL SECURITY ERROR] In production, JWT_SECRET cannot use a known fallback key.'
      );
    }
  } else if (isStaging) {
    if (!jwtSecret) {
      console.warn('⚠️  [ENV CONFIG] JWT_SECRET not set in staging — using fallback key.');
      jwtSecret = STAGING_FALLBACK_KEY;
    } else if (jwtSecret.length < 32) {
      throw new Error(
        `[ENV CONFIG ERROR] In staging, JWT_SECRET must have at least 32 characters.`
      );
    }
  } else if (isTest) {
    // Test environment can use predefined test key
    jwtSecret = TEST_FALLBACK_KEY;
  } else {
    // Development
    if (!jwtSecret) {
      console.warn('⚠️  [ENV CONFIG] JWT_SECRET not set in .env — using safe development key.');
      jwtSecret = DEV_FALLBACK_KEY;
    }
  }

  // =============================================================================
  // 3. DATABASE CONFIGURATION
  // =============================================================================
  
  // PostgreSQL (Neon Cloud)
  const rawDatabaseUrl = envSource.DATABASE_URL?.trim();
  let databaseUrl = null;
  if (rawDatabaseUrl && !rawDatabaseUrl.includes('username:password@ep-sample-pooler')) {
    if (!rawDatabaseUrl.startsWith('postgres://') && !rawDatabaseUrl.startsWith('postgresql://')) {
      throw new Error(
        `[ENV CONFIG ERROR] DATABASE_URL must start with "postgres://" or "postgresql://".`
      );
    }
    databaseUrl = rawDatabaseUrl;
  }

  // SQLite path
  const dbPath = envSource.DB_PATH?.trim() || './database.sqlite';

  // =============================================================================
  // 4. BCRYPT ROUNDS
  // =============================================================================
  const defaultRounds = isProduction ? '12' : (isStaging ? '12' : (isTest ? '4' : '10'));
  const rawRounds = envSource.BCRYPT_ROUNDS || defaultRounds;
  const bcryptRounds = parseInt(rawRounds, 10);
  if (isNaN(bcryptRounds) || bcryptRounds < 4 || bcryptRounds > 16) {
    throw new Error(`[ENV CONFIG ERROR] Invalid BCRYPT_ROUNDS: "${rawRounds}". Must be between 4 and 16.`);
  }

  // =============================================================================
  // 5. CORS CONFIGURATION
  // =============================================================================
  const corsOrigins = (envSource.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // =============================================================================
  // 6. AI TUTOR CONFIGURATION
  // =============================================================================
  const aiTutorEnabled = envSource.AI_TUTOR_ENABLED !== 'false';
  const aiProvider = envSource.AI_PROVIDER || 'mock';
  
  // =============================================================================
  // 7. LOGGING CONFIGURATION
  // =============================================================================
  const validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
  const logLevel = (envSource.LOG_LEVEL || (isProduction ? 'info' : 'debug')).toLowerCase();
  if (!validLogLevels.includes(logLevel)) {
    throw new Error(`[ENV CONFIG ERROR] Invalid LOG_LEVEL: "${logLevel}". Must be one of: ${validLogLevels.join(', ')}`);
  }

  // =============================================================================
  // 8. FEATURE FLAGS
  // =============================================================================
  const allowSqliteDev = envSource.ALLOW_SQLITE_DEV === 'true';
  const allowSeedInStaging = envSource.ALLOW_SEED_IN_STAGING === 'true';

  // =============================================================================
  // 9. SUPABASE (Optional)
  // =============================================================================
  const supabaseUrl = envSource.SUPABASE_URL?.trim() || null;
  const supabaseKey = (envSource.SUPABASE_SERVICE_ROLE_KEY || envSource.SUPABASE_ANON_KEY)?.trim() || null;

  // =============================================================================
  // RETURN FROZEN CONFIG
  // =============================================================================
  return Object.freeze({
    // Environment flags
    NODE_ENV: nodeEnv,
    IS_PRODUCTION: isProduction,
    IS_STAGING: isStaging,
    IS_TEST: isTest,
    IS_DEVELOPMENT: isDevelopment,

    // Server
    PORT: port,

    // Security
    JWT_SECRET: jwtSecret,
    BCRYPT_ROUNDS: bcryptRounds,

    // Database
    DATABASE_URL: databaseUrl,
    DB_PATH: dbPath,
    
    // Connection helpers
    isPostgresConfigured: () => !!databaseUrl,
    isSqliteOnly: () => !databaseUrl,

    // CORS
    CORS_ORIGINS: corsOrigins,

    // AI Tutor
    AI_TUTOR_ENABLED: aiTutorEnabled,
    AI_PROVIDER: aiProvider,

    // Logging
    LOG_LEVEL: logLevel,

    // Feature flags
    ALLOW_SQLITE_DEV: allowSqliteDev,
    ALLOW_SEED_IN_STAGING: allowSeedInStaging,

    // Supabase
    SUPABASE_URL: supabaseUrl,
    SUPABASE_KEY: supabaseKey,

    // Debug info (safe to log)
    _debug: Object.freeze({
      envFile: isTest ? '.env.test' : (isProduction ? '.env.production' : (isStaging ? '.env.staging' : '.env.development')),
      usingSqlite: !databaseUrl,
      usingPostgres: !!databaseUrl,
    }),
  });
}

// Global active configuration validated at startup
export const config = validateEnv(process.env);
export default config;
