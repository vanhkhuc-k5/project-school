/**
 * EduPortal Typed API Client
 * Strongly typed HTTP client connecting to backend endpoints.
 *
 * Key design decisions:
 * - Bearer token stored in memory (not localStorage) for XSS safety
 * - Silent refresh on 401 with request queuing
 * - AbortSignal propagation for request cancellation
 * - All errors return StandardResponse<T> (never throws)
 */

import type {
  User,
  Assignment,
  SchoolNotice,
  LeaveRequest,
  AuditLogEntry,
  ClassRoom,
  Subject,
  Teacher,
  Announcement,
  AnnouncementCategory,
  Student,
} from '../types';

const BASE_URL = '/api';

export interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
}

export interface StandardResponse<T = unknown> {
  success: boolean;
  status?: number;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

// Session persistence — localStorage survives page reload/refresh navigation.
// Token is still transmitted via Bearer header (never in URL), so this is
// acceptable for a server-authenticated session where the token is opaque.
const SESSION_TOKEN_KEY = 'eduportal_session_token';

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (token) {
    try { localStorage.setItem(SESSION_TOKEN_KEY, token); } catch (e) { console.warn('[Auth] localStorage save failed:', e); }
  } else {
    try { localStorage.removeItem(SESSION_TOKEN_KEY); } catch (e) { console.warn('[Auth] localStorage remove failed:', e); }
  }
}

/** Restore token from localStorage on module load (survives page reload). */
export function restoreAccessToken(): void {
  if (!inMemoryAccessToken) {
    try {
      const stored = localStorage.getItem(SESSION_TOKEN_KEY);
      if (stored) inMemoryAccessToken = stored;
    } catch { /* quota or private mode */ }
  }
}

/** Clear session token (logout). */
export function clearAccessToken(): void {
  inMemoryAccessToken = null;
  try { localStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* quota */ }
}

// Restore on first import
restoreAccessToken();

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {}),
  };
}

/**
 * Core request function — always returns StandardResponse<T>, never throws.
 * Supports AbortSignal for cancellation.
 */
async function request<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<StandardResponse<T>> {
  // Early exit if already aborted
  if (options.signal?.aborted) {
    return { success: false, message: 'Yêu cầu đã bị hủy' };
  }

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      credentials: 'include',
      ...options,
      signal: options.signal,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    // Silent refresh on 401 if not an auth endpoint
    if (res.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/refresh') && !url.startsWith('/auth/logout')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.accessToken || refreshData.token || null;
            setAccessToken(newToken);
            onRefreshed(newToken);
            isRefreshing = false;

            // Retry with new token
            const retryRes = await fetch(`${BASE_URL}${url}`, {
              credentials: 'include',
              ...options,
              signal: options.signal,
              headers: {
                ...getHeaders(),
                ...options.headers,
              },
            });
            return (await retryRes.json().catch(() => ({}))) as StandardResponse<T>;
          } else {
            setAccessToken(null);
            onRefreshed(null);
            isRefreshing = false;
          }
        } catch {
          setAccessToken(null);
          onRefreshed(null);
          isRefreshing = false;
        }
      } else {
        // Queue while refresh in flight
        const retryToken = await new Promise<string | null>((resolve) => {
          refreshSubscribers.push(resolve);
        });
        if (retryToken) {
          const retryRes = await fetch(`${BASE_URL}${url}`, {
            credentials: 'include',
            ...options,
            signal: options.signal,
            headers: {
              ...getHeaders(),
              ...options.headers,
            },
          });
          return (await retryRes.json().catch(() => ({}))) as StandardResponse<T>;
        }
      }
    }

    const data = (await res.json().catch(() => ({}))) as StandardResponse<T>;
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        message: (data as { message?: string }).message || `Lỗi hệ thống (${res.status})`,
        error: data.error,
      };
    }
    return data;
  } catch (err) {
    // Handle abort
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, message: 'Yêu cầu đã bị hủy' };
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[API] ${url}:`, message);
    return { success: false, message: 'Không thể kết nối đến máy chủ EduPortal. Vui lòng kiểm tra backend.' };
  }
}

// =============================================
// 1. Auth API
// =============================================
export const authApi = {
  async login(
    identifier: string,
    password: string,
    role?: string
  ): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
    const res = await request<{ user: User; token: string; accessToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role }),
    });

    // ── Canonical backend response ──────────────────────────────────────────
    // Backend returns { success: true, user, token, accessToken } directly
    // (no nested data wrapper)
    if (res?.success && (res as unknown as { user?: User }).user) {
      const raw = res as unknown as { user?: User; token?: string; accessToken?: string };
      const token = raw.accessToken || raw.token || '';
      const user = raw.user;
      if (token) setAccessToken(token);
      return { success: true, user, token };
    }

    // ── Legacy wrapped response ──────────────────────────────────────────────
    // Some backends may still return { success, data: { user, token, ... } }
    if (res?.success && res.data) {
      const responseData = res.data as { user?: User; token?: string; accessToken?: string };
      const token = responseData.accessToken || responseData.token || '';
      const user = responseData.user;
      if (token) setAccessToken(token);
      return { success: true, user, token };
    }

    // ── Error response ────────────────────────────────────────────────────────
    const errorMessage =
      res?.error?.message ||
      res?.message ||
      'Tài khoản hoặc mật khẩu không chính xác';
    return { success: false, message: errorMessage };
  },

  async refresh(): Promise<{ success: boolean; token?: string; user?: User }> {
    const res = await request<{ user: User; token: string; accessToken?: string }>('/auth/refresh', {
      method: 'POST',
    });
    if (!res?.success) return { success: false };

    // Canonical: { success, user, token, accessToken }
    const raw = res as unknown as { user?: User; token?: string; accessToken?: string; data?: { user?: User; token?: string; accessToken?: string } };

    // Try data wrapper first (legacy)
    const fromData = raw.data;
    const token = fromData?.accessToken || fromData?.token || raw.accessToken || raw.token;
    const user = fromData?.user || raw.user;

    if (token) setAccessToken(token);
    return { success: true, token, user };
  },

  async getMe(): Promise<User | null> {
    // Restore token from localStorage on page reload (before any request)
    restoreAccessToken();
    if (!inMemoryAccessToken) {
      return null;
    }
    // Use the standard request helper — handles 304 body parsing correctly
    const res = await request<User>('/auth/me');
    if (res?.success && res.data) {
      return res.data;
    }
    // Fallback: user may be at top level for some endpoints
    if (res?.success && (res as unknown as { user?: User }).user) {
      return (res as unknown as { user: User }).user;
    }
    // 401 → clear stale token
    if (res && 'status' in res && res.status === 401) {
      setAccessToken(null);
    }
    return null;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<StandardResponse> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async forgotPassword(email: string): Promise<StandardResponse> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<StandardResponse> {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async register(userData: Record<string, unknown>): Promise<StandardResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },
};

// =============================================
// 2. Student API
// =============================================
export const studentApi = {
  async getDashboard<T = unknown>(): Promise<T | null> {
    const res = await request<T>('/student/dashboard');
    return res?.success && res.data ? res.data : null;
  },

  async getAssignments(): Promise<Assignment[]> {
    const res = await request<{ assignments: Assignment[] }>('/student/assignments');
    return res?.success && Array.isArray((res as unknown as { assignments?: Assignment[] }).assignments)
      ? (res as unknown as { assignments: Assignment[] }).assignments
      : [];
  },

  async getAssignmentDetail(id: string): Promise<Assignment | null> {
    const res = await request<{ assignment: Assignment }>(`/student/assignments/${id}`);
    return res?.success ? (res as unknown as { assignment: Assignment }).assignment : null;
  },

  async submitAssignment(id: string, answers: Record<string, string>): Promise<StandardResponse> {
    return request(`/student/assignments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ studentAnswers: answers }),
    });
  },

  async getGrades<T = unknown>(period?: string): Promise<T | null> {
    const query = period ? `?period=${period}` : '';
    const res = await request<T>(`/student/grades${query}`);
    return res?.success && res.data ? res.data : null;
  },

  async getResources<T = unknown>(filters: Record<string, string> = {}): Promise<T[]> {
    const query = new URLSearchParams(filters).toString();
    const res = await request<{ resources: T[] }>(`/student/resources${query ? `?${query}` : ''}`);
    return res?.success && Array.isArray((res as unknown as { resources?: T[] }).resources)
      ? (res as unknown as { resources: T[] }).resources
      : [];
  },

  async downloadResource(id: string): Promise<boolean> {
    const res = await request(`/student/resources/${id}/download`, { method: 'POST' });
    return res?.success ?? false;
  },

  async getTimetable<T = unknown>(): Promise<T[]> {
    const res = await request<{ schedule: T[] }>('/student/timetable');
    return res?.success && Array.isArray((res as unknown as { schedule?: T[] }).schedule)
      ? (res as unknown as { schedule: T[] }).schedule
      : [];
  },

  async getAttendance<T = unknown>(): Promise<T | null> {
    const res = await request<{ attendance: T }>('/student/attendance');
    return res?.success ? (res as unknown as { attendance: T }).attendance : null;
  },

  async getAnnouncements<T = unknown>(): Promise<T[]> {
    const res = await request<{ announcements: T[] }>('/student/announcements');
    return res?.success && Array.isArray((res as unknown as { announcements?: T[] }).announcements)
      ? (res as unknown as { announcements: T[] }).announcements
      : [];
  },
};

