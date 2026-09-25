// =============================================================================
// Announcements Controller — HTTP Request Handlers
// G25 — Production Announcements
// =============================================================================
import { announcementService as service } from './announcements.service.js';
import { createAnnouncementSchema, updateAnnouncementSchema, listAnnouncementsQuerySchema, publishAnnouncementSchema } from './announcements.schema.js';

function getSchoolId(req) {
  return req.schoolId || req.user?.schoolId || 'sch_bacau';
}

// ── ADMIN: Full CRUD ─────────────────────────────────────────────────────────

export async function createAnnouncement(req, res, next) {
  try {
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const announcement = await service.createAnnouncement({
      data: parsed.data,
      schoolId: getSchoolId(req),
      authorId: req.user.id,
      authorName: req.user.name,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
}

export async function listAnnouncements(req, res, next) {
  try {
    const parsed = listAnnouncementsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, ...filters } = parsed.data;
    const result = await service.listAnnouncementsForAdmin({
      filters,
      schoolId: getSchoolId(req),
      page,
      limit,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getAnnouncement(req, res, next) {
  try {
    const announcement = await service.getAnnouncementById(req.params.id);
    res.json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const parsed = updateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await service.updateAnnouncement({
      id: req.params.id,
      data: parsed.data,
      editorId: req.user.id,
      editorRole: req.user.role,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function publishAnnouncement(req, res, next) {
  try {
    const parsed = publishAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const published = await service.publishAnnouncement({
      id: req.params.id,
      publishedBy: req.user.id,
      role: req.user.role,
      scheduledPublishAt: parsed.data.scheduledPublishAt,
    });

    res.json({ success: true, data: published });
  } catch (err) {
    next(err);
  }
}

export async function archiveAnnouncement(req, res, next) {
  try {
    const archived = await service.archiveAnnouncement({
      id: req.params.id,
      archivedBy: req.user.id,
      role: req.user.role,
    });

    res.json({ success: true, data: archived });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    await service.deleteAnnouncement({
      id: req.params.id,
      deletedBy: req.user.id,
      role: req.user.role,
    });

    res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (err) {
    next(err);
  }
}

// ── USER: View own announcements ──────────────────────────────────────────────

export async function getMyAnnouncements(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    // Resolve user's class and role
    const schoolId = getSchoolId(req);
    let classId = req.query.classId || null;

    // Try to get classId from user's enrollment
    if (!classId && req.user.role === 'student') {
      classId = req.user.classId || null;
    }

    const result = await service.getAnnouncementsForUser({
      userId: req.user.id,
      role: req.user.role,
      schoolId,
      classId,
      page,
      limit,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ── READ TRACKING ──────────────────────────────────────────────────────────

export async function markAsRead(req, res, next) {
  try {
    const { announcementId } = req.body;
    await service.markAsRead({
      announcementId: announcementId || req.params.id,
      userId: req.user.id,
    });
    res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
  } catch (err) {
    next(err);
  }
}

// ── CATEGORIES ─────────────────────────────────────────────────────────────

export async function listCategories(req, res, next) {
  try {
    const categories = await service.listCategories({ schoolId: getSchoolId(req) });
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

// ── G39: EMERGENCY BROADCAST ─────────────────────────────────────────────────

export async function emergencyBroadcast(req, res, next) {
  try {
    const { title, message, severity, requiresAcknowledgment } = req.body || {};

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'title và message là bắt buộc.',
      });
    }

    const validSeverities = ['EMERGENCY', 'CRITICAL', 'WARNING'];
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `severity phải là một trong: ${validSeverities.join(', ')}`,
      });
    }

    // Check role permission (admin, principal, vice_principal only)
    const allowedRoles = ['admin', 'school_admin', 'super_admin', 'principal', 'vice_principal'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền phát thông báo khẩn cấp.',
      });
    }

    const announcement = await service.createEmergencyBroadcast({
      title,
      message,
      severity: severity || 'WARNING',
      requiresAcknowledgment: Boolean(requiresAcknowledgment),
      schoolId: getSchoolId(req),
      authorId: req.user.id,
      authorName: req.user.name,
    });

    res.status(201).json({
      success: true,
      message: 'Thông báo khẩn cấp đã được phát tới toàn trường.',
      announcement,
    });
  } catch (err) {
    next(err);
  }
}
