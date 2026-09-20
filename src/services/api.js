const BASE_URL = '/api';

function getHeaders() {
  const token = localStorage.getItem('edunordic_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(url, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, status: res.status, message: data.message || `Lỗi hệ thống (${res.status})` };
    }
    return data;
  } catch (err) {
    console.error(`[API] ${url}:`, err.message);
    return { success: false, message: 'Không thể kết nối đến máy chủ EduPortal. Vui lòng kiểm tra backend.' };
  }
}

// =============================================
// 1. Auth API
// =============================================
export const authApi = {
  async login(identifier, password, role) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role }),
    });
    if (res?.success && res?.token) {
      localStorage.setItem('edunordic_token', res.token);
      return { success: true, user: res.user, token: res.token };
    }
    return { success: false, message: res?.message || 'Tài khoản hoặc mật khẩu không chính xác' };
  },

  async getMe() {
    const token = localStorage.getItem('edunordic_token');
    if (!token) return null;
    const res = await request('/auth/me');
    return res?.success ? res.user : null;
  },

  async changePassword(currentPassword, newPassword) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async register(userData) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout() {
    localStorage.removeItem('edunordic_token');
    localStorage.removeItem('eduportal_user');
  },
};

// =============================================
// 2. Student API — Không fallback mock
// =============================================
export const studentApi = {
  async getDashboard() {
    const res = await request('/student/dashboard');
    return res?.success ? res.data : null;
  },

  async getAssignments() {
    const res = await request('/student/assignments');
    return res?.success ? res.assignments : [];
  },

  async getAssignmentDetail(id) {
    const res = await request(`/student/assignments/${id}`);
    return res?.success ? res.assignment : null;
  },

  async submitAssignment(id, answers) {
    return request(`/student/assignments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ studentAnswers: answers }),
    });
  },

  async getGrades() {
    const res = await request('/student/grades');
    return res?.success ? res.data : null;
  },

  async getResources(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const res = await request(`/student/resources${query ? `?${query}` : ''}`);
    return res?.success ? res.resources : [];
  },

  async downloadResource(id) {
    const res = await request(`/student/resources/${id}/download`, { method: 'POST' });
    return res?.success ?? false;
  },
};

// =============================================
// 3. Teacher API — Không fallback mock
// =============================================
export const teacherApi = {
  async getAnalytics() {
    const res = await request('/teacher/analytics');
    return res?.success ? res.data : null;
  },

  async getClasses(classId) {
    const query = classId ? `?classId=${classId}` : '';
    const res = await request(`/teacher/classes${query}`);
    return res?.success ? res : null;
  },

  async updateGrade(data) {
    return request('/teacher/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAssignments() {
    const res = await request('/teacher/assignments');
    return res?.success ? res : null;
  },

  async gradeSubmission(id, score, feedback) {
    return request(`/teacher/submissions/${id}/grade`, {
      method: 'POST',
      body: JSON.stringify({ score, feedback }),
    });
  },

  async getReports() {
    const res = await request('/teacher/reports');
    return res?.success ? res.data : null;
  },

  async createAssignment(data) {
    return request('/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async notifyParents() {
    return request('/teacher/intervene-notify', { method: 'POST' });
  },

  async recordAttendance(classId, records, date) {
    return request('/teacher/attendance', {
      method: 'POST',
      body: JSON.stringify({ classId, records, date }),
    });
  },

  async getAttendance(classId, date) {
    const query = new URLSearchParams({ classId: classId || 'cls_10A1', ...(date ? { date } : {}) }).toString();
    const res = await request(`/teacher/attendance?${query}`);
    return res?.success ? res.records : [];
  },
};

// =============================================
// 4. Parent API — Không fallback mock
// =============================================
export const parentApi = {
  async getChildrenData() {
    const res = await request('/parent/children');
    return res?.success ? res.data : null;
  },

  async payTuition(invoiceId) {
    return request(`/parent/tuition/${invoiceId}/pay`, { method: 'POST' });
  },

  async confirmNotice(noticeId) {
    return request(`/parent/notices/${noticeId}/confirm`, { method: 'POST' });
  },

  async getLeaveRequests(studentId) {
    const query = studentId ? `?studentId=${studentId}` : '';
    const res = await request(`/parent/leave-requests${query}`);
    return res?.success ? res.requests : [];
  },

  async submitLeaveRequest(data) {
    return request('/parent/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTeacherMessages(studentId) {
    const query = studentId ? `?studentId=${studentId}` : '';
    const res = await request(`/parent/messages${query}`);
    return res?.success ? res.messages : [];
  },

  async sendTeacherMessage(data) {
    return request('/parent/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDetailedGrades(studentId) {
    const query = studentId ? `?studentId=${studentId}` : '';
    const res = await request(`/parent/grades-detail${query}`);
    return res?.success ? res.data : null;
  },

  async getInvoices(studentId) {
    const query = studentId ? `?studentId=${studentId}` : '';
    const res = await request(`/parent/invoices${query}`);
    return res?.success ? res : null;
  },
};

// =============================================
// 5. Admin API — Không fallback mock
// =============================================
export const adminApi = {
  async getOverview() {
    const res = await request('/admin/overview');
    return res?.success ? res.data : null;
  },

  async broadcastNotice(title, content) {
    return request('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  },

  async syncMoet() {
    return request('/admin/sync-moet', { method: 'POST' });
  },

  async getUsers(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const res = await request(`/admin/users${query ? `?${query}` : ''}`);
    return res?.success ? res.users : [];
  },

  async createUser(data) {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id, data) {
    return request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id) {
    return request(`/admin/users/${id}`, { method: 'DELETE' });
  },

  async resetPassword(id) {
    return request(`/admin/users/${id}/reset-password`, { method: 'POST' });
  },

  async getClasses() {
    const res = await request('/admin/classes');
    return res?.success ? res.classes : [];
  },

  async createClass(data) {
    return request('/admin/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTeachers() {
    const res = await request('/admin/teachers');
    return res?.success ? res.teachers : [];
  },

  async getFinancials() {
    const res = await request('/admin/financials');
    return res?.success ? res.financials : null;
  },

  async getAuditLogs() {
    const res = await request('/admin/audit-logs');
    return res?.success ? res.logs : [];
  },

  async getSubjects() {
    const res = await request('/admin/subjects');
    return res?.success ? res.subjects : [];
  },
};

// =============================================
// 6. AI Tutor API
// =============================================
export const aiTutorApi = {
  async getMessages() {
    const res = await request('/ai-tutor/messages');
    return res?.success ? res.messages : [];
  },

  async sendMessage(text, topic) {
    const res = await request('/ai-tutor/chat', {
      method: 'POST',
      body: JSON.stringify({ text, topic }),
    });
    return res?.success ? res.reply : null;
  },
};

// =============================================
// 7. Sync & Notifications API
// =============================================
export const syncApi = {
  async getStatus(role) {
    const res = await request(`/sync/status${role ? `?role=${role}` : ''}`);
    return res?.success ? res.data : null;
  },

  async getNotifications() {
    const res = await request('/sync/notifications');
    return res?.success ? res.notifications : [];
  },

  async markAsRead(noticeId) {
    return request(`/sync/notifications/${noticeId}/read`, { method: 'POST' });
  },

  async markAllAsRead() {
    return request('/sync/notifications/read-all', { method: 'POST' });
  },

  async triggerEvent(eventData) {
    return request('/sync/trigger', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },
};
