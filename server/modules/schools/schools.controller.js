/**
 * Schools Module Controller
 * Handles HTTP requests for school profile.
 */

import { schoolsService } from './schools.service.js';

export const schoolsController = {
  /**
   * GET /api/schools/profile
   * Return school profile for the current tenant
   */
  async getProfile(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const school = await schoolsService.getProfile(schoolId);
      return res.json({
        success: true,
        data: { school },
        school,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/schools/profile
   * Update current school profile
   */
  async updateProfile(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const updated = await schoolsService.updateProfile(schoolId, req.body, req.user);
      return res.json({
        success: true,
        message: 'Cập nhật thông tin trường học thành công!',
        data: { school: updated },
        school: updated,
      });
    } catch (err) {
      next(err);
    }
  },
};
