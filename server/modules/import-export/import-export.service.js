// =============================================================================
// Import/Export Service — Business Logic Layer
// G35 — Safe Data Import/Export
// =============================================================================
import * as repo from './import-export.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { withTransaction } from '../../shared/database/index.js';
import {
  ImportValidationResult,
  IMPORT_ENTITY_TYPES,
  IMPORT_FORMATS,
  IMPORT_MODES,
  DUPLICATE_STRATEGIES,
  EXPORT_ENTITY_TYPES,
  ROW_STATUS,
  MAX_IMPORT_FILE_SIZE,
  MAX_IMPORT_ROWS,
  MAX_EXPORT_ROWS,
} from './import-export.types.js';
import {
  studentImportRowSchema,
  teacherImportRowSchema,
  enrollmentImportRowSchema,
  parseCSVRows,
  objectsToCSV,
  sanitizeForCSV,
} from './import-export.schema.js';

// ── Import Validation Helpers ──────────────────────────────────────────────────

/**
 * Validate raw CSV rows against schema
 */
function validateStudentRows(rows) {
  const result = new ImportValidationResult();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because header is row 1
    
    try {
      const parsed = studentImportRowSchema.safeParse(row);
      
      if (!parsed.success) {
        result.addRow(ROW_STATUS.ERROR, row, rowNumber);
        for (const error of parsed.error.errors) {
          result.addError(
            rowNumber,
            error.path.join('.'),
            error.message,
            'VALIDATION_ERROR'
          );
        }
      } else {
        result.addRow(ROW_STATUS.VALID, parsed.data, rowNumber);
      }
    } catch (err) {
      result.addRow(ROW_STATUS.ERROR, row, rowNumber);
      result.addError(rowNumber, 'unknown', err.message, 'PARSE_ERROR');
    }
  }
  
  return result;
}

/**
 * Validate teacher import rows
 */
function validateTeacherRows(rows) {
  const result = new ImportValidationResult();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    
    try {
      const parsed = teacherImportRowSchema.safeParse(row);
      
      if (!parsed.success) {
        result.addRow(ROW_STATUS.ERROR, row, rowNumber);
        for (const error of parsed.error.errors) {
          result.addError(
            rowNumber,
            error.path.join('.'),
            error.message,
            'VALIDATION_ERROR'
          );
        }
      } else {
        result.addRow(ROW_STATUS.VALID, parsed.data, rowNumber);
      }
    } catch (err) {
      result.addRow(ROW_STATUS.ERROR, row, rowNumber);
      result.addError(rowNumber, 'unknown', err.message, 'PARSE_ERROR');
    }
  }
  
  return result;
}

/**
 * Validate enrollment import rows
 */
function validateEnrollmentRows(rows) {
  const result = new ImportValidationResult();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    
    try {
      const parsed = enrollmentImportRowSchema.safeParse(row);
      
      if (!parsed.success) {
        result.addRow(ROW_STATUS.ERROR, row, rowNumber);
        for (const error of parsed.error.errors) {
          result.addError(
            rowNumber,
            error.path.join('.'),
            error.message,
            'VALIDATION_ERROR'
          );
        }
      } else {
        result.addRow(ROW_STATUS.VALID, parsed.data, rowNumber);
      }
    } catch (err) {
      result.addRow(ROW_STATUS.ERROR, row, rowNumber);
      result.addError(rowNumber, 'unknown', err.message, 'PARSE_ERROR');
    }
  }
  
  return result;
}

// ── Duplicate Detection ────────────────────────────────────────────────────────

/**
 * Check for duplicates in student import
 */
async function checkStudentDuplicates(rows, schoolId) {
  const errors = [];
  const seenEmails = new Set();
  const seenCodes = new Set();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    const email = row.email?.toLowerCase();
    const studentCode = row.studentCode;
    
    // Check for duplicates within the import file
    if (email && seenEmails.has(email)) {
      errors.push({
        rowNumber,
        field: 'email',
        message: `Email trùng lặp trong file import: ${email}`,
        code: 'DUPLICATE_IN_FILE',
      });
    }
    seenEmails.add(email);
    
    if (studentCode && seenCodes.has(studentCode)) {
      errors.push({
        rowNumber,
        field: 'studentCode',
        message: `Mã học sinh trùng lặp trong file import: ${studentCode}`,
        code: 'DUPLICATE_IN_FILE',
      });
    }
    seenCodes.add(studentCode);
    
    // Check for existing students in database
    if (email) {
      const existing = await repo.importExportRepository.findStudentByEmail(email, schoolId);
      if (existing) {
        row._existingStudent = existing;
        errors.push({
          rowNumber,
          field: 'email',
          message: `Học sinh đã tồn tại với email: ${email} (ID: ${existing.id})`,
          code: 'DUPLICATE_IN_DATABASE',
          existingId: existing.id,
        });
      }
    }
  }
  
  return errors;
}

