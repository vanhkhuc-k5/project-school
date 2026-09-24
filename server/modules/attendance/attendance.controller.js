import { attendanceService } from './attendance.service.js';
import {
  takeAttendanceSessionSchema,
  updateAttendanceRecordSchema,
  queryAttendanceSessionSchema,
} from './attendance.schema.js';

export const attendanceController = {
  /**
   * Take or update attendance for a class session
   * POST /api/attendance/sessions or POST /api/teacher/attendance
   */
  async takeAttendance(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const validated = takeAttendanceSessionSchema.parse(req.body);

      const result = await attendanceService.takeAttendanceSession({
        schoolId,
        ...validated,
        currentUser: req.user,
      });

      return res.status(200).json({
        success: true,
        message: 'Lưu sổ điểm danh thành công!',
        data: result,
      });
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu điểm danh không hợp lệ',
          errors: err.errors,
        });
      }
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        message: err.message,
        error: { code: err.code || 'SERVER_ERROR', message: err.message },
      });
    }
  },

  /**
   * Correct a single attendance record
   * PATCH /api/attendance/records/:id
   */
  async correctRecord(req, res) {
    try {
      const recordId = req.params.id;
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const validated = updateAttendanceRecordSchema.parse(req.body);

      const result = await attendanceService.correctAttendanceRecord({
        recordId,
        status: validated.status,
        note: validated.note,
        reason: validated.reason,
        schoolId,
        currentUser: req.user,
      });

      return res.status(200).json({
        success: true,
        message: 'Hiệu chỉnh điểm danh thành công!',
        data: result,
      });
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu hiệu chỉnh không hợp lệ',
          errors: err.errors,
        });
      }
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        message: err.message,
        error: { code: err.code || 'SERVER_ERROR', message: err.message },
      });
    }
  },

  /**
   * Get attendance session for class & date
   * GET /api/attendance/sessions
   */
  async getSession(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const classId = req.query.classId || req.query.class_id;
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const period = req.query.period ? parseInt(req.query.period, 10) : null;
      const sessionType = req.query.sessionType || req.query.session_type || 'daily';

      if (!classId) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_CLASS_ID',
          message: 'classId là bắt buộc',
        });
      }

      const result = await attendanceService.getSessionBySlot({
        classId,
        date,
        period,
        sessionType,
        schoolId,
        currentUser: req.user,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        message: err.message,
        error: { code: err.code || 'SERVER_ERROR', message: err.message },
      });
    }
  },

  /**
   * Get student personal attendance
   * GET /api/attendance/student or GET /api/student/attendance
   */
  async getStudentAttendance(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const studentId = req.query.studentId || req.query.student_id || req.user.id;

      const result = await attendanceService.getStudentAttendanceHistory({
        studentId,
        schoolId,
        currentUser: req.user,
      });

      return res.status(200).json({
        success: true,
        attendance: result,
        data: result,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        message: err.message,
        error: { code: err.code || 'SERVER_ERROR', message: err.message },
      });
    }
  },

  /**
   * Get parent child attendance
   * GET /api/attendance/parent/child/:id or GET /api/parent/children/:id/attendance
   */
  async getParentChildAttendance(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const childId = req.params.id || req.params.studentId || req.query.studentId;

      if (!childId) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_STUDENT_ID',
          message: 'Mã học sinh là bắt buộc',
        });
      }

      const result = await attendanceService.getParentChildAttendance({
        parentUserId: req.user.id,
        childStudentId: childId,
        schoolId,
        currentUser: req.user,
      });

      return res.status(200).json({
        success: true,
        attendance: result,
        data: result,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        message: err.message,
        error: { code: err.code || 'SERVER_ERROR', message: err.message },
      });
    }
  },

  /**
   * Get class roster with existing records pre-filled
   * GET /api/attendance/roster?classId=&date=
   */
  async getRoster(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const classId = req.query.classId || req.query.class_id;
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const period = req.query.period !== undefined ? parseInt(req.query.period, 10) : null;

      if (!classId) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_CLASS_ID',
          message: 'classId là bắt buộc',
        });
      }

      // Load existing session for this slot to pre-fill records
      const { attendanceRepository } = await import('./attendance.repository.js');
      const session = await attendanceRepository.findSessionBySlot({ classId, date, period });
      const roster = await attendanceRepository.getRosterWithExistingRecords({
        classId,
        schoolId,
        sessionId: session ? session.id : null,
      });

      return res.status(200).json({
        success: true,
        data: {
          roster,
          session: session || null,
        },
        roster,
        session: session || null,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        message: err.message,
        error: { code: err.code || 'SERVER_ERROR', message: err.message },
      });
    }
  },

  /**
   * Get attendance aggregate reporting (admin/BGH)
   * GET /api/attendance/report or GET /api/admin/attendance/report
   */
  async getReport(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const date = req.query.date || null;
      const startDate = req.query.startDate || req.query.start_date || null;
      const endDate = req.query.endDate || req.query.end_date || null;

      const report = await attendanceService.getAttendanceReport({
        schoolId,
        date,
        startDate,
        endDate,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        message: err.message,
        error: { code: err.code || 'SERVER_ERROR', message: err.message },
      });
    }
  },
};
