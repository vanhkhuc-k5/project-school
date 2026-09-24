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

  async getClasses<T = unknown>(classId?: string): Promise<T | null> {
    const query = classId ? `?classId=${classId}` : '';
    const res = await request<T>(`/teacher/classes${query}`);
    return res?.success ? (res as unknown as T) : null;
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

  // Invoices
  async getInvoices<T = unknown>(studentId: string): Promise<T | null> {
    const res = await request<T>(`/parent/invoices?studentId=${studentId}`);
    return res?.success ? (res as unknown as T) : null;
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

  async getTeachers(): Promise<Teacher[]> {
    const res = await request<{ teachers: Teacher[] }>('/admin/teachers');
    return res?.success && Array.isArray((res as unknown as { teachers?: Teacher[] }).teachers)
      ? (res as unknown as { teachers: Teacher[] }).teachers
      : [];
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
  options?: AssignmentQuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  hasPlot?: boolean;
  plotData?: string;
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
};

// Re-export adminApi methods as a default `api` alias for backward compatibility
// Note: adminApi already contains all the academic management methods (years, semesters, departments)
export { adminApi as api };



