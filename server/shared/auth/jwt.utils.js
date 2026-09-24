/**
 * JWT & Cryptographic Token Utility Functions
 * Handles signing, verifying short-lived access tokens, and hashing refresh/reset tokens.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

export const JWT_SECRET = config.JWT_SECRET;
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Signs a short-lived access JWT token (default: 15 minutes)
 * @param {object} payload
 * @param {jwt.SignOptions} [options]
 * @returns {string}
 */
export function signAccessToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    ...options,
  });
}

/**
 * Legacy compatibility alias for signAccessToken
 * @param {object} payload
 * @param {jwt.SignOptions} [options]
 * @returns {string}
 */
export function signToken(payload, options = {}) {
  return signAccessToken(payload, options);
}

/**
 * Verifies a JWT access token
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Legacy compatibility alias for verifyAccessToken
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyToken(token) {
  return verifyAccessToken(token);
}

/**
 * Generates a cryptographically secure random token string
 * @param {number} [bytes=40]
 * @returns {string} hex string
 */
export function generateRandomToken(bytes = 40) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Computes a SHA-256 hash of a raw token for secure database storage/lookup
 * @param {string} rawToken
 * @returns {string} hex sha256 hash
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}
