// =============================================================================
// Announcements Service — Business Logic Layer
// G25 — Production Announcements
// G26 — Notification Center Integration
// G39 — Emergency Broadcast System
// =============================================================================
import * as repo from './announcements.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { notifyAnnouncementPublished } from '../notifications/notifications.service.js';
import { dispatchToSchool } from '../notifications/sse.controller.js';

export const announcementService = {
  // ── CREATE ─────────────────────────────────────────────────────────────────

  async createAnnouncement({ data, schoolId, authorId, authorName }) {
    if (!authorId) throw AppError.unauthorized('Yêu cầu xác thực');

    if (data.scheduledPublishAt) {
      const scheduled = new Date(data.scheduledPublishAt);
      if (scheduled <= new Date()) {
        throw AppError.badRequest('Thời gian đăng phải trong tương lai.');
      }
    }

    if (data.scheduledPublishAt) {
      data.status = 'draft';
    } else if (!data.status) {
      data.status = 'draft';
    }

    return repo.createAnnouncement({ data, schoolId, authorId, authorName });
  },

  // ── READ ─────────────────────────────────────────────────────────────────────

  async getAnnouncementById(id) {
    const ann = await repo.getAnnouncementById(id);
    if (!ann) throw AppError.notFound('Thông báo không tồn tại.');
    const readCount = await repo.getReadCount(id);
    return { ...ann, readCount };
  },

  listAnnouncementsForAdmin({ filters = {}, schoolId, page, limit }) {
    return repo.listAnnouncements({ filters, schoolId, page, limit });
  },

  getAnnouncementsForUser({ userId, role, schoolId, classId, page, limit }) {
    return repo.getAnnouncementsForUser({ userId, role, schoolId, classId, page, limit });
  },

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  async updateAnnouncement({ id, data, editorId, editorRole }) {
    const existing = await repo.getAnnouncementById(id);
    if (!existing) throw AppError.notFound('Thông báo không tồn tại.');

    if (existing.status === 'published' && editorRole !== 'admin' && editorRole !== 'school_admin' && editorRole !== 'super_admin') {
      throw AppError.forbidden('Không thể chỉnh sửa thông báo đã xuất bản.');
    }

    if (data.scheduledPublishAt) {
      const scheduled = new Date(data.scheduledPublishAt);
      if (scheduled <= new Date()) {
        throw AppError.badRequest('Thời gian đăng phải trong tương lai.');
      }
    }

    return repo.updateAnnouncement({ id, data, editorId });
  },

  // ── PUBLISH ─────────────────────────────────────────────────────────────────

  async publishAnnouncement({ id, publishedBy, role, scheduledPublishAt }) {
    if (!publishedBy) throw AppError.unauthorized('Yêu cầu xác thực');

    const allowedRoles = ['admin', 'school_admin', 'super_admin', 'principal', 'vice_principal'];
    if (!allowedRoles.includes(role)) {
      throw AppError.forbidden('Bạn không có quyền đăng thông báo.');
    }

    const existing = await repo.getAnnouncementById(id);
    if (!existing) throw AppError.notFound('Thông báo không tồn tại.');
    if (existing.status === 'published') {
      throw AppError.conflict('Thông báo đã được đăng rồi.');
    }

    const published = await repo.publishAnnouncement({ id, publishedBy, scheduledPublishAt });

    // G26: Notify recipients after successful publish
    if (!scheduledPublishAt) {
      try {
        const announcement = await repo.getAnnouncementById(id);
        const recipients = await repo.getAnnouncementRecipients(announcement);
        if (recipients.length > 0) {
          await notifyAnnouncementPublished({
            announcement: {
              id: announcement.id,
              title: announcement.title,
              priority: announcement.priority,
              scope: announcement.scope,
            },
            recipients,
          });
        }
      } catch (notifErr) {
        console.error('[NotificationService] notifyAnnouncementPublished failed:', notifErr.message);
      }
    }

    return published;
  },

  // ── ARCHIVE ─────────────────────────────────────────────────────────────────

  async archiveAnnouncement({ id, archivedBy, role }) {
    if (!archivedBy) throw AppError.unauthorized('Yêu cầu xác thực');

    const allowedRoles = ['admin', 'school_admin', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      throw AppError.forbidden('Bạn không có quyền lưu trữ thông báo.');
    }

    const existing = await repo.getAnnouncementById(id);
    if (!existing) throw AppError.notFound('Thông báo không tồn tại.');

    return repo.archiveAnnouncement(id);
  },

  // ── DELETE ──────────────────────────────────────────────────────────────────

  async deleteAnnouncement({ id, deletedBy, role }) {
    if (!deletedBy) throw AppError.unauthorized('Yêu cầu xác thực');

    const allowedRoles = ['admin', 'school_admin', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      throw AppError.forbidden('Bạn không có quyền xóa thông báo.');
    }

    const existing = await repo.getAnnouncementById(id);
    if (!existing) throw AppError.notFound('Thông báo không tồn tại.');

    await repo.deleteAnnouncement(id);
    return { id, deleted: true };
  },

  // ── READ TRACKING ─────────────────────────────────────────────────────────

  async markAsRead({ announcementId, userId }) {
    if (!announcementId || !userId) throw AppError.badRequest('Thiếu thông tin');

    const ann = await repo.getAnnouncementById(announcementId);
    if (!ann) throw AppError.notFound('Thông báo không tồn tại.');
    if (ann.status !== 'published') {
      throw AppError.forbidden('Không thể đánh dấu thông báo chưa đăng.');
    }

    await repo.markAnnouncementAsRead({ announcementId, userId });
    return { success: true };
  },

  // ── CATEGORIES ─────────────────────────────────────────────────────────────

  listCategories({ schoolId }) {
    return repo.listCategories({ schoolId });
  },

  // ── G39: EMERGENCY BROADCAST ────────────────────────────────────────────────

  async createEmergencyBroadcast({ title, message, severity, requiresAcknowledgment, schoolId, authorId, authorName }) {
    if (!authorId) throw AppError.unauthorized('Yêu cầu xác thực');

    // Create and immediately publish the emergency announcement
    const announcement = await repo.createAnnouncement({
      data: {
        title,
        message,
        priority: severity || 'emergency',
        scope: 'all',
        status: 'published',
        isEmergency: true,
        requiresAcknowledgment: Boolean(requiresAcknowledgment),
      },
      schoolId,
      authorId,
      authorName,
    });

    // Dispatch SSE EMERGENCY_BROADCAST to ALL connected clients school-wide
    try {
      const broadcastData = {
        event: 'EMERGENCY_BROADCAST',
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        severity: severity || 'WARNING',
        requiresAcknowledgment: Boolean(requiresAcknowledgment),
        issuedBy: authorName || 'Ban Giám Hiệu',
        issuedAt: announcement.publishedAt || new Date().toISOString(),
        priority: 'emergency',
      };

      const connectionCount = dispatchToSchool(schoolId, 'EMERGENCY_BROADCAST', broadcastData);
      console.log(`[EmergencyBroadcast] Sent to ${connectionCount} connections. School: ${schoolId}`);
    } catch (sseErr) {
      console.error('[EmergencyBroadcast] SSE dispatch failed (non-fatal):', sseErr.message);
    }

    return announcement;
  },
};
