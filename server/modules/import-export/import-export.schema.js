// =============================================================================
// Import/Export Schema — Zod Validation
// G35 — Safe Data Import/Export
// =============================================================================
import { z } from 'zod';
import {
  IMPORT_ENTITY_TYPES,
  IMPORT_FORMATS,
  IMPORT_MODES,
  DUPLICATE_STRATEGIES,
  EXPORT_ENTITY_TYPES,
  EXPORT_FORMATS,
} from './import-export.types.js';

// ── Import Schemas ────────────────────────────────────────────────────────────

/**
 * Student import row schema
 */
export const studentImportRowSchema = z.object({
  // Required fields
  email: z.string().email('Email không hợp lệ').max(255),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(100).optional(),
  
  // Profile fields
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
  phone: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày sinh phải là YYYY-MM-DD')
    .optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().max(500).optional().nullable(),
  
  // Academic fields
  studentCode: z.string().max(50).optional().nullable(), // Mã học sinh
  gradeLevel: z.coerce.number().int().min(1).max(12).optional(), // Lớp (1-12)
  classId: z.string().max(50).optional().nullable(), // ID lớp để ghi danh
  
  // Parent info (optional, creates link if provided)
  parentName: z.string().max(100).optional().nullable(),
  parentPhone: z.string().max(20).optional().nullable(),
  parentEmail: z.string().email().max(255).optional().nullable(),
  relationship: z.enum(['father', 'mother', 'guardian', 'other']).optional().default('mother'),
});

/**
 * Teacher import row schema
 */
export const teacherImportRowSchema = z.object({
  // Required fields
  email: z.string().email('Email không hợp lệ').max(255),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(100).optional(),
  
  // Profile fields
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
  phone: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày sinh phải là YYYY-MM-DD')
    .optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().max(500).optional().nullable(),
  
  // Professional fields
  employeeCode: z.string().max(50).optional().nullable(), // Mã nhân viên
  departmentId: z.string().max(50).optional().nullable(), // ID tổ bộ môn
  subjects: z.string().max(500).optional().nullable(), // Comma-separated subject IDs
  isHomeroom: z.enum(['true', 'false', '1', '0', '']).transform(v => {
    if (v === '' || v === undefined) return false;
    return v === 'true' || v === '1';
  }).optional().default(false),
  qualifications: z.string().max(1000).optional().nullable(),
});

/**
 * Enrollment import row schema
 */
export const enrollmentImportRowSchema = z.object({
  // Required fields
  studentEmail: z.string().email('Email học sinh không hợp lệ'),
  classId: z.string().min(1, 'ID lớp học là bắt buộc'),
  
  // Academic year (optional, uses current if not provided)
  academicYearId: z.string().max(50).optional().nullable(),
  
  // Enrollment metadata
  enrollmentDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD')
    .optional()
    .default(() => new Date().toISOString().split('T')[0]),
  status: z.enum(['active', 'transferred', 'graduated', 'withdrawn']).optional().default('active'),
  
  // For re-enrollment (optional)
  previousClassId: z.string().max(50).optional().nullable(),
});

/**
 * Parse and validate a single import row
 */
export function validateImportRow(row, schema) {
  return schema.safeParse(row);
}

/**
 * Batch validate import rows
 */
export function validateImportRows(rows, schema) {
  const results = [];
  for (let i = 0; i < rows.length; i++) {
    results.push({
      rowNumber: i + 2, // +2 because header is row 1, data starts at row 2
      data: rows[i],
      result: schema.safeParse(rows[i]),
    });
  }
  return results;
}

// ── Import Request Schemas ─────────────────────────────────────────────────────

/**
 * Import preview/dry-run request
 */
export const importPreviewSchema = z.object({
  entityType: z.enum([
    IMPORT_ENTITY_TYPES.STUDENTS,
    IMPORT_ENTITY_TYPES.TEACHERS,
    IMPORT_ENTITY_TYPES.ENROLLMENTS,
  ]),
  format: z.enum([IMPORT_FORMATS.CSV, IMPORT_FORMATS.XLSX]).default(IMPORT_FORMATS.CSV),
  duplicateStrategy: z.enum([
    DUPLICATE_STRATEGIES.SKIP,
    DUPLICATE_STRATEGIES.UPDATE,
    DUPLICATE_STRATEGIES.REJECT,
  ]).default(DUPLICATE_STRATEGIES.SKIP),
  // Base64 encoded file content
  fileContent: z.string().min(1, 'Nội dung file không được để trống'),
  // For enrollments - optionally auto-create missing students/teachers
  autoCreateStudents: z.boolean().optional().default(false),
  autoCreateTeachers: z.boolean().optional().default(false),
});

