import { enrollmentsService } from './enrollments.service.js';

export const enrollmentsController = {
  async enrollStudent(req, res, next) {
    try {
      const data = await enrollmentsService.enrollStudent(req.body, req.user, req.user?.schoolId);
      res.status(201).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async transferStudent(req, res, next) {
    try {
      const data = await enrollmentsService.transferStudent(req.body, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async withdrawStudent(req, res, next) {
    try {
      const data = await enrollmentsService.withdrawStudent(req.body, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async bulkEnroll(req, res, next) {
    try {
      const data = await enrollmentsService.bulkEnroll(req.body, req.user, req.user?.schoolId);
      res.status(201).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async getStudentHistory(req, res, next) {
    try {
      const { studentId } = req.params;
      const data = await enrollmentsService.getStudentHistory(studentId, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async getStudentCurrent(req, res, next) {
    try {
      const { studentId } = req.params;
      const data = await enrollmentsService.getStudentCurrent(studentId, req.user, req.user?.schoolId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  },

  async getClassRoster(req, res, next) {
    try {
      const { classId } = req.params;
      const data = await enrollmentsService.getClassRoster(classId, req.user, req.query, req.user?.schoolId);
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
