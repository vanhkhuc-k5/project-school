/**
 * Users Module Service
 * Core business rules, validation, academic history protection, and audit logging.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { usersRepository } from './users.repository.js';
import { normalizeRole } from '../../shared/auth/rbac.registry.js';
import { AppError } from '../../shared/errors/index.js';

export const usersService = {
  /**
   * List users with pagination, filters, and search
   */
  async listUsers({
    page = 1,
    limit = 10,
    search = '',
    role = 'all',
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
    adminUser,
    schoolId,
  }) {
    const isSuperAdmin = adminUser?.role === 'super_admin' || adminUser?.isSuperAdmin === true;
    const effectiveSchoolId = isSuperAdmin ? null : (schoolId || adminUser?.schoolId || 'sch_bacau');

    const { users, total } = await usersRepository.findUsers({
      page,
      limit,
      search,
      role,
      status,
      schoolId: effectiveSchoolId,
      isSuperAdmin,
      sortBy,
      sortOrder,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  /**
   * Get single user by ID
   */
  async getUserById(id, adminUser, schoolId) {
    const isSuperAdmin = adminUser?.role === 'super_admin' || adminUser?.isSuperAdmin === true;
    const effectiveSchoolId = isSuperAdmin ? null : (schoolId || adminUser?.schoolId || 'sch_bacau');

    const user = await usersRepository.findById(id, effectiveSchoolId, isSuperAdmin);
    if (!user) {
      throw new AppError('Không tìm thấy tài khoản người dùng', 404, 'USER_NOT_FOUND');
    }
    if (user === 'FORBIDDEN_TENANT') {
      throw new AppError('Bạn không có quyền truy cập người dùng thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    return user;
  },

  /**
   * Create a new user with duplicate validation and audit logging
   */
  async createUser(payload, adminUser, schoolId) {
    const isSuperAdmin = adminUser?.role === 'super_admin' || adminUser?.isSuperAdmin === true;
    const effectiveSchoolId = isSuperAdmin
      ? (payload.schoolId || 'sch_bacau')
      : (schoolId || adminUser?.schoolId || 'sch_bacau');

    const normalizedRole = normalizeRole(payload.role);

    // 1. Check duplicate username or email
    const duplicate = await usersRepository.findDuplicateIdentifier(payload.username, payload.email);
    if (duplicate) {
      if (duplicate.username.toLowerCase() === payload.username.toLowerCase()) {
        throw new AppError('Tên đăng nhập đã tồn tại trên hệ thống', 400, 'DUPLICATE_USERNAME');
      }
      if (payload.email && duplicate.email && duplicate.email.toLowerCase() === payload.email.toLowerCase()) {
        throw new AppError('Email đã được sử dụng bởi một tài khoản khác', 400, 'DUPLICATE_EMAIL');
      }
    }

    // 2. Check duplicate code
    if (payload.code) {
      const dupCode = await usersRepository.findDuplicateCode(payload.code, effectiveSchoolId);
      if (dupCode) {
        throw new AppError('Mã định danh đã tồn tại trong trường học', 400, 'DUPLICATE_CODE');
      }
    }

    // 3. Prepare credentials
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const rawPassword = payload.password && payload.password.trim() ? payload.password.trim() : '123456';
    const passwordHash = rawPassword.startsWith('$2') ? rawPassword : bcrypt.hashSync(rawPassword, 10);
    const avatar =
      payload.avatar ||
      `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120&h=120`;

    const userData = {
      id: userId,
      username: payload.username.trim(),
      email: payload.email && payload.email.trim() ? payload.email.trim() : `${payload.username.trim()}@school.edu.vn`,
      passwordHash,
      role: normalizedRole,
      roles: payload.roles || [normalizedRole],
      name: payload.name.trim(),
      code: payload.code && payload.code.trim() ? payload.code.trim() : `NV-${Date.now().toString().slice(-4)}`,
      phone: payload.phone && payload.phone.trim() ? payload.phone.trim() : '',
      avatar,
      schoolId: effectiveSchoolId,
      classId: payload.classId || 'cls_10A1',
    };

    const created = await usersRepository.createUser(userData);

    // 4. Log audit
    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Đã tạo tài khoản mới: ${created.name} (${created.role})`,
      badge: 'Tạo mới',
      badgeType: 'info',
      schoolId: effectiveSchoolId,
      details: `Username: ${created.username}, Mã: ${created.code}`,
    });

    return {
      user: created,
      initialPassword: rawPassword,
    };
  },

  /**
   * Update profile information
   */
  async updateUser(id, updateData, adminUser, schoolId) {
    const user = await this.getUserById(id, adminUser, schoolId);

    // Check duplicate email
    if (updateData.email && updateData.email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const dup = await usersRepository.findDuplicateIdentifier('', updateData.email, id);
      if (dup) {
        throw new AppError('Email đã được sử dụng bởi một tài khoản khác', 400, 'DUPLICATE_EMAIL');
      }
    }

    // Check duplicate code
    if (updateData.code && updateData.code.toLowerCase() !== (user.code || '').toLowerCase()) {
      const dup = await usersRepository.findDuplicateCode(updateData.code, user.school_id, id);
      if (dup) {
        throw new AppError('Mã định danh đã tồn tại trong trường học', 400, 'DUPLICATE_CODE');
      }
    }

    const roleToUpdate = updateData.role ? normalizeRole(updateData.role) : undefined;

    await usersRepository.updateUser(id, {
      ...updateData,
      role: roleToUpdate,
    });

    const updated = await this.getUserById(id, adminUser, schoolId);

    // Audit log
    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Đã cập nhật thông tin tài khoản: ${updated.name}`,
      badge: 'Cập nhật',
      badgeType: 'info',
      schoolId: user.school_id || 'sch_bacau',
      details: `ID: ${id}`,
    });

    return updated;
  },

  /**
   * Update account status (active / disabled / locked)
   */
  async updateStatus(id, { status, reason }, adminUser, schoolId) {
    const user = await this.getUserById(id, adminUser, schoolId);

    if (id === adminUser?.id && status !== 'active') {
      throw new AppError('Bạn không thể tự khóa hoặc vô hiệu hóa tài khoản của chính mình', 400, 'CANNOT_DEACTIVATE_SELF');
    }

    await usersRepository.updateStatus(id, status);

    // If disabling or locking, revoke all active sessions
    if (status !== 'active') {
      await usersRepository.revokeAllSessions(id);
    }

    const actionText = status === 'active' ? 'Kích hoạt tài khoản' : 'Khóa/Vô hiệu hóa tài khoản';
    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `${actionText}: ${user.name} (${user.username})`,
      badge: status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa',
      badgeType: status === 'active' ? 'success' : 'danger',
      schoolId: user.school_id || 'sch_bacau',
      details: reason || `Trạng thái mới: ${status}`,
    });

    return {
      success: true,
      userId: id,
      status,
      message: `Tài khoản ${user.name} đã được chuyển sang trạng thái "${status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}"`,
    };
  },

  /**
   * Assign and sync roles for a user
   */
  async assignRoles(id, { role, roles }, adminUser, schoolId) {
    const user = await this.getUserById(id, adminUser, schoolId);

    const primaryRole = normalizeRole(role || roles[0]);
    const normalizedRoles = (roles || [primaryRole]).map(normalizeRole);

    const updatedRoles = await usersRepository.updateRoles(
      id,
      primaryRole,
      normalizedRoles,
      user.school_id || 'sch_bacau'
    );

    // Invalidate sessions so that new permissions are re-evaluated
    await usersRepository.revokeAllSessions(id);

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Phân công lại vai trò cho: ${user.name} -> [${updatedRoles.join(', ')}]`,
      badge: 'Phân quyền',
      badgeType: 'warning',
      schoolId: user.school_id || 'sch_bacau',
      details: `Primary Role: ${primaryRole}`,
    });

    return {
      success: true,
      userId: id,
      role: primaryRole,
      roles: updatedRoles,
      message: `Đã cập nhật vai trò phân quyền cho ${user.name} thành công!`,
    };
  },

  /**
   * Reset credentials securely and invalidate sessions
   */
  async resetPassword(id, { newPassword, mustChangePassword = true }, adminUser, schoolId) {
    const user = await this.getUserById(id, adminUser, schoolId);

    const temporaryPassword = newPassword && newPassword.trim() ? newPassword.trim() : '123456';
    const passwordHash = bcrypt.hashSync(temporaryPassword, 10);

    await usersRepository.resetPassword(id, passwordHash, mustChangePassword);
    await usersRepository.revokeAllSessions(id);

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Đặt lại mật khẩu cho tài khoản: ${user.name} (${user.username})`,
      badge: 'Đặt lại mật khẩu',
      badgeType: 'warning',
      schoolId: user.school_id || 'sch_bacau',
      details: 'Yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo',
    });

    return {
      success: true,
      userId: id,
      temporaryPassword,
      message: `Đặt lại mật khẩu cho ${user.name} thành công! Mật khẩu tạm thời: ${temporaryPassword}`,
    };
  },

  /**
   * Delete user with academic history protection
   */
  async deleteUser(id, adminUser, schoolId) {
    const user = await this.getUserById(id, adminUser, schoolId);

    if (id === adminUser?.id) {
      throw new AppError('Bạn không thể tự xóa tài khoản của chính mình', 400, 'CANNOT_DELETE_SELF');
    }

    // Check academic history constraint: "Do not permanently delete users with academic history"
    const hasHistory = await usersRepository.hasAcademicHistory(id);

    if (hasHistory) {
      // Safely deactivate instead of hard deleting
      await usersRepository.updateStatus(id, 'disabled');
      await usersRepository.revokeAllSessions(id);

      await usersRepository.logAudit({
        actorId: adminUser?.id,
        actorName: adminUser?.name || 'Quản trị viên',
        role: adminUser?.role || 'school_admin',
        action: `Vô hiệu hóa tài khoản (bảo toàn lịch sử học vụ): ${user.name}`,
        badge: 'Bảo toàn học vụ',
        badgeType: 'warning',
        schoolId: user.school_id || 'sch_bacau',
        details: 'Không thể xóa vĩnh viễn do có dữ liệu điểm số/bài nộp/chuyên cần',
      });

      return {
        success: true,
        softDeactivated: true,
        message: 'Tài khoản có dữ liệu học vụ lịch sử (điểm số, bài nộp hoặc hồ sơ lớp) nên không thể xóa vĩnh viễn. Hệ thống đã tự động chuyển trạng thái tài khoản sang "Vô hiệu hóa".',
      };
    }

    // No academic history: safe to delete permanently
    await usersRepository.deleteUser(id);

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Đã xóa tài khoản: ${user.name} (${user.username})`,
      badge: 'Xóa tài khoản',
      badgeType: 'danger',
      schoolId: user.school_id || 'sch_bacau',
      details: `Username: ${user.username}, Role: ${user.role}`,
    });

    return {
      success: true,
      softDeactivated: false,
      message: `Đã xóa tài khoản ${user.name} thành công khỏi hệ thống!`,
    };
  },
};
