/**
 * Users Module Controller
 * Handles HTTP requests, passes context to usersService, and returns standardized responses.
 */

import { usersService } from './users.service.js';

export const usersController = {
  /**
   * GET /api/users
   * Paginated user list with search and filters
   */
  async listUsers(req, res, next) {
    try {
      const { page, limit, search, role, status, sortBy, sortOrder } = req.query;
      const result = await usersService.listUsers({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search,
        role,
        status,
        sortBy,
        sortOrder,
        adminUser: req.user,
        schoolId: req.schoolId,
      });

      return res.json({
        success: true,
        data: result,
        users: result.users,
        pagination: result.pagination,
        meta: {
          total: result.pagination.total,
          page: result.pagination.page,
          limit: result.pagination.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/users/:id
   * Get single user details
   */
  async getUserById(req, res, next) {
    try {
      const user = await usersService.getUserById(req.params.id, req.user, req.schoolId);
      return res.json({
        success: true,
        data: { user },
        user,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/users
   * Create new user
   */
  async createUser(req, res, next) {
    try {
      const result = await usersService.createUser(req.body, req.user, req.schoolId);
      return res.status(200).json({
        success: true,
        message: 'Tạo tài khoản người dùng thành công!',
        userId: result.user.id,
        user: result.user,
        initialPassword: result.initialPassword,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/users/:id
   * Update user profile
   */
  async updateUser(req, res, next) {
    try {
      const updated = await usersService.updateUser(req.params.id, req.body, req.user, req.schoolId);
      return res.json({
        success: true,
        message: 'Cập nhật tài khoản thành công!',
        data: { user: updated },
        user: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/users/:id/status
   * Activate or deactivate user
   */
  async updateStatus(req, res, next) {
    try {
      const result = await usersService.updateStatus(req.params.id, req.body, req.user, req.schoolId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/users/:id/roles
   * Assign or update roles
   */
  async assignRoles(req, res, next) {
    try {
      const result = await usersService.assignRoles(req.params.id, req.body, req.user, req.schoolId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/users/:id/reset-password
   * Securely reset user password
   */
  async resetPassword(req, res, next) {
    try {
      const result = await usersService.resetPassword(req.params.id, req.body, req.user, req.schoolId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/users/:id
   * Delete user or safely deactivate if academic history exists
   */
  async deleteUser(req, res, next) {
    try {
      const result = await usersService.deleteUser(req.params.id, req.user, req.schoolId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
