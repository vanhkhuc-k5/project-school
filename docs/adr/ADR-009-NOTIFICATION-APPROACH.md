# ADR-009: Notification Architecture

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal needs to notify users about:
- Assignment deadlines
- Grade publications
- Attendance alerts
- Announcements
- Messages from teachers/parents
- Payment reminders

Notifications should be:
- Delivered in real-time when possible
- Persistent (stored in database)
- Markable as read
- Filterable by user

---

## 2. Decision

### 2.1 Notification Types

| Type | Channel | Priority |
|------|---------|----------|
| Assignment Due | In-app, Email | Normal |
| Grade Published | In-app, Email | Normal |
| Attendance Alert | In-app | High |
| Announcement | In-app | Varies |
| Message | In-app | Normal |
| Payment Reminder | In-app, Email | Low |

### 2.2 Notification Storage

```javascript
// Notification record
{
  id: 'notif_abc123',
  user_id: 'usr_xyz',         // Recipient
  type: 'grade_published',
  title: 'Điểm mới được công bố',
  content: 'Bạn có điểm môn Toán',
  data: {
    gradeId: 'grd_123',
    subject: 'Toán'
  },
  priority: 'normal',
  is_read: false,
  read_at: null,
  created_at: '2025-01-15T10:00:00Z'
}
```

### 2.3 Notification Service

```javascript
class NotificationService {
  async create(notification) {
    // Store in database
    await this.repo.create(notification);
    
    // Queue for email (if enabled)
    if (notification.email_enabled) {
      await this.queueEmail(notification);
    }
    
    // Real-time push (future enhancement)
    if (this.websocket) {
      this.websocket.send(notification.user_id, notification);
    }
  }
}
```

---

## 3. Alternatives Considered

### Option A: Real-Time Only (WebSocket)

| Pros | Cons |
|------|------|
| Instant delivery | Lost if user offline |
| No storage needed | No history |
| Low storage | No search |

**Verdict:** Rejected. Need persistent notifications for history and offline users.

### Option B: Email Only

| Pros | Cons |
|------|------|
| Universal delivery | Spam concerns |
| No app needed | Rate limits |
| Persistent | No in-app indicator |

**Verdict:** Rejected. Need in-app notifications for immediate visibility.

### Option C: Third-Party Push (Firebase, OneSignal)

| Pros | Cons |
|------|------|
| Native apps | Vendor lock-in |
| Push notifications | Cost |
| Device targeting | Complexity |

**Verdict:** Rejected for v1. In-app notifications are sufficient.

---

## 4. Consequences

### Positive

1. **Universal Access:** Notifications available on all devices
2. **History:** Users can review past notifications
3. **Offline Support:** Notifications available when user returns
4. **Email Fallback:** Critical notifications reach email

### Negative

1. **Storage Cost:** Notifications accumulate over time
2. **Email Complexity:** Email service integration needed
3. **Real-Time Gap:** No push without WebSocket

### Mitigation

- Cleanup job removes old notifications (90 days)
- Email sent only for high-priority notifications
- WebSocket integration planned for future

---

## 5. Implementation

### Notification Repository

```javascript
async create(notification) {
  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, content, data, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(notification.id, notification.user_id, notification.type, ...);
}

async list(userId, { page, limit, unreadOnly }) {
  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  if (unreadOnly) query += ' AND is_read = false';
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  return db.prepare(query).all(userId, limit, offset);
}

async markAsRead(notificationIds, userId) {
  await db.prepare(`
    UPDATE notifications 
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE id IN (?) AND user_id = ?
  `).run(notificationIds, userId);
}
```

### Trigger Points

```javascript
// When grade is published
await notificationService.create({
  user_id: student.user_id,
  type: 'grade_published',
  title: 'Điểm mới',
  content: `Bạn có điểm ${subject} mới`,
  data: { gradeId, subject },
});

// When assignment published
await notificationService.create({
  user_id: student.user_id,
  type: 'assignment_published',
  title: 'Bài tập mới',
  content: `Giáo viên giao bài tập ${title}`,
  data: { assignmentId },
});
```

---

## 6. Future Enhancements

| Feature | Priority | Notes |
|---------|----------|-------|
| WebSocket push | High | Real-time delivery |
| Email digest | Medium | Daily summary |
| Push notifications | Medium | Mobile app |
| Notification preferences | Low | User settings |

---

## 7. References

- [ADR-002: Modular Monolith](./ADR-002-MODULAR-MONOLITH.md)
