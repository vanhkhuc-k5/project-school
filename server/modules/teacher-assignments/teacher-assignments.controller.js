import { teacherAssignmentsService } from './teacher-assignments.service.js';

export const teacherAssignmentsController = {
  async getAssignments(req, res, next) {
    try {
      const data = await teacherAssignmentsService.getAssignments(req.query, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyClasses(req, res, next) {
    try {
      const { academicYearId } = req.query;
      const data = await teacherAssignmentsService.getMyClasses(req.user, req.user?.schoolId, academicYearId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async getAssignmentById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await teacherAssignmentsService.getAssignmentById(id, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async createAssignment(req, res, next) {
    try {
      const data = await teacherAssignmentsService.createAssignment(req.body, req.user, req.user?.schoolId);
      res.status(201).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const data = await teacherAssignmentsService.updateAssignment(id, req.body, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const data = await teacherAssignmentsService.deleteAssignment(id, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },
};