/**
 * Import commit request
 */
export const importCommitSchema = z.object({
  entityType: z.enum([
    IMPORT_ENTITY_TYPES.STUDENTS,
    IMPORT_ENTITY_TYPES.TEACHERS,
    IMPORT_ENTITY_TYPES.ENROLLMENTS,
  ]),
  format: z.enum([IMPORT_FORMATS.CSV, IMPORT_FORMATS.XLSX]).default(IMPORT_FORMATS.CSV),
  duplicateStrategy: z.enum([
    DUPLICATE_STRATEGIES.SKIP,
    DUPLICATE_STRATEGIES.UPDATE,
    DUPLICATE_STRATEGIES.REJECT,
  ]).default(DUPLICATE_STRATEGIES.SKIP),
  fileContent: z.string().min(1, 'Nội dung file không được để trống'),
  // Validation token from preview (ensures no changes between preview and commit)
  previewToken: z.string().optional(),
  // For enrollments
  autoCreateStudents: z.boolean().optional().default(false),
  autoCreateTeachers: z.boolean().optional().default(false),
  // Batch metadata
  batchName: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// ── Export Request Schemas ─────────────────────────────────────────────────────

/**
 * Export request schema
 */
export const exportRequestSchema = z.object({
  entityType: z.enum([
    EXPORT_ENTITY_TYPES.STUDENTS,
    EXPORT_ENTITY_TYPES.TEACHERS,
    EXPORT_ENTITY_TYPES.CLASSES,
    EXPORT_ENTITY_TYPES.ENROLLMENTS,
    EXPORT_ENTITY_TYPES.GRADES,
    EXPORT_ENTITY_TYPES.ATTENDANCE,
    EXPORT_ENTITY_TYPES.TUITION,
  ]),
  format: z.enum([EXPORT_FORMATS.CSV, EXPORT_FORMATS.XLSX]).default(EXPORT_FORMATS.CSV),
  
  // Filters
  academicYearId: z.string().max(50).optional().nullable(),
  classId: z.string().max(50).optional().nullable(),
  gradeLevel: z.coerce.number().int().min(1).max(12).optional().nullable(),
  departmentId: z.string().max(50).optional().nullable(),
  
  // Date range filters
  dateFrom: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD')
    .optional()
    .nullable(),
  dateTo: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD')
    .optional()
    .nullable(),
  
  // Options
  includeArchived: z.boolean().optional().default(false),
  includeInactive: z.boolean().optional().default(false),
});

// ── Template Schemas ──────────────────────────────────────────────────────────

/**
 * Template download request
 */
export const templateRequestSchema = z.object({
  entityType: z.enum([
    IMPORT_ENTITY_TYPES.STUDENTS,
    IMPORT_ENTITY_TYPES.TEACHERS,
    IMPORT_ENTITY_TYPES.ENROLLMENTS,
  ]),
  format: z.enum([IMPORT_FORMATS.CSV, IMPORT_FORMATS.XLSX]).default(IMPORT_FORMATS.CSV),
});

// ── Validation Helpers ────────────────────────────────────────────────────────

/**
 * Validate import preview request
 */
export function validateImportPreview(body) {
  return importPreviewSchema.safeParse(body);
}

/**
 * Validate import commit request
 */
export function validateImportCommit(body) {
  return importCommitSchema.safeParse(body);
}

/**
 * Validate export request
 */
export function validateExportRequest(query) {
  return exportRequestSchema.parse(query);
}

/**
 * Validate template request
 */
export function validateTemplateRequest(query) {
  return templateRequestSchema.parse(query);
}

/**
 * Sanitize string input - prevent formula injection
 * Prefixes cells starting with =, +, -, @, tab, carriage return with single quote
 */
export function sanitizeForCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Check for formula-like patterns
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Parse CSV content safely
 */
export function parseCSVRows(content) {
  const rows = [];
  const lines = content.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    rows.push(values);
  }
  
  return rows;
}

/**
 * Convert array of objects to CSV string
 */
export function objectsToCSV(data, columns) {
  if (!data || data.length === 0) return '';
  
  // Header row
  const headers = columns.map(col => sanitizeForCSV(col.label || col.field));
  const rows = [headers.join(',')];
  
  // Data rows
  for (const item of data) {
    const values = columns.map(col => {
      let value = item[col.field];
      if (value === null || value === undefined) value = '';
      if (col.transform) value = col.transform(value, item);
      // Sanitize for CSV safety
      value = sanitizeForCSV(value);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
        value = `"${String(value).replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(values.join(','));
  }
  
  return rows.join('\n');
}
