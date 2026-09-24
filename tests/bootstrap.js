/**
 * Test Environment Bootstrap
 * 
 * This file MUST be imported FIRST by any test entry point
 * before any server modules. It sets up the isolated test environment.
 */

// Set test environment FIRST - before dotenv loads
process.env.NODE_ENV = 'test';

// For tests, we use SQLite as the isolated test database
// No production DATABASE_URL should be used
delete process.env.DATABASE_URL;  // Ensure no production DB is accidentally used
process.env.DB_PATH = ':memory:';  // Use in-memory SQLite for speed

console.log('🧪 [TEST BOOTSTRAP] Test environment initialized');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DATABASE_URL:', process.env.DATABASE_URL || '(none - SQLite mode)');
console.log('   DB_PATH:', process.env.DB_PATH);
