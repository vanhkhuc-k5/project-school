/**
 * G34 — Reporting Repository
 * Efficient database queries for reporting
 * 
 * Key principles:
 * - NO N+1 queries - use JOINs and subqueries
 * - School scope enforced on all queries
 * - Efficient indexes used
 * - Batch loading where needed
 */

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const reportingRepository = {
  // =========================================================================
  // STUDENT ACADEMIC RECORD REPORT
  // =========================================================================

  /**
   * Get student academic record - single query with all data
   * Avoids N+1 by using JOINs
   */
  async getStudentAcademicRecord(schoolId, studentId, query = {}) {
    const { academicYearId, semesterId, page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      // Get student info with class enrollment
      const studentSql = `
        SELECT 
          s.id as student_id,
          s.user_id,
          s.student_code,
          u.name as student_name,
          c.id as class_id,
          c.name as class_name,
          c.grade_level,
          ay.name as academic_year,
          s.gpa,
          s.attendance_rate
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = TRUE AND ce.status = 'enrolled'
        LEFT JOIN classes c ON ce.class_id = c.id
        LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
        WHERE s.id = $1 AND (c.school_id = $2 OR c.school_id IS NULL)
      `;
      const studentRes = await pgQuery(studentSql, [studentId, schoolId]);
      const student = studentRes.rows[0];

      if (!student) return null;

      // Get grades by subject - single query with aggregation
      let gradesSql = `
        SELECT 
          sub.id as subject_id,
          sub.name as subject_name,
          sub.code as subject_code,
          sub.credits,
          ROUND(AVG(g.raw_score / NULLIF(g.max_score, 0) * 100)::numeric, 1) as average_percentage,
          ROUND(AVG(g.raw_score)::numeric, 2) as average_score,
          MAX(g.max_score) as max_score,
          COUNT(g.id) as grade_count,
          CASE 
            WHEN AVG(g.raw_score / NULLIF(g.max_score, 0)) >= 0.9 THEN 'A'
            WHEN AVG(g.raw_score / NULLIF(g.max_score, 0)) >= 0.8 THEN 'B'
            WHEN AVG(g.raw_score / NULLIF(g.max_score, 0)) >= 0.7 THEN 'C'
            WHEN AVG(g.raw_score / NULLIF(g.max_score, 0)) >= 0.6 THEN 'D'
            ELSE 'F'
          END as letter_grade
        FROM grades g
        JOIN subjects sub ON g.subject_id = sub.id
        WHERE g.student_id = $1
          AND g.status = 'published'
          AND g.school_id = $2
          ${academicYearId ? 'AND g.academic_year_id = $3' : ''}
          ${semesterId ? 'AND g.semester_id = $4' : ''}
        GROUP BY sub.id, sub.name, sub.code, sub.credits
        ORDER BY sub.name
      `;

      const gradesParams = [studentId, schoolId];
      if (academicYearId) gradesParams.push(academicYearId);
      if (semesterId) gradesParams.push(semesterId);

      const gradesRes = await pgQuery(gradesSql, gradesParams);

      // Get individual grade entries with pagination
      let entriesSql = `
        SELECT 
          g.id as assignment_id,
          COALESCE(a.title, 'Grade Entry') as assignment_title,
          gc.name as category_name,
          g.raw_score as score,
          g.max_score,
          ROUND((g.raw_score / NULLIF(g.max_score, 0) * 100)::numeric, 1) as percentage,
          g.status,
          g.updated_at as graded_at
        FROM grades g
        LEFT JOIN assignments a ON g.assignment_id = a.id
        LEFT JOIN grade_categories gc ON g.category_id = gc.id
        WHERE g.student_id = $1
          AND g.status = 'published'
          AND g.school_id = $2
          ${academicYearId ? 'AND g.academic_year_id = $3' : ''}
          ${semesterId ? 'AND g.semester_id = $4' : ''}
        ORDER BY g.updated_at DESC
        LIMIT $${gradesParams.length + 1} OFFSET $${gradesParams.length + 2}
      `;
      const entriesParams = [...gradesParams, limit, offset];
      const entriesRes = await pgQuery(entriesSql, entriesParams);

      // Count total for pagination
      const countSql = entriesSql.split('LIMIT')[0].replace(/\$.*OFFSET.*$/, '');
      const countRes = await pgQuery(`SELECT COUNT(*) as total FROM (${countSql}) subq`, gradesParams);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      return {
        student: {
          studentId: student.student_id,
          studentCode: student.student_code,
          studentName: student.student_name,
          className: student.class_name,
          gradeLevel: student.grade_level,
          academicYear: student.academic_year,
          overallGPA: parseFloat(student.gpa) || 0,
          attendanceRate: parseFloat(student.attendance_rate) || 0,
        },
        subjects: gradesRes.rows.map(r => ({
          subjectId: r.subject_id,
          subjectName: r.subject_name,
          subjectCode: r.subject_code,
          averageScore: parseFloat(r.average_score) || 0,
          maxScore: parseFloat(r.max_score) || 10,
          percentage: parseFloat(r.average_percentage) || 0,
          letterGrade: r.letter_grade,
          creditHours: parseFloat(r.credits) || 0,
        })),
        entries: {
          data: entriesRes.rows.map(r => ({
            assignmentId: r.assignment_id,
            assignmentTitle: r.assignment_title,
            categoryName: r.category_name || 'General',
            score: parseFloat(r.score) || 0,
            maxScore: parseFloat(r.max_score) || 10,
            percentage: parseFloat(r.percentage) || 0,
            status: r.status,
            gradedAt: r.graded_at,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    }

    // SQLite fallback - similar structure
    const student = db.prepare(`
      SELECT s.id as student_id, s.user_id, s.student_code, u.name as student_name,
             c.id as class_id, c.name as class_name, c.grade_level,
             ay.name as academic_year, s.gpa, s.attendance_rate
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1 AND ce.status = 'enrolled'
      LEFT JOIN classes c ON ce.class_id = c.id
      LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
      WHERE s.id = ? AND (c.school_id = ? OR c.school_id IS NULL)
    `).get(studentId, schoolId);

    if (!student) return null;

    const gradesParams = [studentId, schoolId];
    let gradesSql = `
      SELECT sub.id as subject_id, sub.name as subject_name, sub.code as subject_code, sub.credits,
             AVG(g.raw_score) as average_score, MAX(g.max_score) as max_score, COUNT(g.id) as grade_count
      FROM grades g
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE g.student_id = ? AND g.status = 'published' AND g.school_id = ?
      GROUP BY sub.id, sub.name, sub.code, sub.credits
      ORDER BY sub.name
    `;

    const grades = db.prepare(gradesSql).all(...gradesParams);

    return {
      student: {
        studentId: student.student_id,
        studentCode: student.student_code,
        studentName: student.student_name,
        className: student.class_name,
        gradeLevel: student.grade_level,
        academicYear: student.academic_year,
        overallGPA: parseFloat(student.gpa) || 0,
        attendanceRate: parseFloat(student.attendance_rate) || 0,
      },
      subjects: grades.map(r => ({
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        subjectCode: r.subject_code,
        averageScore: parseFloat(r.average_score) || 0,
        maxScore: parseFloat(r.max_score) || 10,
        percentage: r.average_score ? (parseFloat(r.average_score) / parseFloat(r.max_score || 10) * 100) : 0,
        letterGrade: r.average_score ? (parseFloat(r.average_score) >= 9 ? 'A' : 
          (parseFloat(r.average_score) >= 8 ? 'B' : 
            (parseFloat(r.average_score) >= 7 ? 'C' : 
              (parseFloat(r.average_score) >= 6 ? 'D' : 'F')))) : 'N/A',
        creditHours: parseFloat(r.credits) || 0,
      })),
      entries: { data: [], pagination: { page, limit, total: 0, totalPages: 0 } },
    };
  },

  // =========================================================================
  // CLASS GRADE REPORT
  // =========================================================================

  /**
   * Get class grade report - aggregated by student
   * Efficient query avoiding N+1
   */
  async getClassGradeReport(schoolId, classId, query = {}) {
    const { academicYearId, semesterId, page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      // Get class info
      const classSql = `
        SELECT c.id, c.name, c.grade_level, ay.name as academic_year, ay.id as academic_year_id,
               s.name as semester_name, s.id as semester_id,
               COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.status = 'enrolled') as student_count
        FROM classes c
        LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
        LEFT JOIN semesters s ON s.academic_year_id = ay.id
        LEFT JOIN class_enrollments ce ON ce.class_id = c.id AND ce.is_current = TRUE
        WHERE c.id = $1 AND c.school_id = $2
        GROUP BY c.id, c.name, c.grade_level, ay.name, ay.id, s.name, s.id
      `;
      const classRes = await pgQuery(classSql, [classId, schoolId]);
      const classInfo = classRes.rows[0];

      if (!classInfo) return null;

      // Get student grades aggregated
      let studentsSql = `
        SELECT 
          st.id as student_id,
          st.student_code,
          u.name as student_name,
          ROUND(AVG(g.raw_score / NULLIF(g.max_score, 0) * 100)::numeric, 1) as average_percentage,
          ROUND(AVG(g.raw_score)::numeric, 2) as average_score,
          COUNT(g.id) as grade_count,
          RANK() OVER (ORDER BY AVG(g.raw_score / NULLIF(g.max_score, 0)) DESC) as rank
        FROM students st
        JOIN users u ON st.user_id = u.id
        JOIN class_enrollments ce ON ce.student_id = st.id AND ce.class_id = $1 AND ce.is_current = TRUE AND ce.status = 'enrolled'
        LEFT JOIN grades g ON g.student_id = st.id 
          AND g.class_id = $1
          AND g.status = 'published'
          ${academicYearId ? 'AND g.academic_year_id = $3' : ''}
          ${semesterId ? 'AND g.semester_id = $4' : ''}
        WHERE st.school_id = $2
        GROUP BY st.id, st.student_code, u.name
        ORDER BY average_score DESC NULLS LAST
        LIMIT $${academicYearId ? (semesterId ? 5 : 4) : 3} OFFSET $${academicYearId ? (semesterId ? 6 : 5) : 4}
      `;

      const params = [classId, schoolId];
      if (academicYearId) params.push(academicYearId);
      if (semesterId) params.push(semesterId);
      params.push(limit, offset);

      const studentsRes = await pgQuery(studentsSql, params);

      // Count total
      const countSql = `SELECT COUNT(*) as total FROM class_enrollments WHERE class_id = $1 AND is_current = TRUE AND status = 'enrolled'`;
      const countRes = await pgQuery(countSql, [classId]);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      // Get subject breakdown for class
      const subjectSql = `
        SELECT 
          sub.id as subject_id,
          sub.name as subject_name,
          COUNT(DISTINCT g.student_id) as students_graded,
          ROUND(AVG(g.raw_score / NULLIF(g.max_score, 0) * 100)::numeric, 1) as class_average
        FROM subjects sub
        LEFT JOIN grades g ON g.subject_id = sub.id 
          AND g.class_id = $1
          AND g.status = 'published'
          ${academicYearId ? 'AND g.academic_year_id = $2' : ''}
          ${semesterId ? 'AND g.semester_id = $3' : ''}
        WHERE sub.department_id IN (
          SELECT DISTINCT s.department_id FROM teacher_assignments ta
          JOIN subjects s ON ta.subject_id = s.id
          WHERE ta.class_id = $1 AND s.department_id IS NOT NULL
        )
        GROUP BY sub.id, sub.name
        ORDER BY sub.name
      `;
      const subjParams = [classId];
      if (academicYearId) subjParams.push(academicYearId);
      if (semesterId) subjParams.push(semesterId);
      const subjectRes = await pgQuery(subjectSql, subjParams);

      return {
        classInfo: {
          classId: classInfo.id,
          className: classInfo.name,
          gradeLevel: classInfo.grade_level,
          academicYear: classInfo.academic_year,
          semesterName: classInfo.semester_name,
          studentCount: parseInt(classInfo.student_count || '0', 10),
        },
        subjects: subjectRes.rows.map(r => ({
          subjectId: r.subject_id,
          subjectName: r.subject_name,
          studentsGraded: parseInt(r.students_graded || '0', 10),
          classAverage: parseFloat(r.class_average) || 0,
        })),
        students: {
          data: studentsRes.rows.map(r => ({
            studentId: r.student_id,
            studentCode: r.student_code,
            studentName: r.student_name,
            averageScore: parseFloat(r.average_score) || 0,
            averagePercentage: parseFloat(r.average_percentage) || 0,
            gradeCount: parseInt(r.grade_count || '0', 10),
            rank: r.rank,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    }

    return null; // SQLite fallback not implemented for complex queries
  },

  // =========================================================================
  // ATTENDANCE REPORT
  // =========================================================================

  /**
   * Get attendance report - by student or class
   * Efficient aggregation query
   */
  async getAttendanceReport(schoolId, query = {}) {
    const { 
      classId, studentId, gradeLevel, 
      startDate, endDate, 
      page = 1, limit = 100 
    } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      // Build WHERE conditions
      const conditions = ['asr.school_id = $1'];
      const params = [schoolId];
      let paramIdx = 2;

      if (classId) {
        conditions.push(`asr.class_id = $${paramIdx++}`);
        params.push(classId);
      }
      if (studentId) {
        conditions.push(`ar.student_id = $${paramIdx++}`);
        params.push(studentId);
      }
      if (startDate) {
        conditions.push(`asr.date >= $${paramIdx++}`);
        params.push(startDate);
      }
      if (endDate) {
        conditions.push(`asr.date <= $${paramIdx++}`);
        params.push(endDate);
      }
      if (gradeLevel) {
        conditions.push(`c.grade_level = $${paramIdx++}`);
        params.push(gradeLevel);
      }

      const whereClause = conditions.join(' AND ');

      // Summary by entity (student or class)
      let summarySql;
      if (studentId) {
        // Per-day attendance for a student
        summarySql = `
          SELECT 
            asr.date as date,
            asr.period,
            sub.name as subject_name,
            ar.status,
            ar.note
          FROM attendance_records ar
          JOIN attendance_sessions asr ON ar.session_id = asr.id
          LEFT JOIN subjects sub ON asr.subject_id = sub.id
          JOIN classes c ON asr.class_id = c.id
          WHERE ${whereClause}
          ORDER BY asr.date DESC, asr.period
          LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `;
      } else {
        // Summary by student
        summarySql = `
          SELECT 
            st.id as entity_id,
            u.name as entity_name,
            st.student_code,
            c.id as class_id,
            c.name as class_name,
            COUNT(ar.id) as total_days,
            SUM(CASE WHEN UPPER(ar.status) = 'PRESENT' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN UPPER(ar.status) = 'ABSENT' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN UPPER(ar.status) = 'LATE' THEN 1 ELSE 0 END) as late_days,
            SUM(CASE WHEN UPPER(ar.status) = 'EXCUSED' THEN 1 ELSE 0 END) as excused_days,
            ROUND(SUM(CASE WHEN UPPER(ar.status) IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::numeric / 
              NULLIF(COUNT(ar.id), 0) * 100, 1) as attendance_rate
          FROM attendance_records ar
          JOIN attendance_sessions asr ON ar.session_id = asr.id
          JOIN students st ON ar.student_id = st.id
          JOIN users u ON st.user_id = u.id
          JOIN classes c ON asr.class_id = c.id
          WHERE ${whereClause}
          GROUP BY st.id, u.name, st.student_code, c.id, c.name
          ORDER BY c.name, u.name
          LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `;
      }

      params.push(limit, offset);
      const summaryRes = await pgQuery(summarySql, params);

      // Count total
      const countSql = `
        SELECT COUNT(DISTINCT st.id) as total
        FROM attendance_records ar
        JOIN attendance_sessions asr ON ar.session_id = asr.id
        JOIN students st ON ar.student_id = st.id
        JOIN classes c ON asr.class_id = c.id
        WHERE ${whereClause}
      `;
      const countRes = await pgQuery(countSql, params.slice(0, -2));
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      return {
        dateRange: { start: startDate, end: endDate },
        summary: studentId ? null : summaryRes.rows.map(r => ({
          entityId: r.entity_id,
          entityName: r.entity_name,
          studentCode: r.student_code,
          classId: r.class_id,
          className: r.class_name,
          totalDays: parseInt(r.total_days || '0', 10),
          presentDays: parseInt(r.present_days || '0', 10),
          absentDays: parseInt(r.absent_days || '0', 10),
          lateDays: parseInt(r.late_days || '0', 10),
          excusedDays: parseInt(r.excused_days || '0', 10),
          attendanceRate: parseFloat(r.attendance_rate || '0', 10),
        })),
        details: studentId ? summaryRes.rows.map(r => ({
          date: r.date,
          period: r.period,
          subjectName: r.subject_name,
          status: r.status,
          note: r.note,
        })) : [],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    return null;
  },

  // =========================================================================
  // ASSIGNMENT REPORT
  // =========================================================================

  /**
   * Get assignment report - summary for teachers/department heads
   */
  async getAssignmentReport(schoolId, query = {}) {
    const { classId, subjectId, teacherId, status, startDate, endDate, page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      const conditions = ['a.school_id = $1'];
      const params = [schoolId];
      let paramIdx = 2;

      if (classId) {
        conditions.push(`a.class_id = $${paramIdx++}`);
        params.push(classId);
      }
      if (subjectId) {
        conditions.push(`a.subject_id = $${paramIdx++}`);
        params.push(subjectId);
      }
      if (teacherId) {
        conditions.push(`a.created_by = $${paramIdx++}`);
        params.push(teacherId);
      }
      if (status && status !== 'all') {
        conditions.push(`a.status = $${paramIdx++}`);
        params.push(status);
      }
      if (startDate) {
        conditions.push(`a.due_date >= $${paramIdx++}`);
        params.push(startDate);
      }
      if (endDate) {
        conditions.push(`a.due_date <= $${paramIdx++}`);
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');

      const sql = `
        SELECT 
          a.id as assignment_id,
          a.title,
          sub.name as subject_name,
          c.name as class_name,
          a.due_date,
          a.status,
          a.max_score,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT sub2.id) FILTER (WHERE sub2.status = 'submitted') as submitted_count,
          COUNT(DISTINCT sub2.id) FILTER (WHERE sub2.status = 'graded') as graded_count,
          ROUND(AVG(sub2.score / NULLIF(sub2.max_score, 0) * 100)::numeric, 1) as average_score,
          ROUND(COUNT(DISTINCT sub2.id) FILTER (WHERE sub2.status = 'submitted')::numeric / 
            NULLIF(COUNT(DISTINCT s.id), 0) * 100, 1) as completion_rate
        FROM assignments a
        JOIN subjects sub ON a.subject_id = sub.id
        JOIN classes c ON a.class_id = c.id
        LEFT JOIN students st ON st.current_class_id = c.id OR st.id IN (
          SELECT student_id FROM class_enrollments WHERE class_id = c.id AND is_current = TRUE
        )
        LEFT JOIN submissions sub2 ON sub2.assignment_id = a.id
        WHERE ${whereClause}
        GROUP BY a.id, a.title, sub.name, c.name, a.due_date, a.status, a.max_score
        ORDER BY a.due_date DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      params.push(limit, offset);
      const res = await pgQuery(sql, params);

      // Count total
      const countSql = `SELECT COUNT(*) as total FROM assignments a WHERE ${whereClause}`;
      const countRes = await pgQuery(countSql, params.slice(0, -2));
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      return {
        data: res.rows.map(r => ({
          assignmentId: r.assignment_id,
          title: r.title,
          subjectName: r.subject_name,
          className: r.class_name,
          dueDate: r.due_date,
          status: r.status,
          maxScore: parseFloat(r.max_score) || 10,
          totalStudents: parseInt(r.total_students || '0', 10),
          submittedCount: parseInt(r.submitted_count || '0', 10),
          gradedCount: parseInt(r.graded_count || '0', 10),
          averageScore: parseFloat(r.average_score || '0', 10),
          completionRate: parseFloat(r.completion_rate || '0', 10),
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  },

  // =========================================================================
  // ENROLLMENT REPORT
  // =========================================================================

  /**
   * Get enrollment report - summary by academic year
   */
  async getEnrollmentReport(schoolId, query = {}) {
    const { academicYearId, gradeLevel } = query;

    if (isPostgresConfigured()) {
      const conditions = ['c.school_id = $1', 'ce.is_current = TRUE'];
      const params = [schoolId];
      let paramIdx = 2;

      if (academicYearId) {
        conditions.push(`ce.academic_year_id = $${paramIdx++}`);
        params.push(academicYearId);
      }
      if (gradeLevel) {
        conditions.push(`c.grade_level = $${paramIdx++}`);
        params.push(gradeLevel);
      }

      const whereClause = conditions.join(' AND ');

      // By grade level
      const gradeSql = `
        SELECT 
          c.grade_level,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.status = 'enrolled') as student_count,
          SUM(c.max_capacity) as total_capacity
        FROM classes c
        LEFT JOIN class_enrollments ce ON ce.class_id = c.id
        WHERE ${whereClause}
        GROUP BY c.grade_level
        ORDER BY c.grade_level
      `;
      const gradeRes = await pgQuery(gradeSql, params);

      // By class
      const classSql = `
        SELECT 
          c.id as class_id,
          c.name as class_name,
          c.grade_level,
          c.room,
          COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.status = 'enrolled') as student_count,
          c.max_capacity
        FROM classes c
        LEFT JOIN class_enrollments ce ON ce.class_id = c.id
        WHERE ${whereClause}
        GROUP BY c.id, c.name, c.grade_level, c.room, c.max_capacity
        ORDER BY c.grade_level, c.name
      `;
      const classRes = await pgQuery(classSql, params);

      // Academic year info
      const yearSql = academicYearId 
        ? `SELECT name, start_date, end_date FROM academic_years WHERE id = $1`
        : `SELECT name, start_date, end_date FROM academic_years WHERE school_id = $1 ORDER BY start_date DESC LIMIT 1`;
      const yearRes = await pgQuery(yearSql, academicYearId ? [academicYearId] : [schoolId]);
      const academicYear = yearRes.rows[0];

      return {
        academicYear: academicYearId,
        academicYearName: academicYear?.name || 'Unknown',
        dateRange: { 
          start: academicYear?.start_date, 
          end: academicYear?.end_date 
        },
        byGrade: gradeRes.rows.map(r => ({
          gradeLevel: r.grade_level,
          classCount: parseInt(r.class_count || '0', 10),
          studentCount: parseInt(r.student_count || '0', 10),
          totalCapacity: parseInt(r.total_capacity || '0', 10),
          utilizationRate: r.total_capacity > 0 
            ? Math.round(parseInt(r.student_count || '0', 10) / parseInt(r.total_capacity, 10) * 100)
            : 0,
        })),
        byClass: classRes.rows.map(r => ({
          classId: r.class_id,
          className: r.class_name,
          gradeLevel: r.grade_level,
          room: r.room,
          studentCount: parseInt(r.student_count || '0', 10),
          capacity: parseInt(r.max_capacity || '0', 10),
        })),
        totals: {
          totalClasses: gradeRes.rows.reduce((sum, r) => sum + parseInt(r.class_count || '0', 10), 0),
          totalStudents: gradeRes.rows.reduce((sum, r) => sum + parseInt(r.student_count || '0', 10), 0),
        },
      };
    }

    return null;
  },

  // =========================================================================
  // TUITION REPORT
  // =========================================================================

  /**
   * Get tuition report - summary by class/academic year
   */
  async getTuitionReport(schoolId, query = {}) {
    const { academicYearId, classId } = query;

    if (isPostgresConfigured()) {
      const conditions = ['ti.school_id = $1'];
      const params = [schoolId];
      let paramIdx = 2;

      if (academicYearId) {
        conditions.push(`ti.academic_year_id = $${paramIdx++}`);
        params.push(academicYearId);
      }
      if (classId) {
        conditions.push(`ce.class_id = $${paramIdx++}`);
        params.push(classId);
      }

      const whereClause = conditions.join(' AND ');

      // Summary by class
      const classSql = `
        SELECT 
          c.id as class_id,
          c.name as class_name,
          c.grade_level,
          COUNT(DISTINCT ti.id) as invoice_count,
          SUM(ti.total_amount) as total_invoiced,
          SUM(ti.paid_amount) as total_paid,
          SUM(ti.total_amount - ti.paid_amount) as total_outstanding
        FROM tuition_invoices ti
        LEFT JOIN students st ON ti.student_id = st.id
        LEFT JOIN class_enrollments ce ON ce.student_id = st.id AND ce.is_current = TRUE
        LEFT JOIN classes c ON ce.class_id = c.id
        WHERE ${whereClause}
        GROUP BY c.id, c.name, c.grade_level
        ORDER BY c.grade_level, c.name
      `;
      const classRes = await pgQuery(classSql, params);

      // Overall summary
      const summarySql = `
        SELECT 
          SUM(ti.total_amount) as total_invoiced,
          SUM(ti.paid_amount) as total_paid,
          SUM(ti.total_amount - ti.paid_amount) as total_outstanding,
          COUNT(DISTINCT ti.id) as total_invoices,
          COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'paid') as paid_invoices,
          COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'partial') as partial_invoices,
          COUNT(DISTINCT ti.id) FILTER (WHERE ti.status IN ('issued', 'overdue')) as outstanding_invoices
        FROM tuition_invoices ti
        WHERE ti.school_id = $1
        ${academicYearId ? 'AND ti.academic_year_id = $2' : ''}
      `;
      const summaryRes = await pgQuery(summarySql, params);

      const summary = summaryRes.rows[0];

      return {
        academicYear: academicYearId,
        summary: {
          totalInvoiced: parseFloat(summary.total_invoiced || '0'),
          totalPaid: parseFloat(summary.total_paid || '0'),
          totalOutstanding: parseFloat(summary.total_outstanding || '0'),
          collectionRate: summary.total_invoiced > 0
            ? Math.round(parseFloat(summary.total_paid || '0') / parseFloat(summary.total_invoiced) * 100, 1)
            : 0,
          totalInvoices: parseInt(summary.total_invoices || '0', 10),
          paidInvoices: parseInt(summary.paid_invoices || '0', 10),
          partialInvoices: parseInt(summary.partial_invoices || '0', 10),
          outstandingInvoices: parseInt(summary.outstanding_invoices || '0', 10),
        },
        byClass: classRes.rows.map(r => ({
          classId: r.class_id,
          className: r.class_name,
          gradeLevel: r.grade_level,
          invoiceCount: parseInt(r.invoice_count || '0', 10),
          totalInvoiced: parseFloat(r.total_invoiced || '0'),
          totalPaid: parseFloat(r.total_paid || '0'),
          totalOutstanding: parseFloat(r.total_outstanding || '0'),
        })),
      };
    }

    return null;
  },
};
