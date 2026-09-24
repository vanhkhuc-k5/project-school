import { z } from 'zod';

export const attendanceStatusEnum = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
  'present',
  'absent',
  'late',
  'excused',
]);

export const attendanceRecordItemSchema = z.object({
  studentId: z.string().optional(),
  student_id: z.string().optional(),
  status: attendanceStatusEnum,
  note: z.string().max(500).optional().nullable(),
}).transform((data) => ({
  studentId: data.studentId || data.student_id,
  status: data.status.toUpperCase(),
  note: data.note || '',
})).refine((d) => Boolean(d.studentId), {
  message: 'studentId là bắt buộc cho từng học sinh',
});

export const takeAttendanceSessionSchema = z.object({
  classId: z.string().optional(),
  class_id: z.string().optional(),
  subjectId: z.string().optional().nullable(),
  subject_id: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  teacher_id: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD'),
  period: z.coerce.number().int().min(0).max(10).optional().nullable(),
  sessionType: z.enum(['daily', 'period', 'exam']).optional().default('daily'),
  session_type: z.enum(['daily', 'period', 'exam']).optional(),
  semesterId: z.string().optional().nullable(),
  semester_id: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  records: z.array(attendanceRecordItemSchema).min(1, 'Danh sách điểm danh không được để trống'),
}).transform((data) => ({
  classId: data.classId || data.class_id,
  subjectId: data.subjectId !== undefined ? data.subjectId : data.subject_id,
  teacherId: data.teacherId !== undefined ? data.teacherId : data.teacher_id,
  date: data.date,
  period: data.period !== undefined ? data.period : null,
  sessionType: data.sessionType || data.session_type || 'daily',
  semesterId: data.semesterId !== undefined ? data.semesterId : data.semester_id,
  notes: data.notes || '',
  records: data.records,
})).refine((d) => Boolean(d.classId), {
  message: 'classId là bắt buộc',
});

export const updateAttendanceRecordSchema = z.object({
  status: attendanceStatusEnum.optional(),
  note: z.string().max(500).optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
}).transform((data) => ({
  status: data.status ? data.status.toUpperCase() : undefined,
  note: data.note,
  reason: data.reason,
}));

export const queryAttendanceSessionSchema = z.object({
  classId: z.string().optional(),
  class_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  period: z.coerce.number().int().optional(),
  sessionType: z.string().optional(),
  session_type: z.string().optional(),
  subjectId: z.string().optional(),
  subject_id: z.string().optional(),
  teacherId: z.string().optional(),
  teacher_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).transform((data) => ({
  classId: data.classId || data.class_id,
  date: data.date,
  startDate: data.startDate || data.start_date,
  endDate: data.endDate || data.end_date,
  period: data.period,
  sessionType: data.sessionType || data.session_type,
  subjectId: data.subjectId || data.subject_id,
  teacherId: data.teacherId || data.teacher_id,
  page: data.page,
  limit: data.limit,
}));
