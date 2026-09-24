/**
 * RBAC & Granular Permission Middleware Engine
 * Enforces authentication, permission validation, ownership rules, and school scope boundaries.
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './jwt.utils.js';
import { validateTenantPrivilegeEscalation } from './tenant.middleware.js';
import { resolvePermissionsForUser, normalizeRole, ROLES } from './rbac.registry.js';
import { logSecurityEvent } from './securityLogger.js';

/**
 * Enhanced Authentication Middleware.
 * Decodes JWT, attaches user with permissions and helper inspection methods.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Yêu cầu đăng nhập để truy cập',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      const status = err.name === 'TokenExpiredError' ? 401 : 403;
      return res.status(status).json({
        success: false,
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại',
      });
    }

    // Attach user object and resolve permissions
    req.user = decodedUser;
    req.schoolId = decodedUser.schoolId || decodedUser.school_id || 'sch_bacau';

    // Populate resolved permissions
    const permissions = resolvePermissionsForUser(decodedUser);
    req.user.permissions = permissions;

    // Attach inspection helpers
    req.user.hasPermission = (perm) => {
      if (decodedUser.role === ROLES.SUPER_ADMIN) return true;
      return permissions.includes(perm);
    };

    req.user.hasAnyPermission = (...perms) => {
      if (decodedUser.role === ROLES.SUPER_ADMIN) return true;
      const targetPerms = perms.flat();
      return targetPerms.some((p) => permissions.includes(p));
    };

    req.user.hasAllPermissions = (...perms) => {
      if (decodedUser.role === ROLES.SUPER_ADMIN) return true;
      const targetPerms = perms.flat();
      return targetPerms.every((p) => permissions.includes(p));
    };

    req.user.hasRole = (...roles) => {
      const userNormRole = normalizeRole(decodedUser.role);
      const targetRoles = roles.flat().map(normalizeRole);
      return targetRoles.includes(userNormRole);
    };

    if (validateTenantPrivilegeEscalation(req, res)) {
      next();
    }
  });
}

/**
 * Backward compatibility alias for authenticateToken
 */
export const authenticateToken = authenticate;

/**
 * Enforces that user possesses all required permissions.
 * @param {...string} permissions
 */
export function requirePermission(...permissions) {
  const required = permissions.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để truy cập',
      });
    }

    if (!req.user.hasAllPermissions(...required)) {
      logSecurityEvent('AUTH_PERMISSION_DENIED', {
        userId: req.user.id,
        role: req.user.role,
        required,
        userPermissions: req.user.permissions,
        path: req.originalUrl || req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PERMISSION',
        message: `Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền: ${required.join(', ')}`,
        required,
      });
    }

    next();
  };
}

/**
 * Enforces that user possesses at least one of the specified permissions.
 * @param {...string} permissions
 */
export function requireAnyPermission(...permissions) {
  const required = permissions.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để truy cập',
      });
    }

    if (!req.user.hasAnyPermission(...required)) {
      logSecurityEvent('AUTH_ANY_PERMISSION_DENIED', {
        userId: req.user.id,
        role: req.user.role,
        required,
        path: req.originalUrl || req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PERMISSION',
        message: `Bạn không có quyền thực hiện thao tác này. Yêu cầu một trong các quyền: ${required.join(', ')}`,
        required,
      });
    }

    next();
  };
}

/**
 * Enforces resource ownership or administrative management override.
 * @param {(req: any) => string | Promise<string>} getOwnerIdFn
 * @param {object} [options]
 * @param {string[]} [options.managerPermissions=['school.manage', 'user.update']]
 * @param {(req: any) => boolean | Promise<boolean>} [options.customCheck]
 */
export function requireOwnership(getOwnerIdFn, {
  managerPermissions = ['school.manage', 'user.update'],
  customCheck = null,
} = {}) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để truy cập',
      });
    }

    // Super Admin bypass
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Manager / Admin permission override
    if (typeof req.user.hasAnyPermission === 'function' && req.user.hasAnyPermission(...managerPermissions)) {
      return next();
    }

    // Custom ownership / relationship evaluation
    if (typeof customCheck === 'function') {
      const allowed = await customCheck(req);
      if (allowed) return next();
    }

    // Direct owner id comparison
    try {
      const ownerId = typeof getOwnerIdFn === 'function' ? await getOwnerIdFn(req) : null;
      if (ownerId && String(ownerId) === String(req.user.id)) {
        return next();
      }
    } catch (err) {
      return next(err);
    }

    logSecurityEvent('AUTH_OWNERSHIP_DENIED', {
      userId: req.user.id,
      role: req.user.role,
      path: req.originalUrl || req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_OWNERSHIP',
      message: 'Bạn không có quyền truy cập hoặc chỉnh sửa tài nguyên của người dùng khác',
    });
  };
}

/**
 * Enforces school-level tenant boundary.
 * @param {(req: any) => string | Promise<string>} getTargetSchoolIdFn
 */
export function requireSchoolScope(getTargetSchoolIdFn) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để truy cập',
      });
    }

    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const currentSchoolId = req.schoolId || req.user.schoolId || 'sch_bacau';
    const targetSchoolId = await getTargetSchoolIdFn(req);

    if (targetSchoolId && targetSchoolId !== currentSchoolId) {
      logSecurityEvent('TENANT_ACCESS_DENIED', {
        userId: req.user.id,
        currentSchoolId,
        targetSchoolId,
        path: req.originalUrl || req.path,
      });

      return res.status(403).json({
        success: false,
        code: 'TENANT_FORBIDDEN',
        message: 'Bạn không có quyền truy cập dữ liệu thuộc trường học khác',
      });
    }

    next();
  };
}
