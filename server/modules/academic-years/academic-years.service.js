/**
 * Academic Years & Semesters Module Service
 * Business rules, lifecycle validations, and audit logging for academic configuration.
 */

import { academicYearsRepository } from './academic-years.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { usersRepository } from '../users/users.repository.js';

export const academicYearsService = {
  /**
   * List all academic years with nested semesters
   */
  async listAcademicYears(schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    return academicYearsRepository.findAll(effectiveSchoolId);
  },

  /**
   * Get current active academic year and semester
   */
  async getCurrentAcademicCycle(schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const cycle = await academicYearsRepository.findCurrent(effectiveSchoolId);
    return cycle;
  },

  /**
   * Get single academic year by ID
   */
  async getAcademicYearById(id, schoolId) {
    const effectiveSchoolId = schoolId || 'sch_bacau';
    const year = await academicYearsRepository.findById(id, effectiveSchoolId);
    if (!year) {
      throw new AppError('Không tìm thấy thông tin năm học', 404, 'ACADEMIC_YEAR_NOT_FOUND');
    }
    return year;
  },

  /**
   * Create new academic year
   */
  async createAcademicYear(payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';

    // 1. Check duplicate name
    const dupName = await academicYearsRepository.findByName(effectiveSchoolId, payload.name);
    if (dupName) {
      throw new AppError(`Năm học "${payload.name}" đã tồn tại trong trường`, 400, 'DUPLICATE_ACADEMIC_YEAR_NAME');
    }

    // 2. Check overlapping years
    const overlapping = await academicYearsRepository.findOverlappingYears(
      effectiveSchoolId,
      payload.start_date,
      payload.end_date
    );
    if (overlapping.length > 0) {
      throw new AppError(
        `Khoảng thời gian (${payload.start_date} đến ${payload.end_date}) bị trùng lặp với năm học "${overlapping[0].name}" (${overlapping[0].start_date} đến ${overlapping[0].end_date})`,
        400,
        'OVERLAPPING_ACADEMIC_YEAR_PERIOD'
      );
    }

    const yearId = `ay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created = await academicYearsRepository.createYear({
      id: yearId,
      schoolId: effectiveSchoolId,
      name: payload.name.trim(),
      startDate: payload.start_date,
      endDate: payload.end_date,
      isCurrent: payload.is_current === true,
    });

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Tạo năm học mới: ${created.name}`,
      badge: 'Năm học mới',
      badgeType: 'success',
      schoolId: effectiveSchoolId,
      details: `Kỳ hạn: ${created.start_date} đến ${created.end_date}, Hiện tại: ${created.is_current ? 'Có' : 'Không'}`,
    });

    return created;
  },

  /**
   * Update academic year
   */
  async updateAcademicYear(id, payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const current = await this.getAcademicYearById(id, effectiveSchoolId);

    // 1. Duplicate name check
    if (payload.name && payload.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const dupName = await academicYearsRepository.findByName(effectiveSchoolId, payload.name, id);
      if (dupName) {
        throw new AppError(`Năm học "${payload.name}" đã tồn tại trong trường`, 400, 'DUPLICATE_ACADEMIC_YEAR_NAME');
      }
    }

    const newStart = payload.start_date || current.start_date;
    const newEnd = payload.end_date || current.end_date;

    // 2. Overlap check
    if (payload.start_date || payload.end_date) {
      const overlapping = await academicYearsRepository.findOverlappingYears(
        effectiveSchoolId,
        newStart,
        newEnd,
        id
      );
      if (overlapping.length > 0) {
        throw new AppError(
          `Khoảng thời gian (${newStart} đến ${newEnd}) bị trùng lặp với năm học "${overlapping[0].name}"`,
          400,
          'OVERLAPPING_ACADEMIC_YEAR_PERIOD'
        );
      }

      // Check existing semesters fit within new bounds
      if (current.semesters && current.semesters.length > 0) {
        for (const sem of current.semesters) {
          if (sem.start_date < newStart || sem.end_date > newEnd) {
            throw new AppError(
              `Không thể thu hẹp thời gian năm học vì học kỳ "${sem.name}" (${sem.start_date} - ${sem.end_date}) nằm ngoài khoảng này`,
              400,
              'SEMESTER_OUT_OF_BOUNDS'
            );
          }
        }
      }
    }

    const updated = await academicYearsRepository.updateYear(id, effectiveSchoolId, {
      name: payload.name ? payload.name.trim() : undefined,
      startDate: payload.start_date,
      endDate: payload.end_date,
      isCurrent: payload.is_current,
    });

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Cập nhật năm học: ${updated.name}`,
      badge: 'Cập nhật năm học',
      badgeType: 'info',
      schoolId: effectiveSchoolId,
      details: `ID: ${id}, Thời gian: ${updated.start_date} - ${updated.end_date}`,
    });

    return updated;
  },

  /**
   * Set academic year as active/current
   */
  async setCurrentAcademicYear(id, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const year = await this.getAcademicYearById(id, effectiveSchoolId);

    const updated = await academicYearsRepository.setCurrentYear(id, effectiveSchoolId);

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Kích hoạt năm học hiện tại: ${year.name}`,
      badge: 'Kích hoạt năm học',
      badgeType: 'success',
      schoolId: effectiveSchoolId,
      details: `Năm học "${year.name}" được thiết lập làm năm học vận hành chính`,
    });

    return updated;
  },

  /**
   * Delete academic year with historical data protection
   */
  async deleteAcademicYear(id, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const year = await this.getAcademicYearById(id, effectiveSchoolId);

    // Historical data protection: reject deletion if classes are associated
    const hasHistory = await academicYearsRepository.hasHistoricalData(id);
    if (hasHistory) {
      throw new AppError(
        `Không thể xóa năm học "${year.name}" vì có các lớp học và dữ liệu học vụ liên kết. Vui lòng bảo lưu dữ liệu lịch sử.`,
        409,
        'CANNOT_DELETE_WITH_HISTORICAL_DATA'
      );
    }

    if (year.is_current) {
      throw new AppError(
        `Không thể xóa năm học đang được kích hoạt làm năm học hiện tại. Vui lòng chuyển năm học hiện tại sang niên khóa khác trước khi xóa.`,
        400,
        'CANNOT_DELETE_ACTIVE_YEAR'
      );
    }

    await academicYearsRepository.deleteYear(id, effectiveSchoolId);

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Xóa năm học: ${year.name}`,
      badge: 'Xóa năm học',
      badgeType: 'danger',
      schoolId: effectiveSchoolId,
      details: `ID: ${id}`,
    });

    return {
      success: true,
      message: `Đã xóa năm học "${year.name}" thành công!`,
    };
  },

  // --------------------------------------------------------------------------
  // SEMESTER OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Create semester inside an academic year
   */
  async createSemester(yearId, payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const year = await this.getAcademicYearById(yearId, effectiveSchoolId);

    // 1. Boundary check: semester must be completely inside year
    if (payload.start_date < year.start_date || payload.end_date > year.end_date) {
      throw new AppError(
        `Thời gian học kỳ (${payload.start_date} đến ${payload.end_date}) phải nằm trong khoảng thời gian của năm học "${year.name}" (${year.start_date} đến ${year.end_date})`,
        400,
        'SEMESTER_OUT_OF_YEAR_BOUNDS'
      );
    }

    // 2. Duplicate semester number
    const dupNumber = await academicYearsRepository.findSemesterByNumber(yearId, payload.semester_number);
    if (dupNumber) {
      throw new AppError(
        `Học kỳ số ${payload.semester_number} đã tồn tại trong năm học này`,
        400,
        'DUPLICATE_SEMESTER_NUMBER'
      );
    }

    // 3. Overlapping semester check within the year
    const overlapping = await academicYearsRepository.findOverlappingSemesters(
      yearId,
      payload.start_date,
      payload.end_date
    );
    if (overlapping.length > 0) {
      throw new AppError(
        `Thời gian học kỳ bị trùng lặp với học kỳ "${overlapping[0].name}" (${overlapping[0].start_date} đến ${overlapping[0].end_date})`,
        400,
        'OVERLAPPING_SEMESTER_PERIOD'
      );
    }

    const semesterId = `sem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created = await academicYearsRepository.createSemester({
      id: semesterId,
      schoolId: effectiveSchoolId,
      academicYearId: yearId,
      name: payload.name.trim(),
      semesterNumber: payload.semester_number,
      startDate: payload.start_date,
      endDate: payload.end_date,
      isCurrent: payload.is_current === true,
    });

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Thêm học kỳ mới: ${created.name} (${year.name})`,
      badge: 'Thêm học kỳ',
      badgeType: 'success',
      schoolId: effectiveSchoolId,
      details: `Học kỳ ${created.semester_number}, Thời gian: ${created.start_date} - ${created.end_date}`,
    });

    return created;
  },

  /**
   * Update semester
   */
  async updateSemester(yearId, semesterId, payload, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const year = await this.getAcademicYearById(yearId, effectiveSchoolId);
    const semester = await academicYearsRepository.findSemesterById(semesterId, effectiveSchoolId);

    if (!semester || semester.academic_year_id !== yearId) {
      throw new AppError('Không tìm thấy học kỳ trong năm học tương ứng', 404, 'SEMESTER_NOT_FOUND');
    }

    const newStart = payload.start_date || semester.start_date;
    const newEnd = payload.end_date || semester.end_date;

    // Boundary check
    if (newStart < year.start_date || newEnd > year.end_date) {
      throw new AppError(
        `Thời gian học kỳ phải nằm trong khoảng thời gian của năm học "${year.name}" (${year.start_date} đến ${year.end_date})`,
        400,
        'SEMESTER_OUT_OF_YEAR_BOUNDS'
      );
    }

    // Overlap check
    if (payload.start_date || payload.end_date) {
      const overlapping = await academicYearsRepository.findOverlappingSemesters(
        yearId,
        newStart,
        newEnd,
        semesterId
      );
      if (overlapping.length > 0) {
        throw new AppError(
          `Thời gian học kỳ bị trùng lặp với học kỳ "${overlapping[0].name}"`,
          400,
          'OVERLAPPING_SEMESTER_PERIOD'
        );
      }
    }

    // Duplicate semester number check
    if (payload.semester_number && payload.semester_number !== semester.semester_number) {
      const dupNumber = await academicYearsRepository.findSemesterByNumber(
        yearId,
        payload.semester_number,
        semesterId
      );
      if (dupNumber) {
        throw new AppError(
          `Học kỳ số ${payload.semester_number} đã tồn tại trong năm học này`,
          400,
          'DUPLICATE_SEMESTER_NUMBER'
        );
      }
    }

    const updated = await academicYearsRepository.updateSemester(semesterId, effectiveSchoolId, {
      name: payload.name ? payload.name.trim() : undefined,
      semesterNumber: payload.semester_number,
      startDate: payload.start_date,
      endDate: payload.end_date,
      isCurrent: payload.is_current,
    });

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Cập nhật học kỳ: ${updated.name} (${year.name})`,
      badge: 'Cập nhật học kỳ',
      badgeType: 'info',
      schoolId: effectiveSchoolId,
      details: `ID: ${semesterId}, Kỳ: ${updated.start_date} - ${updated.end_date}`,
    });

    return updated;
  },

  /**
   * Set semester as current/active
   */
  async setCurrentSemester(yearId, semesterId, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const year = await this.getAcademicYearById(yearId, effectiveSchoolId);
    const semester = await academicYearsRepository.findSemesterById(semesterId, effectiveSchoolId);

    if (!semester || semester.academic_year_id !== yearId) {
      throw new AppError('Không tìm thấy học kỳ trong năm học tương ứng', 404, 'SEMESTER_NOT_FOUND');
    }

    // Setting semester as active also ensures parent year is current
    await academicYearsRepository.setCurrentYear(yearId, effectiveSchoolId);
    const updated = await academicYearsRepository.setCurrentSemester(semesterId, effectiveSchoolId);

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Kích hoạt học kỳ hiện tại: ${semester.name} - ${year.name}`,
      badge: 'Kích hoạt học kỳ',
      badgeType: 'success',
      schoolId: effectiveSchoolId,
      details: `Học kỳ ${semester.name} niên khóa ${year.name} được thiết lập làm học kỳ vận hành chính`,
    });

    return updated;
  },

  /**
   * Delete semester
   */
  async deleteSemester(yearId, semesterId, adminUser, schoolId) {
    const effectiveSchoolId = schoolId || adminUser?.schoolId || 'sch_bacau';
    const semester = await academicYearsRepository.findSemesterById(semesterId, effectiveSchoolId);

    if (!semester || semester.academic_year_id !== yearId) {
      throw new AppError('Không tìm thấy học kỳ tương ứng', 404, 'SEMESTER_NOT_FOUND');
    }

    if (semester.is_current) {
      throw new AppError(
        'Không thể xóa học kỳ đang hoạt động. Vui lòng kích hoạt học kỳ khác trước khi xóa.',
        400,
        'CANNOT_DELETE_ACTIVE_SEMESTER'
      );
    }

    await academicYearsRepository.deleteSemester(semesterId, effectiveSchoolId);

    await usersRepository.logAudit({
      actorId: adminUser?.id,
      actorName: adminUser?.name || 'Quản trị viên',
      role: adminUser?.role || 'school_admin',
      action: `Xóa học kỳ: ${semester.name}`,
      badge: 'Xóa học kỳ',
      badgeType: 'danger',
      schoolId: effectiveSchoolId,
      details: `ID: ${semesterId}, Năm học ID: ${yearId}`,
    });

    return {
      success: true,
      message: `Đã xóa học kỳ "${semester.name}" thành công!`,
    };
  },
};
