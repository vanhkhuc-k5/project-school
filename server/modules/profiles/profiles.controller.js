/**
 * Profiles Module Controller
 * Handles HTTP requests and formatting for Teacher, Student, and Parent profiles.
 */

import { profilesService } from './profiles.service.js';

export const profilesController = {
  // ========================================================================
  // TEACHERS
  // ========================================================================

  async getMyTeacherProfile(req, res, next) {
    try {
      const teacher = await profilesService.getTeacherProfile(req.user.id, req.user);
      res.json({ success: true, data: teacher });
    } catch (err) {
      next(err);
    }
  },

  async updateMyTeacherProfile(req, res, next) {
    try {
      const teacher = await profilesService.updateTeacherProfile(req.user.id, req.body, req.user);
      res.json({ success: true, data: teacher, message: 'Cập nhật hồ sơ giáo viên thành công' });
    } catch (err) {
      next(err);
    }
  },

  async getTeacherById(req, res, next) {
    try {
      const teacher = await profilesService.getTeacherProfile(req.params.id, req.user);
      res.json({ success: true, data: teacher });
    } catch (err) {
      next(err);
    }
  },

  async listTeachers(req, res, next) {
    try {
      const result = await profilesService.listTeachers(req.query, req.user);
      res.json({ success: true, data: result.teachers, teachers: result.teachers, meta: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  async createTeacherProfile(req, res, next) {
    try {
      const teacher = await profilesService.createTeacherProfile(req.body, req.user);
      res.status(201).json({ success: true, data: teacher, message: 'Tạo hồ sơ giáo viên thành công' });
    } catch (err) {
      next(err);
    }
  },

  async updateTeacherProfile(req, res, next) {
    try {
      const teacher = await profilesService.updateTeacherProfile(req.params.id, req.body, req.user);
      res.json({ success: true, data: teacher, message: 'Cập nhật hồ sơ giáo viên thành công' });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // STUDENTS
  // ========================================================================

  async getMyStudentProfile(req, res, next) {
    try {
      const student = await profilesService.getStudentProfile(req.user.id, req.user);
      res.json({ success: true, data: student });
    } catch (err) {
      next(err);
    }
  },

  async getStudentById(req, res, next) {
    try {
      const student = await profilesService.getStudentProfile(req.params.id, req.user);
      res.json({ success: true, data: student });
    } catch (err) {
      next(err);
    }
  },

  async listStudents(req, res, next) {
    try {
      const result = await profilesService.listStudents(req.query, req.user);
      res.json({ success: true, data: result.students, students: result.students, meta: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  async createStudentProfile(req, res, next) {
    try {
      const student = await profilesService.createStudentProfile(req.body, req.user);
      res.status(201).json({ success: true, data: student, message: 'Tạo hồ sơ học sinh thành công' });
    } catch (err) {
      next(err);
    }
  },

  async updateStudentProfile(req, res, next) {
    try {
      const student = await profilesService.updateStudentProfile(req.params.id, req.body, req.user);
      res.json({ success: true, data: student, message: 'Cập nhật hồ sơ học sinh thành công' });
    } catch (err) {
      next(err);
    }
  },

  async getStudentGuardians(req, res, next) {
    try {
      const guardians = await profilesService.getStudentGuardians(req.params.id, req.user);
      res.json({ success: true, data: guardians });
    } catch (err) {
      next(err);
    }
  },

  async assignStudentGuardian(req, res, next) {
    try {
      const assigned = await profilesService.assignStudentGuardian(req.params.id, req.body, req.user);
      res.status(201).json({ success: true, data: assigned, message: 'Gán người giám hộ thành công' });
    } catch (err) {
      next(err);
    }
  },

  async removeStudentGuardian(req, res, next) {
    try {
      const result = await profilesService.removeStudentGuardian(req.params.id, req.params.parentId, req.user);
      res.json({ success: true, message: result.message });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // PARENTS
  // ========================================================================

  async getMyParentProfile(req, res, next) {
    try {
      const parent = await profilesService.getParentProfile(req.user.id, req.user);
      res.json({ success: true, data: parent });
    } catch (err) {
      next(err);
    }
  },

  async getParentById(req, res, next) {
    try {
      const parent = await profilesService.getParentProfile(req.params.id, req.user);
      res.json({ success: true, data: parent });
    } catch (err) {
      next(err);
    }
  },

  async listParents(req, res, next) {
    try {
      const result = await profilesService.listParents(req.query, req.user);
      res.json({ success: true, data: result.parents, parents: result.parents, meta: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  async createParentProfile(req, res, next) {
    try {
      const parent = await profilesService.createParentProfile(req.body, req.user);
      res.status(201).json({ success: true, data: parent, message: 'Tạo hồ sơ phụ huynh thành công' });
    } catch (err) {
      next(err);
    }
  },

  async updateParentProfile(req, res, next) {
    try {
      const parent = await profilesService.updateParentProfile(req.params.id, req.body, req.user);
      res.json({ success: true, data: parent, message: 'Cập nhật hồ sơ phụ huynh thành công' });
    } catch (err) {
      next(err);
    }
  },

  async getParentChildren(req, res, next) {
    try {
      const targetUserId = req.params.id === 'me' ? req.user.id : req.params.id;
      const children = await profilesService.getParentChildren(targetUserId, req.user);
      res.json({ success: true, data: children });
    } catch (err) {
      next(err);
    }
  },
};
