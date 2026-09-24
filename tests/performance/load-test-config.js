/**
 * EduPortal Load Test Configuration
 * 
 * Configuration for load testing against staging environment.
 * DO NOT run against production.
 * 
 * Usage:
 *   npm run load-test:50    # 50 concurrent users
 *   npm run load-test:150   # 150 concurrent users
 *   npm run load-test:300   # 300 concurrent users
 */

export const LOAD_TEST_CONFIG = {
  // Environment
  environment: process.env.NODE_ENV || 'staging',
  baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:5000',
  
  // Database (for verification queries only)
  database: {
    // DO NOT hardcode - use environment variable
    url: process.env.DATABASE_URL,
  },
  
  // Test scenarios
  scenarios: {
    // 50 concurrent users
    '50-users': {
      duration: 120, // seconds
      users: 50,
      rampUp: 10, // seconds to reach full users
      spawnRate: 5, // users per second
      routes: {
        login: { weight: 20, hits: 100 },
        dashboard: { weight: 30, hits: 150 },
        schedule: { weight: 15, hits: 75 },
        assignments: { weight: 15, hits: 75 },
        attendance: { weight: 10, hits: 50 },
        grades: { weight: 10, hits: 50 },
      },
    },
    
    // 150 concurrent users
    '150-users': {
      duration: 180,
      users: 150,
      rampUp: 30,
      spawnRate: 5,
      routes: {
        login: { weight: 20, hits: 300 },
        dashboard: { weight: 30, hits: 450 },
        schedule: { weight: 15, hits: 225 },
        assignments: { weight: 15, hits: 225 },
        attendance: { weight: 10, hits: 150 },
        grades: { weight: 10, hits: 150 },
      },
    },
    
    // 300 concurrent users
    '300-users': {
      duration: 300,
      users: 300,
      rampUp: 60,
      spawnRate: 5,
      routes: {
        login: { weight: 20, hits: 600 },
        dashboard: { weight: 30, hits: 900 },
        schedule: { weight: 15, hits: 450 },
        assignments: { weight: 15, hits: 450 },
        attendance: { weight: 10, hits: 300 },
        grades: { weight: 10, hits: 300 },
      },
    },
  },
  
  // Demo accounts for load testing
  testAccounts: [
    { role: 'admin', username: 'stg_admin', email: 'stg.admin@stg-demo.edu.vn', password: 'Staging@2026' },
    { role: 'teacher', username: 'stg_teacher', email: 'stg.teacher@stg-demo.edu.vn', password: 'Staging@2026' },
    { role: 'student', username: 'stg_student', email: 'stg.student@stg-demo.edu.vn', password: 'Staging@2026' },
    { role: 'parent', username: 'stg_parent', email: 'stg.parent@stg-demo.edu.vn', password: 'Staging@2026' },
  ],
  
  // Routes to test
  routes: {
    // Public routes
    health: { method: 'GET', path: '/api/health' },
    healthDetailed: { method: 'GET', path: '/api/health/detailed' },
    
    // Auth routes
    login: { method: 'POST', path: '/api/auth/login' },
    refresh: { method: 'POST', path: '/api/auth/refresh' },
    
    // Student routes
    studentDashboard: { method: 'GET', path: '/api/student/dashboard' },
    studentAssignments: { method: 'GET', path: '/api/student/assignments' },
    studentGrades: { method: 'GET', path: '/api/student/grades' },
    studentSchedule: { method: 'GET', path: '/api/student/schedule' },
    studentAttendance: { method: 'GET', path: '/api/student/attendance' },
    
    // Teacher routes
    teacherDashboard: { method: 'GET', path: '/api/teacher/dashboard' },
    teacherClasses: { method: 'GET', path: '/api/teacher/classes' },
    teacherAssignments: { method: 'GET', path: '/api/teacher/assignments' },
    
    // Parent routes
    parentDashboard: { method: 'GET', path: '/api/parent/dashboard' },
    parentChildren: { method: 'GET', path: '/api/parent/children' },
    parentGrades: { method: 'GET', path: '/api/parent/grades' },
    
    // Admin routes
    adminDashboard: { method: 'GET', path: '/api/admin/dashboard' },
    adminUsers: { method: 'GET', path: '/api/admin/users' },
    adminClasses: { method: 'GET', path: '/api/admin/classes' },
  },
  
  // Performance thresholds
  thresholds: {
    http_req_duration: { p95: 500 }, // 95% of requests under 500ms
    http_req_failed: { pass_rate: 99 }, // 99% success rate
    http_reqs: { total: 1000 }, // at least 1000 requests per minute
  },
};

// Export individual scenario configs for convenience
export const SCENARIOS = LOAD_TEST_CONFIG.scenarios;
export const ROUTES = LOAD_TEST_CONFIG.routes;
export const TEST_ACCOUNTS = LOAD_TEST_CONFIG.testAccounts;
