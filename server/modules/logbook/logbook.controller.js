// =============================================================================
// Logbook Controller — HTTP Handlers
// Implements: Digital Class Logbook, Conduct Evaluation, Discipline Records
// =============================================================================
import * as service from './logbook.service.js';
import { AppError } from '../../shared/errors/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildResponse(data, meta = {}) {
  return { success: true, data, meta };
}

function extractUser(req) {
  return {
    userId: req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id || 'sch_bacau',
    role: req.user?.role,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGBOOK ENTRIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/logbook/entries — List logbook entries
 */
export async function listLogbookEntries(req, res, next) {
  try {
    const { schoolId } = extractUser(req);
    const { class_id, teacher_id, academic_year, semester, date_from, date_to, status, page, limit } = req.query;

    const result = await service.listEntries({
      schoolId,
      classId: class_id,
      teacherId: teacher_id,
      academicYear: academic_year,
      semester: semester ? parseInt(semester) : undefined,
      dateFrom: date_from,
      dateTo: date_to,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json(buildResponse(result.entries, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      total: result.total,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logbook/entries/:id — Get single logbook entry
 */
export async function getLogbookEntry(req, res, next) {
  try {
    const entry = await service.getEntry(req.params.id);
    res.json(buildResponse(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/logbook/entries — Create logbook entry
 */
export async function createLogbookEntry(req, res, next) {
  try {
    const { userId, schoolId } = extractUser(req);
    const entry = await service.createEntry({
      data: req.body,
      schoolId,
      teacherId: userId,
    });
    res.status(201).json(buildResponse(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/logbook/entries/:id — Update logbook entry
 */
export async function updateLogbookEntry(req, res, next) {
  try {
    const entry = await service.updateEntry(req.params.id, req.body);
    res.json(buildResponse(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/logbook/entries/:id/sign — Sign logbook entry
 */
export async function signLogbookEntry(req, res, next) {
  try {
    const { userId } = extractUser(req);
    const signature = `Signed by ${req.user?.name || 'Teacher'} at ${new Date().toISOString()}`;
    const entry = await service.signEntry(req.params.id, {
      teacherId: userId,
      signature,
    });
    res.json(buildResponse(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/logbook/entries/:id/submit — Submit logbook entry for review
 */
export async function submitLogbookEntry(req, res, next) {
  try {
    const { userId } = extractUser(req);
    const entry = await service.submitEntry(req.params.id, userId);
    res.json(buildResponse(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logbook/class/:classId/weekly-summary — Get weekly logbook summary
 */
export async function getWeeklySummary(req, res, next) {
  try {
    const { classId } = req.params;
    const { week_start, week_end } = req.query;

    if (!week_start || !week_end) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu week_start hoặc week_end',
      });
    }

    const summary = await service.getWeeklySummary(classId, week_start, week_end);
    res.json(buildResponse(summary));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONDUCT EVALUATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/logbook/conduct — List conduct evaluations
 */
export async function listConductEvaluations(req, res, next) {
  try {
    const { schoolId } = extractUser(req);
    const { class_id, student_id, academic_year, semester, evaluation_type, page, limit } = req.query;

    const result = await service.listEvaluations({
      schoolId,
      classId: class_id,
      studentId: student_id,
      academicYear: academic_year,
      semester: semester !== undefined ? parseInt(semester) : undefined,
      evaluationType: evaluation_type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json(buildResponse(result.evaluations, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      total: result.total,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logbook/conduct/class/:classId/summary — Get class conduct summary
 */
export async function getClassConductSummary(req, res, next) {
  try {
    const { classId } = req.params;
    const { academic_year, semester } = req.query;

    const summary = await service.getClassConductSummary(
      classId,
      academic_year || '2025-2026',
      semester ? parseInt(semester) : 1
    );

    res.json(buildResponse(summary));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/logbook/conduct/:id — Update conduct evaluation
 */
export async function updateConductEvaluation(req, res, next) {
  try {
    const { userId } = extractUser(req);
    const evaluation = await service.updateEvaluation(req.params.id, {
      data: req.body,
      teacherId: userId,
    });
    res.json(buildResponse(evaluation));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/logbook/conduct/batch — Batch update conduct evaluations
 */
export async function batchUpdateConductEvaluations(req, res, next) {
  try {
    const { userId, schoolId } = extractUser(req);
    const { evaluations, class_id, academic_year, semester } = req.body;

    if (!Array.isArray(evaluations)) {
      return res.status(400).json({
        success: false,
        error: 'evaluations phải là một mảng',
      });
    }

    // Enrich with class_id, academic_year, semester
    const enrichedEvals = evaluations.map(e => ({
      ...e,
      class_id: e.class_id || class_id,
      academic_year: e.academic_year || academic_year,
      semester: e.semester !== undefined ? e.semester : (semester !== undefined ? parseInt(semester) : 1),
    }));

    const results = await service.batchUpdateEvaluations({
      evaluations: enrichedEvals,
      schoolId,
      teacherId: userId,
      academicYear: academic_year || '2025-2026',
      semester: semester ? parseInt(semester) : 1,
    });

    res.json(buildResponse(results, { count: results.length }));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCIPLINE RECORDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/logbook/discipline — List discipline records
 */
export async function listDisciplineRecords(req, res, next) {
  try {
    const { schoolId } = extractUser(req);
    const { class_id, group_id, student_id, date_from, date_to, violation_type, status, page, limit } = req.query;

    const result = await service.listDisciplineRecords({
      schoolId,
      classId: class_id,
      groupId: group_id,
      studentId: student_id,
      dateFrom: date_from,
      dateTo: date_to,
      violationType: violation_type,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json(buildResponse(result.records, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      total: result.total,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/logbook/discipline — Create discipline record
 */
export async function createDisciplineRecord(req, res, next) {
  try {
    const { userId, schoolId } = extractUser(req);
    const record = await service.createDisciplineRecord({
      data: req.body,
      schoolId,
      reportedBy: userId,
    });
    res.status(201).json(buildResponse(record));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/logbook/discipline/:id — Update discipline record
 */
export async function updateDisciplineRecord(req, res, next) {
  try {
    const record = await service.updateDisciplineRecord(req.params.id, req.body);
    res.json(buildResponse(record));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logbook/discipline/class/:classId/group-summary — Get group discipline summary
 */
export async function getGroupDisciplineSummary(req, res, next) {
  try {
    const { classId } = req.params;
    const { date_from, date_to } = req.query;

    const summary = await service.getGroupDisciplineSummary(
      classId,
      date_from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to || new Date().toISOString().split('T')[0]
    );

    res.json(buildResponse(summary));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEATING ARRANGEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/logbook/seating/:classId — Get seating arrangement
 */
export async function getSeatingArrangement(req, res, next) {
  try {
    const { classId } = req.params;
    const { academic_year, semester } = req.query;

    const seating = await service.getSeatingArrangement(
      classId,
      academic_year || '2025-2026',
      semester ? parseInt(semester) : 0
    );

    res.json(buildResponse(seating));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/logbook/seating — Save seating arrangement
 */
export async function saveSeatingArrangement(req, res, next) {
  try {
    const { schoolId } = extractUser(req);
    const seating = await service.saveSeatingArrangement({
      data: req.body,
      schoolId,
    });
    res.json(buildResponse(seating));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/logbook/reference/labels — Get rating and label references
 */
export async function getReferenceLabels(req, res, next) {
  try {
    const labels = {
      ratings: service.getViolationLabels ? service.getViolationLabels() : {},
      conduct: service.getConductLabels(),
    };
    res.json(buildResponse(labels));
  } catch (err) {
    next(err);
  }
}
