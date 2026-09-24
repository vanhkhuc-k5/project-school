// =============================================================================
// Import/Export Controller — HTTP Handlers
// G35 — Safe Data Import/Export
// =============================================================================
import { importExportService } from './import-export.service.js';
import {
  validateImportPreview,
  validateImportCommit,
  validateExportRequest,
  validateTemplateRequest,
} from './import-export.schema.js';

/**
 * Extract user ID from request
 */
function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?.sub || null;
}

/**
 * Extract school ID from request (with tenant scoping)
 */
function getSchoolId(req) {
  return req.user?.schoolId || req.user?.school_id || null;
}

/**
 * Extract user role from request
 */
function getUserRole(req) {
  return req.user?.role || null;
}

// ── Import Endpoints ──────────────────────────────────────────────────────────

/**
 * POST /import/preview
 * Validate import data without committing
 */
export async function previewImport(req, res, next) {
  try {
    const parsed = validateImportPreview(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await importExportService.previewImport({
      ...parsed.data,
      schoolId: getSchoolId(req),
      userId: getUserId(req),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /import/commit
 * Commit import with transaction safety
 */
export async function commitImport(req, res, next) {
  try {
    const parsed = validateImportCommit(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await importExportService.commitImport({
      ...parsed.data,
      schoolId: getSchoolId(req),
      userId: getUserId(req),
    });

    res.status(201).json({
      success: true,
      message: `Import thành công! Đã tạo ${result.results.created || result.results.enrolled || 0} bản ghi.`,
      batchId: result.batchId,
      results: result.results,
    });
  } catch (err) {
    next(err);
  }
}

// ── Export Endpoints ──────────────────────────────────────────────────────────

/**
 * GET /export
 * Export data to CSV
 */
export async function exportData(req, res, next) {
  try {
    const parsed = validateExportRequest(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await importExportService.exportData({
      ...parsed.data,
      schoolId: getSchoolId(req),
      userId: getUserId(req),
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    // Write BOM for Excel UTF-8 compatibility
    res.write('\ufeff');
    res.end(result.content);
  } catch (err) {
    next(err);
  }
}

// ── Template Endpoints ────────────────────────────────────────────────────────

/**
 * GET /import/template
 * Download import template
 */
export async function downloadTemplate(req, res, next) {
  try {
    const parsed = validateTemplateRequest(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await importExportService.getTemplate({
      ...parsed.data,
      schoolId: getSchoolId(req),
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    // Write BOM for Excel UTF-8 compatibility
    res.write('\ufeff');
    res.end(result.content);
  } catch (err) {
    next(err);
  }
}
