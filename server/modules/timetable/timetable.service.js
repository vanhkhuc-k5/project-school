import crypto from 'crypto';
import { timetableRepository } from './timetable.repository.js';
import { usersRepository } from '../users/users.repository.js';

export const PERIOD_DEFAULTS = {
  1: { start: '07:30', end: '08:15', name: 'Tiết 1 (Sáng)' },
  2: { start: '08:20', end: '09:05', name: 'Tiết 2 (Sáng)' },
  3: { start: '09:20', end: '10:05', name: 'Tiết 3 (Sáng)' },
  4: { start: '10:10', end: '10:55', name: 'Tiết 4 (Sáng)' },
  5: { start: '11:00', end: '11:45', name: 'Tiết 5 (Sáng)' },
  6: { start: '13:30', end: '14:15', name: 'Tiết 6 (Chiều)' },
  7: { start: '14:20', end: '15:05', name: 'Tiết 7 (Chiều)' },
  8: { start: '15:20', end: '16:05', name: 'Tiết 8 (Chiều)' },
  9: { start: '16:10', end: '16:55', name: 'Tiết 9 (Chiều)' },
  10: { start: '17:00', end: '17:45', name: 'Tiết 10 (Chiều)' },
};

export const DAY_NAMES = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật',
};

/**
 * Format flat slot list into standardized Day/Period weekly schedule
 */
export function formatWeeklySchedule(slots = [], metadata = {}) {
  const daysOfWeek = [2, 3, 4, 5, 6, 7];

  const schedule = daysOfWeek.map((dow) => {
    const dayName = DAY_NAMES[dow] || `Thứ ${dow}`;
    const daySlots = slots
      .filter((s) => Number(s.day_of_week) === dow)
      .sort((a, b) => Number(a.period) - Number(b.period));
    const periodList = daySlots.map((s) => ({
      id: s.id,
      period: Number(s.period),
      subject: s.subject_name,
      subjectName: s.subject_name,
      subject_name: s.subject_name,
      subjectId: s.subject_id,
      subject_id: s.subject_id,
      subjectCode: s.subject_code,
      time: s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : (PERIOD_DEFAULTS[s.period] ? `${PERIOD_DEFAULTS[s.period].start} - ${PERIOD_DEFAULTS[s.period].end}` : `Tiết ${s.period}`),
      startTime: s.start_time || PERIOD_DEFAULTS[s.period]?.start || '07:30',
      start_time: s.start_time || PERIOD_DEFAULTS[s.period]?.start || '07:30',
      endTime: s.end_time || PERIOD_DEFAULTS[s.period]?.end || '08:15',
      end_time: s.end_time || PERIOD_DEFAULTS[s.period]?.end || '08:15',
      teacher: s.teacher_name || 'Đang cập nhật',
      teacherName: s.teacher_name || 'Đang cập nhật',
      teacher_name: s.teacher_name || 'Đang cập nhật',
      teacherId: s.teacher_id,
      teacher_id: s.teacher_id,
      teacherEmail: s.teacher_email,
      room: s.room || 'Phòng học chính',
      classId: s.class_id,
      class_id: s.class_id,
      className: s.class_name,
      class_name: s.class_name,
      semesterId: s.semester_id,
    }));

    return {
      day: dayName,
      dayOfWeek: dow,
      day_of_week: dow,
      periods: periodList,
      slots: periodList,
    };
  });

  const summary = {
    total_slots: slots.length,
    totalSlots: slots.length,
    teaching_classes_count: new Set(slots.map(s => s.class_id)).size,
    subjects_count: new Set(slots.map(s => s.subject_id)).size,
  };

  const resolvedClassName = metadata.class?.name || (slots[0]?.class_name || 'Lớp 10A1');
  const resolvedClassId = metadata.class?.id || (slots[0]?.class_id || 'cls_10A1');

  return {
    class_id: resolvedClassId,
    class_name: resolvedClassName,
    className: resolvedClassName,
    summary,
    schedule,
    slots,
    meta: {
      totalSlots: slots.length,
      class: metadata.class || { id: resolvedClassId, name: resolvedClassName },
      summary,
      ...metadata,
    },
  };
}

