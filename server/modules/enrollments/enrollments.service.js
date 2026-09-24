import { enrollmentsRepository } from './enrollments.repository.js';
import { academicStructureRepository } from '../academic-structure/academic-structure.repository.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { withTransaction } from '../../shared/database/transaction.js';
import { isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';
import { AppError } from '../../shared/errors/AppError.js';

export const enrollmentsService = {
  /**
   * Helper to execute a callback in an ACID transaction across engines.
   */
  async runInTransaction(callback) {
    if (isPostgresConfigured()) {
      return withTransaction(callback);
    }
    // SQLite transaction
    const tx = db.transaction(() => callback(null));
    return tx();
  },

  /**
   * Enroll a single student into a class for an academic year.
   */
  async enrollStudent(payload, adminUser, schoolId = null) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const { studentId, classId, academicYearId, enrollmentDate, notes } = payload;

    // 1. Verify student exists
    const student = await profilesRepository.findStudentById(studentId);
    if (!student) {
      throw new AppError('Không tìm thấy hồ sơ học sinh', 404, 'STUDENT_NOT_FOUND');
    }
    if (student.school_id && student.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền ghi danh học sinh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // 2. Verify target class exists
    const targetClass = await academicStructureRepository.findClassById(classId);
    if (!targetClass) {
      throw new AppError('Không tìm thấy lớp học mục tiêu', 404, 'CLASS_NOT_FOUND');
    }
    if (targetClass.school_id && targetClass.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền ghi danh vào lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }
    if (targetClass.status === 'archived' || targetClass.status === 'completed') {
      throw new AppError(`Không thể ghi danh vào lớp học đã ở trạng thái "${targetClass.status}"`, 400, 'CLASS_NOT_ACTIVE');
    }

    // 3. Single Active Invariant: prevent conflicting active enrollments
    const activeEnrollment = await enrollmentsRepository.findActiveEnrollmentByStudent(studentId, effectiveSchoolId);
    if (activeEnrollment) {
      throw new AppError(
        `Học sinh hiện đang ghi danh tại lớp ${activeEnrollment.class_name} (${activeEnrollment.academic_year_name || 'Niên khóa hiện tại'}). Vui lòng sử dụng tính năng Chuyển lớp (transfer) thay vì ghi danh mới.`,
        409,
        'STUDENT_ALREADY_ENROLLED'
      );
    }

    // 4. Class Capacity check
    const currentActiveCount = await enrollmentsRepository.countClassActiveStudents(classId);
    const capacityLimit = targetClass.max_capacity || targetClass.max_students || 45;
    if (currentActiveCount >= capacityLimit) {
      throw new AppError(
        `Lớp học "${targetClass.name}" đã đạt sĩ số tối đa (${currentActiveCount}/${capacityLimit} em). Không thể tiếp nhận thêm học sinh.`,
        400,
        'CLASS_CAPACITY_EXCEEDED'
      );
    }

    const yearId = academicYearId || targetClass.academic_year_id || 'ay_2024_2025';
    const enrDate = enrollmentDate || new Date().toISOString().split('T')[0];

    // 5. Atomic transaction execution
    const newEnrollment = await this.runInTransaction(async (client) => {
      const enr = await enrollmentsRepository.createEnrollment({
        classId,
        studentId,
        academicYearId: yearId,
        schoolId: effectiveSchoolId,
        enrollmentDate: enrDate,
        startDate: enrDate,
        status: 'enrolled',
        isCurrent: true,
        notes: notes || null,
      }, client);

      await enrollmentsRepository.syncStudentCurrentClassCache(studentId, classId, client);
      return enr;
    });

    // 6. Audit logging
    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Ghi danh học sinh ${student.name || student.student_code} vào Lớp ${targetClass.name}`,
        badge: 'Ghi danh',
        badgeType: 'success',
        schoolId: effectiveSchoolId,
        details: { studentId, classId, enrollmentId: newEnrollment.id },
      });
    }

    return newEnrollment;
  },

  /**
   * Transfer student between classes while strictly preserving historical records.
   */
  async transferStudent(payload, adminUser, schoolId = null) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const { studentId, targetClassId, transferDate, reason, notes } = payload;

    // 1. Verify student exists
    const student = await profilesRepository.findStudentById(studentId);
    if (!student) {
      throw new AppError('Không tìm thấy hồ sơ học sinh', 404, 'STUDENT_NOT_FOUND');
    }
    if (student.school_id && student.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền chuyển lớp cho học sinh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // 2. Find active current enrollment
    const activeEnrollment = await enrollmentsRepository.findActiveEnrollmentByStudent(studentId, effectiveSchoolId);
    if (!activeEnrollment) {
      throw new AppError('Học sinh hiện không có bản ghi lớp đang học để chuyển lớp. Vui lòng dùng tính năng Ghi danh.', 400, 'NO_ACTIVE_ENROLLMENT');
    }

    if (activeEnrollment.class_id === targetClassId) {
      throw new AppError('Lớp học chuyển đến trùng với lớp học hiện tại của học sinh', 400, 'SAME_CLASS_TRANSFER');
    }

    // 3. Verify target class
    const targetClass = await academicStructureRepository.findClassById(targetClassId);
    if (!targetClass) {
      throw new AppError('Không tìm thấy lớp học mục tiêu', 404, 'CLASS_NOT_FOUND');
    }
    if (targetClass.school_id && targetClass.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền chuyển học sinh sang lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }
    if (targetClass.status === 'archived' || targetClass.status === 'completed') {
      throw new AppError(`Không thể chuyển học sinh vào lớp học đã ở trạng thái "${targetClass.status}"`, 400, 'CLASS_NOT_ACTIVE');
    }

    // 4. Capacity check
    const currentActiveCount = await enrollmentsRepository.countClassActiveStudents(targetClassId);
    const capacityLimit = targetClass.max_capacity || targetClass.max_students || 45;
    if (currentActiveCount >= capacityLimit) {
      throw new AppError(
        `Lớp học mục tiêu "${targetClass.name}" đã đạt sĩ số tối đa (${currentActiveCount}/${capacityLimit} em). Không thể tiếp nhận học sinh chuyển đến.`,
        400,
        'CLASS_CAPACITY_EXCEEDED'
      );
    }

    const tDate = transferDate || new Date().toISOString().split('T')[0];
    const yearId = targetClass.academic_year_id || activeEnrollment.academic_year_id || 'ay_2024_2025';

    // 5. ACID Transaction: Mark old transferred + insert new active
    const newEnrollment = await this.runInTransaction(async (client) => {
      // Step A: Close out current enrollment
      await enrollmentsRepository.updateEnrollment(activeEnrollment.id, {
        status: 'transferred',
        isCurrent: false,
        endDate: tDate,
        reason: reason,
        notes: notes ? `Chuyển sang lớp ${targetClass.name}: ${notes}` : `Chuyển sang lớp ${targetClass.name}`,
      }, client);

      // Step B: Create new active enrollment
      const created = await enrollmentsRepository.createEnrollment({
        classId: targetClassId,
        studentId,
        academicYearId: yearId,
        schoolId: effectiveSchoolId,
        enrollmentDate: tDate,
        startDate: tDate,
        status: 'enrolled',
        isCurrent: true,
        reason: `Chuyển từ lớp ${activeEnrollment.class_name}`,
        notes: notes || null,
      }, client);

      // Step C: Update student cache
      await enrollmentsRepository.syncStudentCurrentClassCache(studentId, targetClassId, client);

      return created;
    });

    // 6. Audit logging
    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Chuyển lớp học sinh ${student.name || student.student_code}: Từ ${activeEnrollment.class_name} sang ${targetClass.name}`,
        badge: 'Chuyển lớp',
        badgeType: 'info',
        schoolId: effectiveSchoolId,
        details: {
          studentId,
          fromClassId: activeEnrollment.class_id,
          toClassId: targetClassId,
          reason,
          enrollmentId: newEnrollment.id,
        },
      });
    }

    return newEnrollment;
  },

  /**
   * Withdraw a student from their active class with status 'withdrawn'.
   */
  async withdrawStudent(payload, adminUser, schoolId = null) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const { studentId, withdrawalDate, reason, notes } = payload;

    // 1. Verify student exists
    const student = await profilesRepository.findStudentById(studentId);
    if (!student) {
      throw new AppError('Không tìm thấy hồ sơ học sinh', 404, 'STUDENT_NOT_FOUND');
    }
    if (student.school_id && student.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền rút học sinh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // 2. Find active enrollment
    const activeEnrollment = await enrollmentsRepository.findActiveEnrollmentByStudent(studentId, effectiveSchoolId);
    if (!activeEnrollment) {
      throw new AppError('Học sinh hiện không có bản ghi lớp đang hoạt động để rút khỏi lớp', 400, 'NO_ACTIVE_ENROLLMENT');
    }

    const wDate = withdrawalDate || new Date().toISOString().split('T')[0];

    // 3. ACID Transaction: Mark withdrawn + clear active class cache
    await this.runInTransaction(async (client) => {
      await enrollmentsRepository.updateEnrollment(activeEnrollment.id, {
        status: 'withdrawn',
        isCurrent: false,
        endDate: wDate,
        reason,
        notes: notes || null,
      }, client);

      await enrollmentsRepository.syncStudentCurrentClassCache(studentId, null, client);
    });

    // 4. Audit logging
    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Rút học sinh ${student.name || student.student_code} khỏi Lớp ${activeEnrollment.class_name}`,
        badge: 'Rút khỏi lớp',
        badgeType: 'warning',
        schoolId: effectiveSchoolId,
        details: {
          studentId,
          classId: activeEnrollment.class_id,
          reason,
          withdrawalDate: wDate,
        },
      });
    }

    return {
      message: `Đã rút học sinh ${student.name || student.student_code} khỏi lớp ${activeEnrollment.class_name} thành công`,
      previousEnrollmentId: activeEnrollment.id,
      classId: activeEnrollment.class_id,
      className: activeEnrollment.class_name,
    };
  },

  /**
   * Bulk enroll multiple students into a class atomically.
   */
  async bulkEnroll(payload, adminUser, schoolId = null) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const { classId, academicYearId, studentIds, enrollmentDate, notes } = payload;

    // 1. Verify class exists
    const targetClass = await academicStructureRepository.findClassById(classId);
    if (!targetClass) {
      throw new AppError('Không tìm thấy lớp học mục tiêu', 404, 'CLASS_NOT_FOUND');
    }
    if (targetClass.school_id && targetClass.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền ghi danh vào lớp học thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }
    if (targetClass.status === 'archived' || targetClass.status === 'completed') {
      throw new AppError(`Không thể ghi danh vào lớp học đã ở trạng thái "${targetClass.status}"`, 400, 'CLASS_NOT_ACTIVE');
    }

    // 2. Check capacity
    const currentActiveCount = await enrollmentsRepository.countClassActiveStudents(classId);
    const capacityLimit = targetClass.max_capacity || targetClass.max_students || 45;
    const remainingSlots = capacityLimit - currentActiveCount;

    if (studentIds.length > remainingSlots) {
      throw new AppError(
        `Không đủ chỗ trống trong lớp "${targetClass.name}". Còn lại: ${remainingSlots} chỗ, số lượng yêu cầu: ${studentIds.length} em (Sĩ số hiện tại: ${currentActiveCount}/${capacityLimit}).`,
        400,
        'CLASS_CAPACITY_EXCEEDED'
      );
    }

    // 3. Verify students and check for conflicting active enrollments
    const enrolledResults = [];
    const enrDate = enrollmentDate || new Date().toISOString().split('T')[0];
    const yearId = academicYearId || targetClass.academic_year_id || 'ay_2024_2025';

    for (const sId of studentIds) {
      const st = await profilesRepository.findStudentById(sId);
      if (!st) {
        throw new AppError(`Không tìm thấy hồ sơ học sinh ID: ${sId}`, 404, 'STUDENT_NOT_FOUND');
      }
      if (st.school_id && st.school_id !== effectiveSchoolId && adminUser?.role !== 'super_admin') {
        throw new AppError(`Học sinh ID: ${sId} thuộc trường khác`, 403, 'TENANT_FORBIDDEN');
      }

      const active = await enrollmentsRepository.findActiveEnrollmentByStudent(sId, effectiveSchoolId);
      if (active) {
        throw new AppError(
          `Học sinh "${st.name || st.student_code}" hiện đang ghi danh tại lớp ${active.class_name}. Vui lòng chuyển lớp riêng thay vì ghi danh hàng loạt.`,
          409,
          'STUDENT_ALREADY_ENROLLED'
        );
      }
    }

    // 4. Atomic multi-student enrollment
    await this.runInTransaction(async (client) => {
      for (const sId of studentIds) {
        const enr = await enrollmentsRepository.createEnrollment({
          classId,
          studentId: sId,
          academicYearId: yearId,
          schoolId: effectiveSchoolId,
          enrollmentDate: enrDate,
          startDate: enrDate,
          status: 'enrolled',
          isCurrent: true,
          notes: notes ? `Ghi danh hàng loạt: ${notes}` : 'Ghi danh hàng loạt',
        }, client);

        await enrollmentsRepository.syncStudentCurrentClassCache(sId, classId, client);
        enrolledResults.push(enr);
      }
    });

    // 5. Audit log
    if (adminUser) {
      await usersRepository.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.name || 'Ban Giám Hiệu',
        role: adminUser.role || 'admin',
        action: `Ghi danh hàng loạt ${studentIds.length} học sinh vào Lớp ${targetClass.name}`,
        badge: 'Ghi danh hàng loạt',
        badgeType: 'success',
        schoolId: effectiveSchoolId,
        details: { classId, count: studentIds.length, studentIds },
      });
    }

    return {
      classId,
      className: targetClass.name,
      academicYearId: yearId,
      totalEnrolled: enrolledResults.length,
      enrollments: enrolledResults,
    };
  },

  /**
   * Get student's full historical enrollment timeline.
   */
  async getStudentHistory(studentId, requestingUser, schoolId = null) {
    const effectiveSchoolId = schoolId || requestingUser?.schoolId || 'sch_bacau';

    const student = await profilesRepository.findStudentById(studentId);
    if (!student) {
      throw new AppError('Không tìm thấy hồ sơ học sinh', 404, 'STUDENT_NOT_FOUND');
    }

    if (student.school_id && student.school_id !== effectiveSchoolId && requestingUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền truy cập hồ sơ học sinh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    // IDOR check: Student can only view own history
    if (requestingUser.role === 'student' && student.user_id !== requestingUser.id) {
      throw new AppError('Bạn chỉ có thể xem lịch sử học vụ của chính mình', 403, 'FORBIDDEN_OWNERSHIP');
    }

    // Parent can only view linked children
    if (requestingUser.role === 'parent') {
      const parent = await profilesRepository.findParentByUserId(requestingUser.id);
      if (!parent) {
        throw new AppError('Không tìm thấy hồ sơ phụ huynh', 404, 'PARENT_NOT_FOUND');
      }
      const children = await profilesRepository.findChildrenByParentId(parent.id);
      const isLinked = children.some((c) => c.id === studentId || c.student_id === studentId);
      if (!isLinked) {
        throw new AppError('Bạn không có quyền xem lịch sử học tập của học sinh này', 403, 'FORBIDDEN_RELATIONSHIP');
      }
    }

    const history = await enrollmentsRepository.findEnrollmentHistory(studentId, effectiveSchoolId);
    return {
      studentId,
      studentCode: student.student_code,
      studentName: student.name,
      totalEntries: history.length,
      history,
    };
  },

  /**
   * Get student's current active enrollment.
   */
  async getStudentCurrent(studentId, requestingUser, schoolId = null) {
    const effectiveSchoolId = schoolId || requestingUser?.schoolId || 'sch_bacau';

    const student = await profilesRepository.findStudentById(studentId);
    if (!student) {
      throw new AppError('Không tìm thấy hồ sơ học sinh', 404, 'STUDENT_NOT_FOUND');
    }

    if (student.school_id && student.school_id !== effectiveSchoolId && requestingUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền truy cập hồ sơ học sinh thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    if (requestingUser.role === 'student' && student.user_id !== requestingUser.id) {
      throw new AppError('Bạn chỉ có thể xem thông tin lớp của chính mình', 403, 'FORBIDDEN_OWNERSHIP');
    }

    const current = await enrollmentsRepository.findActiveEnrollmentByStudent(studentId, effectiveSchoolId);
    return {
      studentId,
      studentCode: student.student_code,
      studentName: student.name,
      currentEnrollment: current,
    };
  },

  /**
   * Get class roster derived from active enrollments.
   */
  async getClassRoster(classId, requestingUser, options = {}, schoolId = null) {
    const effectiveSchoolId = schoolId || requestingUser?.schoolId || 'sch_bacau';

    const cls = await academicStructureRepository.findClassById(classId);
    if (!cls) {
      throw new AppError('Không tìm thấy thông tin lớp học', 404, 'CLASS_NOT_FOUND');
    }

    if (cls.school_id && cls.school_id !== effectiveSchoolId && requestingUser?.role !== 'super_admin') {
      throw new AppError('Bạn không có quyền truy cập danh sách lớp thuộc trường khác', 403, 'TENANT_FORBIDDEN');
    }

    const students = await enrollmentsRepository.findClassRoster(classId, effectiveSchoolId, options);
    return {
      classId,
      className: cls.name,
      gradeLevel: cls.grade_level,
      room: cls.room,
      maxCapacity: cls.max_capacity || cls.max_students || 45,
      activeCount: students.length,
      roster: students,
    };
  },
};