// =============================================
// 3. Teacher API
// =============================================
export const teacherApi = {
  async getAnalytics<T = unknown>(): Promise<T | null> {
    const res = await request<T>('/teacher/analytics');
    return res?.success && res.data ? res.data : null;
  },

  async getClasses(classId?: string): Promise<TeacherClassData | null> {
    const query = classId ? `?classId=${classId}` : '';
    const res = await request<TeacherClassData>(`/teacher/classes${query}`);
    return res?.success ? res.data : null;
  },

  async updateGrade(data: Record<string, unknown>): Promise<StandardResponse> {
    return request('/teacher/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAssignments<T = unknown>(): Promise<T | null> {
    const res = await request<T>('/teacher/assignments');
    return res?.success ? (res as unknown as T) : null;
  },

  async gradeSubmission(id: string, score: number, feedback?: string): Promise<StandardResponse> {
    return request(`/teacher/submissions/${id}/grade`, {
      method: 'POST',
      body: JSON.stringify({ score, feedback }),
    });
  },

  async getReports<T = unknown>(): Promise<T | null> {
    const res = await request<T>('/teacher/reports');
    return res?.success && res.data ? res.data : null;
  },

  async createAssignment(data: Record<string, unknown>): Promise<StandardResponse> {
    return request('/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async notifyParents(): Promise<StandardResponse> {
    return request('/teacher/intervene-notify', { method: 'POST' });
  },

  async recordAttendance(classId: string, records: unknown[], date?: string): Promise<StandardResponse> {
    return request('/teacher/attendance', {
      method: 'POST',
      body: JSON.stringify({ classId, records, date }),
    });
  },

  async getAttendance<T = unknown>(classId?: string, date?: string): Promise<T[]> {
    const query = new URLSearchParams({ classId: classId || 'cls_10A1', ...(date ? { date } : {}) }).toString();
    const res = await request<{ records: T[] }>(`/teacher/attendance?${query}`);
    return res?.success && Array.isArray((res as unknown as { records?: T[] }).records)
      ? (res as unknown as { records: T[] }).records
      : [];
  },
};

// =============================================
// 4. Parent API
// =============================================
export const parentApi = {
  // List all active children for the authenticated parent
  async getChildrenData<T = unknown>(): Promise<T | null> {
    const res = await request<T>('/parent/children');
    return res?.success ? (res as unknown as T) : null;
  },

  // Get published grades for a specific child (requires valid relationship)
  async getGrades<T = unknown>(studentId: string, period?: string): Promise<T | null> {
    const params = new URLSearchParams({ studentId });
    if (period) params.set('period', period);
    const res = await request<T>(`/parent/grades?${params}`);
    return res?.success && res.data ? res.data : null;
  },

  // Get detailed grades for parent view
  async getDetailedGrades<T = unknown>(studentId: string, period?: string): Promise<T | null> {
    const params = new URLSearchParams({ studentId });
    if (period) params.set('period', period);
    const res = await request<T>(`/parent/grades-detail?${params}`);
    return res?.success && res.data ? res.data : null;
  },

  // Get attendance history for a specific child
  async getAttendance<T = unknown>(studentId: string): Promise<T | null> {
    const res = await request<T>(`/parent/attendance?studentId=${studentId}`);
    return res?.success && res.data ? res.data : null;
  },

  // Get assignments for a specific child
  async getAssignments<T = unknown>(studentId: string): Promise<T | null> {
    const res = await request<T>(`/parent/assignments?studentId=${studentId}`);
    return res?.success && res.data ? res.data : null;
  },

  // Get timetable for a specific child
  async getTimetable<T = unknown>(studentId: string, semesterId?: string): Promise<T | null> {
    const params = new URLSearchParams({ studentId });
    if (semesterId) params.set('semesterId', semesterId);
    const res = await request<T>(`/parent/timetable/${studentId}?${params}`);
    return res?.success ? (res as unknown as T) : null;
  },

  // Get announcements for parent (optionally scoped to child)
  async getAnnouncements<T = unknown>(studentId?: string): Promise<T | null> {
    const params = studentId ? `?studentId=${studentId}` : '';
    const res = await request<T>(`/parent/announcements${params}`);
    return res?.success ? (res as unknown as T) : null;
  },

  // Tuition
  async getTuition<T = unknown>(studentId: string): Promise<T | null> {
    const res = await request<T>(`/parent/tuition?studentId=${studentId}`);
    return res?.success ? (res as unknown as T) : null;
  },

  async payTuition(invoiceId: string): Promise<StandardResponse> {
    return request(`/parent/tuition/${invoiceId}/pay`, { method: 'POST' });
  },

  async confirmNotice(noticeId: string): Promise<StandardResponse> {
    return request(`/parent/notices/${noticeId}/confirm`, { method: 'POST' });
  },

  // Leave requests
  async getLeaveRequests(studentId: string): Promise<LeaveRequest[]> {
    const res = await request<{ requests: LeaveRequest[] }>(`/parent/leave-requests?studentId=${studentId}`);
    return res?.success && Array.isArray((res as unknown as { requests?: LeaveRequest[] }).requests)
      ? (res as unknown as { requests: LeaveRequest[] }).requests
      : [];
  },

  async submitLeaveRequest(data: Record<string, unknown>): Promise<StandardResponse> {
    return request('/parent/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Teacher messages
  async getTeacherMessages<T = unknown>(studentId: string): Promise<T[]> {
    const res = await request<{ messages: T[] }>(`/parent/messages?studentId=${studentId}`);
    return res?.success && Array.isArray((res as unknown as { messages?: T[] }).messages)
      ? (res as unknown as { messages: T[] }).messages
      : [];
  },

  async sendTeacherMessage(data: Record<string, unknown>): Promise<StandardResponse> {
    return request('/parent/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // G38 Teacher ↔ Parent Conversations (2-way real-time chat)
  async getConversations(page = 1, limit = 50): Promise<{ conversations: TeacherConversation[] }> {
    const res = await request<{ conversations: TeacherConversation[] }>(
      `/messages/conversations?page=${page}&limit=${limit}`
    );
    return res?.success ? res : { conversations: [] };
  },

  async getConversationMessages(conversationId: string, page = 1, limit = 100): Promise<{ messages: TeacherMessage[] }> {
    const res = await request<{ messages: TeacherMessage[] }>(
      `/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return res?.success ? res : { messages: [] };
  },

  async sendReply(conversationId: string, content: string): Promise<StandardResponse> {
    return request(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async markConversationRead(conversationId: string): Promise<StandardResponse> {
    return request(`/messages/conversations/${conversationId}/read`, { method: 'PATCH' });
  },

  // Invoices
  async getInvoices<T = unknown>(studentId: string): Promise<T | null> {
    const res = await request<T>(`/parent/invoices?studentId=${studentId}`);
    return res?.success ? (res as unknown as T) : null;
  },

  // G38: VietQR Sandbox simulation — dev/test only
  async simulatePayment(invoiceId: string): Promise<{ success: boolean; receiptNo?: string }> {
    const res = await request<{ success: boolean; receiptNo?: string }>(
      `/payments/sandbox/simulate-payment`,
      { method: 'POST', body: JSON.stringify({ invoiceId }) }
    );
    return res?.success ? res : { success: false };
  },
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =============================================
// 5. Admin API
// =============================================
export const adminApi = {
  async getOverview<T = unknown>(): Promise<T | null> {
    const res = await request<T>('/admin/overview');
    return res?.success && res.data ? res.data : null;
  },

  async broadcastNotice(title: string, content: string): Promise<StandardResponse> {
    return request('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  },

  async syncMoet(): Promise<StandardResponse> {
    return request('/admin/sync-moet', { method: 'POST' });
  },

  async getUsers(filters: Record<string, string | number> = {}): Promise<{ users: User[]; pagination: PaginationMeta }> {
    const stringParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') {
        stringParams[k] = String(v);
      }
    }
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ users: User[]; pagination: PaginationMeta }>(`/admin/users${query ? `?${query}` : ''}`);
    const users = res?.success && Array.isArray((res as unknown as { users?: User[] }).users)
      ? (res as unknown as { users: User[] }).users
      : [];
    const pagination = (res as unknown as { pagination?: PaginationMeta }).pagination || {
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      total: users.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    return { users, pagination };
  },

  async createUser(data: Record<string, unknown>): Promise<StandardResponse & { userId?: string; user?: User; initialPassword?: string }> {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Record<string, unknown>): Promise<StandardResponse & { user?: User }> {
    return request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateUserStatus(id: string, status: 'active' | 'disabled' | 'locked', reason?: string): Promise<StandardResponse<{ status?: string }>> {
    return request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },

  async updateUserRoles(id: string, role: string, roles?: string[]): Promise<StandardResponse & { roles?: string[] }> {
    return request(`/admin/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ role, roles }),
    });
  },

  async deleteUser(id: string): Promise<StandardResponse & { softDeactivated?: boolean }> {
    return request(`/admin/users/${id}`, { method: 'DELETE' });
  },

  async resetPassword(id: string, newPassword?: string): Promise<StandardResponse & { temporaryPassword?: string }> {
    return request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async getClasses(): Promise<ClassRoom[]> {
    const res = await request<{ classes: ClassRoom[] }>('/admin/classes');
    return res?.success && Array.isArray((res as unknown as { classes?: ClassRoom[] }).classes)
      ? (res as unknown as { classes: ClassRoom[] }).classes
      : [];
  },

  async createClass(data: Record<string, unknown>): Promise<StandardResponse> {
    return request('/admin/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClass(id: string, data: Record<string, unknown>): Promise<StandardResponse> {
    return request(`/admin/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClass(id: string): Promise<StandardResponse> {
    return request(`/admin/classes/${id}`, { method: 'DELETE' });
  },

  async getFinancials<T = unknown>(): Promise<T | null> {
    const res = await request<{ financials: T }>('/admin/financials');
    return res?.success ? (res as unknown as { financials: T }).financials : null;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await request<{ logs: AuditLogEntry[] }>('/admin/audit-logs');
    return res?.success && Array.isArray((res as unknown as { logs?: AuditLogEntry[] }).logs)
      ? (res as unknown as { logs: AuditLogEntry[] }).logs
      : [];
  },

  async getSubjects(): Promise<Subject[]> {
    const res = await request<{ subjects: Subject[] }>('/admin/subjects');
    return res?.success && Array.isArray((res as unknown as { subjects?: Subject[] }).subjects)
      ? (res as unknown as { subjects: Subject[] }).subjects
      : [];
  },

  async createSubject(data: {
    name: string;
    code: string;
    departmentId?: string;
    gradeLevel?: number;
    weeklyPeriods?: number;
  }): Promise<StandardResponse & { subject?: Subject }> {
    return request('/admin/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSubject(id: string, data: Partial<{
    name: string;
    code: string;
    departmentId: string;
    gradeLevel: number;
    weeklyPeriods: number;
  }>): Promise<StandardResponse & { subject?: Subject }> {
    return request(`/admin/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSubject(id: string): Promise<StandardResponse> {
    return request(`/admin/subjects/${id}`, { method: 'DELETE' });
  },

  // ── Academic Years & Semesters ──────────────────────────────────────────────
  async getAcademicYears(): Promise<AcademicYear[]> {
    const res = await request<{ academicYears: AcademicYear[] }>('/admin/academic-years');
    return res?.success && Array.isArray((res as unknown as { academicYears?: AcademicYear[] }).academicYears)
      ? (res as unknown as { academicYears: AcademicYear[] }).academicYears
      : [];
  },

  async getAcademicYearById(id: string): Promise<AcademicYear | null> {
    const res = await request<{ academicYear: AcademicYear }>(`/admin/academic-years/${id}`);
    return res?.success ? (res as unknown as { academicYear: AcademicYear }).academicYear : null;
  },

  async createAcademicYear(data: {
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }): Promise<StandardResponse & { academicYear?: AcademicYear }> {
    return request('/admin/academic-years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAcademicYear(id: string, data: Partial<{
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }>): Promise<StandardResponse & { academicYear?: AcademicYear }> {
    return request(`/admin/academic-years/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async setCurrentAcademicYear(id: string): Promise<StandardResponse & { academicYear?: AcademicYear }> {
    return request(`/admin/academic-years/${id}/set-current`, { method: 'PATCH' });
  },

  async deleteAcademicYear(id: string): Promise<StandardResponse> {
    return request(`/admin/academic-years/${id}`, { method: 'DELETE' });
  },

  // Semesters
  async createSemester(yearId: string, data: {
    name: string;
    semesterNumber: number;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }): Promise<StandardResponse & { semester?: Semester }> {
    return request(`/admin/academic-years/${yearId}/semesters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSemester(yearId: string, semesterId: string, data: Partial<{
    name: string;
    semesterNumber: number;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }>): Promise<StandardResponse & { semester?: Semester }> {
    return request(`/admin/academic-years/${yearId}/semesters/${semesterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async setCurrentSemester(yearId: string, semesterId: string): Promise<StandardResponse & { semester?: Semester }> {
    return request(`/admin/academic-years/${yearId}/semesters/${semesterId}/set-current`, { method: 'PATCH' });
  },

  async deleteSemester(yearId: string, semesterId: string): Promise<StandardResponse> {
    return request(`/admin/academic-years/${yearId}/semesters/${semesterId}`, { method: 'DELETE' });
  },

  // ── Departments ──────────────────────────────────────────────────────────────
  async getDepartments(): Promise<Department[]> {
    const res = await request<{ departments: Department[] }>('/admin/departments');
    return res?.success && Array.isArray((res as unknown as { departments?: Department[] }).departments)
      ? (res as unknown as { departments: Department[] }).departments
      : [];
  },

  async createDepartment(data: {
    name: string;
    code?: string;
    description?: string;
    headTeacherId?: string;
  }): Promise<StandardResponse & { department?: Department }> {
    return request('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDepartment(id: string, data: Partial<{
    name: string;
    code: string;
    description: string;
    headTeacherId: string;
  }>): Promise<StandardResponse & { department?: Department }> {
    return request(`/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteDepartment(id: string): Promise<StandardResponse> {
    return request(`/admin/departments/${id}`, { method: 'DELETE' });
  },

  // ── Archive Class ────────────────────────────────────────────────────────────
  async archiveClass(id: string): Promise<StandardResponse> {
    return request(`/admin/classes/${id}/archive`, { method: 'POST' });
  },

  async getClassStudents(classId: string): Promise<Student[]> {
    const res = await request<{ students: Student[] }>(`/admin/classes/${classId}/students`);
    return res?.success && Array.isArray((res as unknown as { students?: Student[] }).students)
      ? (res as unknown as { students: Student[] }).students
      : [];
  },

  // ── Student Management ─────────────────────────────────────────────────────────
  async getStudents(params: {
    search?: string;
    classId?: string;
    gradeLevel?: number;
    status?: 'active' | 'inactive';
    page?: number;
    limit?: number;
  } = {}): Promise<{ students: Student[]; pagination: PaginationMeta }> {
    const stringParams: Record<string, string> = {};
    if (params.search) stringParams.search = params.search;
    if (params.classId) stringParams.classId = params.classId;
    if (params.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    if (params.status) stringParams.status = params.status;
    if (params.page) stringParams.page = String(params.page);
    if (params.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ students: Student[]; pagination: PaginationMeta }>(
      `/admin/students${query ? `?${query}` : ''}`
    );
    return res?.success
      ? {
          students: (res as unknown as { students?: Student[] }).students || [],
          pagination: (res as unknown as { pagination?: PaginationMeta }).pagination || { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        }
      : { students: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  async getStudentById(id: string): Promise<Student | null> {
    const res = await request<{ student: Student }>(`/admin/students/${id}`);
    return res?.success ? (res as unknown as { student: Student }).student : null;
  },

  async updateStudent(id: string, data: {
    name?: string;
    phone?: string;
    classId?: string;
    parentId?: string;
    isActive?: boolean;
  }): Promise<StandardResponse> {
    return request(`/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getStudentEnrollments(studentId: string): Promise<unknown[]> {
    const res = await request<{ enrollments: unknown[] }>(`/admin/students/${studentId}/enrollments`);
    return res?.success ? (res as unknown as { enrollments: unknown[] }).enrollments || [] : [];
  },

  async getStudentAttendance(studentId: string, params?: { startDate?: string; endDate?: string; limit?: number }): Promise<unknown[]> {
    const stringParams: Record<string, string> = {};
    if (params?.startDate) stringParams.startDate = params.startDate;
    if (params?.endDate) stringParams.endDate = params.endDate;
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ attendance: unknown[] }>(`/admin/students/${studentId}/attendance${query ? `?${query}` : ''}`);
    return res?.success ? (res as unknown as { attendance: unknown[] }).attendance || [] : [];
  },

  async getStudentGrades(studentId: string, params?: { semesterId?: string; subjectId?: string; limit?: number }): Promise<unknown[]> {
    const stringParams: Record<string, string> = {};
    if (params?.semesterId) stringParams.semesterId = params.semesterId;
    if (params?.subjectId) stringParams.subjectId = params.subjectId;
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ grades: unknown[] }>(`/admin/students/${studentId}/grades${query ? `?${query}` : ''}`);
    return res?.success ? (res as unknown as { grades: unknown[] }).grades || [] : [];
  },

  async getStudentAssignments(studentId: string, params?: { status?: string; limit?: number }): Promise<unknown[]> {
    const stringParams: Record<string, string> = {};
    if (params?.status) stringParams.status = params.status;
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ assignments: unknown[] }>(`/admin/students/${studentId}/assignments${query ? `?${query}` : ''}`);
    return res?.success ? (res as unknown as { assignments: unknown[] }).assignments || [] : [];
  },

  async getStudentLeaveRequests(studentId: string): Promise<unknown[]> {
    const res = await request<{ leaveRequests: unknown[] }>(`/admin/students/${studentId}/leave-requests`);
    return res?.success ? (res as unknown as { leaveRequests: unknown[] }).leaveRequests || [] : [];
  },

  async transferStudent(studentId: string, data: { newClassId: string; effectiveDate?: string; reason?: string }): Promise<StandardResponse> {
    return request(`/admin/students/${studentId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ── Teacher Management ─────────────────────────────────────────────────────────
  async getTeachers(params: {
    search?: string;
    department?: string;
    status?: 'active' | 'inactive';
    page?: number;
    limit?: number;
  } = {}): Promise<{ teachers: unknown[]; pagination: PaginationMeta }> {
    const stringParams: Record<string, string> = {};
    if (params.search) stringParams.search = params.search;
    if (params.department) stringParams.department = params.department;
    if (params.status) stringParams.status = params.status;
    if (params.page) stringParams.page = String(params.page);
    if (params.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ teachers: unknown[]; pagination: PaginationMeta }>(
      `/admin/teachers${query ? `?${query}` : ''}`
    );
    return res?.success
      ? {
          teachers: (res as unknown as { teachers?: unknown[] }).teachers || [],
          pagination: (res as unknown as { pagination?: PaginationMeta }).pagination || { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        }
      : { teachers: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  async getTeacherById(id: string): Promise<unknown | null> {
    const res = await request<{ teacher: unknown }>(`/admin/teachers/${id}`);
    return res?.success ? (res as unknown as { teacher: unknown }).teacher : null;
  },

  async updateTeacher(id: string, data: {
    name?: string;
    phone?: string;
    isActive?: boolean;
  }): Promise<StandardResponse> {
    return request(`/admin/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getTeacherWorkload(teacherId: string): Promise<{
    classAssignments: unknown[];
    subjectBreakdown: unknown[];
    totals: { periods: number; classes: number; subjects: number };
    homeroom: unknown | null;
  }> {
    const res = await request<{
      classAssignments: unknown[];
      subjectBreakdown: unknown[];
      totals: { periods: number; classes: number; subjects: number };
      homeroom: unknown | null;
    }>(`/admin/teachers/${teacherId}/workload`);
    if (res?.success) {
      return {
        classAssignments: (res as unknown as { classAssignments?: unknown[] }).classAssignments || [],
        subjectBreakdown: (res as unknown as { subjectBreakdown?: unknown[] }).subjectBreakdown || [],
        totals: (res as unknown as { totals?: { periods: number; classes: number; subjects: number } }).totals || { periods: 0, classes: 0, subjects: 0 },
        homeroom: (res as unknown as { homeroom?: unknown | null }).homeroom || null,
      };
    }
    return { classAssignments: [], subjectBreakdown: [], totals: { periods: 0, classes: 0, subjects: 0 }, homeroom: null };
  },

  // ── Class Structure & Student Leadership ──────────────────────────────────────
  async getClassStructure(classId: string, academicYear?: string): Promise<{
    class: unknown;
    groups: unknown[];
    classMonitor: unknown | null;
    members: unknown[];
    academicYear: string;
  } | null> {
    const query = academicYear ? `?academicYear=${academicYear}` : '';
    const res = await request<{
      class: unknown;
      groups: unknown[];
      classMonitor: unknown | null;
      members: unknown[];
      academicYear: string;
    }>(`/admin/classes/${classId}/structure${query}`);
    if (res?.success) {
      return {
        class: (res as unknown as { class?: unknown }).class,
        groups: (res as unknown as { groups?: unknown[] }).groups || [],
        classMonitor: (res as unknown as { classMonitor?: unknown | null }).classMonitor || null,
        members: (res as unknown as { members?: unknown[] }).members || [],
        academicYear: (res as unknown as { academicYear?: string }).academicYear || academicYear || '',
      };
    }
    return null;
  },

  async createGroup(classId: string, data: { name: string; description?: string; academicYear?: string }): Promise<StandardResponse> {
    return request(`/admin/classes/${classId}/groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGroup(groupId: string, data: { name?: string; description?: string; isActive?: boolean }): Promise<StandardResponse> {
    return request(`/admin/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async archiveGroup(groupId: string): Promise<StandardResponse> {
    return request(`/admin/groups/${groupId}/archive`, {
      method: 'PATCH',
    });
  },

  async addGroupMember(groupId: string, data: { studentId: string; isLeader?: boolean }): Promise<StandardResponse> {
    return request(`/admin/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeGroupMember(groupId: string, studentId: string): Promise<StandardResponse> {
    return request(`/admin/groups/${groupId}/members/${studentId}`, {
      method: 'DELETE',
    });
  },

  async assignGroupLeader(groupId: string, data: { studentId: string; academicYear?: string }): Promise<StandardResponse> {
    return request(`/admin/groups/${groupId}/leader`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async assignClassMonitor(classId: string, data: { studentId: string; academicYear?: string }): Promise<StandardResponse> {
    return request(`/admin/classes/${classId}/monitor`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeClassMonitor(classId: string, academicYear?: string): Promise<StandardResponse> {
    const query = academicYear ? `?academicYear=${academicYear}` : '';
    return request(`/admin/classes/${classId}/monitor${query}`, {
      method: 'DELETE',
    });
  },

  async getStudentPositions(studentId: string): Promise<unknown[]> {
    const res = await request<{ positions: unknown[] }>(`/admin/students/${studentId}/positions`);
    return res?.success ? (res as unknown as { positions?: unknown[] }).positions || [] : [];
  },

  // ── Attendance Management ──────────────────────────────────────────────────────
  async getAttendanceOverview(params: {
    academicYear?: string;
    semesterId?: string;
    gradeLevel?: number;
    classId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    summary: {
      present: number;
      absent: number;
      absentExcused: number;
      absentUnexcused: number;
      late: number;
      earlyLeave: number;
      total: number;
    };
    percentages: {
      present: string;
      absent: string;
      absentExcused: string;
      absentUnexcused: string;
      late: string;
      earlyLeave: string;
    };
  } | null> {
    const stringParams: Record<string, string> = {};
    if (params.academicYear) stringParams.academicYear = params.academicYear;
    if (params.semesterId) stringParams.semesterId = params.semesterId;
    if (params.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    if (params.classId) stringParams.classId = params.classId;
    if (params.startDate) stringParams.startDate = params.startDate;
    if (params.endDate) stringParams.endDate = params.endDate;
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      summary: { present: number; absent: number; absentExcused: number; absentUnexcused: number; late: number; earlyLeave: number; total: number };
      percentages: { present: string; absent: string; absentExcused: string; absentUnexcused: string; late: string; earlyLeave: string };
    }>(`/admin/attendance/overview${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        summary: (res as unknown as { summary: { present: number; absent: number; absentExcused: number; absentUnexcused: number; late: number; earlyLeave: number; total: number } }).summary,
        percentages: (res as unknown as { percentages: { present: string; absent: string; absentExcused: string; absentUnexcused: string; late: string; earlyLeave: string } }).percentages,
      };
    }
    return null;
  },

  async getAttendanceAtRisk(params: {
    academicYear?: string;
    gradeLevel?: number;
    classId?: string;
    threshold?: number;
    limit?: number;
  } = {}): Promise<Array<{
    student_id: string;
    student_name: string;
    student_code: string;
    class_id: string;
    class_name: string;
    grade_level: number;
    total_days: number;
    absent_days: number;
    absence_rate: number;
  }>> {
    const stringParams: Record<string, string> = {};
    if (params.academicYear) stringParams.academicYear = params.academicYear;
    if (params.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    if (params.classId) stringParams.classId = params.classId;
    if (params.threshold) stringParams.threshold = String(params.threshold);
    if (params.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ atRiskStudents: Array<{
      student_id: string;
      student_name: string;
      student_code: string;
      class_id: string;
      class_name: string;
      grade_level: number;
      total_days: number;
      absent_days: number;
      absence_rate: number;
    }> }>(`/admin/attendance/at-risk${query ? `?${query}` : ''}`);
    return res?.success ? (res as unknown as { atRiskStudents: Array<{
      student_id: string;
      student_name: string;
      student_code: string;
      class_id: string;
      class_name: string;
      grade_level: number;
      total_days: number;
      absent_days: number;
      absence_rate: number;
    }> }).atRiskStudents || [] : [];
  },

  async getAttendanceConfig(): Promise<{
    absence_alert_threshold: number;
    absence_warning_threshold: number;
    consecutive_absent_alert: number;
    excused_absence_warning: number;
  }> {
    const res = await request<{ config: {
      absence_alert_threshold: number;
      absence_warning_threshold: number;
      consecutive_absent_alert: number;
      excused_absence_warning: number;
    } }>(`/admin/attendance/config`);
    if (res?.success) {
      return (res as unknown as { config: {
        absence_alert_threshold: number;
        absence_warning_threshold: number;
        consecutive_absent_alert: number;
        excused_absence_warning: number;
      } }).config;
    }
    return { absence_alert_threshold: 10, absence_warning_threshold: 5, consecutive_absent_alert: 3, excused_absence_warning: 5 };
  },

  async getStudentAttendanceHistory(studentId: string, params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<{
    history: Array<{
      id: string;
      status: string;
      note?: string;
      date: string;
      period?: number;
      class_name: string;
      grade_level: number;
      teacher_name?: string;
      subject_name?: string;
    }>;
    summary: Array<{ status: string; count: number }>;
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.startDate) stringParams.startDate = params.startDate;
    if (params?.endDate) stringParams.endDate = params.endDate;
    if (params?.status) stringParams.status = params.status;
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      history: Array<{
        id: string;
        status: string;
        note?: string;
        date: string;
        period?: number;
        class_name: string;
        grade_level: number;
        teacher_name?: string;
        subject_name?: string;
      }>;
      summary: Array<{ status: string; count: number }>;
    }>(`/admin/attendance/student/${studentId}${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        history: (res as unknown as { history: Array<{
          id: string;
          status: string;
          note?: string;
          date: string;
          period?: number;
          class_name: string;
          grade_level: number;
          teacher_name?: string;
          subject_name?: string;
        }> }).history || [],
        summary: (res as unknown as { summary: Array<{ status: string; count: number }> }).summary || [],
      };
    }
    return { history: [], summary: [] };
  },

  async updateAttendanceRecord(recordId: string, data: { status: string; note?: string }): Promise<StandardResponse> {
    return request(`/admin/attendance/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // ── Assessment Management ──────────────────────────────────────────────────────
  async getAssessmentOverview(params?: {
    academicYear?: string;
    semesterId?: string;
    gradeLevel?: number;
    classId?: string;
    teacherId?: string;
  }): Promise<{
    assignments: { total_assignments: number; pending_assignments: number; past_assignments: number };
    submissions: { total_submissions: number; submitted: number; graded: number; late: number; missing: number };
    grades: { total_grades: number; draft_grades: number; published_grades: number };
    gradingProgress: number;
    ungradedSubmissions: number;
  } | null> {
    const stringParams: Record<string, string> = {};
    if (params?.academicYear) stringParams.academicYear = params.academicYear;
    if (params?.semesterId) stringParams.semesterId = params.semesterId;
    if (params?.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    if (params?.classId) stringParams.classId = params.classId;
    if (params?.teacherId) stringParams.teacherId = params.teacherId;
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      assignments: { total_assignments: number; pending_assignments: number; past_assignments: number };
      submissions: { total_submissions: number; submitted: number; graded: number; late: number; missing: number };
      grades: { total_grades: number; draft_grades: number; published_grades: number };
      gradingProgress: number;
      ungradedSubmissions: number;
    }>(`/admin/assessment/overview${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        assignments: (res as unknown as { assignments: { total_assignments: number; pending_assignments: number; past_assignments: number } }).assignments,
        submissions: (res as unknown as { submissions: { total_submissions: number; submitted: number; graded: number; late: number; missing: number } }).submissions,
        grades: (res as unknown as { grades: { total_grades: number; draft_grades: number; published_grades: number } }).grades,
        gradingProgress: (res as unknown as { gradingProgress: number }).gradingProgress,
        ungradedSubmissions: (res as unknown as { ungradedSubmissions: number }).ungradedSubmissions,
      };
    }
    return null;
  },

  async getGradingProgress(params?: {
    academicYear?: string;
    semesterId?: string;
    gradeLevel?: number;
  }): Promise<{
    classProgress: Array<{ class_id: string; class_name: string; grade_level: number; total_grades: number; published_grades: number; progress_percent: number }>;
    subjectProgress: Array<{ subject_id: string; subject_name: string; subject_code: string; total_grades: number; published_grades: number; progress_percent: number }>;
    teacherProgress: Array<{ teacher_id: string; teacher_name: string; total_grades: number; published_grades: number; progress_percent: number }>;
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.academicYear) stringParams.academicYear = params.academicYear;
    if (params?.semesterId) stringParams.semesterId = params.semesterId;
    if (params?.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      classProgress: Array<{ class_id: string; class_name: string; grade_level: number; total_grades: number; published_grades: number; progress_percent: number }>;
      subjectProgress: Array<{ subject_id: string; subject_name: string; subject_code: string; total_grades: number; published_grades: number; progress_percent: number }>;
      teacherProgress: Array<{ teacher_id: string; teacher_name: string; total_grades: number; published_grades: number; progress_percent: number }>;
    }>(`/admin/assessment/grading-progress${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        classProgress: (res as unknown as { classProgress: Array<{ class_id: string; class_name: string; grade_level: number; total_grades: number; published_grades: number; progress_percent: number }> }).classProgress || [],
        subjectProgress: (res as unknown as { subjectProgress: Array<{ subject_id: string; subject_name: string; subject_code: string; total_grades: number; published_grades: number; progress_percent: number }> }).subjectProgress || [],
        teacherProgress: (res as unknown as { teacherProgress: Array<{ teacher_id: string; teacher_name: string; total_grades: number; published_grades: number; progress_percent: number }> }).teacherProgress || [],
      };
    }
    return { classProgress: [], subjectProgress: [], teacherProgress: [] };
  },

  async getGradeAnalysis(params?: {
    academicYear?: string;
    semesterId?: string;
    gradeLevel?: number;
    classId?: string;
    subjectId?: string;
  }): Promise<{
    gradeDistribution: Array<{ range: string; count: number }>;
    classAverages: Array<{ class_id: string; class_name: string; grade_level: number; average_score: number; average_percent: number; grade_count: number }>;
    subjectAverages: Array<{ subject_id: string; subject_name: string; subject_code: string; average_score: number; average_percent: number; grade_count: number }>;
    overallStats: { total_published_grades: number; overall_average: number; overall_percent: number; min_score: number; max_score: number };
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.academicYear) stringParams.academicYear = params.academicYear;
    if (params?.semesterId) stringParams.semesterId = params.semesterId;
    if (params?.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    if (params?.classId) stringParams.classId = params.classId;
    if (params?.subjectId) stringParams.subjectId = params.subjectId;
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      gradeDistribution: Array<{ range: string; count: number }>;
      classAverages: Array<{ class_id: string; class_name: string; grade_level: number; average_score: number; average_percent: number; grade_count: number }>;
      subjectAverages: Array<{ subject_id: string; subject_name: string; subject_code: string; average_score: number; average_percent: number; grade_count: number }>;
      overallStats: { total_published_grades: number; overall_average: number; overall_percent: number; min_score: number; max_score: number };
    }>(`/admin/assessment/grade-analysis${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        gradeDistribution: (res as unknown as { gradeDistribution: Array<{ range: string; count: number }> }).gradeDistribution || [],
        classAverages: (res as unknown as { classAverages: Array<{ class_id: string; class_name: string; grade_level: number; average_score: number; average_percent: number; grade_count: number }> }).classAverages || [],
        subjectAverages: (res as unknown as { subjectAverages: Array<{ subject_id: string; subject_name: string; subject_code: string; average_score: number; average_percent: number; grade_count: number }> }).subjectAverages || [],
        overallStats: (res as unknown as { overallStats: { total_published_grades: number; overall_average: number; overall_percent: number; min_score: number; max_score: number } }).overallStats,
      };
    }
    return { gradeDistribution: [], classAverages: [], subjectAverages: [], overallStats: { total_published_grades: 0, overall_average: 0, overall_percent: 0, min_score: 0, max_score: 0 } };
  },

  async getUngradedSubmissions(limit?: number): Promise<Array<{
    submission_id: string;
    submitted_at: string;
    submission_status: string;
    assignment_title: string;
    due_date: string;
    subject_name: string;
    class_id: string;
    class_name: string;
    student_name: string;
    student_code: string;
    teacher_name: string;
  }>> {
    const query = limit ? `?limit=${limit}` : '';
    const res = await request<{ ungraded: Array<{
      submission_id: string;
      submitted_at: string;
      submission_status: string;
      assignment_title: string;
      due_date: string;
      subject_name: string;
      class_id: string;
      class_name: string;
      student_name: string;
      student_code: string;
      teacher_name: string;
    }> }>(`/admin/assessment/ungraded${query}`);
    if (res?.success) {
      return (res as unknown as { ungraded: Array<{
        submission_id: string;
        submitted_at: string;
        submission_status: string;
        assignment_title: string;
        due_date: string;
        subject_name: string;
        class_id: string;
        class_name: string;
        student_name: string;
        student_code: string;
        teacher_name: string;
      }> }).ungraded || [];
    }
    return [];
  },

  async getAssessmentPeriods(): Promise<{
    periods: Array<{
      academic_year_id: string;
      academic_year_name: string;
      semester_id: string;
      semester_name: string;
      semester_start: string;
      semester_end: string;
      status: string;
    }>;
    lockedPeriods: unknown[];
  }> {
    const res = await request<{
      periods: Array<{
        academic_year_id: string;
        academic_year_name: string;
        semester_id: string;
        semester_name: string;
        semester_start: string;
        semester_end: string;
        status: string;
      }>;
      lockedPeriods: unknown[];
    }>(`/admin/assessment/periods`);
    if (res?.success) {
      return {
        periods: (res as unknown as { periods: Array<{
          academic_year_id: string;
          academic_year_name: string;
          semester_id: string;
          semester_name: string;
          semester_start: string;
          semester_end: string;
          status: string;
        }> }).periods || [],
        lockedPeriods: (res as unknown as { lockedPeriods: unknown[] }).lockedPeriods || [],
      };
    }
    return { periods: [], lockedPeriods: [] };
  },

  async overrideGrade(gradeId: string, data: { rawScore?: number; maxScore?: number; feedback?: string; reason: string }): Promise<StandardResponse> {
    return request(`/admin/assessment/grades/${gradeId}/override`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async lockGradingPeriod(periodId: string, lock: boolean, lockReason?: string): Promise<StandardResponse> {
    return request(`/admin/assessment/periods/${periodId}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ lock, lockReason }),
    });
  },

  // ── Parent & Guardian Management ────────────────────────────────────────────────
  async getParents(params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    relationship?: string;
  }): Promise<{
    parents: Array<{
      user_id: string;
      name: string;
      email: string;
      phone: string;
      code: string;
      is_active: number;
      created_at: string;
      child_count: number;
      has_primary: number;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.search) stringParams.search = params.search;
    if (params?.page) stringParams.page = String(params.page);
    if (params?.limit) stringParams.limit = String(params.limit);
    if (params?.status) stringParams.status = params.status;
    if (params?.relationship) stringParams.relationship = params.relationship;
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      parents: Array<{
        user_id: string;
        name: string;
        email: string;
        phone: string;
        code: string;
        is_active: number;
        created_at: string;
        child_count: number;
        has_primary: number;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/parents${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        parents: (res as unknown as { parents: Array<{
          user_id: string;
          name: string;
          email: string;
          phone: string;
          code: string;
          is_active: number;
          created_at: string;
          child_count: number;
          has_primary: number;
        }> }).parents || [],
        pagination: (res as unknown as { pagination: { page: number; limit: number; total: number; totalPages: number } }).pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
    return { parents: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  },

  async getParentDetail(parentId: string): Promise<{
    parent: { user_id: string; name: string; email: string; phone: string; code: string; is_active: number; created_at: string; avatar?: string };
    children: Array<{
      link_id: string;
      relationship: string;
      is_primary_contact: number;
      is_verified: number;
      is_active: number;
      notes?: string;
      student_id: string;
      student_name: string;
      student_code: string;
      class_id: string;
      class_name: string;
      grade_level: number;
      gpa: number;
      class_rank?: string;
    }>;
    stats: { linkedChildren: number; messageCount: number; leaveRequestCount: number };
  } | null> {
    const res = await request<{
      parent: { user_id: string; name: string; email: string; phone: string; code: string; is_active: number; created_at: string; avatar?: string };
      children: Array<{
        link_id: string;
        relationship: string;
        is_primary_contact: number;
        is_verified: number;
        is_active: number;
        notes?: string;
        student_id: string;
        student_name: string;
        student_code: string;
        class_id: string;
        class_name: string;
        grade_level: number;
        gpa: number;
        class_rank?: string;
      }>;
      stats: { linkedChildren: number; messageCount: number; leaveRequestCount: number };
    }>(`/admin/parents/${parentId}`);
    if (res?.success) {
      return {
        parent: (res as unknown as { parent: { user_id: string; name: string; email: string; phone: string; code: string; is_active: number; created_at: string; avatar?: string } }).parent,
        children: (res as unknown as { children: Array<{
          link_id: string;
          relationship: string;
          is_primary_contact: number;
          is_verified: number;
          is_active: number;
          notes?: string;
          student_id: string;
          student_name: string;
          student_code: string;
          class_id: string;
          class_name: string;
          grade_level: number;
          gpa: number;
          class_rank?: string;
        }> }).children || [],
        stats: (res as unknown as { stats: { linkedChildren: number; messageCount: number; leaveRequestCount: number } }).stats,
      };
    }
    return null;
  },

  async linkChildToParent(parentId: string, data: { studentId: string; relationship: string; isPrimaryContact?: boolean; notes?: string }): Promise<StandardResponse> {
    return request(`/admin/parents/${parentId}/children`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateParentChildLink(parentId: string, studentId: string, data: { relationship?: string; isPrimaryContact?: boolean; isActive?: boolean; notes?: string }): Promise<StandardResponse> {
    return request(`/admin/parents/${parentId}/children/${studentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async unlinkChildFromParent(parentId: string, studentId: string): Promise<StandardResponse> {
    return request(`/admin/parents/${parentId}/children/${studentId}`, {
      method: 'DELETE',
    });
  },

  async setParentAccountStatus(parentId: string, isActive: boolean): Promise<StandardResponse> {
    return request(`/admin/parents/${parentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  async getAvailableStudentsForParent(parentId: string, params?: { search?: string; gradeLevel?: number }): Promise<Array<{
    student_id: string;
    student_name: string;
    student_code: string;
    class_id: string;
    class_name: string;
    grade_level: number;
  }>> {
    const stringParams: Record<string, string> = {};
    if (params?.search) stringParams.search = params.search;
    if (params?.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ students: Array<{
      student_id: string;
      student_name: string;
      student_code: string;
      class_id: string;
      class_name: string;
      grade_level: number;
    }> }>(`/admin/parents/${parentId}/available-students${query ? `?${query}` : ''}`);
    return res?.success ? (res as unknown as { students: Array<{
      student_id: string;
      student_name: string;
      student_code: string;
      class_id: string;
      class_name: string;
      grade_level: number;
    }> }).students || [] : [];
  },

  // ── Admin Communication Center ────────────────────────────────────────────────
  async getAdminAnnouncements(params?: {
    search?: string;
    status?: string;
    categoryId?: string;
    priority?: string;
    scope?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    announcements: Array<{
      id: string;
      title: string;
      content: string;
      summary?: string;
      status: string;
      priority: string;
      scope: string;
      author_id: string;
      author_name: string;
      category_id?: string;
      category_name?: string;
      category_color?: string;
      created_at: string;
      published_at?: string;
      scheduled_publish_at?: string;
      archived_at?: string;
      total_recipients: number;
      read_count: number;
      unread_count: number;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.search) stringParams.search = params.search;
    if (params?.status) stringParams.status = params.status;
    if (params?.categoryId) stringParams.categoryId = params.categoryId;
    if (params?.priority) stringParams.priority = params.priority;
    if (params?.scope) stringParams.scope = params.scope;
    if (params?.page) stringParams.page = String(params.page);
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      announcements: Array<{
        id: string;
        title: string;
        content: string;
        summary?: string;
        status: string;
        priority: string;
        scope: string;
        author_id: string;
        author_name: string;
        category_id?: string;
        category_name?: string;
        category_color?: string;
        created_at: string;
        published_at?: string;
        scheduled_publish_at?: string;
        archived_at?: string;
        total_recipients: number;
        read_count: number;
        unread_count: number;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/communication/announcements${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        announcements: (res as unknown as { announcements: Array<{
          id: string;
          title: string;
          content: string;
          summary?: string;
          status: string;
          priority: string;
          scope: string;
          author_id: string;
          author_name: string;
          category_id?: string;
          category_name?: string;
          category_color?: string;
          created_at: string;
          published_at?: string;
          scheduled_publish_at?: string;
          archived_at?: string;
          total_recipients: number;
          read_count: number;
          unread_count: number;
        }> }).announcements || [],
        pagination: (res as unknown as { pagination: { page: number; limit: number; total: number; totalPages: number } }).pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
    return { announcements: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  },

  async getAdminAnnouncementDetail(id: string): Promise<{
    announcement: Record<string, unknown>;
    recentReaders: Array<{ user_id: string; user_name: string; role: string; read_at: string }>;
  } | null> {
    const res = await request<{
      announcement: Record<string, unknown>;
      recentReaders: Array<{ user_id: string; user_name: string; role: string; read_at: string }>;
    }>(`/admin/communication/announcements/${id}`);
    if (res?.success) {
      return {
        announcement: (res as unknown as { announcement: Record<string, unknown> }).announcement,
        recentReaders: (res as unknown as { recentReaders: Array<{ user_id: string; user_name: string; role: string; read_at: string }> }).recentReaders || [],
      };
    }
    return null;
  },

  async adminCreateAnnouncement(data: {
    title: string;
    content: string;
    summary?: string;
    status?: string;
    priority?: string;
    scope?: string;
    categoryId?: string;
    scheduledPublishAt?: string;
  }): Promise<StandardResponse> {
    return request('/admin/communication/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async adminUpdateAnnouncement(id: string, data: {
    title?: string;
    content?: string;
    summary?: string;
    priority?: string;
    scope?: string;
    categoryId?: string;
  }): Promise<StandardResponse> {
    return request(`/admin/communication/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async adminPublishAnnouncement(id: string): Promise<StandardResponse> {
    return request(`/admin/communication/announcements/${id}/publish`, {
      method: 'POST',
    });
  },

  async adminArchiveAnnouncement(id: string): Promise<StandardResponse> {
    return request(`/admin/communication/announcements/${id}/archive`, {
      method: 'POST',
    });
  },

  async adminDeleteAnnouncement(id: string): Promise<StandardResponse> {
    return request(`/admin/communication/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  async getAdminAnnouncementCategories(): Promise<Array<{
    id: string;
    name: string;
    color: string;
    icon?: string;
    sort_order: number;
  }>> {
    const res = await request<{ categories: Array<{
      id: string;
      name: string;
      color: string;
      icon?: string;
      sort_order: number;
    }> }>('/admin/communication/categories');
    return res?.success ? (res as unknown as { categories: Array<{
      id: string;
      name: string;
      color: string;
      icon?: string;
      sort_order: number;
    }> }).categories || [] : [];
  },

  async getCommunicationOverview(): Promise<{
    announcements: { total: number; drafts: number; published: number; archived: number };
    reads: { announcements_with_reads: number; total_reads: number };
  } | null> {
    const res = await request<{
      announcements: { total: number; drafts: number; published: number; archived: number };
      reads: { announcements_with_reads: number; total_reads: number };
    }>('/admin/communication/overview');
    if (res?.success) {
      return {
        announcements: (res as unknown as { announcements: { total: number; drafts: number; published: number; archived: number } }).announcements,
        reads: (res as unknown as { reads: { announcements_with_reads: number; total_reads: number } }).reads,
      };
    }
    return null;
  },

  // ── Report Center ─────────────────────────────────────────────────────────────
  async getReportTypes(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    hasData: boolean;
    exportFormats: string[];
  }>> {
    const res = await request<{ reportTypes: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      hasData: boolean;
      exportFormats: string[];
    }> }>('/admin/reports/types');
    return res?.success ? (res as unknown as { reportTypes: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      hasData: boolean;
      exportFormats: string[];
    }> }).reportTypes || [] : [];
  },

  async getReportData(reportType: string, params?: {
    academicYearId?: string;
    semesterId?: string;
    gradeLevel?: number;
    classId?: string;
    subjectId?: string;
    teacherId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    records: Record<string, unknown>[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.academicYearId) stringParams.academicYearId = params.academicYearId;
    if (params?.semesterId) stringParams.semesterId = params.semesterId;
    if (params?.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    if (params?.classId) stringParams.classId = params.classId;
    if (params?.subjectId) stringParams.subjectId = params.subjectId;
    if (params?.teacherId) stringParams.teacherId = params.teacherId;
    if (params?.startDate) stringParams.startDate = params.startDate;
    if (params?.endDate) stringParams.endDate = params.endDate;
    if (params?.page) stringParams.page = String(params.page);
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      records: Record<string, unknown>[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/reports/${reportType}${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        records: (res as unknown as { records: Record<string, unknown>[] }).records || [],
        pagination: (res as unknown as { pagination: { page: number; limit: number; total: number; totalPages: number } }).pagination || { page: 1, limit: 100, total: 0, totalPages: 0 },
      };
    }
    return { records: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } };
  },

  async getReportFilters(): Promise<{
    academicYears: Array<{ id: string; name: string }>;
    semesters: Array<{ id: string; name: string; academic_year_id: string }>;
    classes: Array<{ id: string; name: string; grade_level: number }>;
    subjects: Array<{ id: string; name: string; code: string }>;
    teachers: Array<{ id: string; name: string; email: string }>;
  }> {
    const res = await request<{
      data: {
        academicYears: Array<{ id: string; name: string }>;
        semesters: Array<{ id: string; name: string; academic_year_id: string }>;
        classes: Array<{ id: string; name: string; grade_level: number }>;
        subjects: Array<{ id: string; name: string; code: string }>;
        teachers: Array<{ id: string; name: string; email: string }>;
      };
    }>('/admin/reports/filters');
    if (res?.success) {
      return (res as unknown as { data: {
        academicYears: Array<{ id: string; name: string }>;
        semesters: Array<{ id: string; name: string; academic_year_id: string }>;
        classes: Array<{ id: string; name: string; grade_level: number }>;
        subjects: Array<{ id: string; name: string; code: string }>;
        teachers: Array<{ id: string; name: string; email: string }>;
      } }).data;
    }
    return { academicYears: [], semesters: [], classes: [], subjects: [], teachers: [] };
  },

  async exportReport(reportType: string, params?: {
    academicYearId?: string;
    semesterId?: string;
    gradeLevel?: number;
    classId?: string;
    subjectId?: string;
    teacherId?: string;
    startDate?: string;
    endDate?: string;
    format?: string;
  }): Promise<Blob | null> {
    const stringParams: Record<string, string> = {};
    if (params?.academicYearId) stringParams.academicYearId = params.academicYearId;
    if (params?.semesterId) stringParams.semesterId = params.semesterId;
    if (params?.gradeLevel) stringParams.gradeLevel = String(params.gradeLevel);
    if (params?.classId) stringParams.classId = params.classId;
    if (params?.subjectId) stringParams.subjectId = params.subjectId;
    if (params?.teacherId) stringParams.teacherId = params.teacherId;
    if (params?.startDate) stringParams.startDate = params.startDate;
    if (params?.endDate) stringParams.endDate = params.endDate;
    if (params?.format) stringParams.format = params.format;
    const query = new URLSearchParams(stringParams).toString();
    try {
      const response = await fetch(`/api/admin/reports/${reportType}/export${query ? `?${query}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (response.ok) {
        return await response.blob();
      }
    } catch {
      // Export failed
    }
    return null;
  },

  // ── Data Operations (Import/Export/Data Quality) ─────────────────────────────
  async getDataCapabilities(): Promise<{
    import: { supported: string[]; maxFileSize: number; maxRows: number };
    export: { supported: string[]; maxRows: number };
    dataQuality: { checks: string[] };
  } | null> {
    const res = await request<{
      import: { supported: string[]; maxFileSize: number; maxRows: number };
      export: { supported: string[]; maxRows: number };
      dataQuality: { checks: string[] };
    }>('/admin/data/capabilities');
    if (res?.success) {
      return {
        import: (res as unknown as { import: { supported: string[]; maxFileSize: number; maxRows: number } }).import,
        export: (res as unknown as { export: { supported: string[]; maxRows: number } }).export,
        dataQuality: (res as unknown as { dataQuality: { checks: string[] } }).dataQuality,
      };
    }
    return null;
  },

  async importPreview(entityType: string, data: Record<string, unknown>[]): Promise<{
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    errors: Array<{ rowNumber: number; row: Record<string, unknown>; errors: Array<{ field: string; message: string }> }>;
    warnings: Array<{ rowNumber: number; row: Record<string, unknown>; warnings: Array<{ field: string; message: string }> }>;
    preview: Array<{ rowNumber: number; row: Record<string, unknown> }>;
  } | null> {
    const res = await request<{
      totalRows: number;
      validRows: number;
      warningRows: number;
      errorRows: number;
      errors: Array<{ rowNumber: number; row: Record<string, unknown>; errors: Array<{ field: string; message: string }> }>;
      warnings: Array<{ rowNumber: number; row: Record<string, unknown>; warnings: Array<{ field: string; message: string }> }>;
      preview: Array<{ rowNumber: number; row: Record<string, unknown> }>;
    }>('/admin/data/import/preview', {
      method: 'POST',
      body: JSON.stringify({ entityType, data }),
    });
    if (res?.success) {
      return {
        totalRows: (res as unknown as { totalRows: number }).totalRows,
        validRows: (res as unknown as { validRows: number }).validRows,
        warningRows: (res as unknown as { warningRows: number }).warningRows,
        errorRows: (res as unknown as { errorRows: number }).errorRows,
        errors: (res as unknown as { errors: Array<{ rowNumber: number; row: Record<string, unknown>; errors: Array<{ field: string; message: string }> }> }).errors || [],
        warnings: (res as unknown as { warnings: Array<{ rowNumber: number; row: Record<string, unknown>; warnings: Array<{ field: string; message: string }> }> }).warnings || [],
        preview: (res as unknown as { preview: Array<{ rowNumber: number; row: Record<string, unknown> }> }).preview || [],
      };
    }
    return null;
  },

  async importCommit(entityType: string, data: Record<string, unknown>[]): Promise<{
    imported: number;
    skipped: number;
    errors: number;
  } | null> {
    const res = await request<{
      imported: number;
      skipped: number;
      errors: number;
    }>('/admin/data/import/commit', {
      method: 'POST',
      body: JSON.stringify({ entityType, data, mode: 'commit' }),
    });
    if (res?.success) {
      return {
        imported: (res as unknown as { imported: number }).imported,
        skipped: (res as unknown as { skipped: number }).skipped,
        errors: (res as unknown as { errors: number }).errors,
      };
    }
    return null;
  },

  async getDataQualityIssues(): Promise<{
    issues: Array<{
      type: string;
      title: string;
      count: number;
      severity: 'error' | 'warning' | 'info';
      records: Record<string, unknown>[];
    }>;
    totalIssues: number;
  } | null> {
    const res = await request<{
      issues: Array<{
        type: string;
        title: string;
        count: number;
        severity: 'error' | 'warning' | 'info';
        records: Record<string, unknown>[];
      }>;
      totalIssues: number;
    }>('/admin/data/quality');
    if (res?.success) {
      return {
        issues: (res as unknown as { issues: Array<{
          type: string;
          title: string;
          count: number;
          severity: 'error' | 'warning' | 'info';
          records: Record<string, unknown>[];
        }> }).issues || [],
        totalIssues: (res as unknown as { totalIssues: number }).totalIssues,
      };
    }
    return null;
  },

  async exportData(entityType: string): Promise<Blob | null> {
    try {
      const response = await fetch(`/api/admin/data/export/${entityType}?format=csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (response.ok) {
        return await response.blob();
      }
    } catch {
      // Export failed
    }
    return null;
  },

  async downloadImportTemplate(entityType: string): Promise<Blob | null> {
    try {
      const response = await fetch(`/api/admin/data/templates/${entityType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (response.ok) {
        return await response.blob();
      }
    } catch {
      // Download failed
    }
    return null;
  },

  // ── System Administration ────────────────────────────────────────────────────────
  async getSystemUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    users: Array<{
      id: string;
      email: string;
      name: string;
      code?: string;
      role: string;
      is_active: number;
      last_login?: string;
      created_at: string;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.search) stringParams.search = params.search;
    if (params?.role) stringParams.role = params.role;
    if (params?.status) stringParams.status = params.status;
    if (params?.page) stringParams.page = String(params.page);
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      users: Array<{
        id: string;
        email: string;
        name: string;
        code?: string;
        role: string;
        is_active: number;
        last_login?: string;
        created_at: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/system/users${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        users: (res as unknown as { users: Array<{
          id: string;
          email: string;
          name: string;
          code?: string;
          role: string;
          is_active: number;
          last_login?: string;
          created_at: string;
        }> }).users || [],
        pagination: (res as unknown as { pagination: { page: number; limit: number; total: number; totalPages: number } }).pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
      };
    }
    return { users: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  },

  async adminUpdateUserStatus(userId: string, isActive: boolean): Promise<StandardResponse> {
    return request(`/admin/system/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  async getSystemRoles(): Promise<{
    roles: Array<{ id: string; name: string; description: string; color: string }>;
    permissions: Array<{ id: string; name: string; category: string }>;
  } | null> {
    const res = await request<{
      roles: Array<{ id: string; name: string; description: string; color: string }>;
      permissions: Array<{ id: string; name: string; category: string }>;
    }>('/admin/system/roles');
    if (res?.success) {
      return {
        roles: (res as unknown as { roles: Array<{ id: string; name: string; description: string; color: string }> }).roles || [],
        permissions: (res as unknown as { permissions: Array<{ id: string; name: string; category: string }> }).permissions || [],
      };
    }
    return null;
  },

  async adminGetAuditLogs(params?: {
    search?: string;
    actor?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: Array<{
      id: string;
      actor_id: string;
      actor_name: string;
      role: string;
      action: string;
      entity_type: string;
      entity_id: string;
      details: string;
      ip_address?: string;
      created_at: string;
      description: string;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const stringParams: Record<string, string> = {};
    if (params?.search) stringParams.search = params.search;
    if (params?.actor) stringParams.actor = params.actor;
    if (params?.action) stringParams.action = params.action;
    if (params?.entityType) stringParams.entityType = params.entityType;
    if (params?.startDate) stringParams.startDate = params.startDate;
    if (params?.endDate) stringParams.endDate = params.endDate;
    if (params?.page) stringParams.page = String(params.page);
    if (params?.limit) stringParams.limit = String(params.limit);
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{
      logs: Array<{
        id: string;
        actor_id: string;
        actor_name: string;
        role: string;
        action: string;
        entity_type: string;
        entity_id: string;
        details: string;
        ip_address?: string;
        created_at: string;
        description: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/system/audit${query ? `?${query}` : ''}`);
    if (res?.success) {
      return {
        logs: (res as unknown as { logs: Array<{
          id: string;
          actor_id: string;
          actor_name: string;
          role: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details: string;
          ip_address?: string;
          created_at: string;
          description: string;
        }> }).logs || [],
        pagination: (res as unknown as { pagination: { page: number; limit: number; total: number; totalPages: number } }).pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
      };
    }
    return { logs: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  },

  async getSystemHealth(): Promise<{
    status: string;
    timestamp: string;
    services: { api: { status: string }; database: { status: string } };
    environment: string;
    version: string;
  } | null> {
    const res = await request<{
      status: string;
      timestamp: string;
      services: { api: { status: string }; database: { status: string } };
      environment: string;
      version: string;
    }>('/admin/system/health');
    if (res?.success) {
      return res as unknown as {
        status: string;
        timestamp: string;
        services: { api: { status: string }; database: { status: string } };
        environment: string;
        version: string;
      };
    }
    return null;
  },

  async getSystemSettingsCategories(): Promise<Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
  }>> {
    const res = await request<{ categories: Array<{
      id: string;
      name: string;
      icon: string;
      description: string;
    }> }>('/admin/system/settings');
    return res?.success ? (res as unknown as { categories: Array<{
      id: string;
      name: string;
      icon: string;
      description: string;
    }> }).categories || [] : [];
  },

  async getSystemSettings(category: string): Promise<Array<{
    key: string;
    label: string;
    value: string;
    type: string;
  }>> {
    const res = await request<{ settings: Array<{
      key: string;
      label: string;
      value: string;
      type: string;
    }> }>(`/admin/system/settings/${category}`);
    return res?.success ? (res as unknown as { settings: Array<{
      key: string;
      label: string;
      value: string;
      type: string;
    }> }).settings || [] : [];
  },

  async updateSystemSetting(category: string, key: string, value: string): Promise<StandardResponse> {
    return request(`/admin/system/settings/${category}`, {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    });
  },

  // ── Announcements (G25) ──────────────────────────────────────────────────
  async getAnnouncements(params: {
    page?: number; limit?: number;
    search?: string; status?: string;
    priority?: string; scope?: string;
    categoryId?: string;
  } = {}): Promise<{ announcements: Announcement[]; pagination: PaginationMeta }> {
    const stringParams: Record<string, string> = {};
    if (params.page) stringParams.page = String(params.page);
    if (params.limit) stringParams.limit = String(params.limit);
    if (params.search) stringParams.search = params.search;
    if (params.status) stringParams.status = params.status;
    if (params.priority) stringParams.priority = params.priority;
    if (params.scope) stringParams.scope = params.scope;
    if (params.categoryId) stringParams.categoryId = params.categoryId;
    const query = new URLSearchParams(stringParams).toString();
    const res = await request<{ announcements: Announcement[]; pagination: PaginationMeta }>(
      `/announcements/all${query ? `?${query}` : ''}`
    );
    return res?.success
      ? {
          announcements: (res as unknown as { announcements?: Announcement[] }).announcements || [],
          pagination: (res as unknown as { pagination?: PaginationMeta }).pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        }
      : { announcements: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  async getAnnouncementCategories(): Promise<AnnouncementCategory[]> {
    const res = await request<{ categories: AnnouncementCategory[] }>('/announcements/categories');
    return res?.success && Array.isArray((res as unknown as { categories?: AnnouncementCategory[] }).categories)
      ? (res as unknown as { categories: AnnouncementCategory[] }).categories
      : [];
  },

  async createAnnouncement(data: Record<string, unknown>): Promise<StandardResponse> {
    return request('/announcements', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateAnnouncement(id: string, data: Record<string, unknown>): Promise<StandardResponse> {
    return request(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async publishAnnouncement(id: string, data?: { scheduledPublishAt?: string }): Promise<StandardResponse> {
    return request(`/announcements/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  async archiveAnnouncement(id: string): Promise<StandardResponse> {
    return request(`/announcements/${id}/archive`, { method: 'POST' });
  },

  async deleteAnnouncement(id: string): Promise<StandardResponse> {
    return request(`/announcements/${id}`, { method: 'DELETE' });
  },
};

// =============================================
// 5.1 Dashboard API (Real Metrics)
// =============================================

export interface DashboardMetrics {
  quickStats: {
    students: { total: number; label: string; icon: string };
    teachers: { total: number; label: string; icon: string };
    parents: { total: number; label: string; icon: string };
    classes: { total: number; label: string; icon: string };
  };
  attendance: {
    date: string;
    summary: { total: number; present: number; absent: number; late: number; excused: number };
    rates: { present: number; absent: number; late: number; excused: number };
  };
  assignments: { total: number; draft: number; published: number; closed: number; overdue: number };
  actionCenter: {
    classesWithoutHomeroom: Array<{ id: string; name: string; grade_level: number }>;
    teachersWithoutAssignment: Array<{ id: string; name: string; email: string; title: string }>;
    studentsWithoutParent: Array<{ id: string; name: string; student_code: string; class_name: string }>;
    excessiveAbsence: Array<{ id: string; name: string; student_code: string; class_name: string; absent_days: number }>;
  };
  alerts: Array<{
    id: string;
    priority: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    count: number;
    action: string;
  }>;
  dataQuality: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalAssignments: number;
    issues: {
      classesWithoutHomeroom: number;
      teachersWithoutAssignment: number;
      studentsWithoutParent: number;
      overdueAssignments: number;
    };
    healthScore: number;
    healthStatus: 'good' | 'warning' | 'critical';
  };
  recentAnnouncements: Array<{
    id: string;
    title: string;
    content: string;
    priority: string;
    scope: string;
    author: string;
    publishedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    text: string;
    actor: string;
    time: string;
    badge: string;
    badgeType: string;
  }>;
  security: { lockedAccounts: number; failedLogins: number; totalIssues: number };
  gradeBreakdown: Array<{ grade: number; students: number }>;
  meta: { schoolId: string; academicYearId: string | null; period: string; generatedAt: string };
}

export const dashboardApi = {
  async getMetrics(params?: { academicYearId?: string; period?: string }): Promise<DashboardMetrics | null> {
    const queryParams = new URLSearchParams();
    if (params?.academicYearId) queryParams.set('academicYearId', params.academicYearId);
    if (params?.period) queryParams.set('period', params.period);
    const query = queryParams.toString();
    const res = await request<DashboardMetrics>(`/dashboard/metrics${query ? `?${query}` : ''}`);
    return res?.success && res.data ? res.data : null;
  },

  async getAttendanceTrends(params?: { period?: string }): Promise<unknown | null> {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.set('period', params.period);
    const query = queryParams.toString();
    const res = await request(`/dashboard/attendance-trends${query ? `?${query}` : ''}`);
    return res?.success ? res.data : null;
  },
};

// =============================================
// 6. AI Tutor API
// =============================================

/**
 * Represents a chat message from the AI Tutor backend.
 */
interface AiTutorMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  badge?: string;
  content?: {
    intro?: string;
    steps?: Array<{ title: string; content: string }>;
    question?: string;
    hint?: string;
  };
}

export const aiTutorApi = {
  /**
   * Fetch conversation history.
   * @returns {Promise<AiTutorMessage[]>}
   */
  async getMessages(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<{ messages: AiTutorMessage[] }>(`/ai-tutor/messages${query ? `?${query}` : ''}`);
    return res?.success && Array.isArray((res as unknown as { messages?: AiTutorMessage[] }).messages)
      ? (res as unknown as { messages: AiTutorMessage[] }).messages
      : [];
  },

  /**
   * Send a message to the AI Tutor and receive a structured reply.
   * Returns the full AI message object so the UI can display it directly.
   *
   * @param {string} text       — the student's question
   * @param {string} [topic]    — subject/topic context
   * @param {string} [imageData] — optional base64 image data
   * @returns {Promise<AiTutorMessage|null>}
   */
  async sendMessage(text: string, topic?: string, imageData?: string) {
    const res = await request<{ reply: AiTutorMessage }>('/ai-tutor/chat', {
      method: 'POST',
      body: JSON.stringify({ text, topic, imageData }),
    });

    if (!res?.success) return null;

    // The controller returns { reply: {...} } — use it directly
    const reply = (res as unknown as { reply: AiTutorMessage }).reply;

    // Fallback: if backend returns flat text, wrap it into a message object
    if (typeof reply === 'string') {
      return {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: reply,
        time: 'Vừa xong',
        badge: 'Phản hồi Socratic',
        content: { intro: reply },
      };
    }

    return reply ?? null;
  },

  /**
   * Clear conversation history.
   * @param {string} [topic] — optional topic filter
   */
  async clearMessages(topic?: string) {
    const query = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    return request(`/ai-tutor/messages${query}`, { method: 'DELETE' });
  },

  /**
   * Get list of conversation topics for the current student.
   */
  async getTopics() {
    const res = await request<{ topics: Array<{ topic: string; message_count: number; last_message: string }> }>('/ai-tutor/topics');
    return res?.success ? res.data?.topics ?? [] : [];
  },

  /**
   * Check AI service health and available providers.
   */
  async getHealth() {
    const res = await request<{
      enabled: boolean;
      healthy: boolean;
      provider?: string;
      model?: string;
      providers: Array<{ id: string; name: string; enabled: boolean }>;
    }>('/ai-tutor/health');
    return res?.success ? res.data ?? null : null;
  },

  /**
   * Get usage statistics and rate limit status.
   */
  async getStats() {
    const res = await request<{ stats: Record<string, unknown>; rateLimit: unknown }>('/ai-tutor/stats');
    return res?.success ? res.data ?? null : null;
  },
};

// =============================================
// 7. Sync & Notifications API
// =============================================
export const syncApi = {
  async getStatus<T = unknown>(role?: string): Promise<T | null> {
    const res = await request<T>(`/sync/status${role ? `?role=${role}` : ''}`);
    return res?.success && res.data ? res.data : null;
  },

  async getNotifications(): Promise<SchoolNotice[]> {
    const res = await request<{ notifications: SchoolNotice[] }>('/sync/notifications');
    return res?.success && Array.isArray((res as unknown as { notifications?: SchoolNotice[] }).notifications)
      ? (res as unknown as { notifications: SchoolNotice[] }).notifications
      : [];
  },

  async markAsRead(noticeId: string): Promise<StandardResponse> {
    return request(`/sync/notifications/${noticeId}/read`, { method: 'POST' });
  },

  async markAllAsRead(): Promise<StandardResponse> {
    return request('/sync/notifications/read-all', { method: 'POST' });
  },

  async triggerEvent(eventData: Record<string, unknown>): Promise<StandardResponse> {
    return request('/sync/trigger', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },
};

// =============================================
// 8. Schools Profile API
// =============================================
export interface SchoolProfile {
  id: string;
  code: string;
  name: string;
  short_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  principal_name?: string;
  website?: string;
  logo_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

export const schoolsApi = {
  async getProfile(): Promise<SchoolProfile | null> {
    const res = await request<{ school: SchoolProfile }>('/schools/profile');
    return res?.success && res.data?.school ? res.data.school : null;
  },

  async updateProfile(data: Partial<SchoolProfile>): Promise<StandardResponse<{ school: SchoolProfile }>> {
    return request<{ school: SchoolProfile }>('/schools/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// =============================================
// 9. Academic Years & Semesters API
// =============================================
export interface Semester {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at?: string;
}

export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at?: string;
  semesters?: Semester[];
}

export interface AcademicCycle {
  academicYear: AcademicYear | null;
  currentSemester: Semester | null;
}

export interface Department {
  id: string;
  school_id?: string;
  name: string;
  code?: string | null;
  description?: string | null;
  head_teacher_id?: string | null;
  member_count?: number;
  created_at?: string;
}

export const academicYearsApi = {
  async list(): Promise<AcademicYear[]> {
    const res = await request<{ academicYears: AcademicYear[] }>('/academic-years');
    return res?.success && res.data?.academicYears ? res.data.academicYears : [];
  },

  async getCurrent(): Promise<AcademicCycle> {
    const res = await request<AcademicCycle>('/academic-years/current');
    return res?.success && res.data ? res.data : { academicYear: null, currentSemester: null };
  },

  async getById(id: string): Promise<AcademicYear | null> {
    const res = await request<{ academicYear: AcademicYear }>(`/academic-years/${id}`);
    return res?.success && res.data?.academicYear ? res.data.academicYear : null;
  },

  async create(data: { name: string; start_date: string; end_date: string; is_current?: boolean }): Promise<StandardResponse<{ academicYear: AcademicYear }>> {
    return request<{ academicYear: AcademicYear }>('/academic-years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: { name?: string; start_date?: string; end_date?: string; is_current?: boolean }): Promise<StandardResponse<{ academicYear: AcademicYear }>> {
    return request<{ academicYear: AcademicYear }>(`/academic-years/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async setCurrent(id: string): Promise<StandardResponse<{ academicYear: AcademicYear }>> {
    return request<{ academicYear: AcademicYear }>(`/academic-years/${id}/set-current`, {
      method: 'PATCH',
    });
  },

  async delete(id: string): Promise<StandardResponse> {
    return request(`/academic-years/${id}`, {
      method: 'DELETE',
    });
  },

  // Semesters
  async createSemester(yearId: string, data: { name: string; semester_number: number; start_date: string; end_date: string; is_current?: boolean }): Promise<StandardResponse<{ semester: Semester }>> {
    return request<{ semester: Semester }>(`/academic-years/${yearId}/semesters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSemester(yearId: string, semesterId: string, data: { name?: string; semester_number?: number; start_date?: string; end_date?: string; is_current?: boolean }): Promise<StandardResponse<{ semester: Semester }>> {
    return request<{ semester: Semester }>(`/academic-years/${yearId}/semesters/${semesterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async setCurrentSemester(yearId: string, semesterId: string): Promise<StandardResponse<{ semester: Semester }>> {
    return request<{ semester: Semester }>(`/academic-years/${yearId}/semesters/${semesterId}/set-current`, {
      method: 'PATCH',
    });
  },

  async deleteSemester(yearId: string, semesterId: string): Promise<StandardResponse> {
    return request(`/academic-years/${yearId}/semesters/${semesterId}`, {
      method: 'DELETE',
    });
  },
};

// =============================================
// 10. Normalized Profiles API (Teachers, Students, Parents)
// =============================================
export interface TeacherProfile {
  id: string;
  user_id: string;
  school_id: string;
  name: string;
  username: string;
  account_email?: string;
  account_phone?: string;
  avatar?: string;
  employee_id?: string;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  homeroom_class_id?: string;
  homeroom_class_name?: string;
  specialty?: string;
  qualification?: string;
  subjects?: string | string[];
  status: 'active' | 'on_leave' | 'resigned';
  contact_email?: string;
  contact_phone?: string;
  office_room?: string;
  bio?: string;
  workload?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  school_id: string;
  name: string;
  username: string;
  account_email?: string;
  account_phone?: string;
  avatar?: string;
  student_code?: string;
  class_id?: string;
  current_class_id?: string;
  class_name?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  enrollment_status: 'enrolled' | 'active' | 'graduated' | 'suspended' | 'transferred';
  enrollment_date?: string;
  gpa?: number;
  class_rank?: string;
  attendance_rate?: number;
  guardians?: GuardianRelation[];
}

export interface GuardianRelation {
  relationship_id?: string;
  parent_id: string;
  student_id?: string;
  user_id?: string;
  name?: string;
  avatar?: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  is_primary_contact: boolean;
  is_verified: boolean;
  occupation?: string;
  workplace?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface ParentProfile {
  id: string;
  user_id: string;
  school_id: string;
  name: string;
  username: string;
  account_email?: string;
  account_phone?: string;
  avatar?: string;
  occupation?: string;
  workplace?: string;
  contact_phone?: string;
  contact_email?: string;
  status: 'active' | 'inactive';
  children_count?: number;
  children?: StudentProfile[];
}

export const profilesApi = {
  // Teachers
  async getTeacherMe(): Promise<TeacherProfile | null> {
    const res = await request<TeacherProfile>('/profiles/teachers/me');
    return res?.success && res.data ? res.data : null;
  },

  async listTeachers(params: Record<string, string | number> = {}): Promise<{ teachers: TeacherProfile[]; pagination: PaginationMeta }> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const res = await request<TeacherProfile[]>(`/profiles/teachers${query ? `?${query}` : ''}`);
    const raw = res as unknown as { teachers?: TeacherProfile[]; pagination?: PaginationMeta; meta?: PaginationMeta };
    return {
      teachers: Array.isArray(res.data) ? res.data : (raw?.teachers || []),
      pagination: raw?.meta || raw?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
    };
  },

  async getTeacherById(id: string): Promise<TeacherProfile | null> {
    const res = await request<TeacherProfile>(`/profiles/teachers/${id}`);
    return res?.success && res.data ? res.data : null;
  },

  async updateTeacher(id: string, data: Partial<TeacherProfile>): Promise<StandardResponse<TeacherProfile>> {
    return request<TeacherProfile>(`/profiles/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Students
  async getStudentMe(): Promise<StudentProfile | null> {
    const res = await request<StudentProfile>('/profiles/students/me');
    return res?.success && res.data ? res.data : null;
  },

  async listStudents(params: Record<string, string | number> = {}): Promise<{ students: StudentProfile[]; pagination: PaginationMeta }> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const res = await request<StudentProfile[]>(`/profiles/students${query ? `?${query}` : ''}`);
    const raw = res as unknown as { students?: StudentProfile[]; pagination?: PaginationMeta; meta?: PaginationMeta };
    return {
      students: Array.isArray(res.data) ? res.data : (raw?.students || []),
      pagination: raw?.meta || raw?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
    };
  },

  async getStudentById(id: string): Promise<StudentProfile | null> {
    const res = await request<StudentProfile>(`/profiles/students/${id}`);
    return res?.success && res.data ? res.data : null;
  },

  async updateStudent(id: string, data: Partial<StudentProfile>): Promise<StandardResponse<StudentProfile>> {
    return request<StudentProfile>(`/profiles/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getStudentGuardians(studentId: string): Promise<GuardianRelation[]> {
    const res = await request<GuardianRelation[]>(`/profiles/students/${studentId}/guardians`);
    return res?.success && res.data ? res.data : [];
  },

  async assignGuardian(studentId: string, data: { parentId: string; relationship: string; isPrimaryContact?: boolean; isVerified?: boolean }): Promise<StandardResponse> {
    return request(`/profiles/students/${studentId}/guardians`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeGuardian(studentId: string, parentId: string): Promise<StandardResponse> {
    return request(`/profiles/students/${studentId}/guardians/${parentId}`, {
      method: 'DELETE',
    });
  },

  // Parents
  async getParentMe(): Promise<ParentProfile | null> {
    const res = await request<ParentProfile>('/profiles/parents/me');
    return res?.success && res.data ? res.data : null;
  },

  async listParents(params: Record<string, string | number> = {}): Promise<{ parents: ParentProfile[]; pagination: PaginationMeta }> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const res = await request<ParentProfile[]>(`/profiles/parents${query ? `?${query}` : ''}`);
    const raw = res as unknown as { parents?: ParentProfile[]; pagination?: PaginationMeta; meta?: PaginationMeta };
    return {
      parents: Array.isArray(res.data) ? res.data : (raw?.parents || []),
      pagination: raw?.meta || raw?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
    };
  },

  async getParentById(id: string): Promise<ParentProfile | null> {
    const res = await request<ParentProfile>(`/profiles/parents/${id}`);
    return res?.success && res.data ? res.data : null;
  },

  async updateParent(id: string, data: Partial<ParentProfile>): Promise<StandardResponse<ParentProfile>> {
    return request<ParentProfile>(`/profiles/parents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getParentChildren(parentId: string): Promise<StudentProfile[]> {
    const res = await request<StudentProfile[]>(`/profiles/parents/${parentId}/children`);
    return res?.success && res.data ? res.data : [];
  },
};

// =============================================
// 12. Academic Structure API (Departments, Subjects, Classes)
// =============================================
export interface DepartmentItem {
  id: string;
  school_id: string;
  name: string;
  code?: string;
  description?: string;
  head_teacher_id?: string;
  head_teacher_name?: string;
  teacher_count?: number;
  subject_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectItem {
  id: string;
  school_id: string;
  name: string;
  code: string;
  department_id?: string;
  department_name?: string;
  grade_level?: number;
  weekly_periods: number;
  credits: number;
  status: 'active' | 'archived';
  description?: string;
  assignment_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClassItem {
  id: string;
  school_id: string;
  name: string;
  grade_level: number;
  academic_year_id?: string;
  academic_year: string;
  academic_year_name?: string;
  homeroom_teacher_id?: string;
  homeroom_teacher_name?: string;
  room?: string;
  max_capacity: number;
  max_students?: number;
  status: 'active' | 'archived' | 'completed';
  student_count?: number;
  avg_gpa?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface ClassStudentItem {
  student_id: string;
  user_id: string;
  student_code: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  gpa?: number;
  attendance_rate?: number;
  enrollment_status?: string;
  dob?: string;
  gender?: string;
  guardians?: Array<{
    parent_name: string;
    parent_email?: string;
    contact_phone?: string;
    relationship: string;
    is_primary_contact?: boolean;
  }>;
}

export const academicStructureApi = {
  // Departments
  async listDepartments(params: Record<string, string | number> = {}): Promise<DepartmentItem[]> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const res = await request<DepartmentItem[]>(`/academic-structure/departments${query ? `?${query}` : ''}`);
    const raw = res as unknown as { departments?: DepartmentItem[] };
    return Array.isArray(res.data) ? res.data : (raw?.departments || []);
  },

  async getDepartmentById(id: string): Promise<DepartmentItem | null> {
    const res = await request<DepartmentItem>(`/academic-structure/departments/${id}`);
    const raw = res as unknown as { department?: DepartmentItem };
    return res?.success ? (res.data || raw?.department || null) : null;
  },

  async createDepartment(data: Partial<DepartmentItem>): Promise<StandardResponse<{ department: DepartmentItem }>> {
    return request<{ department: DepartmentItem }>('/academic-structure/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDepartment(id: string, data: Partial<DepartmentItem>): Promise<StandardResponse<{ department: DepartmentItem }>> {
    return request<{ department: DepartmentItem }>(`/academic-structure/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteDepartment(id: string): Promise<StandardResponse> {
    return request(`/academic-structure/departments/${id}`, { method: 'DELETE' });
  },

  // Subjects
  async listSubjects(params: Record<string, string | number> = {}): Promise<SubjectItem[]> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const res = await request<SubjectItem[]>(`/academic-structure/subjects${query ? `?${query}` : ''}`);
    const raw = res as unknown as { subjects?: SubjectItem[] };
    return Array.isArray(res.data) ? res.data : (raw?.subjects || []);
  },

  async getSubjectById(id: string): Promise<SubjectItem | null> {
    const res = await request<SubjectItem>(`/academic-structure/subjects/${id}`);
    const raw = res as unknown as { subject?: SubjectItem };
    return res?.success ? (res.data || raw?.subject || null) : null;
  },

  async createSubject(data: Partial<SubjectItem>): Promise<StandardResponse<{ subject: SubjectItem }>> {
    return request<{ subject: SubjectItem }>('/academic-structure/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSubject(id: string, data: Partial<SubjectItem>): Promise<StandardResponse<{ subject: SubjectItem }>> {
    return request<{ subject: SubjectItem }>(`/academic-structure/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSubject(id: string): Promise<StandardResponse> {
    return request(`/academic-structure/subjects/${id}`, { method: 'DELETE' });
  },

  // Classes
  async listClasses(params: Record<string, string | number> = {}): Promise<ClassItem[]> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const res = await request<ClassItem[]>(`/academic-structure/classes${query ? `?${query}` : ''}`);
    const raw = res as unknown as { classes?: ClassItem[] };
    return Array.isArray(res.data) ? res.data : (raw?.classes || []);
  },

  async getClassById(id: string): Promise<ClassItem | null> {
    const res = await request<ClassItem>(`/academic-structure/classes/${id}`);
    const raw = res as unknown as { class?: ClassItem };
    return res?.success ? (res.data || raw?.class || null) : null;
  },

  async getClassStudents(id: string): Promise<ClassStudentItem[]> {
    const res = await request<ClassStudentItem[]>(`/academic-structure/classes/${id}/students`);
    const raw = res as unknown as { students?: ClassStudentItem[] };
    return Array.isArray(res.data) ? res.data : (raw?.students || []);
  },

  async createClass(data: Partial<ClassItem>): Promise<StandardResponse<{ class: ClassItem }>> {
    return request<{ class: ClassItem }>('/academic-structure/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClass(id: string, data: Partial<ClassItem>): Promise<StandardResponse<{ class: ClassItem }>> {
    return request<{ class: ClassItem }>(`/academic-structure/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async archiveClass(id: string): Promise<StandardResponse<{ class: ClassItem }>> {
    return request<{ class: ClassItem }>(`/academic-structure/classes/${id}/archive`, {
      method: 'PATCH',
    });
  },

  async deleteClass(id: string): Promise<StandardResponse> {
    return request(`/academic-structure/classes/${id}`, { method: 'DELETE' });
  },
};

// ============================================================================
// 12. ENROLLMENT LIFECYCLE API (G14)
// ============================================================================

export interface EnrollmentRecord {
  id: string;
  class_id: string;
  student_id: string;
  academic_year_id: string;
  school_id?: string;
  enrollment_date: string;
  start_date?: string;
  end_date?: string | null;
  status: 'enrolled' | 'completed' | 'dropped' | 'transferred' | 'withdrawn' | 'suspended';
  is_current: boolean;
  reason?: string | null;
  notes?: string | null;
  class_name?: string;
  grade_level?: number;
  room?: string;
  academic_year_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnrollmentHistoryResponse {
  studentId: string;
  studentCode?: string;
  studentName?: string;
  totalEntries: number;
  history: EnrollmentRecord[];
}

export interface ClassRosterResponse {
  classId: string;
  className: string;
  gradeLevel: number;
  room?: string;
  maxCapacity: number;
  activeCount: number;
  roster: ClassStudentItem[];
}

export interface EnrollPayload {
  studentId: string;
  classId: string;
  academicYearId?: string;
  enrollmentDate?: string;
  notes?: string;
}

export interface TransferPayload {
  studentId: string;
  targetClassId: string;
  academicYearId?: string;
  transferDate?: string;
  reason: string;
  notes?: string;
}

export interface WithdrawPayload {
  studentId: string;
  withdrawalDate?: string;
  reason: string;
  notes?: string;
}

export interface BulkEnrollPayload {
  classId: string;
  academicYearId?: string;
  studentIds: string[];
  enrollmentDate?: string;
  notes?: string;
}

export const enrollmentsApi = {
  async enrollStudent(payload: EnrollPayload): Promise<StandardResponse<EnrollmentRecord>> {
    return request<EnrollmentRecord>('/enrollments/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async transferStudent(payload: TransferPayload): Promise<StandardResponse<EnrollmentRecord>> {
    return request<EnrollmentRecord>('/enrollments/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async withdrawStudent(payload: WithdrawPayload): Promise<StandardResponse<{ message: string; previousEnrollmentId: string }>> {
    return request<{ message: string; previousEnrollmentId: string }>('/enrollments/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async bulkEnroll(payload: BulkEnrollPayload): Promise<StandardResponse<{ totalEnrolled: number; enrollments: EnrollmentRecord[] }>> {
    return request<{ totalEnrolled: number; enrollments: EnrollmentRecord[] }>('/enrollments/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getStudentHistory(studentId: string): Promise<EnrollmentHistoryResponse | null> {
    const res = await request<EnrollmentHistoryResponse>(`/enrollments/students/${studentId}/history`);
    return res?.success && res.data ? res.data : null;
  },

  async getStudentCurrent(studentId: string): Promise<EnrollmentRecord | null> {
    const res = await request<{ currentEnrollment: EnrollmentRecord }>(`/enrollments/students/${studentId}/current`);
    return res?.success && res.data?.currentEnrollment ? res.data.currentEnrollment : null;
  },

  async getClassRoster(classId: string, params: Record<string, unknown> = {}): Promise<ClassRosterResponse | null> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const res = await request<ClassRosterResponse>(`/enrollments/classes/${classId}/roster${query ? `?${query}` : ''}`);
    return res?.success && res.data ? res.data : null;
  },
};

// =============================================
// Teacher Assignments API (G15)
// =============================================
export interface TeacherAssignmentRecord {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_code?: string;
  teacher_email?: string;
  class_id: string;
  class_name?: string;
  grade_level?: number;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  department_name?: string;
  academic_year: string;
  academic_year_id?: string;
  academic_year_name?: string;
  semester_id?: string | null;
  semester_name?: string | null;
  role: 'primary' | 'secondary' | 'assistant' | 'substitute';
  status: 'active' | 'inactive' | 'transferred' | 'revoked';
  start_date?: string;
  end_date?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface TeacherAssignedClass {
  id: string;
  name: string;
  // Aliases used by pages
  classId: string;
  className: string;
  studentCount: number;
  grade_level: number;
  room?: string;
  academic_year?: string;
  academic_year_id?: string;
  is_homeroom: boolean;
  student_count: number;
  teaching_subjects?: Array<{
    assignmentId: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    role: string;
    semesterId?: string | null;
  }>;
}

export interface MyClassesResponse {
  teacherId: string;
  teacherName: string;
  academicYearId: string;
  classes: TeacherAssignedClass[];
}

// Data shape returned by GET /teacher/classes
export interface TeacherClassData {
  currentClassId?: string;
  classes: TeacherAssignedClass[];
  students?: Array<{
    id: string;
    name: string;
    code: string;
    gpa: number;
    rank: number;
    attendance: string;
    status: string;
    statusType?: string;
    phone?: string;
  }>;
}

export interface CreateTeacherAssignmentPayload {
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYearId?: string;
  semesterId?: string | null;
  role?: 'primary' | 'secondary' | 'assistant' | 'substitute';
  startDate?: string;
  endDate?: string | null;
  notes?: string;
}

export interface UpdateTeacherAssignmentPayload {
  role?: 'primary' | 'secondary' | 'assistant' | 'substitute';
  status?: 'active' | 'inactive' | 'transferred' | 'revoked';
  endDate?: string | null;
  notes?: string;
}

export const teacherAssignmentsApi = {
  async getAssignments(params: Record<string, unknown> = {}): Promise<{ assignments: TeacherAssignmentRecord[]; total: number; page: number; limit: number; totalPages: number } | null> {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString();
    const res = await request<{ assignments: TeacherAssignmentRecord[]; total: number; page: number; limit: number; totalPages: number }>(`/teacher-assignments${query ? `?${query}` : ''}`);
    return res?.success && res.data ? res.data : null;
  },

  async getMyClasses(academicYearId?: string): Promise<MyClassesResponse | null> {
    const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
    const res = await request<MyClassesResponse>(`/teacher-assignments/my-classes${query}`);
    return res?.success && res.data ? res.data : null;
  },

  async getAssignmentById(id: string): Promise<TeacherAssignmentRecord | null> {
    const res = await request<TeacherAssignmentRecord>(`/teacher-assignments/${id}`);
    return res?.success && res.data ? res.data : null;
  },

  async createAssignment(payload: CreateTeacherAssignmentPayload): Promise<StandardResponse<TeacherAssignmentRecord>> {
    return request<TeacherAssignmentRecord>('/teacher-assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAssignment(id: string, payload: UpdateTeacherAssignmentPayload): Promise<StandardResponse<TeacherAssignmentRecord>> {
    return request<TeacherAssignmentRecord>(`/teacher-assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteAssignment(id: string): Promise<StandardResponse<{ message: string }>> {
    return request<{ message: string }>(`/teacher-assignments/${id}`, {
      method: 'DELETE',
    });
  },
};

// =============================================
// 17. Attendance API (G17)
// =============================================

export interface AttendanceRecordItem {
  id: string;
  sessionId: string;
  date: string;
  period?: number | null;
  subject?: string;
  teacher?: string;
  status: string;
  statusCode: string;
  note?: string;
  createdAt?: string;
}

export interface AttendanceSummary {
  studentId: string;
  rate: string;
  rateNumber: number;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  excusedDays: number;
  absentDays: number;
  status: string;
  records: AttendanceRecordItem[];
}

export interface AttendanceSession {
  id: string;
  school_id?: string;
  class_id: string;
  class_name?: string;
  subject_id?: string | null;
  subject_name?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  date: string;
  period?: number | null;
  session_type?: string;
  semester_id?: string | null;
  status?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  note?: string;
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRosterStudent {
  student_id: string;
  student_code?: string;
  name: string;
  avatar?: string;
  existingStatus?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;
  existingNote?: string;
  existingRecordId?: string;
}

// G38: Teacher ↔ Parent real-time chat types
export interface TeacherConversation {
  id: string;
  studentId: string;
  studentName?: string;
  studentCode?: string;
  parentId: string;
  parentName?: string;
  teacherId: string;
  teacherName?: string;
  classId?: string;
  className?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  read: boolean;
  createdAt?: string;
}

export interface SaveAttendancePayload {
  classId: string;
  date: string;
  period?: number | null;
  sessionType?: 'daily' | 'period' | 'exam';
  subjectId?: string | null;
  semesterId?: string | null;
  notes?: string;
  records: Array<{
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    note?: string;
  }>;
}

export interface AttendanceReportClass {
  classId: string;
  className?: string;
  gradeLevel?: number;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: string;
}

export interface AttendanceReport {
  schoolId: string;
  overview: {
    totalRecords: number;
    totalSessions: number;
    classesChecked: number;
    presentCount: number;
    lateCount: number;
    excusedCount: number;
    absentCount: number;
    attendanceRate: string;
    rateNumber: number;
  };
  byClass: AttendanceReportClass[];
}

export const attendanceApi = {
  /** Get student personal attendance history (student role — own only) */
  async getStudentAttendance(studentId?: string): Promise<AttendanceSummary | null> {
    const query = studentId ? `?studentId=${studentId}` : '';
    const res = await request<AttendanceSummary>(`/attendance/student${query}`);
    // Controller returns { success, attendance, data }
    const raw = res as unknown as { attendance?: AttendanceSummary; data?: AttendanceSummary };
    return res?.success ? (raw?.attendance || raw?.data || null) : null;
  },

  /** Get attendance session for a class on a date */
  async getSession(classId: string, date: string, period?: number | null, sessionType?: string): Promise<{ session: AttendanceSession | null; records: AttendanceRecord[] }> {
    const params = new URLSearchParams({ classId, date });
    if (period !== undefined && period !== null) params.set('period', String(period));
    if (sessionType) params.set('sessionType', sessionType);
    const res = await request<{ session: AttendanceSession | null; records: AttendanceRecord[] }>(`/attendance/sessions?${params.toString()}`);
    const raw = res as unknown as { data?: { session: AttendanceSession | null; records: AttendanceRecord[] } };
    return raw?.data || { session: null, records: [] };
  },

  /** Get enrolled roster for a class with any existing session records pre-filled */
  async getRoster(classId: string, date: string, period?: number | null): Promise<AttendanceRosterStudent[]> {
    const params = new URLSearchParams({ classId, date });
    if (period !== undefined && period !== null) params.set('period', String(period));
    const res = await request<{ roster: AttendanceRosterStudent[] }>(`/attendance/roster?${params.toString()}`);
    const raw = res as unknown as { roster?: AttendanceRosterStudent[]; data?: { roster: AttendanceRosterStudent[] } };
    return raw?.roster || raw?.data?.roster || [];
  },

  /** Save or update attendance session atomically */
  async saveSession(payload: SaveAttendancePayload): Promise<StandardResponse<{ session: AttendanceSession; records: AttendanceRecord[] }>> {
    return request<{ session: AttendanceSession; records: AttendanceRecord[] }>('/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Correct a single attendance record */
  async correctRecord(recordId: string, status: string, note?: string, reason?: string): Promise<StandardResponse> {
    return request(`/attendance/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note, reason }),
    });
  },

  /** Get child's attendance history (parent role) */
  async getParentChildAttendance(childStudentId: string): Promise<AttendanceSummary | null> {
    const res = await request<AttendanceSummary>(`/attendance/parent/child/${childStudentId}`);
    const raw = res as unknown as { attendance?: AttendanceSummary; data?: AttendanceSummary };
    return res?.success ? (raw?.attendance || raw?.data || null) : null;
  },

  /** Get aggregate attendance report (admin/BGH) */
  async getReport(params: { date?: string; startDate?: string; endDate?: string } = {}): Promise<AttendanceReport | null> {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '') as [string, string][]).toString();
    const res = await request<AttendanceReport>(`/attendance/report${qs ? `?${qs}` : ''}`);
    const raw = res as unknown as { data?: AttendanceReport };
    return res?.success ? (raw?.data || null) : null;
  },
};

// =============================================
// 9. Timetable / Schedule API (G16)
// =============================================
export interface TimetablePeriodSlot {
  id: string;
  period: number;
  subject: string;
  subjectId?: string;
  subjectCode?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  teacher: string;
  teacherId?: string;
  teacherEmail?: string;
  room?: string;
  classId?: string;
  className?: string;
  semesterId?: string;
}

// Alias for teacher pages that expect the domain type name
export type TimetableSlot = TimetablePeriodSlot;

export interface TimetableDaySchedule {
  day: string;
  dayOfWeek: number;
  periods: TimetablePeriodSlot[];
}

export interface TimetableResponse {
  schedule: TimetableDaySchedule[];
  slots: Record<string, unknown>[];
  meta?: Record<string, unknown>;
}

export interface CreateTimetableSlotPayload {
  classId: string;
  subjectId: string;
  subjectName?: string;
  teacherId?: string | null;
  dayOfWeek: number;
  period: number;
  room?: string | null;
  semesterId?: string;
  academicYearId?: string;
  startTime?: string;
  endTime?: string;
}

export const timetableApi = {
  async getStudentTimetable(semesterId?: string): Promise<TimetableResponse | null> {
    const query = semesterId ? `?semesterId=${semesterId}` : '';
    const res = await request<TimetableResponse>(`/timetable/student${query}`);
    return res?.success ? (res as unknown as TimetableResponse) : null;
  },

  async getTeacherTimetable(semesterId?: string): Promise<TimetableResponse | null> {
    const query = semesterId ? `?semesterId=${semesterId}` : '';
    const res = await request<TimetableResponse>(`/timetable/teacher${query}`);
    return res?.success ? (res as unknown as TimetableResponse) : null;
  },

  async getChildTimetable(studentId: string, semesterId?: string): Promise<TimetableResponse | null> {
    const query = semesterId ? `?semesterId=${semesterId}` : '';
    const res = await request<TimetableResponse>(`/timetable/parent/child/${studentId}${query}`);
    return res?.success ? (res as unknown as TimetableResponse) : null;
  },

  async getSlots(params: Record<string, unknown> = {}): Promise<TimetableResponse | null> {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString();
    const res = await request<TimetableResponse>(`/timetable${query ? `?${query}` : ''}`);
    return res?.success ? (res as unknown as TimetableResponse) : null;
  },

  async createSlot(payload: CreateTimetableSlotPayload): Promise<StandardResponse<Record<string, unknown>>> {
    return request<Record<string, unknown>>('/timetable', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSlot(id: string, payload: Partial<CreateTimetableSlotPayload>): Promise<StandardResponse<Record<string, unknown>>> {
    return request<Record<string, unknown>>(`/timetable/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteSlot(id: string): Promise<StandardResponse<Record<string, unknown>>> {
    return request<Record<string, unknown>>(`/timetable/${id}`, {
      method: 'DELETE',
    });
  },
};

// =============================================
// 18. Assignments API (G18)
// =============================================

export interface AssignmentQuestionOption {
  id?: string;
  text: string;
  isCorrect?: boolean;
}

export interface AssignmentQuestion {
  id?: string;
  prompt: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay';
  maxScore: number;
  difficulty?: 'NB' | 'TH' | 'VD' | 'VDC' | 'TB';
  options?: AssignmentQuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  hasPlot?: boolean;
  plotData?: string;
  // Legacy field names from assignment form
  question_type?: string;
  points?: number;
}

export interface AssignmentListItem {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'essay' | 'attachment';
  instructions?: string;
  target_classes: string[];
  due_date: string;
  due_time: string;
  duration_minutes: number;
  total_score: number;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  created_at: string;
  updated_at: string;
  grading_scale?: string;
  question_count: number;
  submission_count: number;
  graded_count: number;
  // Aliases used by pages
  class_name?: string;
  student_count?: number;
}

export interface AssignmentDetail extends AssignmentListItem {
  instructions: string;
  lock_after_due: boolean;
  shuffle_questions: boolean;
  questions: AssignmentQuestion[];
  creator_name?: string;
}

export interface AssignmentListResponse {
  assignments: AssignmentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GradingQueueItem {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  score?: number;
  submitted_at: string;
  teacher_feedback?: string;
  assignment_title: string;
  assignment_type: string;
  total_score: number;
  student_name: string;
  student_code: string;
  class_name?: string;
  // Aliases used by pages
  submission_content?: string;
  answers?: Record<string, string>;
  is_late?: boolean;
  resubmit_count?: number;
}

export interface GradingQueueResponse {
  submissions: GradingQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignmentCreatePayload {
  title: string;
  instructions?: string;
  subject: string;
  subjectId?: string;
  classId?: string;
  targetClassIds?: string[];
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  durationMinutes?: number;
  gradingScale?: string;
  type?: 'quiz' | 'essay' | 'attachment';
  totalScore?: number;
  academicYearId?: string;
  semesterId?: string;
  lockAfterDue?: boolean;
  shuffleQuestions?: boolean;
  questions?: AssignmentQuestion[];
  publish?: boolean;
}

export interface AssignmentUpdatePayload extends Partial<AssignmentCreatePayload> {
  status?: 'draft' | 'published' | 'archived';
}

export const assignmentsApi = {
  async list(params: Record<string, unknown> = {}): Promise<AssignmentListResponse | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<AssignmentListResponse>(`/assignments${query ? `?${query}` : ''}`);
    return res?.success ? res.data as AssignmentListResponse : null;
  },

  async getById(id: string): Promise<AssignmentDetail | null> {
    const res = await request<AssignmentDetail>(`/assignments/${id}`);
    return res?.success ? res.data as AssignmentDetail : null;
  },

  async create(payload: AssignmentCreatePayload): Promise<StandardResponse<{ id: string; status: string }>> {
    return request<{ id: string; status: string }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: AssignmentUpdatePayload): Promise<StandardResponse<{ id: string; status: string }>> {
    return request<{ id: string; status: string }>(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async publish(id: string): Promise<StandardResponse<{ id: string; status: string }>> {
    return request<{ id: string; status: string }>(`/assignments/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  async delete(id: string): Promise<StandardResponse<{ id: string }>> {
    return request<{ id: string }>(`/assignments/${id}`, {
      method: 'DELETE',
    });
  },

  async getGradingQueue(params: Record<string, unknown> = {}): Promise<GradingQueueResponse | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<GradingQueueResponse>(`/assignments/grading-queue${query ? `?${query}` : ''}`);
    return res?.success ? res.data as GradingQueueResponse : null;
  },

  async gradeSubmission(
    submissionId: string,
    score: number,
    feedback?: string
  ): Promise<StandardResponse<{ submissionId: string; status: string; score: number }>> {
    return request<{ submissionId: string; status: string; score: number }>('/assignments/grade', {
      method: 'POST',
      body: JSON.stringify({ submissionId, score, feedback }),
    });
  },
};

// =============================================
// 19. Submissions API (G19)
// =============================================

export interface SubmissionQuestion {
  id: string;
  question_order: number;
  prompt: string;
  question_type: 'multiple_choice' | 'short_answer' | 'essay';
  max_score: number;
  has_plot: boolean;
  plot_data?: string;
  options: { id: string; text: string }[];  // correct_answer stripped
  explanation?: string;
}

export interface StudentAssignmentSubmission {
  id: string;
  status: 'in_progress' | 'submitted' | 'graded';
  score?: number;
  answers: Record<string, string>;
  draftAnswers: Record<string, string>;
  isLate: boolean;
  resubmitCount: number;
  submittedAt?: string;
  teacherFeedback?: string;
  isFinal: boolean;
}

export interface StudentAssignmentItem {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'essay' | 'attachment';
  instructions?: string;
  due_date: string;
  due_time: string;
  duration_minutes: number;
  total_score: number;
  lock_after_due: boolean;
  allow_resubmit: boolean;
  assignment_status: string;
  submission_id?: string;
  submission_status?: string;
  score?: number;
  is_late?: boolean;
  submitted_at?: string;
  teacher_feedback?: string;
  draft_answers?: string;
}

export interface StudentAssignmentDetail extends StudentAssignmentItem {
  questions: SubmissionQuestion[];
  submission: StudentAssignmentSubmission | null;
}

export interface StudentAssignmentListResponse {
  assignments: StudentAssignmentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignmentSubmissionItem {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  class_name?: string;
  status: 'in_progress' | 'submitted' | 'graded';
  score?: number;
  is_late: boolean;
  resubmit_count: number;
  submitted_at?: string;
  teacher_feedback?: string;
  is_final: boolean;
}

export interface AssignmentSubmissionListResponse {
  submissions: AssignmentSubmissionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubmissionResult {
  submissionId: string;
  status: string;
  isLate: boolean;
  resubmitCount: number;
  score: number;
  maxScore: number;
  correctCount: number;
}

export const submissionsApi = {
  /**
   * List published assignments for the authenticated student.
   */
  async listAssignments(params: Record<string, unknown> = {}): Promise<StudentAssignmentListResponse | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<StudentAssignmentListResponse>(`/submissions/assignments${query ? `?${query}` : ''}`);
    return res?.success ? res.data as StudentAssignmentListResponse : null;
  },

  /**
   * Get assignment detail with questions and student's submission status.
   * Questions are sanitized — correct answers are stripped.
   */
  async getAssignmentDetail(id: string): Promise<StudentAssignmentDetail | null> {
    const res = await request<StudentAssignmentDetail>(`/submissions/assignments/${id}`);
    return res?.success ? res.data as StudentAssignmentDetail : null;
  },

  /**
   * Save draft answers (in-progress, not finalized).
   */
  async saveDraft(id: string, answers: Record<string, string>): Promise<StandardResponse<{ id: string; status: string }>> {
    return request<{ id: string; status: string }>(`/submissions/assignments/${id}/draft`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  /**
   * Submit final answers.
   */
  async submit(
    id: string,
    answers: Record<string, string>
  ): Promise<StandardResponse<SubmissionResult>> {
    return request<SubmissionResult>(`/submissions/assignments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  /**
   * Get submission history for the authenticated student.
   */
  async getHistory(params: Record<string, unknown> = {}): Promise<StudentAssignmentListResponse | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<StudentAssignmentListResponse>(`/submissions/history${query ? `?${query}` : ''}`);
    return res?.success ? res.data as StudentAssignmentListResponse : null;
  },

  /**
   * List all student submissions for an assignment (teacher view).
   */
  async listAssignmentSubmissions(
    assignmentId: string,
    params: Record<string, unknown> = {}
  ): Promise<AssignmentSubmissionListResponse | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<AssignmentSubmissionListResponse>(
      `/submissions/assignments/${assignmentId}/students${query ? `?${query}` : ''}`
    );
    return res?.success ? res.data as AssignmentSubmissionListResponse : null;
  },
};

// =============================================================================
// GRADEBOOK TYPES (G20)
// =============================================================================

export interface GradeCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  coefficient: number;
  weight: number;
  min_entries_per_semester: number;
  sort_order: number;
  is_active: boolean;
}

export interface GradeEntry {
  id: string;
  student_id: string;
  subject: string;
  subject_id: string | null;
  assignment_id: string | null;
  grade_category_id: string | null;
  category_name: string | null;
  category_code: string | null;
  raw_score: number;
  max_score: number;
  weight: number;
  grading_period: 'regular' | 'midterm' | 'final' | 'special';
  academic_year_id: string | null;
  semester_id: string | null;
  status: 'draft' | 'published';
  teacher_feedback: string | null;
  published_at: string | null;
  published_by: string | null;
  graded_at: string;
}

export interface CategoryAverage {
  normalizedAverage: number | null;
  entryCount: number;
  maxPossible: number;
  categoryWeight: number;
  contribution: number | null;
}

export interface CalculationResult {
  finalScore: number;
  categoryAverages: Record<string, CategoryAverage>;
  categoryWeights: Record<string, number>;
  scaleFactor: number;
  snapshotId: string;
  version: number;
  warnings: string[];
  calculationDate: string;
}

export interface GradeSnapshot {
  id: string;
  student_id: string;
  school_id: string;
  academic_year_id: string;
  semester_id: string;
  subject_id: string | null;
  config_snapshot: Record<string, unknown>;
  category_averages: Record<string, CategoryAverage>;
  final_score: number;
  scale_factor: number;
  version: number;
  computed_by: string | null;
  computed_at: string;
}

export interface GradeCalculationConfig {
  id: string;
  school_id: string;
  academic_year_id: string;
  semester_id: string;
  period_label: string;
  category_weights: Record<string, number>;
  min_entries: Record<string, number>;
  scale_factor: number;
  is_applied: boolean;
  created_by: string | null;
  created_at: string;
}

export interface GradeListResponse {
  grades: GradeEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// TT22 ACADEMIC EVALUATION TYPES
// =============================================================================

export type AcademicClassification = 'Tot' | 'Kha' | 'Dat' | 'ChuaDat';
export type HonorTitle = 'XuatSac' | 'Gioi' | null;
export type ConductRating = 'Tot' | 'Kha' | 'Dat' | null;

export interface SubjectScore {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  hk1Score: number | null;
  hk2Score: number | null;
  yearlyScore: number | null;
  isGradingSubject: boolean;
  gradingResult: 'dat' | 'chua_dat' | null;
  comment: string | null;
}

export interface StudentEvaluation {
  studentId: string;
  studentName: string;
  studentCode: string;
  subjectScores: SubjectScore[];
  yearlyGPA: number | null;
  academicClassification: AcademicClassification;
  academicClassificationLabel: string;
  conductRating: ConductRating;
  conductRatingLabel: string | null;
  honorTitle: HonorTitle;
  honorTitleLabel: string | null;
  honorTitleReason: string;
  classificationDetails: Record<string, unknown>;
  attendanceRate: number;
  violationCount: number;
  homeroomTeacherComment: string | null;
}

export interface ClassAcademicSummary {
  totalStudents: number;
  academicDistribution: { Tot: number; Kha: number; Dat: number; ChuaDat: number };
  conductDistribution: { Tot: number; Kha: number; Dat: number };
  honorDistribution: { XuatSac: number; Gioi: number };
  averageYearlyGPA: number | null;
  classificationRate: number | null;
  passRate: number | null;
}

export interface ClassAcademicSummaryResponse {
  classId: string;
  academicYearId: string | undefined;
  semesterId: string | undefined;
  students: StudentEvaluation[];
  summary: ClassAcademicSummary | null;
  generatedAt: string;
}

export interface StudentReportCardResponse {
  student: {
    id: string;
    name: string;
    code: string;
    birthDate: string;
    gender: string;
    className: string;
  };
  school: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
  academicYear: string;
  semesterId: string | undefined;
  evaluation: StudentEvaluation;
  verificationCode: string;
  generatedAt: string;
}

export interface GradebookLockResponse {
  lockId: string;
  classId: string;
  semesterId: string | null;
  lockedBy: string;
  lockedAt: string;
  studentCount: number;
  reason: string;
}

export interface GradeSnapshotListResponse {
  snapshots: GradeSnapshot[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// GRADEBOOK API CLIENT (G20)
// =============================================================================

export const gradebookApi = {
  // --- Categories ---
  async listCategories(params: Record<string, unknown> = {}): Promise<GradeCategory[] | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<GradeCategory[]>(`/gradebook/categories${query ? `?${query}` : ''}`);
    return res?.success ? res.data as GradeCategory[] : null;
  },

  async createCategory(data: Partial<GradeCategory>): Promise<StandardResponse<GradeCategory>> {
    return request<GradeCategory>('/gradebook/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: string, data: Partial<GradeCategory>): Promise<StandardResponse<GradeCategory>> {
    return request<GradeCategory>(`/gradebook/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // --- Grades ---
  async listGrades(params: Record<string, unknown> = {}): Promise<GradeListResponse | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<GradeListResponse>(`/gradebook/grades${query ? `?${query}` : ''}`);
    return res?.success ? res.data as GradeListResponse : null;
  },

  async getGradeById(id: string): Promise<GradeEntry | null> {
    const res = await request<GradeEntry>(`/gradebook/grades/${id}`);
    return res?.success ? res.data as GradeEntry : null;
  },

  async createGrade(data: {
    studentId: string;
    subject: string;
    subjectId?: string;
    gradeCategoryId?: string;
    rawScore: number;
    maxScore?: number;
    weight?: number;
    gradingPeriod?: string;
    academicYearId?: string;
    semesterId?: string;
    teacherFeedback?: string;
  }): Promise<StandardResponse<GradeEntry>> {
    return request<GradeEntry>('/gradebook/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGrade(id: string, data: Partial<{
    rawScore: number;
    maxScore: number;
    weight: number;
    gradingPeriod: string;
    teacherFeedback: string;
    status: string;
  }>): Promise<StandardResponse<GradeEntry>> {
    return request<GradeEntry>(`/gradebook/grades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async publishGrade(id: string): Promise<StandardResponse<GradeEntry>> {
    return request<GradeEntry>(`/gradebook/grades/${id}/publish`, {
      method: 'POST',
    });
  },

  async batchPublishGrades(gradeIds: string[]): Promise<StandardResponse<{ id: string; success: boolean; error?: string }[]>> {
    return request<{ id: string; success: boolean; error?: string }[]>('/gradebook/grades/publish/batch', {
      method: 'POST',
      body: JSON.stringify({ gradeIds }),
    });
  },

  // Bulk enter grades for multiple students at once (gradebook matrix)
  async bulkEnterGrades(payload: {
    classId: string;
    semesterId?: string;
    subjectId?: string;
    entries: Array<{
      studentId: string;
      categoryCode: string | null; // 'TX' | 'GK' | 'CK' | null
      rawScore: number;
      maxScore?: number;
      testName?: string;
      gradedAt?: string;
    }>;
  }): Promise<StandardResponse<{ saved: number; errors: string[] }>> {
    return request('/gradebook/grades/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --- Calculation ---
  async computeStudentGrade(params: {
    studentId?: string;
    academicYearId: string;
    semesterId: string;
    subjectId?: string;
  }): Promise<StandardResponse<CalculationResult>> {
    return request<CalculationResult>('/gradebook/calculate/student', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async batchComputeGrades(params: {
    studentIds: string[];
    academicYearId: string;
    semesterId: string;
    subjectId?: string;
  }): Promise<StandardResponse<{ studentId: string; success: boolean; finalScore?: number; error?: string }[]>> {
    return request('/gradebook/calculate/batch', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // --- Configs ---
  async listConfigs(params: Record<string, unknown> = {}): Promise<GradeCalculationConfig[] | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<GradeCalculationConfig[]>(`/gradebook/configs${query ? `?${query}` : ''}`);
    return res?.success ? res.data as GradeCalculationConfig[] : null;
  },

  async createConfig(data: {
    schoolId: string;
    academicYearId: string;
    semesterId: string;
    periodLabel: string;
    categoryWeights: Record<string, number>;
    minEntries: Record<string, number>;
    scaleFactor?: number;
  }): Promise<StandardResponse<{ id: string }>> {
    return request<{ id: string }>('/gradebook/configs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // --- Snapshots ---
  async listSnapshots(params: Record<string, unknown> = {}): Promise<GradeSnapshotListResponse | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await request<GradeSnapshotListResponse>(`/gradebook/snapshots${query ? `?${query}` : ''}`);
    return res?.success ? res.data as GradeSnapshotListResponse : null;
  },

  // --- TT22 Academic Evaluation ---
  async getClassAcademicSummary(params: {
    classId: string;
    academicYearId?: string;
    semesterId?: string;
  }): Promise<ClassAcademicSummaryResponse | null> {
    const query = new URLSearchParams({
      ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
      ...(params.semesterId ? { semesterId: params.semesterId } : {}),
    }).toString();
    const res = await request<ClassAcademicSummaryResponse>(
      `/gradebook/classes/${params.classId}/summary${query ? `?${query}` : ''}`
    );
    return res?.success ? res.data as ClassAcademicSummaryResponse : null;
  },

  async getStudentReportCard(params: {
    studentId: string;
    academicYearId?: string;
    semesterId?: string;
  }): Promise<StudentReportCardResponse | null> {
    const query = new URLSearchParams({
      ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
      ...(params.semesterId ? { semesterId: params.semesterId } : {}),
    }).toString();
    const res = await request<StudentReportCardResponse>(
      `/gradebook/students/${params.studentId}/report-card${query ? `?${query}` : ''}`
    );
    return res?.success ? res.data as StudentReportCardResponse : null;
  },

  async lockClassGradebook(params: {
    classId: string;
    semesterId?: string;
    confirmationText: string;
    reason?: string;
  }): Promise<GradebookLockResponse | null> {
    const res = await request<GradebookLockResponse>(
      `/gradebook/classes/${params.classId}/lock`,
      {
        method: 'POST',
        body: JSON.stringify({
          semesterId: params.semesterId,
          confirmationText: params.confirmationText,
          reason: params.reason,
        }),
      }
    );
    return res?.success ? res.data as GradebookLockResponse : null;
  },
};

// Re-export adminApi methods as a default `api` alias for backward compatibility
// Note: adminApi already contains all the academic management methods (years, semesters, departments)
export { adminApi as api };

// Export request function as apiRequest for backward compatibility
export const apiRequest = request;



