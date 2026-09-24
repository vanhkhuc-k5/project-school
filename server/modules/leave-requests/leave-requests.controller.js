// =============================================================================
// Leave Requests Controller — HTTP Handlers
// G28 — Student Leave Requests Lifecycle
// =============================================================================
import { leaveRequestService } from './leave-requests.service.js';
import {
  validateListQuery,
  validateGetParams,
  validateCreateBody,
  validateReviewBody,
  validateCancelBody,
} from './leave-requests.schema.js';
import { STATUS_LABELS, REASON_LABELS, STATUS_COLORS } from './leave-requests.types.js';

/**
 * Extract userId from request.
 */
function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?.sub || null;
}

/**
 * Extract user role from request.
 */
function getUserRole(req) {
  return req.user?.role || null;
}

/**
 * Extract schoolId from request.
 */
function getSchoolId(req) {
  return req.user?.schoolId || req.user?.school_id || null;
}

// ── GET /leave-requests — List requests ───────────────────────────────────

export async function listLeaveRequests(req, res, next) {
  try {
    const parsed = validateListQuery(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, status, studentId, startDateFrom, startDateTo } = parsed.data;
    const result = await leaveRequestService.listRequests({
      userId: getUserId(req),
      role: getUserRole(req),
      schoolId: getSchoolId(req),
      studentId,
      status,
      page,
      limit,
      startDateFrom,
      startDateTo,
    });

    // Enrich with UI metadata
    const enriched = result.requests.map((req) => ({
      ...req,
      statusLabel: STATUS_LABELS[req.status] || req.status,
      reasonLabel: REASON_LABELS[req.reasonType] || req.reasonType,
      statusColor: STATUS_COLORS[req.status] || '#6B7280',
    }));

    res.json({
      success: true,
      requests: enriched,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /leave-requests/pending — Pending requests for review ──────────────

export async function listPendingRequests(req, res, next) {
  try {
    const result = await leaveRequestService.getPendingRequests({
      userId: getUserId(req),
      role: getUserRole(req),
      schoolId: getSchoolId(req),
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });

    const enriched = result.requests.map((req) => ({
      ...req,
      statusLabel: STATUS_LABELS[req.status] || req.status,
      reasonLabel: REASON_LABELS[req.reasonType] || req.reasonType,
      statusColor: STATUS_COLORS[req.status] || '#6B7280',
    }));

    res.json({
      success: true,
      requests: enriched,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /leave-requests/:id — Get single request ─────────────────────────

export async function getLeaveRequest(req, res, next) {
  try {
    const parsed = validateGetParams(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = parsed.data;
    const request = await leaveRequestService.getRequest({
      id,
      userId: getUserId(req),
      role: getUserRole(req),
    });

    const enriched = {
      ...request,
      statusLabel: STATUS_LABELS[request.status] || request.status,
      reasonLabel: REASON_LABELS[request.reasonType] || request.reasonType,
      statusColor: STATUS_COLORS[request.status] || '#6B7280',
    };

    res.json({ success: true, request: enriched });
  } catch (err) {
    next(err);
  }
}

// ── GET /leave-requests/students/:studentId — Requests for student ───────

export async function getRequestsForStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const result = await leaveRequestService.getRequestsForStudent({
      studentId,
      userId: getUserId(req),
      role: getUserRole(req),
    });

    const enriched = result.requests.map((req) => ({
      ...req,
      statusLabel: STATUS_LABELS[req.status] || req.status,
      reasonLabel: REASON_LABELS[req.reasonType] || req.reasonType,
      statusColor: STATUS_COLORS[req.status] || '#6B7280',
    }));

    res.json({
      success: true,
      requests: enriched,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /leave-requests — Create/submit request ─────────────────────────

export async function createLeaveRequest(req, res, next) {
  try {
    const parsed = validateCreateBody(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { studentId, startDate, endDate, reasonType, reasonDetail, emergencyPhone } = parsed.data;
    const userId = getUserId(req);
    const request = await leaveRequestService.createRequest({
      studentId,
      startDate,
      endDate,
      reasonType,
      reasonDetail,
      emergencyPhone,
      userId,
      role: getUserRole(req),
      userName: req.user?.name || 'Người dùng',
    });

    res.status(201).json({
      success: true,
      message: 'Đơn xin nghỉ phép đã được gửi!',
      request,
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /leave-requests/:id/cancel — Cancel request ──────────────────

export async function cancelLeaveRequest(req, res, next) {
  try {
    const parsed = validateGetParams(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const cancelParsed = validateCancelBody(req.body || {});
    if (!cancelParsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: cancelParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = parsed.data;
    const { cancellationReason } = cancelParsed.data;

    await leaveRequestService.cancelRequest({
      id,
      userId: getUserId(req),
      role: getUserRole(req),
      cancellationReason,
      userName: req.user?.name || 'Người dùng',
    });

    res.json({ success: true, message: 'Đơn đã được hủy!' });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /leave-requests/:id/review — Approve/Reject request ───────────

export async function reviewLeaveRequest(req, res, next) {
  try {
    const parsed = validateGetParams(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const bodyParsed = validateReviewBody(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: bodyParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = parsed.data;
    const { status, reviewNote } = bodyParsed.data;

    await leaveRequestService.reviewRequest({
      id,
      status,
      reviewNote,
      userId: getUserId(req),
      role: getUserRole(req),
      userName: req.user?.name || 'Người dùng',
    });

    const message = status === 'approved' ? 'Đơn đã được duyệt!' : 'Đơn đã bị từ chối!';
    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
}
