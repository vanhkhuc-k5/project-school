// =============================================================================
// Logbook Service — Business Logic Layer
// Implements: Digital Class Logbook, Conduct Evaluation, Discipline Records
// =============================================================================
import * as repo from './logbook.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { VIOLATION_LABELS, CONDUCT_LABELS } from './logbook.schema.js';

/**
 * Logbook Service
 * Business logic for homeroom teacher operations
 */
export const logbookService = {
  // ─────────────────────────────────────────────────────────────────────────
  // LOGBOOK ENTRIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new logbook entry
   */
  async createEntry({ data, schoolId, teacherId }) {
    if (!data.class_id) throw AppError.badRequest('Thiếu class_id');
    if (!data.lesson_title) throw AppError.badRequest('Thiếu tên bài học');
    if (!data.date) throw AppError.badRequest('Thiếu ngày dạy');

    // Calculate rating from score if not provided
    let rating = data.rating;
    if (!rating && data.score !== undefined) {
      rating = calculateRating(data.score);
    }

    return repo.logbookRepo.create({
      ...data,
      schoolId,
      teacherId,
      rating,
      absent_student_ids: data.absent_student_ids || [],
    });
  },

  /**
   * List logbook entries with filters
   */
  async listEntries({ schoolId, classId, teacherId, academicYear, semester, dateFrom, dateTo, status, page, limit }) {
    return repo.logbookRepo.list({
      schoolId,
      classId,
      teacherId,
      academicYear,
      semester,
      dateFrom,
      dateTo,
      status,
      page,
      limit,
    });
  },

  /**
   * Get single logbook entry
   */
  async getEntry(id) {
    const entry = await repo.logbookRepo.findById(id);
    if (!entry) throw AppError.notFound('Không tìm thấy sổ đầu bài');
    return entry;
  },

  /**
   * Update logbook entry
   */
  async updateEntry(id, data) {
    // Recalculate rating if score changed
    if (data.score !== undefined) {
      data.rating = calculateRating(data.score);
    }

    return repo.logbookRepo.update(id, data);
  },

  /**
   * Sign logbook entry
   */
  async signEntry(id, { teacherId, signature }) {
    const entry = await repo.logbookRepo.findById(id);
    if (!entry) throw AppError.notFound('Không tìm thấy sổ đầu bài');

    // Only the teacher who created the entry can sign it
    if (entry.teacher_id !== teacherId) {
      throw AppError.forbidden('Chỉ giáo viên ghi sổ mới được ký');
    }

    return repo.logbookRepo.sign(id, teacherId, signature);
  },

  /**
   * Submit logbook entry for review
   */
  async submitEntry(id, teacherId) {
    const entry = await repo.logbookRepo.findById(id);
    if (!entry) throw AppError.notFound('Không tìm thấy sổ đầu bài');
    if (entry.teacher_id !== teacherId) {
      throw AppError.forbidden('Không có quyền nộp sổ này');
    }

    return repo.logbookRepo.update(id, { status: 'submitted' });
  },

  /**
   * Get weekly summary for a class
   */
  async getWeeklySummary(classId, weekStartDate, weekEndDate) {
    const summary = await repo.logbookRepo.getWeeklySummary(classId, weekStartDate, weekEndDate);
    return summary.map(day => ({
      date: day.date,
      entries: parseInt(day.entries),
      submitted: parseInt(day.submitted),
      approved: parseInt(day.approved),
      ratings: {
        tot: parseInt(day.tot_count || 0),
        kha: parseInt(day.kha_count || 0),
        trung_binh: parseInt(day.trung_binh_count || 0),
        kem: parseInt(day.kem_count || 0),
      },
    }));
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONDUCT EVALUATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get or create conduct evaluation for a student
   */
  async getOrCreateEvaluation({ studentId, classId, academicYear, semester, evaluationType = 'semester' }) {
    const existing = await repo.conductRepo.findByStudentClass(studentId, classId, academicYear, semester, evaluationType);
    if (existing) return existing;

    // Return empty evaluation structure for new students
    return {
      student_id: studentId,
      class_id: classId,
      academic_year: academicYear,
      semester,
      evaluation_type: evaluationType,
      conduct_grade: null,
      teacher_comment: null,
      ai_suggested_comment: null,
    };
  },

  /**
   * List conduct evaluations
   */
  async listEvaluations({ schoolId, classId, studentId, academicYear, semester, evaluationType, page, limit }) {
    return repo.conductRepo.list({
      schoolId,
      classId,
      studentId,
      academicYear,
      semester,
      evaluationType,
      page,
      limit,
    });
  },

  /**
   * Update conduct evaluation
   */
  async updateEvaluation(id, { data, teacherId }) {
    const evaluation = await repo.conductRepo.findById(id);
    if (!evaluation) throw AppError.notFound('Không tìm thấy đánh giá');

    return repo.conductRepo.update(id, {
      ...data,
      updated_by: teacherId,
    });
  },

  /**
   * Batch update conduct evaluations for a class
   */
  async batchUpdateEvaluations({ evaluations, schoolId, teacherId, academicYear, semester }) {
    const results = [];

    for (const evalData of evaluations) {
      const result = await repo.conductRepo.upsert({
        student_id: evalData.student_id,
        class_id: evalData.class_id,
        academic_year: academicYear,
        semester,
        conduct_grade: evalData.conduct_grade,
        teacher_comment: evalData.teacher_comment,
        evaluation_type: 'semester',
        schoolId,
        teacherId,
      });
      results.push(result);
    }

    return results;
  },

  /**
   * Get all students for a class with their conduct evaluations
   */
  async getClassConductSummary(classId, academicYear, semester) {
    const { evaluations } = await repo.conductRepo.list({
      classId,
      academicYear,
      semester,
      limit: 1000,
    });

    // Group by student
    const studentEvals = {};
    evaluations.forEach(ev => {
      studentEvals[ev.student_id] = {
        student_id: ev.student_id,
        student_name: ev.student_name,
        student_code: ev.student_code,
        conduct_grade: ev.conduct_grade,
        teacher_comment: ev.teacher_comment,
        ai_suggested_comment: ev.ai_suggested_comment,
      };
    });

    // Count by grade
    const gradeCounts = {
      tot: evaluations.filter(e => e.conduct_grade === 'tot').length,
      kha: evaluations.filter(e => e.conduct_grade === 'kha').length,
      dat: evaluations.filter(e => e.conduct_grade === 'dat').length,
      chua_dat: evaluations.filter(e => e.conduct_grade === 'chua_dat').length,
    };

    return {
      students: Object.values(studentEvals),
      summary: gradeCounts,
      total: evaluations.length,
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DISCIPLINE RECORDS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create discipline record
   */
  async createDisciplineRecord({ data, schoolId, reportedBy }) {
    if (!data.student_id) throw AppError.badRequest('Thiếu student_id');
    if (!data.violation_type) throw AppError.badRequest('Thiếu loại vi phạm');

    return repo.disciplineRepo.create({
      ...data,
      schoolId,
      reportedBy,
    });
  },

  /**
   * List discipline records
   */
  async listDisciplineRecords({ schoolId, classId, groupId, studentId, dateFrom, dateTo, violationType, status, page, limit }) {
    return repo.disciplineRepo.list({
      schoolId,
      classId,
      groupId,
      studentId,
      dateFrom,
      dateTo,
      violationType,
      status,
      page,
      limit,
    });
  },

  /**
   * Update discipline record
   */
  async updateDisciplineRecord(id, data) {
    return repo.disciplineRepo.update(id, data);
  },

  /**
   * Get group discipline summary (for class monitor)
   */
  async getGroupDisciplineSummary(classId, dateFrom, dateTo) {
    const groups = await repo.disciplineRepo.getGroupSummary(classId, dateFrom, dateTo);

    return groups.map(g => ({
      group_id: g.group_id,
      group_name: g.group_name,
      violation_count: parseInt(g.violation_count || 0),
      total_points: parseInt(g.total_points || 0),
      students_involved: parseInt(g.students_involved || 0),
    }));
  },

  /**
   * Get violation labels
   */
  getViolationLabels() {
    return VIOLATION_LABELS;
  },

  /**
   * Get conduct labels
   */
  getConductLabels() {
    return CONDUCT_LABELS;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SEATING ARRANGEMENTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Save seating arrangement
   */
  async saveSeatingArrangement({ data, schoolId }) {
    return repo.seatingRepo.save({
      ...data,
      schoolId,
    });
  },

  /**
   * Get seating arrangement
   */
  async getSeatingArrangement(classId, academicYear, semester = 0) {
    const seating = await repo.seatingRepo.findByClass(classId, academicYear, semester);
    if (!seating) {
      return {
        rows: 4,
        cols: 5,
        seating_data: {},
        description: null,
      };
    }
    return {
      ...seating,
      seating_data: typeof seating.seating_data === 'string' 
        ? JSON.parse(seating.seating_data) 
        : seating.seating_data,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function calculateRating(score) {
  if (score === null || score === undefined) return null;
  if (score >= 9) return 'tot';
  if (score >= 7) return 'kha';
  if (score >= 5) return 'trung_binh';
  return 'kem';
}

/**
 * Generate AI report card comment
 * This is a template-based generator. In production, this could call an AI API.
 */
export function generateAIReportCardComment({ studentName, gpa, attendanceRate, previousConduct, conductGrade }) {
  const student = studentName || 'em';
  const gpaStr = gpa ? gpa.toFixed(1) : 'trung bình';
  const attendanceStr = attendanceRate ? `${attendanceRate.toFixed(0)}%` : 'đạt yêu cầu';

  const comments = {
    tot: [
      `Năm học ${new Date().getFullYear()}, ${student} là một học sinh xuất sắc của lớp. ${student} có kết quả học tập rất tốt với điểm trung bình ${gpaStr}, tỷ lệ chuyên cần ${attendanceStr}. ${student} luôn ngoan ngoãn, có ý thức chấp hành tốt nội quy nhà trường, được thầy cô và bạn bè yêu mến. ${student} là tấm gương sáng cho các bạn trong lớp học tập.`,
      `Kính gửi quý phụ huynh, ${student} đã có một năm học rất thành công. Với sự nỗ lực không ngừng, ${student} đạt kết quả học tập xuất sắc (ĐTB: ${gpaStr}), ý thức kỷ luật tốt, tỷ lệ chuyên cần ${attendanceStr}. Thầy cô很高兴 được đồng hành cùng ${student} trong năm học tới.`,
    ],
    kha: [
      `Trong năm học ${new Date().getFullYear()}, ${student} là học sinh khá của lớp. ${student} có kết quả học tập khá tốt với điểm trung bình ${gpaStr}, có ý thức chấp hành nội quy nhà trường, tỷ lệ chuyên cần ${attendanceStr}. ${student} cần phát huy thêm để đạt kết quả cao hơn trong năm học tới.`,
      `Kính gửi quý phụ huynh, ${student} đã có những tiến bộ đáng ghi nhận trong năm học vừa qua. ĐTB: ${gpaStr}, tỷ lệ chuyên cần ${attendanceStr}. Thầy cô mong ${student} tiếp tục duy trì và phát huy những điểm mạnh, khắc phục những hạn chế để đạt kết quả tốt hơn.`,
    ],
    dat: [
      `${student} đã hoàn thành các yêu cầu của chương trình học trong năm học ${new Date().getFullYear()}. ĐTB: ${gpaStr}, tỷ lệ chuyên cần ${attendanceStr}. ${student} cần nỗ lực hơn nữa để cải thiện kết quả học tập và ý thức kỷ luật trong năm học tới.`,
      `Kính gửi quý phụ huynh, ${student} cần phấn đấu nhiều hơn trong năm học tới. Thầy cô ghi nhận những nỗ lực của ${student} nhưng kết quả học tập (ĐTB: ${gpaStr}) và ý thức chấp hành nội quy vẫn cần được cải thiện. Rất mong quý phụ huynh cùng nhà trường theo dõi sát sao việc học tập của ${student}.`,
    ],
    chua_dat: [
      `Năm học ${new Date().getFullYear()}, ${student} chưa đạt yêu cầu về học tập (ĐTB: ${gpaStr}) và ý thức kỷ luật. ${student} cần được sự quan tâm sát sao từ gia đình và nhà trường để cải thiện tình hình học tập. Thầy cô mong quý phụ huynh phối hợp cùng nhà trường giúp đỡ ${student} tiến bộ.`,
      `Kính gửi quý phụ huynh, thầy cô rất lo lắng về kết quả học tập của ${student} trong năm vừa qua. ĐTB: ${gpaStr}, tỷ lệ chuyên cần thấp. Đây là giai đoạn quan trọng cần sự chung sức của gia đình và nhà trường để giúp ${student} vượt qua khó khăn. Rất mong quý phụ huynh liên hệ thầy cô chủ nhiệm để cùng đồng hành.`,
    ],
  };

  const gradeComments = comments[conductGrade] || comments.dat;
  return gradeComments[Math.floor(Math.random() * gradeComments.length)];
}