/**
 * Check for duplicates in teacher import
 */
async function checkTeacherDuplicates(rows, schoolId) {
  const errors = [];
  const seenEmails = new Set();
  const seenCodes = new Set();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    const email = row.email?.toLowerCase();
    const employeeCode = row.employeeCode;
    
    if (email && seenEmails.has(email)) {
      errors.push({
        rowNumber,
        field: 'email',
        message: `Email trùng lặp trong file import: ${email}`,
        code: 'DUPLICATE_IN_FILE',
      });
    }
    seenEmails.add(email);
    
    if (employeeCode && seenCodes.has(employeeCode)) {
      errors.push({
        rowNumber,
        field: 'employeeCode',
        message: `Mã nhân viên trùng lặp trong file import: ${employeeCode}`,
        code: 'DUPLICATE_IN_FILE',
      });
    }
    seenCodes.add(employeeCode);
    
    if (email) {
      const existing = await repo.importExportRepository.findTeacherByEmail(email, schoolId);
      if (existing) {
        row._existingTeacher = existing;
        errors.push({
          rowNumber,
          field: 'email',
          message: `Giáo viên đã tồn tại với email: ${email} (ID: ${existing.id})`,
          code: 'DUPLICATE_IN_DATABASE',
          existingId: existing.id,
        });
      }
    }
  }
  
  return errors;
}

/**
 * Check for duplicates in enrollment import
 */
async function checkEnrollmentDuplicates(rows, schoolId) {
  const errors = [];
  const seenKeys = new Set();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    const key = `${row.studentEmail?.toLowerCase()}_${row.classId}`;
    
    if (seenKeys.has(key)) {
      errors.push({
        rowNumber,
        field: 'studentEmail',
        message: `Trùng lặp trong file import: ${row.studentEmail} -> ${row.classId}`,
        code: 'DUPLICATE_IN_FILE',
      });
    }
    seenKeys.add(key);
  }
  
  return errors;
}

// ── Import Processing ─────────────────────────────────────────────────────────

/**
 * Process student import
 */
async function processStudentImport(rows, schoolId, options = {}) {
  const { duplicateStrategy = DUPLICATE_STRATEGIES.SKIP, dryRun = false } = options;
  const results = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  
  // Check duplicates first
  const duplicateErrors = await checkStudentDuplicates(rows, schoolId);
  
  // If REJECT strategy and duplicates found, reject entire batch
  if (duplicateStrategy === DUPLICATE_STRATEGIES.REJECT && duplicateErrors.length > 0) {
    throw AppError.conflict(
      `Tìm thấy ${duplicateErrors.length} bản ghi trùng lặp. Import bị từ chừa.`,
      duplicateErrors
    );
  }
  
  // Process each row
  for (const row of rows) {
    const existingStudent = row._existingStudent;
    
    // Skip if exists and strategy is SKIP
    if (existingStudent && duplicateStrategy === DUPLICATE_STRATEGIES.SKIP) {
      results.skipped++;
      continue;
    }
    
    // Skip if exists and strategy is REJECT (already handled above)
    if (existingStudent && duplicateStrategy === DUPLICATE_STRATEGIES.REJECT) {
      results.skipped++;
      continue;
    }
    
    if (dryRun) {
      results.created++;
      continue;
    }
    
    try {
      const result = await repo.importExportRepository.createStudent({
        schoolId,
        ...row,
      });
      results.created++;
    } catch (err) {
      results.errors.push({
        email: row.email,
        message: err.message,
      });
    }
  }
  
  return results;
}

/**
 * Process teacher import
 */
