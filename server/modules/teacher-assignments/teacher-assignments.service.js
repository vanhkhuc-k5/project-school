import { teacherAssignmentsRepository } from './teacher-assignments.repository.js';
import { academicStructureRepository } from '../academic-structure/academic-structure.repository.js';
import { academicYearsRepository } from '../academic-years/academic-years.repository.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { withTransaction } from '../../shared/database/transaction.js';
import { isPostgresConfigured, pgQuery } from '../../postgres.js';
import { db } from '../../db.js';
import { AppError } from '../../shared/errors/AppError.js';

export const teacherAssignmentsService = {
  /**
   * Helper to execute a callback in an ACID transaction across engines.
   */
  async runInTransaction(callback) {
    if (isPostgresConfigured()) {
      return withTransaction(callback);
    }
    const tx = db.transaction(() => callback(null));
    return tx();
  },

  /**
   * Helper to resolve the department ID for a department head user.
   */
  async getDepartmentHeadDeptId(userId, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT id FROM departments
        WHERE head_teacher_id = $1
          AND ($2::text IS NULL OR school_id = $2 OR school_id IS NULL)
        LIMIT 1
      `, [userId, schoolId || null]);
      if (res.rows[0]) return res.rows[0].id;

      // Also check teacher profile's department if user role is department_head
      const tchRes = await pgQuery(`SELECT department_id FROM teachers WHERE user_id = $1`, [userId]);
      return tchRes.rows[0]?.department_id || null;
    }

    const dept = db.prepare(`
      SELECT id FROM departments
      WHERE head_teacher_id = ?
        AND (? IS NULL OR school_id = ? OR school_id IS NULL)
      LIMIT 1
    `).get(userId, schoolId || null, schoolId || null);
    if (dept) return dept.id;

    const tch = db.prepare(`SELECT department_id FROM teachers WHERE user_id = ?`).get(userId);
    return tch?.department_id || null;
  },

  /**
   * List teacher assignments with scoping and role-based filtering.
   */
  async getAssignments(query, user, schoolId = null) {
    const effectiveSchoolId = schoolId || user?.schoolId || 'sch_bacau';
    const isElevatedAdmin = ['super_admin', 'school_admin', 'admin', 'principal', 'vice_principal'].includes(user?.role);
    const isDeptHead = user?.role === 'department_head';

    let departmentIdFilter = query.departmentId || null;
    let teacherIdFilter = query.teacherId || null;

    // Regular teacher: restricted strictly to their own assignments
    if (!isElevatedAdmin && !isDeptHead && user?.role === 'teacher') {
      teacherIdFilter = user.id;
    }

    // Department head: if not elevated admin, scope to their department by default
    if (!isElevatedAdmin && isDeptHead) {
      const headDeptId = await this.getDepartmentHeadDeptId(user.id, effectiveSchoolId);
      if (headDeptId) {
        departmentIdFilter = headDeptId;
      }
    }

    return teacherAssignmentsRepository.findAssignments({
      schoolId: effectiveSchoolId,
      teacherId: teacherIdFilter,
      classId: query.classId || null,
      subjectId: query.subjectId || null,
      academicYearId: query.academicYearId || null,
      semesterId: query.semesterId || null,
      departmentId: departmentIdFilter,
      role: query.role || 'all',
      status: query.status || 'all',
      search: query.search || '',
      page: query.page || 1,
      limit: query.limit || 50,
    });
  },

  /**
   * Get "My Classes" for a teacher.
   */
  async getMyClasses(user, schoolId = null, academicYearId = null) {
    const effectiveSchoolId = schoolId || user?.schoolId || 'sch_bacau';

    // If academicYearId not specified, find current active academic year
    let activeYearId = academicYearId;
    if (!activeYearId) {
      const currentYear = await academicYearsRepository.findCurrent(effectiveSchoolId);
      activeYearId = currentYear?.id || 'ay_2024_2025';
    }

    const classes = await teacherAssignmentsRepository.findTeacherAssignedClasses(user.id, {
      schoolId: effectiveSchoolId,
      academicYearId: activeYearId,
    });

    const formattedClasses = classes.map((c) => ({
      ...c,
      teachingSubjects: c.teaching_subjects || [],
      teaching_subjects: c.teaching_subjects || [],
    }));

    return {
      teacherId: user.id,
      teacherName: user.name,
      academicYearId: activeYearId,
      classes: formattedClasses,
      assignedClasses: formattedClasses,
    };
  },

  /**
   * Get single assignment by ID.
   */
  async getAssignmentById(id, user, schoolId = null) {
    const effectiveSchoolId = schoolId || user?.schoolId || 'sch_bacau';
    const assignment = await teacherAssignmentsRepository.findAssignmentById(id, effectiveSchoolId);
    if (!assignment) {
      throw new AppError('Không tìm thấy bản ghi phân công giảng dạy', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    const isElevated = ['super_admin', 'school_admin', 'admin', 'principal', 'vice_principal'].includes(user?.role);
    if (!isElevated) {
      if (user.role === 'teacher' && assignment.teacher_id !== user.id) {
        throw new AppError('Bạn không có quyền xem phân công của giáo viên khác', 403, 'FORBIDDEN');
      }
      if (user.role === 'department_head') {
        const headDeptId = await this.getDepartmentHeadDeptId(user.id, effectiveSchoolId);
        if (headDeptId && assignment.department_id !== headDeptId) {
          throw new AppError('Tổ trưởng chỉ có quyền xem phân công thuộc tổ chuyên môn của mình', 403, 'FORBIDDEN');
        }
      }
    }

    return assignment;
  },

  /**
   * Create a new teacher assignment.
   */
  async createAssignment(payload, actor, schoolId = null) {
    const effectiveSchoolId = schoolId || actor?.schoolId || 'sch_bacau';
    const isElevated = ['super_admin', 'school_admin', 'admin', 'principal', 'vice_principal'].includes(actor?.role);
    const isDeptHead = actor?.role === 'department_head';

    const {
      teacherId,
      classId,
      subjectId,
      academicYearId,
      semesterId,
      role = 'primary',
      startDate = new Date().toISOString().split('T')[0],
      endDate = null,
      notes = null,
    } = payload;

    // 1. Resolve & verify teacher
    const teacherProfile = await profilesRepository.findTeacherById(teacherId);
    let resolvedTeacherUserId = null;
    let resolvedTeacherName = null;

    if (teacherProfile) {
      resolvedTeacherUserId = teacherProfile.user_id;
      resolvedTeacherName = teacherProfile.name;
      if (teacherProfile.school_id && teacherProfile.school_id !== effectiveSchoolId && actor?.role !== 'super_admin') {
        throw new AppError('Không thể phân công giáo viên thuộc trường khác', 403, 'TENANT_FORBIDDEN');
      }
    } else {
      const user = await usersRepository.findById(teacherId);
      if (!user || user.role !== 'teacher') {
        throw new AppError('Không tìm thấy tài khoản giáo viên hợp lệ', 404, 'TEACHER_NOT_FOUND');
      }
      resolvedTeacherUserId = user.id;
      resolvedTeacherName = user.name;
    }

    // 2. Resolve & verify class
    const targetClass = await academicStructureRepository.findClassById(classId);
    if (!targetClass) {
      throw new AppError('Không tìm thấy lớp học', 404, 'CLASS_NOT_FOUND');
    }
    if (targetClass.school_id && targetClass.school_id !== effectiveSchoolId && actor?.role !== 'super_admin') {
      throw new AppError('Không thể phân công vào lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // 3. Resolve & verify subject
    const targetSubject = await academicStructureRepository.findSubjectById(subjectId);
    if (!targetSubject) {
      throw new AppError('Không tìm thấy môn học', 404, 'SUBJECT_NOT_FOUND');
    }
    if (targetSubject.school_id && targetSubject.school_id !== effectiveSchoolId && actor?.role !== 'super_admin') {
      throw new AppError('Không thể phân công môn học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // 4. Department head authorization check
    if (!isElevated && isDeptHead) {
      const headDeptId = await this.getDepartmentHeadDeptId(actor.id, effectiveSchoolId);
      if (headDeptId && targetSubject.department_id !== headDeptId) {
        throw new AppError(
          'Tổ trưởng chuyên môn chỉ được phép phân công các môn học thuộc tổ chuyên môn phụ trách',
          403,
          'DEPARTMENT_HEAD_SCOPE_EXCEEDED'
        );
      }
    }

    // 5. Resolve academic year
    let finalAcademicYearId = academicYearId || targetClass.academic_year_id;
    let finalAcademicYearName = targetClass.academic_year || '2024-2025';

    if (!finalAcademicYearId) {
      const currentYear = await academicYearsRepository.findCurrent(effectiveSchoolId);
      finalAcademicYearId = currentYear?.id || 'ay_2024_2025';
      finalAcademicYearName = currentYear?.name || '2024 - 2025';
    }
    
    // 5.1 Validate semester if provided
    if (semesterId) {
      const sem = await teacherAssignmentsRepository.findSemesterById(semesterId);
      if (!sem) {
        throw new AppError(`Không tìm thấy học kỳ hợp lệ với mã '${semesterId}'`, 400, 'SEMESTER_NOT_FOUND');
      }
    }

    // 6. Conflict validation: Check primary teacher collision or duplicate assignment
    const conflict = await teacherAssignmentsRepository.checkAssignmentConflict({
      classId,
      subjectId,
      academicYearId: finalAcademicYearId,
      semesterId: semesterId || null,
      teacherId: resolvedTeacherUserId,
      role,
    });

    if (conflict.hasConflict) {
      throw new AppError(conflict.message, 409, conflict.type);
    }

    const assignmentId = `ta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 7. Execute creation inside ACID transaction
    return this.runInTransaction(async (client) => {
      const created = await teacherAssignmentsRepository.createAssignment({
        id: assignmentId,
        schoolId: effectiveSchoolId,
        teacherId: resolvedTeacherUserId,
        classId,
        subjectId,
        academicYear: finalAcademicYearName,
        academicYearId: finalAcademicYearId,
        semesterId: semesterId || null,
        role,
        status: 'active',
        startDate,
        endDate,
        notes,
      }, client);

      // Record audit log
      const auditDetails = JSON.stringify({
        assignmentId,
        teacherId: resolvedTeacherUserId,
        teacherName: resolvedTeacherName,
        classId,
        className: targetClass.name,
        subjectId,
        subjectName: targetSubject.name,
        role,
        academicYearId: finalAcademicYearId,
        semesterId: semesterId || null,
      });

      if (isPostgresConfigured()) {
        const runner = client || { query: (q, p) => pgQuery(q, p) };
        await runner.query(`
          INSERT INTO audit_logs (id, actor_id, actor_name, role, action, entity_type, entity_id, details, badge, badge_type)
          VALUES ($1, $2, $3, $4, $5, 'teacher_assignment', $6, $7, 'Phân công', 'info')
        `, [
          `log_${Date.now()}`,
          actor.id,
          actor.name || 'Quản trị viên',
          actor.role,
          `Phân công giáo viên ${resolvedTeacherName} dạy môn ${targetSubject.name} tại lớp ${targetClass.name} (vai trò: ${role})`,
          assignmentId,
          auditDetails,
        ]);
      } else {
        db.prepare(`
          INSERT INTO audit_logs (id, actor_id, actor_name, role, action, entity_type, entity_id, details, badge, badge_type)
          VALUES (?, ?, ?, ?, ?, 'teacher_assignment', ?, ?, 'Phân công', 'info')
        `).run(
          `log_${Date.now()}`,
          actor.id,
          actor.name || 'Quản trị viên',
          actor.role,
          `Phân công giáo viên ${resolvedTeacherName} dạy môn ${targetSubject.name} tại lớp ${targetClass.name} (vai trò: ${role})`,
          assignmentId,
          auditDetails
        );
      }

      return created;
    });
  },

  /**
   * Update an existing assignment.
   */
  async updateAssignment(id, payload, actor, schoolId = null) {
    const effectiveSchoolId = schoolId || actor?.schoolId || 'sch_bacau';
    const isElevated = ['super_admin', 'school_admin', 'admin', 'principal', 'vice_principal'].includes(actor?.role);
    const isDeptHead = actor?.role === 'department_head';

    const existing = await teacherAssignmentsRepository.findAssignmentById(id, effectiveSchoolId);
    if (!existing) {
      throw new AppError('Không tìm thấy bản ghi phân công giảng dạy', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    if (!isElevated && isDeptHead) {
      const headDeptId = await this.getDepartmentHeadDeptId(actor.id, effectiveSchoolId);
      if (headDeptId && existing.department_id !== headDeptId) {
        throw new AppError('Tổ trưởng chỉ có quyền chỉnh sửa phân công thuộc tổ chuyên môn phụ trách', 403, 'FORBIDDEN');
      }
    }

    // If changing role to 'primary', check conflicts
    if (payload.role === 'primary' && existing.role !== 'primary') {
      const conflict = await teacherAssignmentsRepository.checkAssignmentConflict({
        classId: existing.class_id,
        subjectId: existing.subject_id,
        academicYearId: existing.academic_year_id,
        semesterId: existing.semester_id,
        teacherId: existing.teacher_id,
        role: 'primary',
        excludeId: id,
      });

      if (conflict.hasConflict) {
        throw new AppError(conflict.message, 409, conflict.type);
      }
    }

    return this.runInTransaction(async (client) => {
      const updated = await teacherAssignmentsRepository.updateAssignment(id, payload, client);

      // Audit log
      const auditMsg = `Cập nhật phân công giảng dạy ${existing.teacher_name} - lớp ${existing.class_name} - môn ${existing.subject_name}`;
      if (isPostgresConfigured()) {
        const runner = client || { query: (q, p) => pgQuery(q, p) };
        await runner.query(`
          INSERT INTO audit_logs (id, actor_id, actor_name, role, action, entity_type, entity_id, details, badge, badge_type)
          VALUES ($1, $2, $3, $4, $5, 'teacher_assignment', $6, $7, 'Cập nhật', 'warning')
        `, [
          `log_${Date.now()}`,
          actor.id,
          actor.name || 'Quản trị viên',
          actor.role,
          auditMsg,
          id,
          JSON.stringify(payload),
        ]);
      } else {
        db.prepare(`
          INSERT INTO audit_logs (id, actor_id, actor_name, role, action, entity_type, entity_id, details, badge, badge_type)
          VALUES (?, ?, ?, ?, ?, 'teacher_assignment', ?, ?, 'Cập nhật', 'warning')
        `).run(
          `log_${Date.now()}`,
          actor.id,
          actor.name || 'Quản trị viên',
          actor.role,
          auditMsg,
          id,
          JSON.stringify(payload)
        );
      }

      return updated;
    });
  },

  /**
   * Delete or revoke an assignment.
   */
  async deleteAssignment(id, actor, schoolId = null) {
    const effectiveSchoolId = schoolId || actor?.schoolId || 'sch_bacau';
    const isElevated = ['super_admin', 'school_admin', 'admin', 'principal', 'vice_principal'].includes(actor?.role);
    const isDeptHead = actor?.role === 'department_head';

    const existing = await teacherAssignmentsRepository.findAssignmentById(id, effectiveSchoolId);
    if (!existing) {
      throw new AppError('Không tìm thấy bản ghi phân công giảng dạy', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    if (!isElevated && isDeptHead) {
      const headDeptId = await this.getDepartmentHeadDeptId(actor.id, effectiveSchoolId);
      if (headDeptId && existing.department_id !== headDeptId) {
        throw new AppError('Tổ trưởng chỉ có quyền xóa phân công thuộc tổ chuyên môn phụ trách', 403, 'FORBIDDEN');
      }
    }

    return this.runInTransaction(async (client) => {
      await teacherAssignmentsRepository.deleteAssignment(id, effectiveSchoolId, client);

      const auditMsg = `Xóa/thu hồi phân công giảng dạy của ${existing.teacher_name} (Lớp: ${existing.class_name}, Môn: ${existing.subject_name})`;
      if (isPostgresConfigured()) {
        const runner = client || { query: (q, p) => pgQuery(q, p) };
        await runner.query(`
          INSERT INTO audit_logs (id, actor_id, actor_name, role, action, entity_type, entity_id, details, badge, badge_type)
          VALUES ($1, $2, $3, $4, $5, 'teacher_assignment', $6, $7, 'Thu hồi', 'danger')
        `, [
          `log_${Date.now()}`,
          actor.id,
          actor.name || 'Quản trị viên',
          actor.role,
          auditMsg,
          id,
          JSON.stringify(existing),
        ]);
      } else {
        db.prepare(`
          INSERT INTO audit_logs (id, actor_id, actor_name, role, action, entity_type, entity_id, details, badge, badge_type)
          VALUES (?, ?, ?, ?, ?, 'teacher_assignment', ?, ?, 'Thu hồi', 'danger')
        `).run(
          `log_${Date.now()}`,
          actor.id,
          actor.name || 'Quản trị viên',
          actor.role,
          auditMsg,
          id,
          JSON.stringify(existing)
        );
      }

      return { success: true, message: 'Đã xóa bản ghi phân công giảng dạy thành công' };
    });
  },
};
