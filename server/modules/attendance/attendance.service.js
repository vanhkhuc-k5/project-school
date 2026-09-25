import crypto from 'crypto';
import { attendanceRepository } from './attendance.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { notifyStudentAbsent } from '../notifications/notifications.service.js';
import { dispatchToUser } from '../notifications/sse.controller.js';

export const attendanceService = {
  /**
   * Take or save attendance session and records atomically
   */
  async takeAttendanceSession({
    schoolId,
    classId,
    subjectId = null,
    teacherId = null,
    date,
    period = null,
    sessionType = 'daily',
    semesterId = null,
    notes = '',
    records = [],
    currentUser,
  }) {
    // 1. Validate class existence and tenant scoping
    const targetClass = await attendanceRepository.findClassById(classId, schoolId);
    if (!targetClass) {
      const err = new Error('Lớp học không tồn tại hoặc không thuộc quyền quản lý của trường này');
      err.status = 404;
      err.code = 'CLASS_NOT_FOUND';
      throw err;
    }

    // 2. Authorization check: if caller is teacher, verify assigned class or homeroom
    const isTeacher = currentUser.role === 'teacher';
    const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.isSuperAdmin === true;
    const isSchoolAdmin = ['admin', 'school_admin', 'principal', 'vice_principal'].includes(currentUser.role);

    if (isTeacher && !isSuperAdmin && !isSchoolAdmin) {
      const isAuthorized = await attendanceRepository.isTeacherAuthorizedForClass(
        currentUser.id,
        classId,
        schoolId
      );
      if (!isAuthorized) {
        const err = new Error('Bạn không được phân công giảng dạy hoặc làm chủ nhiệm lớp học này');
        err.status = 403;
        err.code = 'UNAUTHORIZED_CLASS';
        throw err;
      }
    }

    // 3. Validate enrolled students in class: every student in records MUST belong to this class
    const enrolledStudentIds = await attendanceRepository.getEnrolledStudentIds(classId, schoolId);
    const enrolledSet = new Set(enrolledStudentIds);

    for (const rec of records) {
      const resolvedStudentId = await attendanceRepository.resolveStudentId(rec.studentId);
      if (!enrolledSet.has(resolvedStudentId)) {
        const err = new Error(`Học sinh với ID ${rec.studentId} không ghi danh trong lớp ${targetClass.name}`);
        err.status = 400;
        err.code = 'STUDENT_NOT_ENROLLED';
        throw err;
      }
      rec.studentId = resolvedStudentId;
    }

    // 4. Check if session already exists for this slot or generate ID
    let existingSession = await attendanceRepository.findSessionBySlot({
      classId,
      date,
      period,
      sessionType,
    });

    const sessionId = existingSession ? existingSession.id : `ses_${classId}_${date.replace(/-/g, '')}_${period || 0}_${Date.now()}`;

    // 5. Save atomically via repository
    await attendanceRepository.saveSessionAndRecordsAtomic({
      sessionData: {
        id: sessionId,
        schoolId,
        classId,
        subjectId,
        teacherId: teacherId || currentUser.id,
        date,
        period,
        sessionType,
        semesterId,
        status: 'completed',
        notes,
      },
      records,
      userId: currentUser.id,
    });

    // 6. Audit log
    await usersRepository.logAudit({
      schoolId,
      actorId: currentUser.id,
      actorName: currentUser.name || 'Giáo viên',
      role: currentUser.role || 'teacher',
      action: existingSession ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED',
      entityType: 'attendance_session',
      entityId: sessionId,
      details: `Điểm danh lớp ${targetClass.name} ngày ${date} (Tiết: ${period || 'Buổi'}), sĩ số: ${records.length} học sinh.`,
      badge: existingSession ? 'Đã cập nhật' : 'Đã điểm danh',
      badgeType: 'success',
    });

    // Fetch updated session and records
    const session = await attendanceRepository.findSessionById(sessionId);
    const savedRecords = await attendanceRepository.findRecordsBySessionId(sessionId);

    // G26: Notify teacher when students are absent
    try {
      const absentRecords = savedRecords.filter((r) =>
        r.status && r.status.toUpperCase() === 'ABSENT'
      );
      for (const record of absentRecords) {
        // Get student info
        const studentRow = await attendanceRepository.findStudentById(record.student_id || record.studentId);
        if (studentRow && currentUser) {
          await notifyStudentAbsent({
            attendanceRecord: {
              id: record.id,
              sessionId,
              classId,
              date,
            },
            student: {
              id: record.student_id || record.studentId,
              name: studentRow.name || studentRow.student_name || 'Học sinh',
            },
            teacher: {
              id: currentUser.id,
              name: currentUser.name || 'Giáo viên',
            },
          });
        }
      }
    } catch (notifErr) {
      console.error('[NotificationService] notifyStudentAbsent failed:', notifErr.message);
    }

    // G38: Real-time SSE — notify ALL parents immediately for every attendance record
    try {
      for (const record of savedRecords) {
        const studentId = record.student_id || record.studentId;
        const studentRow = await attendanceRepository.findStudentById(studentId);
        const parentUserIds = await attendanceRepository.getParentUserIds(studentId);

        for (const parentUserId of parentUserIds) {
          const statusLabel = record.status === 'PRESENT' ? 'Có mặt'
            : record.status === 'LATE' ? 'Đi muộn'
            : record.status === 'ABSENT_EXCUSED' ? 'Vắng có phép'
            : record.status === 'ABSENT' ? 'Vắng không phép'
            : record.status === 'EARLY_LEAVE' ? 'Về sớm'
            : record.status || 'Chưa rõ';

          dispatchToUser(parentUserId, 'ATTENDANCE_RECORDED', {
            type: 'attendance_recorded',
            studentId,
            studentName: studentRow?.name || studentRow?.student_name || 'Học sinh',
            studentCode: studentRow?.student_code || '',
            classId,
            className: targetClass?.name || '',
            status: record.status,
            statusLabel,
            date,
            recordedAt: new Date().toISOString(),
            sessionId,
            message: `Chuyên cần: ${studentRow?.name || 'Học sinh'} đã được điểm danh ${statusLabel} ngày ${date}`,
          });
        }
      }
    } catch (sseErr) {
      console.error('[Attendance] SSE dispatch failed:', sseErr.message);
    }

    return {
      session,
      records: savedRecords,
    };
  },

  /**
   * Correct or update a specific attendance record
   */
  async correctAttendanceRecord({
    recordId,
    status,
    note,
    reason,
    schoolId,
    currentUser,
  }) {
    const existing = await attendanceRepository.findRecordById(recordId);
    if (!existing) {
      const err = new Error('Không tìm thấy bản ghi điểm danh');
      err.status = 404;
      err.code = 'RECORD_NOT_FOUND';
      throw err;
    }

    // Tenant check
    if (existing.school_id && existing.school_id !== schoolId && currentUser.role !== 'super_admin') {
      const err = new Error('Bạn không có quyền chỉnh sửa bản ghi thuộc trường khác');
      err.status = 403;
      err.code = 'TENANT_FORBIDDEN';
      throw err;
    }

    // Teacher authorization check
    const isTeacher = currentUser.role === 'teacher';
    const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.isSuperAdmin === true;
    const isSchoolAdmin = ['admin', 'school_admin', 'principal', 'vice_principal'].includes(currentUser.role);

    if (isTeacher && !isSuperAdmin && !isSchoolAdmin) {
      const isAuthorized = await attendanceRepository.isTeacherAuthorizedForClass(
        currentUser.id,
        existing.class_id,
        schoolId
      );
      if (!isAuthorized) {
        const err = new Error('Bạn không có quyền sửa điểm danh lớp học này');
        err.status = 403;
        err.code = 'UNAUTHORIZED_CLASS';
        throw err;
      }
    }

    const oldStatus = existing.status;
    const oldNote = existing.note;

    const updated = await attendanceRepository.updateRecordById(recordId, {
      status,
      note,
      recordedBy: currentUser.id,
    });

    // Audit log
    await usersRepository.logAudit({
      schoolId,
      actorId: currentUser.id,
      actorName: currentUser.name || 'Người dùng',
      role: currentUser.role || 'teacher',
      action: 'ATTENDANCE_CORRECTED',
      entityType: 'attendance_record',
      entityId: recordId,
      details: `Hiệu chỉnh điểm danh từ ${oldStatus} sang ${status || oldStatus}. Lý do: ${reason || 'Hiệu chỉnh điểm danh'}.`,
      badge: 'Đã hiệu chỉnh',
      badgeType: 'warning',
    });

    return {
      record: updated,
      previous: { status: oldStatus, note: oldNote },
    };
  },

  /**
   * Get attendance session by class & date/period
   */
  async getSessionBySlot({ classId, date, period = null, sessionType = 'daily', schoolId, currentUser }) {
    // Verify class
    const targetClass = await attendanceRepository.findClassById(classId, schoolId);
    if (!targetClass) {
      const err = new Error('Lớp học không tồn tại');
      err.status = 404;
      err.code = 'CLASS_NOT_FOUND';
      throw err;
    }

    const session = await attendanceRepository.findSessionBySlot({ classId, date, period, sessionType });
    if (!session) {
      return { session: null, records: [] };
    }

    const records = await attendanceRepository.findRecordsBySessionId(session.id);
    return { session, records };
  },

  /**
   * Get student personal attendance history and computed percentages
   */
  async getStudentAttendanceHistory({ studentId, schoolId, currentUser }) {
    const resolvedStudentId = await attendanceRepository.resolveStudentId(studentId || currentUser.id);

    // If student role, ensure student is requesting their own history
    if (currentUser.role === 'student' && currentUser.role !== 'super_admin') {
      const myStudentId = await attendanceRepository.resolveStudentId(currentUser.id);
      if (resolvedStudentId !== myStudentId && studentId !== currentUser.id) {
        const err = new Error('Bạn chỉ có quyền xem nhật ký chuyên cần của chính mình');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    const records = await attendanceRepository.getStudentAttendanceHistory({
      studentId: resolvedStudentId,
      schoolId,
    });

    // Compute metrics dynamically from persisted data (NO hardcoded demo percentages)
    const totalDays = records.length;
    const presentCount = records.filter((r) => r.status.toUpperCase() === 'PRESENT').length;
    const lateCount = records.filter((r) => r.status.toUpperCase() === 'LATE').length;
    const excusedCount = records.filter((r) => r.status.toUpperCase() === 'EXCUSED').length;
    const absentCount = records.filter((r) => r.status.toUpperCase() === 'ABSENT').length;

    // Rate calculation: (present + excused + late * 0.5) / total
    const effectiveAttended = presentCount + excusedCount + lateCount;
    const rawRate = totalDays > 0 ? (effectiveAttended / totalDays) * 100 : 100;
    const rateFormatted = `${rawRate.toFixed(1)}%`;

    let statusLabel = 'Xuất sắc';
    if (rawRate < 80) statusLabel = 'Cần chú ý';
    else if (rawRate < 90) statusLabel = 'Khá';
    else if (rawRate < 95) statusLabel = 'Tốt';

    return {
      studentId: resolvedStudentId,
      rate: rateFormatted,
      rateNumber: parseFloat(rawRate.toFixed(1)),
      totalDays,
      presentDays: presentCount,
      lateDays: lateCount,
      excusedDays: excusedCount,
      absentDays: absentCount,
      status: statusLabel,
      records: records.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        date: r.date,
        period: r.period,
        subject: r.subject_name || 'Buổi học',
        teacher: r.teacher_name,
        status: r.status.toLowerCase(),
        statusCode: r.status.toUpperCase(),
        note: r.note || '',
        createdAt: r.created_at,
      })),
    };
  },

  /**
   * Get parent child attendance history
   */
  async getParentChildAttendance({ parentUserId, childStudentId, schoolId, currentUser }) {
    const resolvedStudentId = await attendanceRepository.resolveStudentId(childStudentId);

    // Verify parent-child relationship
    if (currentUser.role === 'parent' && currentUser.role !== 'super_admin') {
      const isGuardian = await attendanceRepository.isParentOfStudent(parentUserId || currentUser.id, resolvedStudentId);
      if (!isGuardian) {
        const err = new Error('Bạn không có quyền truy cập dữ liệu điểm danh của học sinh này');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    return this.getStudentAttendanceHistory({
      studentId: resolvedStudentId,
      schoolId,
      currentUser,
    });
  },

  /**
   * Get aggregate attendance reporting
   */
  async getAttendanceReport({ schoolId, date = null, startDate = null, endDate = null }) {
    const data = await attendanceRepository.getSchoolAttendanceStats({
      schoolId,
      date,
      startDate,
      endDate,
    });

    const summary = data.summary;
    const totalRecords = Number(summary.total_records) || 0;
    const presentCount = Number(summary.present_count) || 0;
    const lateCount = Number(summary.late_count) || 0;
    const excusedCount = Number(summary.excused_count) || 0;
    const absentCount = Number(summary.absent_count) || 0;

    const attended = presentCount + lateCount + excusedCount;
    const overallRate = totalRecords > 0 ? ((attended / totalRecords) * 100).toFixed(1) : '100.0';

    return {
      schoolId,
      overview: {
        totalRecords,
        totalSessions: Number(summary.total_sessions) || 0,
        classesChecked: Number(summary.total_classes_checked) || 0,
        presentCount,
        lateCount,
        excusedCount,
        absentCount,
        attendanceRate: `${overallRate}%`,
        rateNumber: parseFloat(overallRate),
      },
      byClass: data.byClass.map((c) => {
        const cTotal = Number(c.total_records) || 0;
        const cPres = Number(c.present_count) || 0;
        const cLate = Number(c.late_count) || 0;
        const cExc = Number(c.excused_count) || 0;
        const cAbs = Number(c.absent_count) || 0;
        const cAttended = cPres + cLate + cExc;
        const cRate = cTotal > 0 ? ((cAttended / cTotal) * 100).toFixed(1) : '100.0';

        return {
          classId: c.class_id,
          className: c.class_name,
          gradeLevel: c.grade_level,
          totalRecords: cTotal,
          presentCount: cPres,
          lateCount: cLate,
          excusedCount: cExc,
          absentCount: cAbs,
          attendanceRate: `${cRate}%`,
        };
      }),
    };
  },
};
