/**
 * Academic Years & Semesters Module Controller
 * Handles HTTP requests and formatting for academic configuration.
 */

import { academicYearsService } from './academic-years.service.js';

export const academicYearsController = {
  /**
   * GET /api/academic-years
   * List all academic years with nested semesters
   */
  async listAcademicYears(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const years = await academicYearsService.listAcademicYears(schoolId);
      return res.json({
        success: true,
        data: { academicYears: years },
        academicYears: years,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/academic-years/current
   * Get active academic year and semester
   */
  async getCurrentCycle(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const cycle = await academicYearsService.getCurrentAcademicCycle(schoolId);
      return res.json({
        success: true,
        data: cycle,
        ...cycle,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/academic-years/:id
   * Get single academic year
   */
  async getAcademicYearById(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const year = await academicYearsService.getAcademicYearById(req.params.id, schoolId);
      return res.json({
        success: true,
        data: { academicYear: year },
        academicYear: year,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/academic-years
   * Create new academic year
   */
  async createAcademicYear(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const created = await academicYearsService.createAcademicYear(req.body, req.user, schoolId);
      return res.status(201).json({
        success: true,
        message: 'Tạo năm học mới thành công!',
        data: { academicYear: created },
        academicYear: created,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/academic-years/:id
   * Update academic year
   */
  async updateAcademicYear(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const updated = await academicYearsService.updateAcademicYear(req.params.id, req.body, req.user, schoolId);
      return res.json({
        success: true,
        message: 'Cập nhật năm học thành công!',
        data: { academicYear: updated },
        academicYear: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/academic-years/:id/set-current
   * Activate academic year
   */
  async setCurrentAcademicYear(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const updated = await academicYearsService.setCurrentAcademicYear(req.params.id, req.user, schoolId);
      return res.json({
        success: true,
        message: `Đã thiết lập "${updated.name}" làm năm học hiện tại!`,
        data: { academicYear: updated },
        academicYear: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/academic-years/:id
   * Delete academic year
   */
  async deleteAcademicYear(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const result = await academicYearsService.deleteAcademicYear(req.params.id, req.user, schoolId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // --------------------------------------------------------------------------
  // SEMESTERS
  // --------------------------------------------------------------------------

  /**
   * POST /api/academic-years/:yearId/semesters
   * Create semester in year
   */
  async createSemester(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const created = await academicYearsService.createSemester(req.params.yearId, req.body, req.user, schoolId);
      return res.status(201).json({
        success: true,
        message: 'Thêm học kỳ thành công!',
        data: { semester: created },
        semester: created,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/academic-years/:yearId/semesters/:id
   * Update semester
   */
  async updateSemester(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const updated = await academicYearsService.updateSemester(
        req.params.yearId,
        req.params.id,
        req.body,
        req.user,
        schoolId
      );
      return res.json({
        success: true,
        message: 'Cập nhật học kỳ thành công!',
        data: { semester: updated },
        semester: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/academic-years/:yearId/semesters/:id/set-current
   * Activate semester
   */
  async setCurrentSemester(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const updated = await academicYearsService.setCurrentSemester(
        req.params.yearId,
        req.params.id,
        req.user,
        schoolId
      );
      return res.json({
        success: true,
        message: `Đã kích hoạt "${updated.name}" làm học kỳ hiện tại!`,
        data: { semester: updated },
        semester: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/academic-years/:yearId/semesters/:id
   * Delete semester
   */
  async deleteSemester(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const result = await academicYearsService.deleteSemester(
        req.params.yearId,
        req.params.id,
        req.user,
        schoolId
      );
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