async function processTeacherImport(rows, schoolId, options = {}) {
  const { duplicateStrategy = DUPLICATE_STRATEGIES.SKIP, dryRun = false } = options;
  const results = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  
  const duplicateErrors = await checkTeacherDuplicates(rows, schoolId);
  
  if (duplicateStrategy === DUPLICATE_STRATEGIES.REJECT && duplicateErrors.length > 0) {
    throw AppError.conflict(
      `Tìm thấy ${duplicateErrors.length} bản ghi trùng lặp. Import bị từ chừa.`,
      duplicateErrors
    );
  }
  
  for (const row of rows) {
    const existingTeacher = row._existingTeacher;
    
    if (existingTeacher && duplicateStrategy === DUPLICATE_STRATEGIES.SKIP) {
      results.skipped++;
      continue;
    }
    
    if (existingTeacher && duplicateStrategy === DUPLICATE_STRATEGIES.REJECT) {
      results.skipped++;
      continue;
    }
    
    if (dryRun) {
      results.created++;
      continue;
    }
    
    try {
      const result = await repo.importExportRepository.createTeacher({
        schoolId,
        ...row,
      });
      results.created++;
    } catch (err) {
      results.errors.push({
        email: row.email,
        message: err.message,
      });
    }
  }
  
  return results;
}

/**
 * Process enrollment import
 */
async function processEnrollmentImport(rows, schoolId, options = {}) {
  const { duplicateStrategy = DUPLICATE_STRATEGIES.SKIP, dryRun = false } = options;
  const results = {
    total: rows.length,
    enrolled: 0,
    skipped: 0,
    errors: [],
  };
  
  const duplicateErrors = await checkEnrollmentDuplicates(rows, schoolId);
  
  if (duplicateStrategy === DUPLICATE_STRATEGIES.REJECT && duplicateErrors.length > 0) {
    throw AppError.conflict(
      `Tìm thấy ${duplicateErrors.length} bản ghi trùng lặp. Import bị từ chừa.`,
      duplicateErrors
    );
  }
  
  // Group by class for batch processing
  const byClass = {};
  for (const row of rows) {
    if (!byClass[row.classId]) byClass[row.classId] = [];
    byClass[row.classId].push(row);
  }
  
  for (const [classId, classRows] of Object.entries(byClass)) {
    if (dryRun) {
      results.enrolled += classRows.length;
      continue;
    }
    
    try {
      const classResults = await repo.importExportRepository.bulkEnroll(
        classRows,
        schoolId
      );
      
      for (const r of classResults) {
        if (r.success) {
          results.enrolled++;
        } else {
          results.errors.push(r);
        }
      }
    } catch (err) {
      results.errors.push({
        classId,
        message: err.message,
      });
    }
  }
  
  return results;
}

// ── Service Export ────────────────────────────────────────────────────────────

