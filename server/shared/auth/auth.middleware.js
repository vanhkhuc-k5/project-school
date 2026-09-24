/**
 * Authentication & Authorization Middlewares
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './jwt.utils.js';
import { validateTenantPrivilegeEscalation } from './tenant.middleware.js';

export {
  authenticate,
  authenticateToken,
  requirePermission,
  requireAnyPermission,
  requireOwnership,
  requireSchoolScope,
} from './rbac.middleware.js';

import { normalizeRole } from './rbac.registry.js';

/**
 * @deprecated Optional authentication is deprecated for protected domain routes.
 * Preserved only for public landing resources that may personalize content if logged in.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });
      }
      req.user = user;
      req.schoolId = user.schoolId || user.school_id || 'sch_bacau';
      if (validateTenantPrivilegeEscalation(req, res)) {
        next();
      }
    });
  } else {
    req.schoolId = 'sch_bacau';
    next();
  }
}

/**
 * Middleware factory: Restricts access to specified roles with role normalization.
 * @param {...string} roles
 */
export function requireRole(...roles) {
  const targetRoles = roles.flat().map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực tài khoản' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const userNormRole = normalizeRole(req.user.role);
    if (!targetRoles.includes(userNormRole)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: `Bạn không có quyền truy cập. Yêu cầu vai trò: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Legacy validateInput middleware.
 * @param {...string} fields
 */
export function validateInput(...fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => !req.body[f] || String(req.body[f]).trim() === '');
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Thiếu thông tin bắt buộc: ${missing.join(', ')}`,
      });
    }
    next();
  };
}
