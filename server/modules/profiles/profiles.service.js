/**
 * Profiles Module Service
 * Business logic layer for normalized Teacher, Student, and Parent profiles.
 * Enforces tenant scoping, relationship verification, and audit trail logging.
 */

import { profilesRepository } from './profiles.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { AppError } from '../../shared/errors/index.js';

export const profilesService = {
  // ========================================================================
  // TEACHER SERVICES
  // ========================================================================

  async getTeacherProfile(idOrUserId, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const currentSchoolId = currentUser?.schoolId || currentUser?.school_id || 'sch_bacau';

    const teacher = await profilesRepository.findTeacherById(idOrUserId);
    if (!teacher) {
      throw new AppError('Không tìm thấy hồ sơ giáo viên', 404, 'TEACHER_NOT_FOUND');
    }

    if (!isSuperAdmin && teacher.school_id && teacher.school_id !== currentSchoolId) {
      throw new AppError('Bạn không có quyền truy cập hồ sơ giáo viên thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    return teacher;
  },

  async listTeachers(query, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const schoolId = isSuperAdmin ? null : (currentUser?.schoolId || currentUser?.school_id || 'sch_bacau');

    const result = await profilesRepository.findTeachers({
      ...query,
      schoolId,
    });

    const totalPages = Math.ceil(result.total / (query.limit || 50)) || 1;
    return {
      teachers: result.teachers,
      pagination: {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 50,
        total: result.total,
        totalPages,
      },
    };
  },

  async createTeacherProfile(data, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const schoolId = isSuperAdmin ? (data.schoolId || 'sch_bacau') : (currentUser?.schoolId || currentUser?.school_id || 'sch_bacau');

    const created = await profilesRepository.createTeacher({
      ...data,
      schoolId,
    });

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Hệ thống',
      role: currentUser?.role || 'admin',
      action: `Tạo hồ sơ giáo viên: ${created.name} (${created.employee_id || created.code || 'N/A'})`,
      badge: 'Hồ sơ sư phạm',
      badgeType: 'info',
      schoolId,
      entityType: 'teacher',
      entityId: created.id,
      details: `Tổ: ${created.department_name || 'Chưa gán'}, Trình độ: ${created.qualification || 'Cử nhân'}`,
    });

    return created;
  },

  async updateTeacherProfile(id, data, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const currentSchoolId = currentUser?.schoolId || currentUser?.school_id || 'sch_bacau';

    const existing = await profilesRepository.findTeacherById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy hồ sơ giáo viên', 404, 'TEACHER_NOT_FOUND');
    }

    if (!isSuperAdmin && existing.school_id && existing.school_id !== currentSchoolId) {
      throw new AppError('Bạn không có quyền chỉnh sửa giáo viên thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    const updated = await profilesRepository.updateTeacher(id, data);

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Quản trị viên',
      role: currentUser?.role || 'admin',
      action: `Cập nhật hồ sơ giáo viên: ${updated.name}`,
      badge: 'Cập nhật hồ sơ',
      badgeType: 'info',
      schoolId: existing.school_id,
      entityType: 'teacher',
      entityId: updated.id,
      details: `Trạng thái: ${updated.status}, Lớp chủ nhiệm: ${updated.homeroom_class_name || 'Không'}`,
    });

    return updated;
  },

  // ========================================================================
  // STUDENT SERVICES
  // ========================================================================

  async getStudentProfile(idOrUserId, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const currentSchoolId = currentUser?.schoolId || currentUser?.school_id || 'sch_bacau';

    const student = await profilesRepository.findStudentById(idOrUserId);
    if (!student) {
      throw new AppError('Không tìm thấy hồ sơ học sinh', 404, 'STUDENT_NOT_FOUND');
    }

    if (!isSuperAdmin && student.school_id && student.school_id !== currentSchoolId) {
      throw new AppError('Bạn không có quyền truy cập học sinh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // If requester is a parent, enforce parent-student relationship check
    if (currentUser?.role === 'parent') {
      const hasAccess = await profilesRepository.checkParentStudentAccess(currentUser.id, student.id);
      if (!hasAccess) {
        throw new AppError('Bạn không có quyền truy cập hồ sơ học sinh này', 403, 'FORBIDDEN_PARENT_ACCESS');
      }
    }

    // Attach guardians
    const guardians = await profilesRepository.findStudentGuardians(student.id);
    return { ...student, guardians };
  },

  async listStudents(query, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const schoolId = isSuperAdmin ? null : (currentUser?.schoolId || currentUser?.school_id || 'sch_bacau');

    const result = await profilesRepository.findStudents({
      ...query,
      schoolId,
    });

    const totalPages = Math.ceil(result.total / (query.limit || 50)) || 1;
    return {
      students: result.students,
      pagination: {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 50,
        total: result.total,
        totalPages,
      },
    };
  },

  async createStudentProfile(data, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const schoolId = isSuperAdmin ? (data.schoolId || 'sch_bacau') : (currentUser?.schoolId || currentUser?.school_id || 'sch_bacau');

    const created = await profilesRepository.createStudent({
      ...data,
      schoolId,
    });

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Hệ thống',
      role: currentUser?.role || 'admin',
      action: `Tạo hồ sơ học sinh: ${created.name} (${created.student_code || created.code || 'N/A'})`,
      badge: 'Học vụ',
      badgeType: 'info',
      schoolId,
      entityType: 'student',
      entityId: created.id,
      details: `Lớp: ${created.class_name || 'Chưa xếp lớp'}, Trạng thái: ${created.enrollment_status}`,
    });

    return created;
  },

  async updateStudentProfile(id, data, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const currentSchoolId = currentUser?.schoolId || currentUser?.school_id || 'sch_bacau';

    const existing = await profilesRepository.findStudentById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy hồ sơ học sinh', 404, 'STUDENT_NOT_FOUND');
    }

    if (!isSuperAdmin && existing.school_id && existing.school_id !== currentSchoolId) {
      throw new AppError('Bạn không có quyền chỉnh sửa học sinh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    const updated = await profilesRepository.updateStudent(id, data);

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Quản trị viên',
      role: currentUser?.role || 'admin',
      action: `Cập nhật hồ sơ học sinh: ${updated.name}`,
      badge: 'Cập nhật học vụ',
      badgeType: 'info',
      schoolId: existing.school_id,
      entityType: 'student',
      entityId: updated.id,
      details: `Lớp hiện tại: ${updated.class_name || 'N/A'}, Trạng thái: ${updated.enrollment_status}`,
    });

    return updated;
  },

  async getStudentGuardians(studentId, currentUser) {
    await this.getStudentProfile(studentId, currentUser);
    return profilesRepository.findStudentGuardians(studentId);
  },

  async assignStudentGuardian(studentId, guardianData, currentUser) {
    const student = await this.getStudentProfile(studentId, currentUser);
    const parent = await profilesRepository.findParentById(guardianData.parentId);
    if (!parent) {
      throw new AppError('Không tìm thấy hồ sơ phụ huynh chỉ định', 404, 'PARENT_NOT_FOUND');
    }

    const assigned = await profilesRepository.assignGuardian({
      parentId: parent.id,
      studentId: student.id,
      relationship: guardianData.relationship || 'guardian',
      isPrimaryContact: guardianData.isPrimaryContact !== false,
      isVerified: guardianData.isVerified !== false,
    });

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Quản trị viên',
      role: currentUser?.role || 'admin',
      action: `Gán người giám hộ: ${parent.name} -> Học sinh ${student.name}`,
      badge: 'Người giám hộ',
      badgeType: 'info',
      schoolId: student.school_id,
      details: `Quan hệ: ${assigned.relationship}, Liên hệ chính: ${assigned.isPrimaryContact ? 'Có' : 'Không'}`,
    });

    return assigned;
  },

  async removeStudentGuardian(studentId, parentId, currentUser) {
    const student = await this.getStudentProfile(studentId, currentUser);
    await profilesRepository.removeGuardian(parentId, student.id);

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Quản trị viên',
      role: currentUser?.role || 'admin',
      action: `Gỡ bỏ liên kết người giám hộ học sinh ${student.name}`,
      badge: 'Gỡ giám hộ',
      badgeType: 'warning',
      schoolId: student.school_id,
    });

    return { success: true, message: 'Đã gỡ bỏ người giám hộ thành công' };
  },

  // ========================================================================
  // PARENT SERVICES
  // ========================================================================

  async getParentProfile(idOrUserId, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const currentSchoolId = currentUser?.schoolId || currentUser?.school_id || 'sch_bacau';

    const parent = await profilesRepository.findParentById(idOrUserId);
    if (!parent) {
      throw new AppError('Không tìm thấy hồ sơ phụ huynh', 404, 'PARENT_NOT_FOUND');
    }

    if (!isSuperAdmin && parent.school_id && parent.school_id !== currentSchoolId) {
      throw new AppError('Bạn không có quyền truy cập phụ huynh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    const children = await profilesRepository.findParentChildren(parent.user_id, isSuperAdmin ? null : currentSchoolId);
    return { ...parent, children };
  },

  async listParents(query, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const schoolId = isSuperAdmin ? null : (currentUser?.schoolId || currentUser?.school_id || 'sch_bacau');

    const result = await profilesRepository.findParents({
      ...query,
      schoolId,
    });

    const totalPages = Math.ceil(result.total / (query.limit || 50)) || 1;
    return {
      parents: result.parents,
      pagination: {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 50,
        total: result.total,
        totalPages,
      },
    };
  },

  async createParentProfile(data, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const schoolId = isSuperAdmin ? (data.schoolId || 'sch_bacau') : (currentUser?.schoolId || currentUser?.school_id || 'sch_bacau');

    const created = await profilesRepository.createParent({
      ...data,
      schoolId,
    });

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Hệ thống',
      role: currentUser?.role || 'admin',
      action: `Tạo hồ sơ phụ huynh: ${created.name}`,
      badge: 'Phụ huynh',
      badgeType: 'info',
      schoolId,
      entityType: 'parent',
      entityId: created.id,
      details: `Nghề nghiệp: ${created.occupation || 'Chưa cập nhật'}, ĐT: ${created.contact_phone || 'N/A'}`,
    });

    return created;
  },

  async updateParentProfile(id, data, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const currentSchoolId = currentUser?.schoolId || currentUser?.school_id || 'sch_bacau';

    const existing = await profilesRepository.findParentById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy hồ sơ phụ huynh', 404, 'PARENT_NOT_FOUND');
    }

    if (!isSuperAdmin && existing.school_id && existing.school_id !== currentSchoolId) {
      throw new AppError('Bạn không có quyền chỉnh sửa phụ huynh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    const updated = await profilesRepository.updateParent(id, data);

    await usersRepository.logAudit({
      actorId: currentUser?.id,
      actorName: currentUser?.name || 'Quản trị viên',
      role: currentUser?.role || 'admin',
      action: `Cập nhật hồ sơ phụ huynh: ${updated.name}`,
      badge: 'Cập nhật phụ huynh',
      badgeType: 'info',
      schoolId: existing.school_id,
      entityType: 'parent',
      entityId: updated.id,
    });

    return updated;
  },

  async getParentChildren(parentUserId, currentUser) {
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin === true;
    const currentSchoolId = currentUser?.schoolId || currentUser?.school_id || 'sch_bacau';

    // Verify requesting parent or admin
    if (currentUser?.role === 'parent' && currentUser.id !== parentUserId) {
      throw new AppError('Bạn không có quyền xem danh sách con của phụ huynh khác', 403, 'FORBIDDEN_PARENT_ACCESS');
    }

    return profilesRepository.findParentChildren(parentUserId, isSuperAdmin ? null : currentSchoolId);
  },

  async validateParentStudentAccess(parentUserId, studentId) {
    const relation = await profilesRepository.checkParentStudentAccess(parentUserId, studentId);
    if (!relation) {
      throw new AppError('Bạn không có quyền thực hiện thao tác trên học sinh này', 403, 'FORBIDDEN_PARENT_ACCESS');
    }
    return relation;
  },
};
