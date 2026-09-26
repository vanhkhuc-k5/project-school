/**
 * Department Head Module Controller
 * G33: HTTP request handlers with department scoping.
 */

import { departmentHeadService } from './department-head.service.js';
import {
  queryDepartmentTeachersSchema,
  queryDepartmentSubjectsSchema,
  queryDepartmentClassesSchema,
  queryDepartmentPerformanceSchema,
  queryDepartmentAssignmentsSchema,
  queryDepartmentStudentsSchema,
  updateDepartmentHeadSchema,
} from './department-head.schema.js';

export const departmentHeadController = {
  // ========================================================================
  // 1. DEPARTMENT OVERVIEW
  // ========================================================================

  /**
   * GET /department-head/overview
   * Get department dashboard overview for the authenticated department head.
   */
  async getOverview(req, res, next) {
    try {
      const result = await departmentHeadService.getDepartmentOverview(req.user, req.schoolId);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 2. DEPARTMENT TEACHERS
  // ========================================================================

  /**
   * GET /department-head/:departmentId/teachers
   * List all teachers in the department.
   */
  async listTeachers(req, res, next) {
    try {
      const { departmentId } = req.params;
      const query = queryDepartmentTeachersSchema.parse(req.query);

      const result = await departmentHeadService.listTeachers(
        req.user,
        departmentId,
        req.schoolId,
        query
      );

      res.json({
        success: true,
        data: result.data,
        meta: { pagination: result.pagination },
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 3. DEPARTMENT SUBJECTS
  // ========================================================================

  /**
   * GET /department-head/:departmentId/subjects
   * List all subjects in the department.
   */
  async listSubjects(req, res, next) {
    try {
      const { departmentId } = req.params;
      const query = queryDepartmentSubjectsSchema.parse(req.query);

      const result = await departmentHeadService.listSubjects(
        req.user,
        departmentId,
        req.schoolId,
        query
      );

      res.json({
        success: true,
        data: result.data,
        meta: { pagination: result.pagination },
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 4. DEPARTMENT CLASSES
  // ========================================================================

  /**
   * GET /department-head/:departmentId/classes
   * List classes where department's subjects are taught.
   */
  async listClasses(req, res, next) {
    try {
      const { departmentId } = req.params;
      const query = queryDepartmentClassesSchema.parse(req.query);

      const result = await departmentHeadService.listClasses(
        req.user,
        departmentId,
        req.schoolId,
        query
      );

      res.json({
        success: true,
        data: result.data,
        meta: { pagination: result.pagination },
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 5. CLASS/SUBJECT PERFORMANCE
  // ========================================================================

  /**
   * GET /department-head/:departmentId/performance
   * Get performance statistics for department's subjects and classes.
   */
  async getPerformance(req, res, next) {
    try {
      const { departmentId } = req.params;
      const query = queryDepartmentPerformanceSchema.parse(req.query);

      const result = await departmentHeadService.getPerformance(
        req.user,
        departmentId,
        req.schoolId,
        query
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 6. DEPARTMENT ASSIGNMENTS (VISIBILITY)
  // ========================================================================

  /**
   * GET /department-head/:departmentId/assignments
   * List all assignments for department's subjects.
   */
  async listAssignments(req, res, next) {
    try {
      const { departmentId } = req.params;
      const query = queryDepartmentAssignmentsSchema.parse(req.query);

      const result = await departmentHeadService.listAssignments(
        req.user,
        departmentId,
        req.schoolId,
        query
      );

      res.json({
        success: true,
        data: result.data,
        meta: { pagination: result.pagination },
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 7. DEPARTMENT STUDENTS
  // ========================================================================

  /**
   * GET /department-head/:departmentId/students
   * List students in department's classes.
   */
  async listStudents(req, res, next) {
    try {
      const { departmentId } = req.params;
      const query = queryDepartmentStudentsSchema.parse(req.query);

      const result = await departmentHeadService.listStudents(
        req.user,
        departmentId,
        req.schoolId,
        query
      );

      res.json({
        success: true,
        data: result.data,
        meta: { pagination: result.pagination },
      });
    } catch (err) {
      next(err);
    }
  },

  // ========================================================================
  // 8. UPDATE DEPARTMENT
  // ========================================================================

  /**
   * PATCH /department-head/:departmentId
   * Update department info (description only — headTeacherId requires school admin).
   */
  async updateDepartment(req, res, next) {
    try {
      const { departmentId } = req.params;
      const payload = updateDepartmentHeadSchema.parse(req.body);

      const result = await departmentHeadService.updateDepartment(
        req.user,
        departmentId,
        payload,
        req.schoolId
      );

      res.json({
        success: true,
        data: result,
        message: 'Cập nhật thông tin tổ chuyên môn thành công',
      });
    } catch (err) {
      next(err);
    }
  },
};
