/**
 * EduPortal Core Domain Types
 */

export type UserRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'principal'
  | 'vice_principal'
  | 'department_head';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  name: string;
  code?: string | null;
  phone?: string | null;
  avatar?: string | null;
  schoolId?: string;
  mustChangePassword?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  userId: string;
  classId: string;
  parentId?: string | null;
  gpa: number;
  classRank?: string;
  attendanceRate: number;
  name?: string;
  code?: string;
  className?: string;
  avatar?: string | null;
}

export interface Teacher {
  id: string;
  userId: string;
  department?: string;
  homeroomClassId?: string;
  name?: string;
  code?: string;
  phone?: string;
  email?: string;
}

export interface Parent {
  id: string;
  userId: string;
  phone?: string;
  children?: Student[];
}

export interface ClassRoom {
  id: string;
  name: string;
  gradeLevel: number;
  academicYear: string;
  homeroomTeacherId?: string | null;
  maxStudents?: number;
  studentCount?: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'essay' | 'attachment';
  instructions?: string;
  targetClasses: string[];
  dueDate: string;
  dueTime: string;
  durationMinutes?: number;
  gradingScale?: string;
  lockAfterDue?: boolean;
  shuffleQuestions?: boolean;
  createdBy: string;
  createdAt?: string;
  questionCount?: number;
  submissionStatus?: 'in_progress' | 'submitted' | 'graded' | 'not_submitted';
}

export interface AssignmentQuestion {
  id: string;
  assignmentId: string;
  questionOrder: number;
  prompt: string;
  points: number;
  hasPlot?: boolean;
  plotData?: string | null;
  options: string[];
  explanation?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  score?: number | null;
  studentAnswers?: Record<string, string>;
  submittedAt?: string;
  teacherFeedback?: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  subject: string;
  testName: string;
  score: number;
  maxScore: number;
  coefficient: number;
  semester: number;
  teacherName: string;
  comment?: string;
  gradedAt: string;
}

export interface StudentCompetency {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  proficiencyPercent: number;
  isStrength: boolean;
  hint?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
  recordedBy: string;
  createdAt?: string;
}

export interface TimetableSlot {
  id: string;
  classId: string;
  subjectId?: string | null;
  subjectName: string;
  teacherId?: string | null;
  dayOfWeek: number; // 2 (Thứ 2) -> 7 (Thứ 7)
  period: number; // 1 -> 10
  room?: string | null;
  academicYear: string;
}

export interface TuitionItem {
  name: string;
  amount: number;
}

export interface TuitionInvoice {
  id: string;
  studentId: string;
  period: string;
  totalAmount: number;
  dueDate: string;
  status: 'unpaid' | 'paid' | 'overdue';
  paidAt?: string | null;
  items: TuitionItem[];
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferMemo: string;
}

export interface SchoolNotice {
  id: string;
  title: string;
  content: string;
  category: 'teacher' | 'school' | 'system';
  tag?: string | null;
  tagType?: 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  sender: string;
  canConfirm: boolean;
  createdAt: string;
  isRead?: boolean;
  isConfirmed?: boolean;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  parentId: string;
  startDate: string;
  endDate: string;
  reason: string;
  reasonType?: string;
  status: 'pending' | 'approved' | 'rejected';
  emergencyPhone?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string | null;
  actorName: string;
  role: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
  badge?: string | null;
  badgeType?: 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  ipAddress?: string | null;
  createdAt: string;
}

export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type AnnouncementScope = 'all' | 'student' | 'teacher' | 'parent' | 'admin' | 'class';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  scope: AnnouncementScope;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  schoolId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  scheduledPublishAt?: string | null;
  archivedAt?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  targetRoles?: string[] | null;
  targetClassIds?: string[] | null;
  categoryId?: string | null;
  readCount?: number;
  isRead?: boolean;
}

export interface AnnouncementCategory {
  id: string;
  schoolId?: string | null;
  name: string;
  color: string;
  icon?: string | null;
  sortOrder?: number;
  createdAt?: string;
}
