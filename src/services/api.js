import { STUDENT_DASHBOARD_DATA } from '../mock/studentData';
import { TEACHER_ANALYTICS_DATA } from '../mock/teacherData';
import { PARENT_DASHBOARD_DATA } from '../mock/parentData';
import { ADMIN_DASHBOARD_DATA } from '../mock/adminData';
import { AI_TUTOR_INITIAL_DATA } from '../mock/aiTutorData';
import { MOCK_USERS } from '../mock/authData';

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
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`API request to ${url} failed, falling back to local state:`, err.message);
    return null;
  }
}

// 1. Auth API
export const authApi = {
  async login(identifier, password, role) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role }),
    });
    if (res?.success) {
      localStorage.setItem('edunordic_token', res.token);
      return res.user;
    }
    return MOCK_USERS[role || 'student'];
  },

  async getMe() {
    const res = await request('/auth/me');
    return res?.success ? res.user : null;
  },

  logout() {
    localStorage.removeItem('edunordic_token');
  },
};

// 2. Student API
export const studentApi = {
  async getDashboard() {
    const res = await request('/student/dashboard');
    return res?.success ? res.data : STUDENT_DASHBOARD_DATA;
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
    const res = await request(`/student/assignments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ studentAnswers: answers }),
    });
    return res;
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
    return res?.success ?? true;
  },
};

// 3. Teacher API
export const teacherApi = {
  async getAnalytics() {
    const res = await request('/teacher/analytics');
    return res?.success ? res.data : TEACHER_ANALYTICS_DATA;
  },

  async getClasses(classId) {
    const query = classId ? `?classId=${classId}` : '';
    const res = await request(`/teacher/classes${query}`);
    return res?.success ? res : null;
  },

  async updateGrade(data) {
    const res = await request('/teacher/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.success ?? true;
  },

  async getAssignments() {
    const res = await request('/teacher/assignments');
    return res?.success ? res : null;
  },

  async gradeSubmission(id, score, feedback) {
    const res = await request(`/teacher/submissions/${id}/grade`, {
      method: 'POST',
      body: JSON.stringify({ score, feedback }),
    });
    return res?.success ?? true;
  },

  async getReports() {
    const res = await request('/teacher/reports');
    return res?.success ? res.data : null;
  },

  async createAssignment(data) {
    const res = await request('/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.success ?? true;
  },

  async notifyParents() {
    const res = await request('/teacher/intervene-notify', {
      method: 'POST',
    });
    return res?.success ?? true;
  },
};

// 4. Parent API
export const parentApi = {
  async getChildrenData() {
    const res = await request('/parent/children');
    return res?.success ? res.data : PARENT_DASHBOARD_DATA;
  },

  async payTuition(invoiceId) {
    const res = await request(`/parent/tuition/${invoiceId}/pay`, {
      method: 'POST',
    });
    return res?.success ?? true;
  },

  async confirmNotice(noticeId) {
    const res = await request(`/parent/notices/${noticeId}/confirm`, {
      method: 'POST',
    });
    return res;
  },
};

// 5. Admin API
export const adminApi = {
  async getOverview() {
    const res = await request('/admin/overview');
    return res?.success ? res.data : ADMIN_DASHBOARD_DATA;
  },

  async broadcastNotice(title, content) {
    const res = await request('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
    return res?.success ?? true;
  },

  async syncMoet() {
    const res = await request('/admin/sync-moet', {
      method: 'POST',
    });
    return res?.success ?? true;
  },
};

// 6. AI Tutor API
export const aiTutorApi = {
  async getMessages() {
    const res = await request('/ai-tutor/messages');
    return res?.success && res.messages.length > 0 ? res.messages : AI_TUTOR_INITIAL_DATA.messages;
  },

  async sendMessage(text, topic) {
    const res = await request('/ai-tutor/chat', {
      method: 'POST',
      body: JSON.stringify({ text, topic }),
    });
    return res?.success ? res.reply : null;
  },
};