export const importExportService = {
  // =========================================================================
  // IMPORT OPERATIONS
  // =========================================================================

  /**
   * Preview/validate import data without committing
   */
  async previewImport({ entityType, format, fileContent, duplicateStrategy, schoolId, userId }) {
    // Authorization check
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Validate file size
    const decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
    if (decodedContent.length > MAX_IMPORT_FILE_SIZE) {
      throw AppError.badRequest(
        `File quá lớn. Kích thước tối đa: ${Math.round(MAX_IMPORT_FILE_SIZE / 1024 / 1024)}MB`
      );
    }

    // Parse content
    let rows;
    try {
      if (format === IMPORT_FORMATS.CSV) {
        const parsed = parseCSVRows(decodedContent);
        if (parsed.length < 2) {
          throw AppError.badRequest('File import phải có header và ít nhất 1 dòng dữ liệu');
        }
        // First row is header, rest are data
        const headers = parsed[0];
        rows = parsed.slice(1).map(values => {
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header.trim()] = values[idx] || '';
          });
          return obj;
        });
      } else {
        throw AppError.badRequest('�ịnh dạng XLSX chưa được hỗ trợ trong phiên bản này');
      }
    } catch (err) {
      if (err.status) throw err;
      throw AppError.badRequest(`Lỗi khi đọc file: ${err.message}`);
    }

    // Check row limit
    if (rows.length > MAX_IMPORT_ROWS) {
      throw AppError.badRequest(
        `Số dòng vượt quá giới hạn. Tối đa: ${MAX_IMPORT_ROWS} dòng`
      );
    }

    // Normalize headers - preserve camelCase, handle both formats
    rows = rows.map(row => {
      const normalized = {};
      
      // Define mapping from common variations to schema field names
      const fieldMapping = {
        // Email variations
        'email': 'email',
        // Password
        'password': 'password',
        // Name variations
        'name': 'name',
        'fullname': 'name',
        'full_name': 'name',
        'hoten': 'name',
        'ho_ten': 'name',
        // Phone variations
        'phone': 'phone',
        'phoneNumber': 'phone',
        'phone_number': 'phone',
        'dienthoai': 'phone',
        'dien_thoai': 'phone',
        // Date of birth variations
        'dateofbirth': 'dateOfBirth',
        'date_of_birth': 'dateOfBirth',
        'ngaysinh': 'dateOfBirth',
        'ngay_sinh': 'dateOfBirth',
        'dob': 'dateOfBirth',
        'birthdate': 'dateOfBirth',
        'birth_date': 'dateOfBirth',
        // Gender variations
        'gender': 'gender',
        'gioitinh': 'gender',
        'gioi_tinh': 'gender',
        'sex': 'gender',
        // Address
        'address': 'address',
        'diachi': 'address',
        'dia_chi': 'address',
        // Student code variations
        'studentcode': 'studentCode',
        'student_code': 'studentCode',
        'mahocsinh': 'studentCode',
        'ma_hoc_sinh': 'studentCode',
        'mssv': 'studentCode',
        'code': 'studentCode',
        // Grade level variations
        'gradelevel': 'gradeLevel',
        'grade_level': 'gradeLevel',
        'khoi': 'gradeLevel',
        'lop': 'gradeLevel',
        'class': 'gradeLevel',
        // Class ID variations
        'classid': 'classId',
        'class_id': 'classId',
        'idlop': 'classId',
        'id_lop': 'classId',
        // Parent info
        'parentname': 'parentName',
        'parent_name': 'parentName',
        'tenphuhuynh': 'parentName',
        'ten_phu_huynh': 'parentName',
        'parentphone': 'parentPhone',
        'parent_phone': 'parentPhone',
        'sdtphuhuynh': 'parentPhone',
        'parentemail': 'parentEmail',
        'parent_email': 'parentEmail',
        'emailphuhuynh': 'parentEmail',
        'relationship': 'relationship',
        'quanhe': 'relationship',
        'quan_he': 'relationship',
        // Teacher fields
        'employeecode': 'employeeCode',
        'employee_code': 'employeeCode',
        'magiaovien': 'employeeCode',
        'ma_giao_vien': 'employeeCode',
        'departmentid': 'departmentId',
        'department_id': 'departmentId',
        'idto': 'departmentId',
        'id_to': 'departmentId',
        'subjects': 'subjects',
        'monhoc': 'subjects',
        'mon_hoc': 'subjects',
        'ishomeroom': 'isHomeroom',
        'is_homeroom': 'isHomeroom',
        'gvcn': 'isHomeroom',
        'qualifications': 'qualifications',
        'trinhdo': 'qualifications',
        'trinh_do': 'qualifications',
        // Enrollment fields
        'studentemail': 'studentEmail',
        'student_email': 'studentEmail',
        'academicyearid': 'academicYearId',
        'academic_year_id': 'academicYearId',
        'namhoc': 'academicYearId',
        'nam_hoc': 'academicYearId',
        'enrollmentdate': 'enrollmentDate',
        'enrollment_date': 'enrollmentDate',
        'ngayghidanh': 'enrollmentDate',
        'ngay_ghi_danh': 'enrollmentDate',
        'status': 'status',
        'trangthai': 'status',
        'trang_thai': 'status',
        'previousclassid': 'previousClassId',
        'previous_class_id': 'previousClassId',
      };
      
      for (const [key, value] of Object.entries(row)) {
        // Normalize key: lowercase and remove spaces/special chars
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '');
        const schemaField = fieldMapping[normalizedKey];
        
        if (schemaField) {
          normalized[schemaField] = value;
        } else {
          // For unknown fields, just store as lowercase
          normalized[normalizedKey] = value;
        }
      }
      return normalized;
    });

    // Validate based on entity type
    let validationResult;
    switch (entityType) {
      case IMPORT_ENTITY_TYPES.STUDENTS: {
        validationResult = validateStudentRows(rows);
        // Check for duplicates
        const studentDupErrors = await checkStudentDuplicates(rows, schoolId);
        for (const err of studentDupErrors) {
          validationResult.addError(err.rowNumber, err.field, err.message, err.code);
        }
        break;
      }
        
      case IMPORT_ENTITY_TYPES.TEACHERS: {
        validationResult = validateTeacherRows(rows);
        const teacherDupErrors = await checkTeacherDuplicates(rows, schoolId);
        for (const err of teacherDupErrors) {
          validationResult.addError(err.rowNumber, err.field, err.message, err.code);
        }
        break;
      }
        
      case IMPORT_ENTITY_TYPES.ENROLLMENTS: {
        validationResult = validateEnrollmentRows(rows);
        const enrollDupErrors = await checkEnrollmentDuplicates(rows, schoolId);
        for (const err of enrollDupErrors) {
          validationResult.addError(err.rowNumber, err.field, err.message, err.code);
        }
        break;
      }
        
      default:
        throw AppError.badRequest(`Loại entity không được hỗ trợ: ${entityType}`);
    }

    // Generate preview token (hash of content + timestamp)
    const previewToken = Buffer.from(
      `${fileContent}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    ).toString('base64');

    return {
      validation: validationResult,
      summary: validationResult.summary,
      previewToken,
      canProceed: validationResult.isValid,
    };
  },

  /**
   * Commit import with transaction safety
   */
  async commitImport({ entityType, format, fileContent, duplicateStrategy, schoolId, userId, batchName, notes }) {
    // Authorization check
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Parse content (same as preview)
    const decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
    
    let rows;
    try {
      if (format === IMPORT_FORMATS.CSV) {
        const parsed = parseCSVRows(decodedContent);
        if (parsed.length < 2) {
          throw AppError.badRequest('File import phải có header và ít nhất 1 dòng dữ liệu');
        }
        const headers = parsed[0];
        rows = parsed.slice(1).map(values => {
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header.trim()] = values[idx] || '';
          });
          return obj;
        });
      } else {
        throw AppError.badRequest('ịnh dạng XLSX chưa được hỗ trợ');
      }
    } catch (err) {
      if (err.status) throw err;
      throw AppError.badRequest(`Lỗi khi đọc file: ${err.message}`);
    }

    // Normalize headers
    rows = rows.map(row => {
      const normalized = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '');
        normalized[normalizedKey] = value;
      }
      return normalized;
    });

    // Validate rows first
    let validationResult;
    switch (entityType) {
      case IMPORT_ENTITY_TYPES.STUDENTS:
        validationResult = validateStudentRows(rows);
        break;
      case IMPORT_ENTITY_TYPES.TEACHERS:
        validationResult = validateTeacherRows(rows);
        break;
      case IMPORT_ENTITY_TYPES.ENROLLMENTS:
        validationResult = validateEnrollmentRows(rows);
        break;
      default:
        throw AppError.badRequest(`Loại entity không được hỗ trợ: ${entityType}`);
    }

    // If validation fails, reject entire import
    if (!validationResult.isValid) {
      throw AppError.badRequest(
        `Import thất bại do lỗi validation. Có ${validationResult.errorCount} lỗi.`,
        validationResult.errors
      );
    }

    // Process with transaction
    const batchId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    let results;
    try {
      if (entityType === IMPORT_ENTITY_TYPES.STUDENTS) {
        results = await processStudentImport(rows, schoolId, { duplicateStrategy, dryRun: false });
      } else if (entityType === IMPORT_ENTITY_TYPES.TEACHERS) {
        results = await processTeacherImport(rows, schoolId, { duplicateStrategy, dryRun: false });
      } else if (entityType === IMPORT_ENTITY_TYPES.ENROLLMENTS) {
        results = await processEnrollmentImport(rows, schoolId, { duplicateStrategy, dryRun: false });
      }
    } catch (err) {
      // Transaction safety: if anything fails, nothing is committed
      throw AppError.badRequest(`Import thất bại: ${err.message}`);
    }

    return {
      batchId,
      batchName: batchName || `Import ${entityType} ${new Date().toISOString()}`,
      entityType,
      results,
      notes,
      importedAt: new Date().toISOString(),
    };
  },

  // =========================================================================
  // EXPORT OPERATIONS
  // =========================================================================

  /**
   * Export data to CSV format
   */
  async exportData({ entityType, format, schoolId, userId, filters }) {
    // Authorization check
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    let data;
    let columns;

    switch (entityType) {
      case EXPORT_ENTITY_TYPES.STUDENTS:
        data = await repo.importExportRepository.exportStudents(schoolId, filters);
        columns = [
          { field: 'student_code', label: 'Mã HS' },
          { field: 'email', label: 'Email' },
          { field: 'name', label: 'Họ tên' },
          { field: 'phone', label: 'Điện thoại' },
          { field: 'grade_level', label: 'Khối' },
          { field: 'date_of_birth', label: 'Ngày sinh' },
          { field: 'gender', label: 'Giới tính' },
          { field: 'status', label: 'Trạng thái' },
        ];
        break;

      case EXPORT_ENTITY_TYPES.TEACHERS:
        data = await repo.importExportRepository.exportTeachers(schoolId, filters);
        columns = [
          { field: 'employee_code', label: 'Mã GV' },
          { field: 'email', label: 'Email' },
          { field: 'name', label: 'Họ tên' },
          { field: 'phone', label: 'Điện thoại' },
          { field: 'department_name', label: 'Tổ bộ môn' },
          { field: 'qualifications', label: 'Trình độ' },
        ];
        break;

      case EXPORT_ENTITY_TYPES.CLASSES:
        data = await repo.importExportRepository.exportClasses(schoolId, filters);
        columns = [
          { field: 'name', label: 'Tên lớp' },
          { field: 'grade_level', label: 'Khối' },
          { field: 'capacity', label: 'Sĩ số' },
          { field: 'homeroom_teacher_name', label: 'GVCN' },
          { field: 'academic_year_name', label: 'Năm học' },
          { field: 'status', label: 'Trạng thái' },
        ];
        break;

      case EXPORT_ENTITY_TYPES.ENROLLMENTS:
        data = await repo.importExportRepository.exportEnrollments(schoolId, filters);
        columns = [
          { field: 'student_code', label: 'Mã HS' },
          { field: 'email', label: 'Email' },
          { field: 'name', label: 'Họ tên' },
          { field: 'class_name', label: 'Lớp' },
          { field: 'grade_level', label: 'Khối' },
          { field: 'status', label: 'Trạng thái' },
          { field: 'enrolled_at', label: 'Ngày ghi danh' },
        ];
        break;

      case EXPORT_ENTITY_TYPES.GRADES:
        data = await repo.importExportRepository.exportGrades(schoolId, filters);
        columns = [
          { field: 'student_code', label: 'Mã HS' },
          { field: 'student_name', label: 'Họ tên' },
          { field: 'class_name', label: 'Lớp' },
          { field: 'subject_name', label: 'Môn' },
          { field: 'assignment_title', label: 'Bài tập' },
          { field: 'score', label: 'Điểm' },
          { field: 'max_score', label: 'Thang điểm' },
          { field: 'status', label: 'Trạng thái' },
        ];
        break;

      case EXPORT_ENTITY_TYPES.ATTENDANCE:
        data = await repo.importExportRepository.exportAttendance(schoolId, filters);
        columns = [
          { field: 'student_code', label: 'Mã HS' },
          { field: 'student_name', label: 'Họ tên' },
          { field: 'class_name', label: 'Lớp' },
          { field: 'date', label: 'Ngày' },
          { field: 'status', label: 'Trạng thái' },
          { field: 'note', label: 'Ghi chú' },
        ];
        break;

      case EXPORT_ENTITY_TYPES.TUITION:
        data = await repo.importExportRepository.exportTuition(schoolId, filters);
        columns = [
          { field: 'student_code', label: 'Mã HS' },
          { field: 'student_name', label: 'Họ tên' },
          { field: 'invoice_number', label: 'Số hóa đơn' },
          { field: 'total_amount', label: 'Tổng tiền' },
          { field: 'paid_amount', label: 'Đã thanh toán' },
          { field: 'status', label: 'Trạng thái' },
          { field: 'due_date', label: 'Hạn thanh toán' },
        ];
        break;

      default:
        throw AppError.badRequest(`Loại entity không được hỗ trợ: ${entityType}`);
    }

    // Check size limit
    if (data.length > MAX_EXPORT_ROWS) {
      throw AppError.badRequest(
        `Số bản ghi vượt quá giới hạn xuất (${MAX_EXPORT_ROWS}). Vui lòng thêm bộ lọc.`
      );
    }

    // Convert to CSV
    const csvContent = objectsToCSV(data, columns);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${entityType}_${schoolId}_${timestamp}.csv`;

    return {
      filename,
      content: csvContent,
      rowCount: data.length,
      format: 'csv',
      exportedAt: new Date().toISOString(),
    };
  },

  // =========================================================================
  // TEMPLATE OPERATIONS
  // =========================================================================

  /**
   * Generate import template
   */
  async getTemplate({ entityType, format, schoolId }) {
    let headers;
    let exampleRows;

    switch (entityType) {
      case IMPORT_ENTITY_TYPES.STUDENTS:
        headers = [
          'email', 'password', 'name', 'phone', 'dateOfBirth', 'gender', 'address',
          'studentCode', 'gradeLevel', 'classId',
          'parentName', 'parentPhone', 'parentEmail', 'relationship'
        ];
        exampleRows = [
          [
            'student@school.edu.vn', 'Pass123!', 'Nguyễn Văn An', '0912345678', '2010-05-15', 'male',
            '123 Đường ABC, Quận 1, TP.HCM', 'HS001', '10', 'cls_10A1',
            'Nguyễn Thị Bình', '0987654321', 'parent@email.com', 'mother'
          ],
          [
            'student2@school.edu.vn', 'Pass123!', 'Trần Thị C', '', '2010-08-20', 'female',
            '', '', '', '',
            '', '', '', ''
          ],
        ];
        break;

      case IMPORT_ENTITY_TYPES.TEACHERS:
        headers = [
          'email', 'password', 'name', 'phone', 'dateOfBirth', 'gender', 'address',
          'employeeCode', 'departmentId', 'subjects', 'isHomeroom', 'qualifications'
        ];
        exampleRows = [
          [
            'teacher@school.edu.vn', 'Pass123!', 'GV Nguyễn Văn X', '0912345679', '1985-03-10', 'male',
            '456 Đường XYZ, Quận 2, TP.HCM', 'GV001', 'dept_khtn', 'sub_toan,sub_ly', 'true', 'Đại học Sư phạm'
          ],
        ];
        break;

      case IMPORT_ENTITY_TYPES.ENROLLMENTS: {
        headers = ['studentEmail', 'classId', 'academicYearId', 'enrollmentDate', 'status'];
        // Get actual class IDs for example
        const classes = await repo.importExportRepository.getClassesForTemplate(schoolId);
        const sampleClassId = classes[0]?.id || 'cls_10A1';
        exampleRows = [
          ['', sampleClassId, '', new Date().toISOString().split('T')[0], 'active'],
        ];
        break;
      }

      default:
        throw AppError.badRequest(`Loại entity không được hỗ trợ: ${entityType}`);
    }

    // Build CSV content
    const csvLines = [headers.join(',')];
    for (const row of exampleRows) {
      const escapedRow = row.map(cell => {
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(escapedRow.join(','));
    }

    // Add instruction comment
    const instructions = `# HUONG DAN IMPORT ${entityType.toUpperCase()}
# Dong nay la huong dan, se duoc bo qua khi import
# Cac truong bat buoc: ${headers.filter((h, i) => {
      if (entityType === IMPORT_ENTITY_TYPES.STUDENTS) return ['email', 'name'].includes(h);
      if (entityType === IMPORT_ENTITY_TYPES.TEACHERS) return ['email', 'name'].includes(h);
      if (entityType === IMPORT_ENTITY_TYPES.ENROLLMENTS) return ['studentEmail', 'classId'].includes(h);
      return false;
    }).join(', ')}
# Ngay thang dinh dang: YYYY-MM-DD (nam-thang-ngay)
# Neu gap loi, xem chi tiet o cot cuoi cung trong ket qua preview
`;

    const fullContent = instructions + '\n' + csvLines.join('\n');
    const filename = `template_${entityType}.csv`;

    return {
      filename,
      content: fullContent,
      format: 'csv',
      instructions,
    };
  },
};