export const timetableService = {
  /**
   * Get student's timetable derived from active class enrollment
   */
  async getStudentTimetable({ studentId, schoolId = 'sch_bacau', semesterId = null }) {
    // 1. Resolve active class
    const enrollment = await timetableRepository.findStudentActiveEnrollment(studentId, schoolId);
    if (!enrollment || !enrollment.class_id) {
      const emptySchedule = formatWeeklySchedule([]).schedule;
      const payload = {
        schedule: emptySchedule,
        slots: [],
        meta: {
          class: null,
          message: 'Học sinh hiện chưa được ghi danh vào lớp học nào.',
        },
      };
      return {
        success: true,
        data: payload,
        ...payload,
      };
    }

    // 2. Resolve semester
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const curSem = await timetableRepository.findCurrentSemester(schoolId);
      targetSemesterId = curSem ? curSem.id : null;
    }

    // 3. Fetch slots
    const slots = await timetableRepository.findTimetableSlots({
      schoolId,
      classId: enrollment.class_id,
      semesterId: targetSemesterId,
    });

    const formatted = formatWeeklySchedule(slots, {
      class: {
        id: enrollment.class_id,
        name: enrollment.class_name,
        gradeLevel: enrollment.grade_level,
      },
      semesterId: targetSemesterId,
    });

    return {
      success: true,
      data: formatted,
      ...formatted,
    };
  },

  /**
   * Get teacher's teaching schedule across classes
   */
  async getTeacherTimetable({ teacherId, schoolId = 'sch_bacau', semesterId = null }) {
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const curSem = await timetableRepository.findCurrentSemester(schoolId);
      targetSemesterId = curSem ? curSem.id : null;
    }

    const slots = await timetableRepository.findTimetableSlots({
      schoolId,
      teacherId,
      semesterId: targetSemesterId,
    });

    const formatted = formatWeeklySchedule(slots, {
      teacherId,
      semesterId: targetSemesterId,
    });

    return {
      success: true,
      data: formatted,
      ...formatted,
    };
  },

  /**
   * Get parent child's timetable
   */
  async getParentChildTimetable({ parentId, studentId, schoolId = 'sch_bacau', semesterId = null }) {
    // 1. Verify student exists
    const student = await timetableRepository.findStudentById(studentId);
    if (!student) {
      const error = new Error('Không tìm thấy thông tin học sinh.');
      error.status = 404;
      error.code = 'STUDENT_NOT_FOUND';
      throw error;
    }

    // 2. Tenant isolation
    if (student.school_id && student.school_id !== schoolId) {
      const error = new Error('Bạn không có quyền truy cập học sinh thuộc trường khác.');
      error.status = 403;
      error.code = 'TENANT_FORBIDDEN';
      throw error;
    }

    // 3. Verify parent-student relation
    const isLinked = await timetableRepository.verifyParentStudentLink(parentId, studentId);
    if (!isLinked) {
      const error = new Error('Bạn không có quyền truy cập thông tin thời khóa biểu của học sinh này.');
      error.status = 403;
      error.code = 'PARENT_STUDENT_NOT_LINKED';
      throw error;
    }

    const studentResult = await this.getStudentTimetable({ studentId: student.id || studentId, schoolId, semesterId });
    return {
      ...studentResult,
      data: {
        student_id: student.id,
        student_name: student.name || 'Học sinh',
        ...(studentResult.data || {}),
      },
      student_id: student.id,
      student_name: student.name || 'Học sinh',
    };
  },

  /**
   * Query raw timetable slots
   */
  async getSlots(query = {}, schoolId = 'sch_bacau') {
    const slots = await timetableRepository.findTimetableSlots({
      ...query,
      schoolId,
    });

    const formatted = formatWeeklySchedule(slots, { query });
    return {
      success: true,
      data: {
        slots,
        ...formatted,
      },
      slots,
      ...formatted,
    };
  },

  /**
   * Create a new timetable slot with collision validation
   */
  async createTimetableSlot({ slotData, currentUser, schoolId = 'sch_bacau' }) {
    // 1. Verify Class
    const classRecord = await timetableRepository.findClassById(slotData.classId, schoolId);
    if (!classRecord) {
      const error = new Error(`Lớp học với ID "${slotData.classId}" không tồn tại.`);
      error.status = 404;
      error.code = 'CLASS_NOT_FOUND';
      throw error;
    }

    // 2. Verify Subject
    const subjectRecord = await timetableRepository.findSubjectById(slotData.subjectId, schoolId);
    if (!subjectRecord) {
      const error = new Error(`Môn học với ID "${slotData.subjectId}" không tồn tại.`);
      error.status = 404;
      error.code = 'SUBJECT_NOT_FOUND';
      throw error;
    }

    // 3. Resolve semester and academic year
    let semesterId = slotData.semesterId;
    let academicYearId = slotData.academicYearId || classRecord.academic_year_id;
    let academicYear = classRecord.academic_year || '2024 - 2025';

    if (!semesterId) {
      const curSem = await timetableRepository.findCurrentSemester(schoolId);
      if (curSem) {
        semesterId = curSem.id;
        academicYearId = academicYearId || curSem.academic_year_id;
      }
    }

    // 4. Default times from standard period table
    const periodNumber = Number(slotData.period);
    const defPeriod = PERIOD_DEFAULTS[periodNumber] || { start: '07:30', end: '08:15' };
    const startTime = slotData.startTime || defPeriod.start;
    const endTime = slotData.endTime || defPeriod.end;
    const subjectName = slotData.subjectName || subjectRecord.name;

    // 5. Collision Check (Class collision, Teacher collision, Room collision)
    const collision = await timetableRepository.checkCollisions({
      schoolId,
      classId: slotData.classId,
      teacherId: slotData.teacherId || null,
      room: slotData.room || null,
      semesterId,
      dayOfWeek: Number(slotData.dayOfWeek),
      period: periodNumber,
    });

    if (collision.hasCollision) {
      const error = new Error(collision.message);
      error.status = 409;
      error.code = collision.type;
      error.details = collision.conflictSlot;
      throw error;
    }

    // 6. Generate ID & Create
    const slotId = `tt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newSlot = await timetableRepository.createSlot({
      id: slotId,
      schoolId,
      classId: slotData.classId,
      subjectId: slotData.subjectId,
      subjectName,
      teacherId: slotData.teacherId || null,
      dayOfWeek: Number(slotData.dayOfWeek),
      period: periodNumber,
      startTime,
      endTime,
      room: slotData.room || null,
      academicYearId,
      academicYear,
      semesterId,
    });

    // 7. Audit Log
    try {
      await usersRepository.logAudit({
        schoolId,
        actorId: currentUser?.id,
        actorName: currentUser?.name,
        role: currentUser?.role,
        action: 'TIMETABLE_SLOT_CREATED',
        badge: 'Tạo tiết học',
        badgeType: 'success',
        details: JSON.stringify({
          classId: slotData.classId,
          subjectName,
          dayOfWeek: slotData.dayOfWeek,
          period: periodNumber,
          teacherId: slotData.teacherId,
        }),
      });
    } catch {}

    return newSlot;
  },

  /**
   * Update existing timetable slot with collision validation
   */
  async updateTimetableSlot({ id, updateData, currentUser, schoolId = 'sch_bacau' }) {
    const existing = await timetableRepository.findSlotById(id, schoolId);
    if (!existing) {
      const error = new Error('Tiết học không tồn tại trong hệ thống.');
      error.status = 404;
      error.code = 'SLOT_NOT_FOUND';
      throw error;
    }

    const classId = updateData.classId || existing.class_id;
    const teacherId = updateData.teacherId !== undefined ? updateData.teacherId : existing.teacher_id;
    const room = updateData.room !== undefined ? updateData.room : existing.room;
    const semesterId = updateData.semesterId || existing.semester_id;
    const dayOfWeek = updateData.dayOfWeek ? Number(updateData.dayOfWeek) : Number(existing.day_of_week);
    const period = updateData.period ? Number(updateData.period) : Number(existing.period);

    // Collision check
    const collision = await timetableRepository.checkCollisions({
      schoolId,
      classId,
      teacherId,
      room,
      semesterId,
      dayOfWeek,
      period,
      excludeId: id,
    });

    if (collision.hasCollision) {
      const error = new Error(collision.message);
      error.status = 409;
      error.code = collision.type;
      error.details = collision.conflictSlot;
      throw error;
    }

    let subjectName = updateData.subjectName;
    if (updateData.subjectId && !subjectName) {
      const sub = await timetableRepository.findSubjectById(updateData.subjectId, schoolId);
      if (sub) subjectName = sub.name;
    }

    const updated = await timetableRepository.updateSlot(
      id,
      {
        ...updateData,
        subjectName,
        dayOfWeek,
        period,
      },
      schoolId
    );

    // Audit Log
    try {
      await usersRepository.logAudit({
        schoolId,
        actorId: currentUser?.id,
        actorName: currentUser?.name,
        role: currentUser?.role,
        action: 'TIMETABLE_SLOT_UPDATED',
        badge: 'Cập nhật tiết học',
        badgeType: 'info',
        details: JSON.stringify({ id, updateData }),
      });
    } catch {}

    return updated;
  },

  /**
   * Delete timetable slot
   */
  async deleteTimetableSlot({ id, currentUser, schoolId = 'sch_bacau' }) {
    const existing = await timetableRepository.findSlotById(id, schoolId);
    if (!existing) {
      const error = new Error('Tiết học không tồn tại trong hệ thống.');
      error.status = 404;
      error.code = 'SLOT_NOT_FOUND';
      throw error;
    }

    const deleted = await timetableRepository.deleteSlot(id, schoolId);

    // Audit Log
    try {
      await usersRepository.logAudit({
        schoolId,
        actorId: currentUser?.id,
        actorName: currentUser?.name,
        role: currentUser?.role,
        action: 'TIMETABLE_SLOT_DELETED',
        badge: 'Xóa tiết học',
        badgeType: 'danger',
        details: JSON.stringify({
          classId: existing.class_id,
          subjectName: existing.subject_name,
          dayOfWeek: existing.day_of_week,
          period: existing.period,
        }),
      });
    } catch {}

    return deleted;
  },
};
