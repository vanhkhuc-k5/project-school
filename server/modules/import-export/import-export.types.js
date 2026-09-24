// =============================================================================
// Import/Export Types — G35 Safe Data Import/Export
// =============================================================================

// ── Import Types ──────────────────────────────────────────────────────────────

/**
 * Supported import entity types
 */
export const IMPORT_ENTITY_TYPES = {
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  ENROLLMENTS: 'enrollments',
};

/**
 * Supported import formats
 */
export const IMPORT_FORMATS = {
  CSV: 'csv',
  XLSX: 'xlsx',
};

/**
 * Import processing modes
 */
export const IMPORT_MODES = {
  DRY_RUN: 'dry_run',
  COMMIT: 'commit',
};

/**
 * Duplicate handling strategies
 */
export const DUPLICATE_STRATEGIES = {
  SKIP: 'skip',           // Skip duplicates
  UPDATE: 'update',       // Update existing records
  REJECT: 'reject',       // Reject entire batch if duplicates found
};

/**
 * Row validation status
 */
export const ROW_STATUS = {
  VALID: 'valid',
  WARNING: 'warning',
  ERROR: 'error',
  SKIPPED: 'skipped',
};

// ── Export Types ──────────────────────────────────────────────────────────────

/**
 * Supported export entity types
 */
export const EXPORT_ENTITY_TYPES = {
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  ENROLLMENTS: 'enrollments',
  GRADES: 'grades',
  ATTENDANCE: 'attendance',
  TUITION: 'tuition',
};

/**
 * Supported export formats
 */
export const EXPORT_FORMATS = {
  CSV: 'csv',
  XLSX: 'xlsx',
};

// ── Import Result Types ───────────────────────────────────────────────────────

/**
 * Single row validation error
 */
export class ImportRowError {
  constructor(rowNumber, field, message, code) {
    this.rowNumber = rowNumber;
    this.field = field;
    this.message = message;
    this.code = code;
  }
}

/**
 * Single row validation warning
 */
export class ImportRowWarning {
  constructor(rowNumber, field, message, code) {
    this.rowNumber = rowNumber;
    this.field = field;
    this.message = message;
    this.code = code;
  }
}

/**
 * Import validation result
 */
export class ImportValidationResult {
  constructor() {
    this.rows = [];
    this.errors = [];
    this.warnings = [];
    this.validCount = 0;
    this.errorCount = 0;
    this.warningCount = 0;
    this.skippedCount = 0;
  }

  addRow(status, data, rowNumber) {
    this.rows.push({ status, data, rowNumber });
    if (status === ROW_STATUS.VALID) this.validCount++;
    else if (status === ROW_STATUS.ERROR) this.errorCount++;
    else if (status === ROW_STATUS.WARNING) this.warningCount++;
    else if (status === ROW_STATUS.SKIPPED) this.skippedCount++;
  }

  addError(rowNumber, field, message, code = 'VALIDATION_ERROR') {
    this.errors.push(new ImportRowError(rowNumber, field, message, code));
  }

  addWarning(rowNumber, field, message, code = 'VALIDATION_WARNING') {
    this.warnings.push(new ImportRowWarning(rowNumber, field, message, code));
  }

  get isValid() {
    return this.errorCount === 0;
  }

  get summary() {
    return {
      totalRows: this.rows.length,
      valid: this.validCount,
      errors: this.errorCount,
      warnings: this.warningCount,
      skipped: this.skippedCount,
      canProceed: this.isValid,
    };
  }
}

// ── Template Types ────────────────────────────────────────────────────────────

/**
 * Template column definition
 */
export class TemplateColumn {
  constructor(field, label, example, required = false, validation = null) {
    this.field = field;
    this.label = label;
    this.example = example;
    this.required = required;
    this.validation = validation; // Zod schema or regex pattern
  }
}

/**
 * Template definition
 */
export class ImportTemplate {
  constructor(entityType, columns, instructions) {
    this.entityType = entityType;
    this.columns = columns;
    this.instructions = instructions;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Maximum file size for imports (5MB)
 */
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum rows per import batch
 */
export const MAX_IMPORT_ROWS = 10000;

/**
 * Export size limits
 */
export const MAX_EXPORT_ROWS = 50000;
