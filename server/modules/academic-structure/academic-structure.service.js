/**
 * Academic Structure Module Service
 * Business logic, lifecycle guardrails, business-safe deletion rules, and audit logging.
 */

import { academicStructureRepository } from './academic-structure.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { usersRepository } from '../users/users.repository.js';
import { academicYearsRepository } from '../academic-years/academic-years.repository.js';

export const academicStructureService = {
  // ========================================================================
  // 1. DEPARTMENTS
  // ========================================================================
  async listDepartments(schoolId, query) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    return academicStructureRepository.findDepartments(effectiveSchoolId, query);
  },

  async getDepartmentById(id, schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const dept = await academicStructureRepository.findDepartmentById(id);
    if (!dept) {
      throw new AppError('Không tìm thấy tổ chuyên môn', 404, 'DEPARTMENT_NOT_FOUND');
    }
    if (dept.school_id && dept.school_id !== effectiveSchoolId) {
      throw new AppError('Bạn không có quyền truy cập tổ chuyên môn thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }
    return dept;
  },

  async createDepartment(payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';

    // Duplicate name check
    const dupName = await academicStructureRepository.findDepartmentByName(effectiveSchoolId, payload.name);
    if (dupName) {
      throw new AppError(`Tổ chuyên môn "${payload.name}" đã tồn tại trong trường`, 400, 'DUPLICATE_DEPARTMENT_NAME');
    }

    // Duplicate code check
    if (payload.code) {
      const dupCode = await academicStructureRepository.findDepartmentByCode(effectiveSchoolId, payload.code);
      if (dupCode) {
        throw new AppError(`Mã tổ "${payload.code}" đã được sử dụng`, 400, 'DUPLICATE_DEPARTMENT_CODE');
      }
    }

    const dept = await academicStructureRepository.createDepartment({
      ...payload,
      schoolId: effectiveSchoolId,
    });

    // Audit log
    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Tạo tổ chuyên môn mới: ${dept.name} (${dept.code || 'N/A'})`,
        badge: 'Tổ bộ môn',
        badgeType: 'success',
        schoolId: effectiveSchoolId,
        details: { departmentId: dept.id, name: dept.name, code: dept.code },
      });
    }

    return dept;
  },

  async updateDepartment(id, payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const existing = await academicStructureRepository.findDepartmentById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy tổ chuyên môn cần cập nhật', 404, 'DEPARTMENT_NOT_FOUND');
    }

    if (existing.school_id && existing.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền chỉnh sửa tổ chuyên môn thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    if (payload.name && payload.name !== existing.name) {
      const dup = await academicStructureRepository.findDepartmentByName(effectiveSchoolId, payload.name);
      if (dup && dup.id !== id) {
        throw new AppError(`Tổ chuyên môn "${payload.name}" đã tồn tại trong trường`, 400, 'DUPLICATE_DEPARTMENT_NAME');
      }
    }

    if (payload.code && payload.code !== existing.code) {
      const dup = await academicStructureRepository.findDepartmentByCode(effectiveSchoolId, payload.code);
      if (dup && dup.id !== id) {
        throw new AppError(`Mã tổ "${payload.code}" đã được sử dụng`, 400, 'DUPLICATE_DEPARTMENT_CODE');
      }
    }

    const updated = await academicStructureRepository.updateDepartment(id, effectiveSchoolId, payload);

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Cập nhật tổ chuyên môn: ${updated.name}`,
        badge: 'Tổ bộ môn',
        badgeType: 'info',
        schoolId: effectiveSchoolId,
        details: { departmentId: id, updates: payload },
      });
    }

    return updated;
  },

  async deleteDepartment(id, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const existing = await academicStructureRepository.findDepartmentById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy tổ chuyên môn cần xóa', 404, 'DEPARTMENT_NOT_FOUND');
    }

    if (existing.school_id && existing.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền xóa tổ chuyên môn thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // Business-safe deletion guard
    const { teacherCount, subjectCount } = await academicStructureRepository.getDepartmentMemberCounts(id);
    if (teacherCount > 0 || subjectCount > 0) {
      throw new AppError(
        `Không thể xóa tổ chuyên môn đang có ${teacherCount} giáo viên hoặc ${subjectCount} môn học trực thuộc. Vui lòng chuyển thành viên sang tổ khác trước khi xóa.`,
        409,
        'CANNOT_DELETE_DEPARTMENT_WITH_MEMBERS'
      );
    }

    await academicStructureRepository.deleteDepartment(id, effectiveSchoolId);

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Xóa tổ chuyên môn: ${existing.name}`,
        badge: 'Đã xóa',
        badgeType: 'warning',
        schoolId: effectiveSchoolId,
        details: { departmentId: id, name: existing.name },
      });
    }

    return { id, message: 'Đã xóa tổ chuyên môn thành công' };
  },

  // ========================================================================
  // 2. SUBJECTS
  // ========================================================================
  async listSubjects(schoolId, query) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    return academicStructureRepository.findSubjects(effectiveSchoolId, query);
  },

  async getSubjectById(id, schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const sub = await academicStructureRepository.findSubjectById(id);
    if (!sub) {
      throw new AppError('Không tìm thấy thông tin môn học', 404, 'SUBJECT_NOT_FOUND');
    }
    if (sub.school_id && sub.school_id !== effectiveSchoolId) {
      throw new AppError('Bạn không có quyền truy cập môn học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }
    return sub;
  },

  async createSubject(payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';

    // Duplicate code check
    const dupCode = await academicStructureRepository.findSubjectByCode(effectiveSchoolId, payload.code);
    if (dupCode) {
      throw new AppError(`Mã môn học "${payload.code}" đã tồn tại trên hệ thống`, 400, 'DUPLICATE_SUBJECT_CODE');
    }

    // Validate departmentId if provided
    if (payload.departmentId) {
      const dept = await academicStructureRepository.findDepartmentById(payload.departmentId, effectiveSchoolId);
      if (!dept) {
        throw new AppError('Tổ chuyên môn được chỉ định không tồn tại', 400, 'INVALID_DEPARTMENT');
      }
    }

    const sub = await academicStructureRepository.createSubject({
      ...payload,
      schoolId: effectiveSchoolId,
    });

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Thêm môn học mới: ${sub.name} (${sub.code})`,
        badge: 'Môn học',
        badgeType: 'success',
        schoolId: effectiveSchoolId,
        details: { subjectId: sub.id, name: sub.name, code: sub.code },
      });
    }

    return sub;
  },

  async updateSubject(id, payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const existing = await academicStructureRepository.findSubjectById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy môn học cần cập nhật', 404, 'SUBJECT_NOT_FOUND');
    }

    if (existing.school_id && existing.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền chỉnh sửa môn học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    if (payload.code && payload.code !== existing.code) {
      const dup = await academicStructureRepository.findSubjectByCode(effectiveSchoolId, payload.code);
      if (dup && dup.id !== id) {
        throw new AppError(`Mã môn học "${payload.code}" đã tồn tại`, 400, 'DUPLICATE_SUBJECT_CODE');
      }
    }

    if (payload.departmentId && payload.departmentId !== existing.department_id) {
      const dept = await academicStructureRepository.findDepartmentById(payload.departmentId, effectiveSchoolId);
      if (!dept) {
        throw new AppError('Tổ chuyên môn được chỉ định không tồn tại', 400, 'INVALID_DEPARTMENT');
      }
    }

    const updated = await academicStructureRepository.updateSubject(id, effectiveSchoolId, payload);

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Cập nhật thông tin môn học: ${updated.name}`,
        badge: 'Cập nhật',
        badgeType: 'info',
        schoolId: effectiveSchoolId,
        details: { subjectId: id, updates: payload },
      });
    }

    return updated;
  },

  async deleteSubject(id, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const existing = await academicStructureRepository.findSubjectById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy môn học cần xóa', 404, 'SUBJECT_NOT_FOUND');
    }

    if (existing.school_id && existing.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền xóa môn học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // Business-safe deletion guard
    const { assignmentCount } = await academicStructureRepository.getSubjectUsageCount(id);
    if (assignmentCount > 0) {
      throw new AppError(
        `Không thể xóa môn học "${existing.name}" vì đang có ${assignmentCount} phân công giảng dạy hoặc dữ liệu học vụ liên kết. Hãy chuyển trạng thái môn học sang "Lưu trữ" (archived) để bảo vệ tính toàn vẹn dữ liệu.`,
        409,
        'CANNOT_DELETE_SUBJECT_IN_USE'
      );
    }

    await academicStructureRepository.deleteSubject(id, effectiveSchoolId);

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Xóa môn học: ${existing.name} (${existing.code})`,
        badge: 'Đã xóa',
        badgeType: 'warning',
        schoolId: effectiveSchoolId,
        details: { subjectId: id, name: existing.name },
      });
    }

    return { id, message: 'Đã xóa môn học thành công' };
  },

  // ========================================================================
  // 3. CLASSES
  // ========================================================================
  async listClasses(schoolId, query) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    return academicStructureRepository.findClasses(effectiveSchoolId, query);
  },

  async getClassById(id, schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const cls = await academicStructureRepository.findClassById(id);
    if (!cls) {
      throw new AppError('Không tìm thấy thông tin lớp học', 404, 'CLASS_NOT_FOUND');
    }
    if (cls.school_id && cls.school_id !== effectiveSchoolId) {
      throw new AppError('Bạn không có quyền truy cập lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }
    return cls;
  },

  async getClassStudents(id, schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const cls = await academicStructureRepository.findClassById(id);
    if (!cls) {
      throw new AppError('Không tìm thấy thông tin lớp học', 404, 'CLASS_NOT_FOUND');
    }
    if (cls.school_id && cls.school_id !== effectiveSchoolId) {
      throw new AppError('Bạn không có quyền truy cập lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }
    return academicStructureRepository.getClassEnrolledStudents(id, effectiveSchoolId);
  },

  async createClass(payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';

    // Resolve academic year if not provided
    let yearId = payload.academicYearId;
    let yearStr = payload.academicYear;

    if (!yearId && !yearStr) {
      const currentCycle = await academicYearsRepository.findCurrent(effectiveSchoolId);
      if (currentCycle?.year) {
        yearId = currentCycle.year.id;
        yearStr = currentCycle.year.name;
      } else {
        yearId = 'ay_2024_2025';
        yearStr = '2024 - 2025';
      }
    } else if (yearId && !yearStr) {
      const yr = await academicYearsRepository.findById(yearId, effectiveSchoolId);
      if (yr) {
        yearStr = yr.name;
      }
    }

    // Duplicate check: Same class name in same academic year and school
    const dup = await academicStructureRepository.findClassByNameAndYear(effectiveSchoolId, payload.name, yearId, yearStr);
    if (dup) {
      throw new AppError(`Lớp học "${payload.name}" đã tồn tại trong năm học này`, 400, 'DUPLICATE_CLASS_NAME');
    }

    // Verify homeroom teacher if provided
    if (payload.homeroomTeacherId) {
      const teacherUser = await usersRepository.findById(payload.homeroomTeacherId);
      if (!teacherUser) {
        throw new AppError('Giáo viên chủ nhiệm được chỉ định không tồn tại trong hệ thống', 400, 'INVALID_HOMEROOM_TEACHER');
      }
    }

    const cls = await academicStructureRepository.createClass({
      ...payload,
      academicYearId: yearId,
      academicYear: yearStr,
      schoolId: effectiveSchoolId,
    });

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Mở lớp học mới: Lớp ${cls.name} (Khối ${cls.grade_level}, ${cls.academic_year})`,
        badge: `Khối ${cls.grade_level}`,
        badgeType: 'success',
        schoolId: effectiveSchoolId,
        details: { classId: cls.id, name: cls.name, gradeLevel: cls.grade_level, room: cls.room },
      });
    }

    return cls;
  },

  async updateClass(id, payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const existing = await academicStructureRepository.findClassById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin lớp học', 404, 'CLASS_NOT_FOUND');
    }

    if (existing.school_id && existing.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền chỉnh sửa lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    if (payload.name && (payload.name !== existing.name || payload.academicYearId !== existing.academic_year_id)) {
      const targetYearId = payload.academicYearId || existing.academic_year_id;
      const targetYearStr = payload.academicYear || existing.academic_year;
      const dup = await academicStructureRepository.findClassByNameAndYear(effectiveSchoolId, payload.name, targetYearId, targetYearStr);
      if (dup && dup.id !== id) {
        throw new AppError(`Lớp học "${payload.name}" đã tồn tại trong năm học này`, 400, 'DUPLICATE_CLASS_NAME');
      }
    }

    if (payload.homeroomTeacherId && payload.homeroomTeacherId !== existing.homeroom_teacher_id) {
      const teacherUser = await usersRepository.findById(payload.homeroomTeacherId);
      if (!teacherUser) {
        throw new AppError('Giáo viên chủ nhiệm được chỉ định không tồn tại', 400, 'INVALID_HOMEROOM_TEACHER');
      }
    }

    const updated = await academicStructureRepository.updateClass(id, effectiveSchoolId, payload);

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Cập nhật thông tin lớp học: ${updated.name}`,
        badge: 'Cập nhật',
        badgeType: 'info',
        schoolId: effectiveSchoolId,
        details: { classId: id, updates: payload },
      });
    }

    return updated;
  },

  async archiveClass(id, adminUser, schoolId) {
    return this.updateClass(id, { status: 'archived' }, adminUser, schoolId);
  },

  async deleteClass(id, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const existing = await academicStructureRepository.findClassById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin lớp học cần xóa', 404, 'CLASS_NOT_FOUND');
    }

    if (existing.school_id && existing.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền xóa lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // Business-Safe Deletion Rule:
    // Historical classes with enrolled students or assignments CANNOT be deleted.
    const { studentCount, assignmentCount } = await academicStructureRepository.getClassDependenciesCount(id);
    if (studentCount > 0 || assignmentCount > 0) {
      throw new AppError(
        `Không thể xóa lớp học "${existing.name}" vì có ${studentCount} học sinh ghi danh hoặc bài tập/điểm số liên kết. Vui lòng chuyển trạng thái lớp sang "Lưu trữ" (archived) để bảo toàn dữ liệu học bạ số.`,
        409,
        'CANNOT_DELETE_CLASS_WITH_ENROLLMENTS'
      );
    }

    await academicStructureRepository.deleteClass(id, effectiveSchoolId);

    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Xóa lớp học trống: ${existing.name}`,
        badge: 'Đã xóa',
        badgeType: 'warning',
        schoolId: effectiveSchoolId,
        details: { classId: id, name: existing.name },
      });
    }

    return { id, message: 'Đã xóa lớp học thành công' };
  },
};
