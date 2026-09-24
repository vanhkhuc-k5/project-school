/**
 * Auth Module Routes
 * Defines routing, rate limiting, request validation, and connects to AuthController.
 */

import express from 'express';
import { authController } from './auth.controller.js';
import {
  loginSchema,
  changePasswordSchema,
  registerSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  authenticateToken,
  requirePermission,
  loginRateLimiter,
  passwordResetRateLimiter,
} from '../../shared/auth/index.js';

const router = express.Router();

router.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

router.post(
  '/refresh',
  validateRequest({ body: refreshSchema }),
  authController.refresh
);

router.post(
  '/logout',
  authController.logout
);

router.get(
  '/me',
  authenticateToken,
  authController.getMe
);

router.post(
  '/change-password',
  authenticateToken,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword
);

router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  authController.resetPassword
);

router.post(
  '/register',
  authenticateToken,
  requirePermission('user.create'),
  validateRequest({ body: registerSchema }),
  authController.register
);

export default router;
