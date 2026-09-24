/**
 * Test Authentication Helpers
 * Provides utilities for managing auth state during integration tests.
 */

import { db } from '../../server/db.js';

/**
 * Clear all auth-related state for a clean test environment.
 * Call this at the start of each test suite to ensure isolation.
 */
export function clearAuthState() {
  // Reset failed login attempts and lockouts
  try {
    db.exec(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL`);
  } catch (e) { /* ignore */ }
  
  // Clear all refresh tokens
  try {
    db.exec(`DELETE FROM refresh_tokens`);
  } catch (e) { /* ignore */ }
  
  // Clear all password reset tokens (table may not exist in all schemas)
  try {
    db.exec(`DELETE FROM password_reset_tokens`);
  } catch (e) { /* ignore */ }
}

/**
 * Clear auth state for specific users.
 * Use this when a test needs to isolate specific users.
 */
export function clearUserAuthState(emailOrId) {
  try {
    db.exec(`
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL 
      WHERE email = ? OR id = ?
    `, emailOrId, emailOrId);
  } catch (e) { /* ignore */ }
}

/**
 * Get a fresh admin token, clearing any stale auth state first.
 */
export async function getAdminToken(api) {
  clearUserAuthState('admin@school.edu.vn');
  const res = await api.post('/auth/login', {
    identifier: 'admin@school.edu.vn',
    password: '123456',
  });
  if (res.status !== 200) {
    throw new Error(`Admin login failed: ${res.status}`);
  }
  return res.body.token;
}

/**
 * Get a fresh teacher token.
 */
export async function getTeacherToken(api, identifier = 'mailan@school.edu.vn') {
  clearUserAuthState(identifier);
  const res = await api.post('/auth/login', {
    identifier,
    password: '123456',
  });
  if (res.status !== 200) {
    throw new Error(`Teacher login failed: ${res.status}`);
  }
  return res.body.token;
}

/**
 * Get a fresh student token.
 */
export async function getStudentToken(api, identifier = 'minhkhang@school.edu.vn') {
  clearUserAuthState(identifier);
  const res = await api.post('/auth/login', {
    identifier,
    password: '123456',
  });
  if (res.status !== 200) {
    throw new Error(`Student login failed: ${res.status}`);
  }
  return res.body.token;
}

/**
 * Get a fresh parent token.
 */
export async function getParentToken(api, identifier = 'vanhoi@parent.school.edu.vn') {
  clearUserAuthState(identifier);
  const res = await api.post('/auth/login', {
    identifier,
    password: '123456',
  });
  if (res.status !== 200) {
    throw new Error(`Parent login failed: ${res.status}`);
  }
  return res.body.token;
}
