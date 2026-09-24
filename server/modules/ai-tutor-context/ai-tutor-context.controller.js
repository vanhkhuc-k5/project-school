// =============================================================================
// AI Tutor Context Controller — G38 Safe Academic Context
// =============================================================================

import { aiContextService } from './ai-tutor-context.service.js';
import { ContextBuildOptions, CONTEXT_SOURCE_CONFIG } from './ai-tutor-context.types.js';

/**
 * Extract student/school identity from authenticated request.
 * Supports JWT payload with both snake_case and camelCase variants.
 */
function getStudentInfo(req) {
  return {
    studentId: req.user?.studentId || req.user?.student_id || req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id,
    userId: req.user?.id,
    role: req.user?.role,
  };
}

// ── Configuration Endpoints ───────────────────────────────────────────────────

/**

 * GET /ai-tutor-context/config — Public context configuration summary
 */
export async function getContextConfig(req, res, next) {
  try {
    const config = aiContextService.getContextConfig();
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ai-tutor-context/sources — All context sources with availability status
 */
export async function getContextSources(req, res, next) {
  try {
    const { role } = getStudentInfo(req);

    const sources = Object.entries(CONTEXT_SOURCE_CONFIG).map(([key, cfg]) => ({
      source: key,
      enabled: cfg.enabled,
      requiresPermission: cfg.requiresPermission,
      tokenWeight: cfg.tokenWeight,
      ttlMinutes: cfg.ttlMinutes,
      privacySensitive: cfg.privacySensitive || false,
      isAvailable: aiContextService.isContextSourceAvailable(key, role),
    }));

    res.json({ success: true, sources });
  } catch (err) {
    next(err);
  }
}

// ── Context Building Endpoints ────────────────────────────────────────────────

/**

 * GET /ai-tutor-context/available — Available context for the current user
 */
export async function getAvailableContext(req, res, next) {
  try {
    const { studentId, schoolId, role } = getStudentInfo(req);

    const validation = aiContextService.validateContextRequest({ studentId, schoolId });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        errors: validation.errors,
      });
    }

    const availableSources = Object.keys(CONTEXT_SOURCE_CONFIG)
      .filter(src => aiContextService.isContextSourceAvailable(src, role))
      .map(src => ({
        source: src,
        config: CONTEXT_SOURCE_CONFIG[src],
      }));

    res.json({
      success: true,
      availableSources,
      userRole: role,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /ai-tutor-context/build — Build academic context for AI Tutor
 *
 * Body: { targetStudentId?, subjectId?, options? }
 */
export async function buildContext(req, res, next) {
  try {
    const { studentId, schoolId, role } = getStudentInfo(req);
    const { targetStudentId, subjectId, options } = req.body || {};

    // Resolve effective student ID
    const effectiveStudentId = targetStudentId || studentId;

    // Role guard: teachers/admins can query other students' context
    if (targetStudentId && targetStudentId !== studentId) {
      const allowedRoles = ['teacher', 'admin', 'school_admin', 'super_admin', 'department_head'];
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Chỉ giáo viên hoặc quản trị viên mới có thể xem ngữ cảnh của học sinh khác',
        });
      }
    }

    // Validate
    const validation = aiContextService.validateContextRequest({
      studentId: effectiveStudentId,
      schoolId,
    });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        errors: validation.errors,
      });
    }

    // Build options
    const buildOptions = new ContextBuildOptions({
      includeHistory: options?.includeHistory ?? true,
      includeResources: options?.includeResources ?? true,
      includeAssignment: options?.includeAssignment ?? true,
      maxHistoryMessages: options?.maxHistoryMessages ?? 5,
      maxTokens: options?.maxTokens ?? 4000,
    });

    // Build context
    const context = await aiContextService.buildContext({
      studentId: effectiveStudentId,
      schoolId,
      subjectId,
      options: buildOptions,
    });

    const promptContext = aiContextService.formatContextForPrompt(context);

    res.json({
      success: true,
      context,
      promptContext,
      meta: {
        studentId: effectiveStudentId,
        schoolId,
        buildTime: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /ai-tutor-context/preview — Preview context without returning full prompt text
 */
export async function previewContext(req, res, next) {
  try {
    const { studentId, schoolId } = getStudentInfo(req);
    const { targetStudentId } = req.body || {};

    const effectiveStudentId = targetStudentId || studentId;

    if (!effectiveStudentId || !schoolId) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Thiếu thông tin học sinh hoặc trường',
      });
    }

    const buildOptions = new ContextBuildOptions({});
    const context = await aiContextService.buildContext({
      studentId: effectiveStudentId,
      schoolId,
      options: buildOptions,
    });

    res.json({
      success: true,
      preview: context.contextItems.map(c => ({
        source: c.source,
        label: c.sourceLabel,
        hasData: !!c.data,
        tokenEstimate: Math.ceil((c.data.text || '').length / 4),
      })),
      totalTokens: context.metadata.estimatedTokens,
      tokenBudget: context.metadata.tokenBudget,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /ai-tutor-context/validate — Validate context request parameters
 */
export async function validateContextRequest(req, res, next) {
  try {
    const { studentId, schoolId } = getStudentInfo(req);
    const { targetStudentId } = req.body || {};

    const validation = aiContextService.validateContextRequest({
      studentId: targetStudentId || studentId,
      schoolId,
    });

    res.json({ success: true, validation });
  } catch (err) {
    next(err);
  }
}
