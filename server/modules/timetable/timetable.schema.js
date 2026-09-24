import { z } from 'zod';

export const createTimetableSlotSchema = z
  .object({
    classId: z.string().optional(),
    class_id: z.string().optional(),
    subjectId: z.string().optional(),
    subject_id: z.string().optional(),
    subjectName: z.string().optional(),
    subject_name: z.string().optional(),
    teacherId: z.string().nullable().optional(),
    teacher_id: z.string().nullable().optional(),
    dayOfWeek: z.coerce.number().int().optional(),
    day_of_week: z.coerce.number().int().optional(),
    period: z.coerce.number().int().min(1, 'Tiết học phải từ 1 đến 10').max(10, 'Tiết học phải từ 1 đến 10'),
    room: z.string().max(64).nullable().optional(),
    semesterId: z.string().optional(),
    semester_id: z.string().optional(),
    academicYearId: z.string().optional(),
    academic_year_id: z.string().optional(),
    startTime: z.string().optional(),
    start_time: z.string().optional(),
    endTime: z.string().optional(),
    end_time: z.string().optional(),
  })
  .transform((data) => ({
    classId: data.classId || data.class_id,
    subjectId: data.subjectId || data.subject_id,
    subjectName: data.subjectName || data.subject_name,
    teacherId: data.teacherId !== undefined ? data.teacherId : data.teacher_id,
    dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : data.day_of_week,
    period: data.period,
    room: data.room,
    semesterId: data.semesterId || data.semester_id,
    academicYearId: data.academicYearId || data.academic_year_id,
    startTime: data.startTime || data.start_time,
    endTime: data.endTime || data.end_time,
  }))
  .refine((d) => Boolean(d.classId), { message: 'class_id hoặc classId là bắt buộc' })
  .refine((d) => Boolean(d.subjectId), { message: 'subject_id hoặc subjectId là bắt buộc' })
  .refine((d) => d.dayOfWeek !== undefined && d.dayOfWeek >= 2 && d.dayOfWeek <= 8, {
    message: 'day_of_week phải từ Thứ Hai (2) đến Chủ Nhật (8)',
  });

export const updateTimetableSlotSchema = z
  .object({
    classId: z.string().optional(),
    class_id: z.string().optional(),
    subjectId: z.string().optional(),
    subject_id: z.string().optional(),
    subjectName: z.string().optional(),
    subject_name: z.string().optional(),
    teacherId: z.string().nullable().optional(),
    teacher_id: z.string().nullable().optional(),
    dayOfWeek: z.coerce.number().int().optional(),
    day_of_week: z.coerce.number().int().optional(),
    period: z.coerce.number().int().min(1).max(10).optional(),
    room: z.string().max(64).nullable().optional(),
    semesterId: z.string().optional(),
    semester_id: z.string().optional(),
    academicYearId: z.string().optional(),
    academic_year_id: z.string().optional(),
    startTime: z.string().optional(),
    start_time: z.string().optional(),
    endTime: z.string().optional(),
    end_time: z.string().optional(),
  })
  .transform((data) => ({
    classId: data.classId || data.class_id,
    subjectId: data.subjectId || data.subject_id,
    subjectName: data.subjectName || data.subject_name,
    teacherId: data.teacherId !== undefined ? data.teacherId : data.teacher_id,
    dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : data.day_of_week,
    period: data.period,
    room: data.room,
    semesterId: data.semesterId || data.semester_id,
    academicYearId: data.academicYearId || data.academic_year_id,
    startTime: data.startTime || data.start_time,
    endTime: data.endTime || data.end_time,
  }));

export const queryTimetableSchema = z
  .object({
    classId: z.string().optional(),
    class_id: z.string().optional(),
    teacherId: z.string().optional(),
    teacher_id: z.string().optional(),
    studentId: z.string().optional(),
    student_id: z.string().optional(),
    subjectId: z.string().optional(),
    subject_id: z.string().optional(),
    semesterId: z.string().optional(),
    semester_id: z.string().optional(),
    academicYearId: z.string().optional(),
    academic_year_id: z.string().optional(),
    dayOfWeek: z.coerce.number().int().optional(),
    day_of_week: z.coerce.number().int().optional(),
    period: z.coerce.number().int().optional(),
  })
  .transform((data) => ({
    classId: data.classId || data.class_id,
    teacherId: data.teacherId || data.teacher_id,
    studentId: data.studentId || data.student_id,
    subjectId: data.subjectId || data.subject_id,
    semesterId: data.semesterId || data.semester_id,
    academicYearId: data.academicYearId || data.academic_year_id,
    dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : data.day_of_week,
    period: data.period,
  }));
