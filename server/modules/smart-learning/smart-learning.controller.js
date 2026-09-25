// =============================================================================
// Smart Learning Controller — HTTP Handlers
// Implements: Flashcards SM-2, Flipped Classroom, Periodic Table, Exam Parser
// =============================================================================
import * as service from './smart-learning.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildResponse(data, meta = {}) {
  return { success: true, data, meta };
}

function extractUser(req) {
  return {
    userId: req.user?.id,
    studentId: req.user?.studentId || req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id || 'sch_bacau',
    role: req.user?.role,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FLASHCARD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/smart-learning/flashcards/decks
 * List flashcard decks
 */
export async function listFlashcardDecks(req, res, next) {
  try {
    const { schoolId, studentId } = extractUser(req);
    const { subject_id, grade_level, deck_type, search, page, limit } = req.query;

    const result = await service.smartLearningService.getDecksWithStats({
      schoolId,
      studentId,
      subjectId: subject_id,
      gradeLevel: grade_level ? parseInt(grade_level) : undefined,
      deckType: deck_type,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json(buildResponse(result.decks, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      total: result.total,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/smart-learning/flashcards/decks
 * Create a new flashcard deck
 */
export async function createFlashcardDeck(req, res, next) {
  try {
    const { userId, schoolId } = extractUser(req);
    const deck = await service.smartLearningService.createDeck({
      data: req.body,
      schoolId,
      userId,
    });
    res.status(201).json(buildResponse(deck));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/smart-learning/flashcards/decks/:id
 * Get deck with cards
 */
export async function getFlashcardDeck(req, res, next) {
  try {
    const { studentId } = extractUser(req);
    const { id } = req.params;

    const deck = await service.smartLearningService.getDeck(id);
    
    // Get stats for student
    const stats = await service.smartLearningService.getDeckStats({
      studentId,
      deckId: id,
    });

    res.json(buildResponse({ ...deck, stats }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/smart-learning/flashcards/decks/:id/cards
 * Create a flashcard in a deck
 */
export async function createFlashcardCard(req, res, next) {
  try {
    const { userId, schoolId } = extractUser(req);
    const { id: deckId } = req.params;

    const card = await service.smartLearningService.createCard({
      data: { ...req.body, deck_id: deckId },
      schoolId,
      userId,
    });
    res.status(201).json(buildResponse(card));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/smart-learning/flashcards/decks/:id/study
 * Get cards for study session (due + new)
 */
export async function getStudyCards(req, res, next) {
  try {
    const { studentId } = extractUser(req);
    const { id: deckId } = req.params;
    const { limit } = req.query;

    const studyData = await service.smartLearningService.getStudyCards({
      studentId,
      deckId,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json(buildResponse(studyData));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/smart-learning/flashcards/decks/:id/stats
 * Get deck statistics for current student
 */
export async function getDeckStats(req, res, next) {
  try {
    const { studentId } = extractUser(req);
    const { id: deckId } = req.params;

    const stats = await service.smartLearningService.getDeckStats({
      studentId,
      deckId,
    });

    res.json(buildResponse(stats));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/smart-learning/flashcards/cards/:id/review
 * Review a flashcard with SM-2 quality rating
 */
export async function reviewFlashcard(req, res, next) {
  try {
    const { studentId } = extractUser(req);
    const { id: cardId } = req.params;
    const { quality, response_time_ms } = req.body;

    const result = await service.smartLearningService.reviewCard({
      studentId,
      cardId,
      quality: parseInt(quality),
      responseTimeMs: response_time_ms ? parseInt(response_time_ms) : undefined,
    });

    res.json(buildResponse(result));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIPPED CLASSROOM ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/smart-learning/flipped/:timetableId
 * Get flipped material for a timetable entry
 */
export async function getFlippedMaterial(req, res, next) {
  try {
    const { studentId } = extractUser(req);
    const { timetableId } = req.params;

    const material = await service.smartLearningService.getFlippedMaterial(timetableId);

    if (!material) {
      return res.json(buildResponse(null));
    }

    // Record student view
    await service.smartLearningService.recordMaterialView(studentId, material.id);

    res.json(buildResponse(material));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/smart-learning/flipped/materials
 * Create flipped classroom material (teacher)
 */
export async function createFlippedMaterial(req, res, next) {
  try {
    const { userId, schoolId } = extractUser(req);
    const material = await service.smartLearningService.createFlippedMaterial({
      data: req.body,
      schoolId,
      userId,
    });
    res.status(201).json(buildResponse(material));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/smart-learning/flipped/materials
 * List flipped materials
 */
export async function listFlippedMaterials(req, res, next) {
  try {
    const { schoolId } = extractUser(req);
    const { class_id, subject_id, page, limit } = req.query;

    const result = await service.smartLearningService.listFlippedMaterials({
      schoolId,
      classId: class_id,
      subjectId: subject_id,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json(buildResponse(result.materials, {
      total: result.total,
    }));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIODIC TABLE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/smart-learning/periodic-table
 * Get all periodic table elements
 */
export async function getPeriodicTable(req, res, next) {
  try {
    const elements = await service.smartLearningService.getPeriodicTable();
    res.json(buildResponse(elements));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/smart-learning/periodic-table/:atomicNumber
 * Get element by atomic number
 */
export async function getElement(req, res, next) {
  try {
    const { atomicNumber } = req.params;
    const element = await service.smartLearningService.getElement(parseInt(atomicNumber));
    res.json(buildResponse(element));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM PARSER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/smart-learning/parse-exam-docx
 * Parse exam document and extract questions
 */
export async function parseExamDocx(req, res, next) {
  try {
    const { userId, schoolId } = extractUser(req);
    const { file_content, filename, subject } = req.body;

    const result = await service.smartLearningService.parseExamDocument({
      teacherId: userId,
      schoolId,
      fileContent: file_content,
      filename,
      subject,
    });

    res.json(buildResponse(result));
  } catch (err) {
    next(err);
  }
}
