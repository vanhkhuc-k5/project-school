/**
 * Schools Module Service
 * Business rules and audit logging for school profile operations.
 */

import { schoolsRepository } from './schools.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { usersRepository } from '../users/users.repository.js';

export const schoolsService = {
  /**
   * Get current school profile
   */
  async getProfile(schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const school = await schoolsRepository.findById(effectiveSchoolId);
    if (!school) {
      throw new AppError('Không tìm thấy thông tin trường học', 404, 'SCHOOL_NOT_FOUND');
    }
    return school;
  },

  /**
   * Update school profile with audit trail
   */
  async updateProfile(schoolId, updateData, adminUser) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const current = await this.getProfile(effectiveSchoolId);

    const updated = await schoolsRepository.update(effectiveSchoolId, updateData);

    // Record audit log
    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Cập nhật hồ sơ trường học: ${updated.name}`,
      badge: 'Cấu hình trường',
      badgeType: 'info',
      schoolId: effectiveSchoolId,
      details: `Code: ${updated.code}, Hiệu trưởng: ${updated.principal_name || 'Chưa cập nhật'}`,
    });

    return updated;
  },
};
