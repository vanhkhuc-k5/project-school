import express from 'express';
import { authenticateToken, requireRole, requirePermission } from '../../middleware/auth.js';
import {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
  getMyAnnouncements,
  markAsRead,
  listCategories,
  emergencyBroadcast,
} from './announcements.controller.js';

const router = express.Router();

// ── User routes: authenticated users can read their own announcements ──────
router.get(
  '/',
  authenticateToken,
  getMyAnnouncements
);

router.get(
  '/me',
  authenticateToken,
  getMyAnnouncements
);

router.post(
  '/me/read',
  authenticateToken,
  markAsRead
);

// ── Admin/Staff: full CRUD ─────────────────────────────────────────────────
router.use(authenticateToken);
router.use(requireRole('admin', 'school_admin', 'super_admin', 'principal', 'vice_principal'));

// G39: Emergency broadcast — must be before /:id to avoid route conflict
router.post('/emergency-broadcast', requirePermission('announcement.create'), emergencyBroadcast);

// List all announcements (admin view)
router.get('/all', requirePermission('announcement.read'), listAnnouncements);

// Category management
router.get('/categories', requirePermission('announcement.read'), listCategories);

// CRUD
router.post('/', requirePermission('announcement.create'), createAnnouncement);
router.get('/:id', requirePermission('announcement.read'), getAnnouncement);
router.put('/:id', requirePermission('announcement.update'), updateAnnouncement);
router.patch('/:id', requirePermission('announcement.update'), updateAnnouncement);

// State transitions
router.post('/:id/publish', requirePermission('announcement.publish'), publishAnnouncement);
router.post('/:id/archive', requirePermission('announcement.update'), archiveAnnouncement);
router.delete('/:id', requirePermission('announcement.delete'), deleteAnnouncement);

export default router;
