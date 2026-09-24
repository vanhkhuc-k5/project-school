/**
 * Users Module Routes
 * Defines routing, RBAC authorization, validation, and attaches to usersController.
 */

import express from 'express';
import { usersController } from './users.controller.js';
import {
  userQuerySchema,
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  assignRolesSchema,
  resetPasswordSchema,
} from './users.schema.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
} from '../../shared/auth/index.js';

const router = express.Router();

// Enforce authentication & admin/principal role across all user management endpoints
router.use(authenticateToken);
router.use(requireRole('admin', 'school_admin', 'super_admin', 'principal', 'vice_principal'));

// 1. List users (paginated, filtered, searched)
router.get(
  '/',
  requirePermission('user.read'),
  validateRequest({ query: userQuerySchema }),
  usersController.listUsers
);

// 2. Get user by ID
router.get(
  '/:id',
  requirePermission('user.read'),
  usersController.getUserById
);

// 3. Create user
router.post(
  '/',
  requirePermission('user.create'),
  validateRequest({ body: createUserSchema }),
  usersController.createUser
);

// 4. Update user profile
router.put(
  '/:id',
  requirePermission('user.update'),
  validateRequest({ body: updateUserSchema }),
  usersController.updateUser
);

// 5. Update account status (activate/deactivate/lock)
router.patch(
  '/:id/status',
  requirePermission('user.disable'),
  validateRequest({ body: updateStatusSchema }),
  usersController.updateStatus
);

// 6. Assign and update roles
router.put(
  '/:id/roles',
  requirePermission('user.update'),
  validateRequest({ body: assignRolesSchema }),
  usersController.assignRoles
);

// 7. Reset password securely
router.post(
  '/:id/reset-password',
  requirePermission('user.update'),
  validateRequest({ body: resetPasswordSchema }),
  usersController.resetPassword
);

// 8. Delete user (with academic history protection)
router.delete(
  '/:id',
  requirePermission('user.disable'),
  usersController.deleteUser
);

export default router;
