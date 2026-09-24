/**
 * Department Head Module Service
 * G33: Business logic with department scoping enforcement.
 */

import { departmentHeadRepository } from './department-head.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { ROLES } from '../../shared/auth/rbac.registry.js';

export const departmentHeadService = {
  // =========================================================================
  // HELPER: Get and validate department for user
  // =========================================================================

  /**
   * Get the department that the user is head of.
   * Enforces domain isolation — department head can only access their own department.
   */
  async getMyDepartment(user, schoolId) {
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';
    const teacherId = user?.teacherId || user?.teacher_id || user?.id;

    if (!teacherId) {
      throw new AppError('Người dùng không phải là giáo viên', 403, 'NOT_A_TEACHER');
    }

    const dept = await departmentHeadRepository.getMyDepartment(effectiveSchoolId, teacherId);

    if (!dept) {
      throw new AppError(
        'Bạn không phải là Trưởng bộ môn của bất kỳ tổ chuyên môn nào',
        403,
        'NOT_DEPARTMENT_HEAD'
      );
    }

    return dept;
  },

  /**
   * Validate department access — ensure user is head of the requested department.
   */
  async validateDepartmentAccess(user, departmentId, schoolId) {
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';
    const teacherId = user?.teacherId || user?.teacher_id || user?.id;

    if (!departmentId) {
      throw new AppError('ID tổ chuyên môn là bắt buộc', 400, 'MISSING_DEPARTMENT_ID');
    }

    // Check if user is head of this specific department
    const isHead = await departmentHeadRepository.isDepartmentHead(
      effectiveSchoolId,
      teacherId,
      departmentId
    );

    if (!isHead) {
      throw new AppError(
        'Bạn không có quyền truy cập tổ chuyên môn này',
        403,
        'DEPARTMENT_ACCESS_DENIED'
      );
    }

    return true;
  },

  // =========================================================================
  // 1. DEPARTMENT OVERVIEW (Dashboard)
  // =========================================================================

  async getDepartmentOverview(user, schoolId) {
    const dept = await this.getMyDepartment(user, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    const overview = await departmentHeadRepository.getDepartmentOverview(dept.id, effectiveSchoolId);

    return {
      department: {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        headTeacherName: dept.head_teacher_name,
      },
      ...overview,
    };
  },

  // =========================================================================
  // 2. DEPARTMENT TEACHERS
  // =========================================================================

  async listTeachers(user, departmentId, schoolId, query = {}) {
    // Validate access to this department
    await this.validateDepartmentAccess(user, departmentId, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    return departmentHeadRepository.findDepartmentTeachers(departmentId, effectiveSchoolId, query);
  },

  // =========================================================================
  // 3. DEPARTMENT SUBJECTS
  // =========================================================================

  async listSubjects(user, departmentId, schoolId, query = {}) {
    await this.validateDepartmentAccess(user, departmentId, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    return departmentHeadRepository.findDepartmentSubjects(departmentId, effectiveSchoolId, query);
  },

  // =========================================================================
  // 4. DEPARTMENT CLASSES
  // =========================================================================

  async listClasses(user, departmentId, schoolId, query = {}) {
    await this.validateDepartmentAccess(user, departmentId, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    return departmentHeadRepository.findDepartmentClasses(departmentId, effectiveSchoolId, query);
  },

  // =========================================================================
  // 5. CLASS/SUBJECT PERFORMANCE
  // =========================================================================

  async getPerformance(user, departmentId, schoolId, query = {}) {
    await this.validateDepartmentAccess(user, departmentId, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    const performance = await departmentHeadRepository.getDepartmentPerformance(
      departmentId,
      effectiveSchoolId,
      query
    );

    return {
      departmentId,
      departmentName: (await departmentHeadRepository.findDepartmentById(departmentId, effectiveSchoolId))?.name || '',
      ...performance,
    };
  },

  // =========================================================================
  // 6. DEPARTMENT ASSIGNMENTS (VISIBILITY)
  // =========================================================================

  async listAssignments(user, departmentId, schoolId, query = {}) {
    await this.validateDepartmentAccess(user, departmentId, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    return departmentHeadRepository.findDepartmentAssignments(departmentId, effectiveSchoolId, query);
  },

  // =========================================================================
  // 7. DEPARTMENT STUDENTS
  // =========================================================================

  async listStudents(user, departmentId, schoolId, query = {}) {
    await this.validateDepartmentAccess(user, departmentId, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    return departmentHeadRepository.findDepartmentStudents(departmentId, effectiveSchoolId, query);
  },

  // =========================================================================
  // 8. UPDATE DEPARTMENT INFO
  // =========================================================================

  async updateDepartment(user, departmentId, payload, schoolId) {
    await this.validateDepartmentAccess(user, departmentId, schoolId);
    const effectiveSchoolId = schoolId || user?.schoolId || user?.school_id || 'sch_bacau';

    // Only allow updating description and headTeacherId
    const allowedFields = {};
    if (payload.description !== undefined) {
      allowedFields.description = payload.description;
    }
    // Note: headTeacherId update is restricted — only school admin can reassign
    // Department head can only view this field

    const updated = await departmentHeadRepository.updateDepartment(
      departmentId,
      effectiveSchoolId,
      allowedFields
    );

    return updated;
  },
};
