/**
 * Multi-School Tenant Isolation Middleware
 * Enforces strict school scoping and prevents client privilege escalation.
 */

import { TenantForbiddenError } from '../errors/AppError.js';

/**
 * Check and prevent privilege escalation via client-supplied schoolId.
 * Returns true if allowed, false if rejected (response already sent).
 * 
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {boolean}
 */
export function validateTenantPrivilegeEscalation(req, res) {
  if (!req.user) return true;

  const userSchoolId = req.user.schoolId || req.user.school_id || 'sch_bacau';
  const isSuperAdmin = req.user.role === 'super_admin' || req.user.isSuperAdmin === true;

  const clientSuppliedSchoolId =
    req.query?.schoolId ||
    req.query?.school_id ||
    req.body?.schoolId ||
    req.body?.school_id ||
    req.params?.schoolId ||
    req.params?.school_id;

  if (clientSuppliedSchoolId && String(clientSuppliedSchoolId).trim() !== userSchoolId) {
    if (!isSuperAdmin) {
      res.status(403).json({
        success: false,
        code: 'TENANT_FORBIDDEN',
        message: 'Truy cập trái phép vào dữ liệu trường khác (Cross-tenant access forbidden)',
      });
      return false;
    }
    req.schoolId = String(clientSuppliedSchoolId).trim();
    return true;
  }

  req.schoolId = userSchoolId;
  if (req.body && typeof req.body === 'object') {
    req.body.schoolId = userSchoolId;
    req.body.school_id = userSchoolId;
  }
  return true;
}

/**
 * Middleware: Enforces tenant scoping on incoming requests.
 * 1. Checks that req.user is populated.
 * 2. Derives tenant school ID from verified identity (JWT).
 * 3. Rejects attempts by non-super-admins to supply or override schoolId in query/body/params.
 * 4. Injects req.schoolId for downstream controllers, services, and repositories.
 */
export function enforceTenantScoping(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Yêu cầu đăng nhập để truy cập tài nguyên trường học',
    });
  }

  if (validateTenantPrivilegeEscalation(req, res)) {
    next();
  }
}


/**
 * Assert that a requested resource belongs to the current tenant school.
 * Throws TenantForbiddenError if cross-school violation is detected.
 * 
 * @param {object} req - Express request object containing req.schoolId and req.user
 * @param {string} resourceSchoolId - The school_id of the entity being accessed/mutated
 * @param {string} [resourceName='tài nguyên']
 */
export function assertTenantAccess(req, resourceSchoolId, resourceName = 'tài nguyên') {
  if (!resourceSchoolId) return;

  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.isSuperAdmin === true;

  if (resourceSchoolId !== currentSchoolId && !isSuperAdmin) {
    throw new TenantForbiddenError(
      `Không có quyền truy cập ${resourceName} thuộc trường khác`
    );
  }
}
