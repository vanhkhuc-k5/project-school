/**
 * Academic Structure Module Controller
 * Handles HTTP requests and response formatting for Departments, Subjects, and Classes.
 */

import { academicStructureService } from './academic-structure.service.js';

export const academicStructureController = {
  // ========================================================================
  // 1. DEPARTMENTS
  // ========================================================================
  async listDepartments(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const departments = await academicStructureService.listDepartments(schoolId, req.query);
      return res.json({
        success: true,
        data: { departments },
        departments,
      });
    } catch (err) {
      next(err);
    }
  },

  async getDepartmentById(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const department = await academicStructureService.getDepartmentById(req.params.id, schoolId);
      return res.json({
        success: true,
        data: { department },
        department,
      });
    } catch (err) {
      next(err);
    }
  },

  async createDepartment(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const department = await academicStructureService.createDepartment(req.body, req.user, schoolId);
      return res.status(201).json({
        success: true,
        message: 'Tạo tổ chuyên môn thành công',
        data: { department },
        department,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateDepartment(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const department = await academicStructureService.updateDepartment(req.params.id, req.body, req.user, schoolId);
      return res.json({
        success: true,
        message: 'Cập nhật tổ chuyên môn thành công',
        data: { department },
        department,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteDepartment(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const result = await academicStructureService.deleteDepartment(req.params.id, req.user, schoolId);
      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 2. SUBJECTS
  // ========================================================================
  async listSubjects(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const subjects = await academicStructureService.listSubjects(schoolId, req.query);
      return res.json({
        success: true,
        data: { subjects },
        subjects,
      });
    } catch (err) {
      next(err);
    }
  },

  async getSubjectById(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const subject = await academicStructureService.getSubjectById(req.params.id, schoolId);
      return res.json({
        success: true,
        data: { subject },
        subject,
      });
    } catch (err) {
      next(err);
    }
  },

  async createSubject(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const subject = await academicStructureService.createSubject(req.body, req.user, schoolId);
      return res.status(201).json({
        success: true,
        message: 'Thêm môn học mới thành công',
        data: { subject },
        subject,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSubject(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const subject = await academicStructureService.updateSubject(req.params.id, req.body, req.user, schoolId);
      return res.json({
        success: true,
        message: 'Cập nhật môn học thành công',
        data: { subject },
        subject,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteSubject(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const result = await academicStructureService.deleteSubject(req.params.id, req.user, schoolId);
      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 3. CLASSES
  // ========================================================================
  async listClasses(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const classes = await academicStructureService.listClasses(schoolId, req.query);
      return res.json({
        success: true,
        data: { classes },
        classes,
      });
    } catch (err) {
      next(err);
    }
  },

  async getClassById(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const classItem = await academicStructureService.getClassById(req.params.id, schoolId);
      return res.json({
        success: true,
        data: { class: classItem },
        class: classItem,
      });
    } catch (err) {
      next(err);
    }
  },

  async getClassStudents(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const students = await academicStructureService.getClassStudents(req.params.id, schoolId);
      return res.json({
        success: true,
        data: { students },
        students,
      });
    } catch (err) {
      next(err);
    }
  },

  async createClass(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      // Support legacy payload property names
      const payload = {
        name: req.body.name,
        gradeLevel: req.body.gradeLevel ?? req.body.grade_level,
        academicYearId: req.body.academicYearId ?? req.body.academic_year_id,
        academicYear: req.body.academicYear ?? req.body.academic_year,
        homeroomTeacherId: req.body.homeroomTeacherId ?? req.body.homeroom_teacher_id,
        room: req.body.room,
        maxCapacity: req.body.maxCapacity ?? req.body.max_students ?? req.body.max_capacity,
        status: req.body.status || 'active',
      };
      const newClass = await academicStructureService.createClass(payload, req.user, schoolId);
      return res.status(201).json({
        success: true,
        message: 'Mở lớp học mới thành công',
        classId: newClass.id,
        data: { class: newClass },
        class: newClass,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateClass(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const payload = {
        name: req.body.name,
        gradeLevel: req.body.gradeLevel ?? req.body.grade_level,
        academicYearId: req.body.academicYearId ?? req.body.academic_year_id,
        academicYear: req.body.academicYear ?? req.body.academic_year,
        homeroomTeacherId: req.body.homeroomTeacherId ?? req.body.homeroom_teacher_id,
        room: req.body.room,
        maxCapacity: req.body.maxCapacity ?? req.body.max_students ?? req.body.max_capacity,
        status: req.body.status,
      };
      const updated = await academicStructureService.updateClass(req.params.id, payload, req.user, schoolId);
      return res.json({
        success: true,
        message: 'Cập nhật thông tin lớp học thành công!',
        data: { class: updated },
        class: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async archiveClass(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const archived = await academicStructureService.archiveClass(req.params.id, req.user, schoolId);
      return res.json({
        success: true,
        message: 'Đã chuyển lớp học sang trạng thái lưu trữ thành công',
        data: { class: archived },
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteClass(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
      const result = await academicStructureService.deleteClass(req.params.id, req.user, schoolId);
      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
