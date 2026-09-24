/**
 * Cookie Utilities for HttpOnly Refresh Tokens & Session Lifecycle
 */

import { config } from '../../config/env.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_COOKIE_PATH = '/api/auth';
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Parses raw Cookie header string from request into a key-value object.
 * @param {import('express').Request} req
 * @returns {Record<string, string>}
 */
export function parseCookies(req) {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return {};

  const cookies = {};
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

/**
 * Sets a secure HttpOnly refresh token cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setRefreshTokenCookie(res, token) {
  const isProd = config.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };

  if (typeof res.cookie === 'function') {
    res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions);
  } else {
    // Fallback manual header
    const cookieStr = `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=${REFRESH_COOKIE_PATH}; Max-Age=${Math.floor(REFRESH_COOKIE_MAX_AGE_MS / 1000)}; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookieStr);
  }
}

/**
 * Clears the refresh token cookie upon logout.
 * @param {import('express').Response} res
 */
export function clearRefreshTokenCookie(res) {
  const isProd = config.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
  };

  if (typeof res.clearCookie === 'function') {
    res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
  } else {
    const cookieStr = `${REFRESH_COOKIE_NAME}=; Path=${REFRESH_COOKIE_PATH}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookieStr);
  }
}
