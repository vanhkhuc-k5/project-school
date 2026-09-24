/**
 * G34 — Reporting Validation Schemas
 * Zod schemas for report query parameters
 */

import { z } from 'zod';

// Common pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

// Common date range schema
const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date' }
);

// Student Academic Record
export const studentAcademicRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// Class Grade Report
export const classGradeReportSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Attendance Report
export const attendanceReportSchema = z.object({
  classId: z.string().optional(),
  studentId: z.string().optional(),
  gradeLevel: z.coerce.number().int().min(10).max(12).optional(),
  ...dateRangeSchema.shape,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// Assignment Report
export const assignmentReportSchema = z.object({
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  status: z.enum(['draft', 'published', 'closed', 'all']).default('all'),
  ...dateRangeSchema.shape,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// Enrollment Report
export const enrollmentReportSchema = z.object({
  academicYearId: z.string().optional(),
  gradeLevel: z.coerce.number().int().min(10).max(12).optional(),
});

// Tuition Report
export const tuitionReportSchema = z.object({
  academicYearId: z.string().optional(),
  classId: z.string().optional(),
});

// Dashboard Summary
export const dashboardSchema = z.object({
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
});
