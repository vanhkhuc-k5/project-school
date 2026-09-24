import { timetableService } from './timetable.service.js';
import { timetableRepository } from './timetable.repository.js';
import {
  createTimetableSlotSchema,
  updateTimetableSlotSchema,
  queryTimetableSchema,
} from './timetable.schema.js';

export const timetableController = {
  /**
   * GET /api/timetable/student
   */
  async getStudentTimetable(req, res) {
    try {
      const studentId = req.user.id;
      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const semesterId = req.query.semesterId || null;

      const result = await timetableService.getStudentTimetable({
        studentId,
        schoolId,
        semesterId,
      });

      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
      });
    }
  },

  /**
   * GET /api/timetable/teacher
   */
  async getTeacherTimetable(req, res) {
    try {
      const teacherId = req.user.id;
      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const semesterId = req.query.semesterId || null;

      const result = await timetableService.getTeacherTimetable({
        teacherId,
        schoolId,
        semesterId,
      });

      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
      });
    }
  },

  /**
   * GET /api/timetable/parent/child/:studentId
   */
  async getParentChildTimetable(req, res) {
    try {
      const parentId = req.user.id;
      const { studentId } = req.params;
      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const semesterId = req.query.semesterId || null;

      const result = await timetableService.getParentChildTimetable({
        parentId,
        studentId,
        schoolId,
        semesterId,
      });

      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
      });
    }
  },

  /**
   * GET /api/timetable (Admin or general slots search)
   */
  async getSlots(req, res) {
    try {
      const parseResult = queryTimetableSchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tham số truy vấn không hợp lệ',
            details: parseResult.error.errors,
          },
        });
      }

      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const result = await timetableService.getSlots(parseResult.data, schoolId);

      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
      });
    }
  },

  /**
   * GET /api/timetable/:id
   */
  async getSlotById(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const slot = await timetableRepository.findSlotById(req.params.id, schoolId);
      if (!slot) {
        return res.status(404).json({
          success: false,
          code: 'SLOT_NOT_FOUND',
          error: {
            code: 'SLOT_NOT_FOUND',
            message: 'Không tìm thấy tiết học',
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: slot,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
      });
    }
  },

  /**
   * POST /api/timetable (Create new slot)
   */
  async createSlot(req, res) {
    try {
      const parseResult = createTimetableSlotSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dữ liệu tiết học không hợp lệ',
            details: parseResult.error.errors,
          },
        });
      }

      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const slot = await timetableService.createTimetableSlot({
        slotData: parseResult.data,
        currentUser: req.user,
        schoolId,
      });

      return res.status(201).json({
        success: true,
        data: slot,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
          details: err.details,
        },
      });
    }
  },

  /**
   * PATCH /api/timetable/:id
   */
  async updateSlot(req, res) {
    try {
      const parseResult = updateTimetableSlotSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dữ liệu cập nhật tiết học không hợp lệ',
            details: parseResult.error.errors,
          },
        });
      }

      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const slot = await timetableService.updateTimetableSlot({
        id: req.params.id,
        updateData: parseResult.data,
        currentUser: req.user,
        schoolId,
      });

      return res.status(200).json({
        success: true,
        data: slot,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
          details: err.details,
        },
      });
    }
  },

  /**
   * DELETE /api/timetable/:id
   */
  async deleteSlot(req, res) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
      const slot = await timetableService.deleteTimetableSlot({
        id: req.params.id,
        currentUser: req.user,
        schoolId,
      });

      return res.status(200).json({
        success: true,
        data: slot,
        message: 'Xóa tiết học khỏi thời khóa biểu thành công',
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'SERVER_ERROR',
        error: {
          code: err.code || 'SERVER_ERROR',
          message: err.message,
        },
      });
    }
  },
};
