import express from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get system heartbeat and sync status
router.get('/status', optionalAuth, (req, res) => {
  const role = req.user?.role || req.query.role || 'student';
  const userId = req.user?.id || 'usr_student_1';

  // Get total unread notices
  const notices = db.prepare('SELECT * FROM school_notices ORDER BY created_at DESC').all();
  
  // Find latest school broadcast from BGH
  const latestBroadcast = db.prepare(`
    SELECT * FROM school_notices 
    WHERE (category = 'school' OR sender LIKE '%Ban Giám Hiệu%' OR tag = 'BGH' OR tag = 'Toàn trường')
    ORDER BY created_at DESC 
    LIMIT 1
  `).get();

  // Pending grading submissions for teachers
  const pendingSubmissions = db.prepare(`
    SELECT COUNT(*) as count 
    FROM assignment_submissions 
    WHERE status = 'submitted'
  `).get()?.count || 0;

  // Student active assignment count
  const pendingAssignments = db.prepare(`
    SELECT COUNT(*) as count 
    FROM assignments a
    WHERE a.id NOT IN (SELECT assignment_id FROM assignment_submissions WHERE student_id = 'std_khang')
  `).get()?.count || 0;

  // Tuition status
  const tuitionInvoice = db.prepare('SELECT * FROM tuition_invoices WHERE student_id = ? LIMIT 1').get('std_khoi');

  // Audit log count
  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get()?.count || 0;

  // Filter notices for this user
  const userNotices = notices.map((n) => {
    let confirmedUsers = [];
    try {
      confirmedUsers = JSON.parse(n.confirmed_by_users || '[]');
    } catch {}
    const isRead = confirmedUsers.includes(userId);
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      tag: n.tag,
      tagType: n.tag_type,
      sender: n.sender,
      canConfirm: Boolean(n.can_confirm),
      isConfirmed: confirmedUsers.includes(userId),
      createdAt: n.created_at,
      isRead,
    };
  });

  const unreadCount = userNotices.filter((n) => !n.isRead).length;

  const broadcastObj = latestBroadcast ? {
    id: latestBroadcast.id,
    title: latestBroadcast.title,
    content: latestBroadcast.content,
    sender: latestBroadcast.sender,
    tag: latestBroadcast.tag,
    tagType: latestBroadcast.tag_type,
    createdAt: latestBroadcast.created_at,
  } : null;

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      academicTerm: 'Học kỳ I • 2024 - 2025',
      lastMoetSync: 'Hôm nay lúc ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      systemStatus: 'operational',
      unreadCount,
      unreadNotificationsCount: unreadCount,
      pendingSubmissions,
      pendingGradingCount: pendingSubmissions,
      pendingAssignments,
      tuitionStatus: tuitionInvoice?.status || 'unpaid',
      latestBroadcast: broadcastObj,
      activeBroadcast: broadcastObj,
      noticesCount: notices.length,
      auditCount,
    },
  });
});

// Get detailed notifications list for user
router.get('/notifications', optionalAuth, (req, res) => {
  const userId = req.user?.id || req.query.userId || 'usr_student_1';

  const notices = db.prepare('SELECT * FROM school_notices ORDER BY created_at DESC LIMIT 30').all();

  const formatted = notices.map((n) => {
    let confirmedUsers = [];
    try {
      confirmedUsers = JSON.parse(n.confirmed_by_users || '[]');
    } catch {}
    const isRead = confirmedUsers.includes(userId);

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      tag: n.tag,
      tagType: n.tag_type || 'info',
      sender: n.sender,
      canConfirm: Boolean(n.can_confirm),
      isConfirmed: confirmedUsers.includes(userId),
      createdAt: n.created_at,
      isRead,
    };
  });

  res.json({ success: true, data: formatted, notifications: formatted });
});

// Mark single notification as read / confirmed
router.post('/notifications/:id/read', optionalAuth, (req, res) => {
  const noticeId = req.params.id;
  const userId = req.user?.id || req.body.userId || 'usr_student_1';

  const notice = db.prepare('SELECT confirmed_by_users FROM school_notices WHERE id = ?').get(noticeId);
  if (!notice) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
  }

  let confirmedUsers = [];
  try {
    confirmedUsers = JSON.parse(notice.confirmed_by_users || '[]');
  } catch {}

  if (!confirmedUsers.includes(userId)) {
    confirmedUsers.push(userId);
    db.prepare('UPDATE school_notices SET confirmed_by_users = ? WHERE id = ?')
      .run(JSON.stringify(confirmedUsers), noticeId);
  }

  res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
});

// Mark all notifications as read
router.post('/notifications/read-all', optionalAuth, (req, res) => {
  const userId = req.user?.id || req.body.userId || 'usr_student_1';

  const notices = db.prepare('SELECT id, confirmed_by_users FROM school_notices').all();
  const updateStmt = db.prepare('UPDATE school_notices SET confirmed_by_users = ? WHERE id = ?');

  notices.forEach((n) => {
    let users = [];
    try {
      users = JSON.parse(n.confirmed_by_users || '[]');
    } catch {}
    if (!users.includes(userId)) {
      users.push(userId);
      updateStmt.run(JSON.stringify(users), n.id);
    }
  });

  res.json({ success: true, message: 'Đã đánh dấu đọc tất cả thông báo' });
});

// Trigger a system-wide broadcast event
router.post('/trigger', optionalAuth, (req, res) => {
  const { title, content, tag, tagType, category, sender } = req.body;

  const noticeId = `notif_${Date.now()}`;
  db.prepare(`
    INSERT INTO school_notices (id, title, content, category, tag, tag_type, sender, can_confirm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    noticeId,
    title || 'Thông báo hệ thống',
    content || 'Nội dung cập nhật mới từ nhà trường.',
    category || 'school',
    tag || 'Hệ thống',
    tagType || 'info',
    sender || 'Ban Giám Hiệu',
    1
  );

  res.json({ success: true, message: 'Sự kiện đã được đồng bộ toàn trường!', noticeId });
});

export default router;
