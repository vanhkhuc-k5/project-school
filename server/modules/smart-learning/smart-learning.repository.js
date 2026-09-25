// =============================================================================
// Smart Learning Repository — Data Access Layer
// Implements: Flashcards, SM-2 Progress, Flipped Classroom, Periodic Table, Exam Parser
// =============================================================================
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

/**
 * Generate UUID-like IDs
 */
function generateId(prefix = 'sl') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLASHCARD OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const flashcardRepo = {
  /**
   * Create a new flashcard deck
   */
  async createDeck({ data, schoolId, userId }) {
    const id = generateId('deck');
    const tags = data.tags ? JSON.stringify(data.tags) : null;

    const deck = {
      id,
      school_id: schoolId,
      subject_id: data.subject_id || null,
      subject_name: data.subject_name || null,
      grade_level: data.grade_level || null,
      title: data.title,
      description: data.description || null,
      deck_type: data.deck_type || 'general',
      is_system: data.is_system || false,
      is_public: data.is_public !== false,
      created_by: userId,
      tags,
    };

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO flashcard_decks (${Object.keys(deck).join(', ')})
        VALUES (${Object.keys(deck).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `, Object.values(deck));
      return res.rows[0];
    }

    const cols = Object.keys(deck).join(', ');
    const placeholders = Object.keys(deck).map(() => '?').join(', ');
    db.prepare(`INSERT INTO flashcard_decks (${cols}) VALUES (${placeholders})`).run(...Object.values(deck));
    return this.findDeckById(id);
  },

  /**
   * Find deck by ID
   */
  async findDeckById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM flashcard_decks WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(id) || null;
  },

  /**
   * List decks with filters
   */
  async listDecks({ schoolId, subjectId, gradeLevel, deckType, search, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['school_id = ?'];
    const params = [schoolId];

    if (subjectId) { conditions.push('subject_id = ?'); params.push(subjectId); }
    if (gradeLevel) { conditions.push('grade_level = ?'); params.push(gradeLevel); }
    if (deckType) { conditions.push('deck_type = ?'); params.push(deckType); }
    if (search) { conditions.push('(title ILIKE ? OR description ILIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const where = conditions.join(' AND ');
    const countWhere = params.length;

    if (isPostgresConfigured()) {
      params.push(limit, offset);
      const [dataRes, countRes] = await Promise.all([
        pgQuery(`SELECT * FROM flashcard_decks WHERE ${where} ORDER BY created_at DESC LIMIT $${countWhere + 1} OFFSET $${countWhere + 2}`, params),
        pgQuery(`SELECT COUNT(*) as total FROM flashcard_decks WHERE ${where}`, params.slice(0, countWhere)),
      ]);
      return { decks: dataRes.rows, total: parseInt(countRes.rows[0].total) };
    }

    params.push(limit, offset);
    const decks = db.prepare(`SELECT * FROM flashcard_decks WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM flashcard_decks WHERE ${where}`).get(...params.slice(0, countWhere));
    return { decks, total };
  },

  /**
   * Create a flashcard
   */
  async createCard(data) {
    const id = generateId('card');
    const tags = data.tags ? JSON.stringify(data.tags) : null;

    const card = {
      id,
      deck_id: data.deck_id,
      front_text: data.front_text,
      front_type: data.front_type || 'text',
      front_image_url: data.front_image_url || null,
      back_text: data.back_text,
      back_type: data.back_type || 'text',
      back_image_url: data.back_image_url || null,
      phonetic: data.phonetic || null,
      audio_url: data.audio_url || null,
      example_sentence: data.example_sentence || null,
      formula_latex: data.formula_latex || null,
      formula_type: data.formula_type || null,
      hint: data.hint || null,
      difficulty: data.difficulty || 2,
      tags,
    };

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO flashcard_cards (${Object.keys(card).join(', ')})
        VALUES (${Object.keys(card).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `, Object.values(card));
      
      // Update deck card count
      await pgQuery('UPDATE flashcard_decks SET card_count = card_count + 1 WHERE id = $1', [data.deck_id]);
      
      return res.rows[0];
    }

    const cols = Object.keys(card).join(', ');
    const placeholders = Object.keys(card).map(() => '?').join(', ');
    db.prepare(`INSERT INTO flashcard_cards (${cols}) VALUES (${placeholders})`).run(...Object.values(card));
    db.prepare('UPDATE flashcard_decks SET card_count = card_count + 1 WHERE id = ?').run(data.deck_id);
    return this.findCardById(id);
  },

  /**
   * Find card by ID
   */
  async findCardById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM flashcard_cards WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM flashcard_cards WHERE id = ?').get(id) || null;
  },

  /**
   * Get cards for a deck
   */
  async getDeckCards(deckId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM flashcard_cards WHERE deck_id = $1 ORDER BY created_at', [deckId]);
      return res.rows;
    }
    return db.prepare('SELECT * FROM flashcard_cards WHERE deck_id = ? ORDER BY created_at').all(deckId);
  },

  /**
   * Get cards due for review (SM-2)
   */
  async getDueCards(studentId, deckId = null, limit = 20) {
    const today = new Date().toISOString().split('T')[0];
    const conditions = ['sfp.student_id = ?', 'sfp.next_review_date <= ?'];
    const params = [studentId, today];

    if (deckId) {
      conditions.push('sfp.deck_id = ?');
      params.push(deckId);
    }

    const where = conditions.join(' AND ');

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT fc.*, sfp.repetitions, sfp.ease_factor, sfp.interval_days, sfp.mastery_level
        FROM student_flashcard_progress sfp
        JOIN flashcard_cards fc ON sfp.card_id = fc.id
        WHERE ${where}
        ORDER BY sfp.next_review_date
        LIMIT $${params.length + 1}
      `, [...params, limit]);
      return res.rows;
    }

    return db.prepare(`
      SELECT fc.*, sfp.repetitions, sfp.ease_factor, sfp.interval_days, sfp.mastery_level
      FROM student_flashcard_progress sfp
      JOIN flashcard_cards fc ON sfp.card_id = fc.id
      WHERE ${where}
      ORDER BY sfp.next_review_date
      LIMIT ?
    `).all(...params, limit);
  },

  /**
   * Get new cards (never reviewed)
   */
  async getNewCards(studentId, deckId, limit = 10) {
    const conditions = ['fc.deck_id = ?'];
    const params = [deckId];

    if (isPostgresConfigured()) {
      conditions.push(`
        fc.id NOT IN (
          SELECT card_id FROM student_flashcard_progress WHERE student_id = $2
        )
      `);
      params.push(studentId);
      const res = await pgQuery(`
        SELECT fc.*, 'new' as mastery_level, 0 as repetitions, 2.5 as ease_factor, 0 as interval_days
        FROM flashcard_cards fc
        WHERE ${conditions.join(' AND ')}
        ORDER BY fc.difficulty, RANDOM()
        LIMIT $${params.length + 1}
      `, [...params, limit]);
      return res.rows;
    }

    const newCards = db.prepare(`
      SELECT fc.*, 'new' as mastery_level, 0 as repetitions, 2.5 as ease_factor, 0 as interval_days
      FROM flashcard_cards fc
      WHERE fc.deck_id = ?
        AND fc.id NOT IN (SELECT card_id FROM student_flashcard_progress WHERE student_id = ?)
      ORDER BY fc.difficulty
      LIMIT ?
    `).all(deckId, studentId, limit);
    return newCards;
  },

  /**
   * Update student progress with SM-2 calculation
   */
  async updateProgress(studentId, cardId, { quality, responseTimeMs }) {
    const existing = await this.getProgress(studentId, cardId);
    
    // SM-2 Algorithm
    let { repetitions = 0, ease_factor = 2.5, interval_days = 0 } = existing || {};
    
    // Quality < 3 = failed, reset repetitions
    if (quality < 3) {
      repetitions = 0;
      interval_days = 1;
    } else {
      if (repetitions === 0) {
        interval_days = 1;
      } else if (repetitions === 1) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
      repetitions += 1;
    }
    
    // Update ease factor
    ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    
    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval_days);
    
    // Determine mastery level
    let masteryLevel = 'new';
    if (repetitions >= 5 && ease_factor >= 2.5) masteryLevel = 'mastered';
    else if (repetitions >= 2) masteryLevel = 'review';
    else if (repetitions >= 1) masteryLevel = 'learning';

    if (existing) {
      // Update existing progress
      const updates = [
        'repetitions = ?', 'ease_factor = ?', 'interval_days = ?',
        'next_review_date = ?', 'last_reviewed_at = CURRENT_TIMESTAMP',
        'last_quality = ?', 'times_reviewed = times_reviewed + 1',
        'total_response_time_ms = total_response_time_ms + ?',
        'mastery_level = ?', 'updated_at = CURRENT_TIMESTAMP'
      ];
      const values = [
        repetitions, ease_factor, interval_days, nextReviewDate.toISOString().split('T')[0],
        quality, responseTimeMs || 0, masteryLevel
      ];

      if (isPostgresConfigured()) {
        await pgQuery(`UPDATE student_flashcard_progress SET ${updates.join(', ')} WHERE student_id = $${values.length + 1} AND card_id = $${values.length + 2}`,
          [...values, studentId, cardId]);
      } else {
        db.prepare(`UPDATE student_flashcard_progress SET ${updates.join(', ')} WHERE student_id = ? AND card_id = ?`).run(...values, studentId, cardId);
      }
    } else {
      // Create new progress
      const id = generateId('prg');
      const progress = {
        id,
        student_id: studentId,
        card_id: cardId,
        deck_id: existing?.deck_id || null,
        repetitions,
        ease_factor,
        interval_days,
        next_review_date: nextReviewDate.toISOString().split('T')[0],
        last_reviewed_at: new Date().toISOString(),
        last_quality: quality,
        times_reviewed: 1,
        times_correct: quality >= 3 ? 1 : 0,
        total_response_time_ms: responseTimeMs || 0,
        mastery_level: masteryLevel,
      };

      if (isPostgresConfigured()) {
        const res = await pgQuery(`
          INSERT INTO student_flashcard_progress (${Object.keys(progress).join(', ')})
          VALUES (${Object.keys(progress).map((_, i) => `$${i + 1}`).join(', ')})
          ON CONFLICT (student_id, card_id) DO UPDATE SET
            repetitions = EXCLUDED.repetitions,
            ease_factor = EXCLUDED.ease_factor,
            interval_days = EXCLUDED.interval_days,
            next_review_date = EXCLUDED.next_review_date
          RETURNING *
        `, Object.values(progress));
        return res.rows[0];
      }

      db.prepare(`
        INSERT OR REPLACE INTO student_flashcard_progress (${Object.keys(progress).join(', ')})
        VALUES (${Object.keys(progress).map(() => '?').join(', ')})
      `).run(...Object.values(progress));
    }

    return this.getProgress(studentId, cardId);
  },

  /**
   * Get student progress for a card
   */
  async getProgress(studentId, cardId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        'SELECT * FROM student_flashcard_progress WHERE student_id = $1 AND card_id = $2',
        [studentId, cardId]
      );
      return res.rows[0] || null;
    }
    return db.prepare(
      'SELECT * FROM student_flashcard_progress WHERE student_id = ? AND card_id = ?'
    ).get(studentId, cardId) || null;
  },

  /**
   * Get deck study stats for a student
   */
  async getDeckStats(studentId, deckId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          COUNT(*) as total_cards,
          COUNT(CASE WHEN sfp.mastery_level = 'mastered' THEN 1 END) as mastered,
          COUNT(CASE WHEN sfp.mastery_level = 'review' THEN 1 END) as review,
          COUNT(CASE WHEN sfp.mastery_level = 'learning' THEN 1 END) as learning,
          COUNT(CASE WHEN sfp.next_review_date <= CURRENT_DATE THEN 1 END) as due_now,
          AVG(sfp.ease_factor) as avg_ease_factor
        FROM flashcard_cards fc
        LEFT JOIN student_flashcard_progress sfp ON fc.id = sfp.card_id AND sfp.student_id = $1
        WHERE fc.deck_id = $2
      `, [studentId, deckId]);
      return res.rows[0];
    }

    return db.prepare(`
      SELECT 
        COUNT(*) as total_cards,
        COUNT(CASE WHEN sfp.mastery_level = 'mastered' THEN 1 END) as mastered,
        COUNT(CASE WHEN sfp.mastery_level = 'review' THEN 1 END) as review,
        COUNT(CASE WHEN sfp.mastery_level = 'learning' THEN 1 END) as learning,
        COUNT(CASE WHEN sfp.next_review_date <= date('now') THEN 1 END) as due_now,
        AVG(sfp.ease_factor) as avg_ease_factor
      FROM flashcard_cards fc
      LEFT JOIN student_flashcard_progress sfp ON fc.id = sfp.card_id AND sfp.student_id = ?
      WHERE fc.deck_id = ?
    `).get(studentId, deckId);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FLIPPED CLASSROOM OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const flippedRepo = {
  /**
   * Create flipped material
   */
  async createMaterial({ data, schoolId, userId }) {
    const id = generateId('flp');
    const warmup = data.warmup_questions ? JSON.stringify(data.warmup_questions) : null;
    const keyPoints = data.key_points ? JSON.stringify(data.key_points) : null;
    const prereqs = data.prerequisites ? JSON.stringify(data.prerequisites) : null;

    const material = {
      id,
      school_id: schoolId,
      class_id: data.class_id,
      subject_id: data.subject_id || null,
      subject_name: data.subject_name || null,
      timetable_entry_id: data.timetable_entry_id || null,
      title: data.title,
      description: data.description || null,
      slide_url: data.slide_url || null,
      mindmap_url: data.mindmap_url || null,
      video_url: data.video_url || null,
      summary_text: data.summary_text || null,
      key_points: keyPoints,
      prerequisites: prereqs,
      warmup_questions_json: warmup,
      is_published: true,
      created_by: userId,
    };

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO flipped_classroom_materials (${Object.keys(material).join(', ')})
        VALUES (${Object.keys(material).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `, Object.values(material));
      return res.rows[0];
    }

    const cols = Object.keys(material).join(', ');
    const placeholders = Object.keys(material).map(() => '?').join(', ');
    db.prepare(`INSERT INTO flipped_classroom_materials (${cols}) VALUES (${placeholders})`).run(...Object.values(material));
    return this.findById(id);
  },

  /**
   * Find material by ID
   */
  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM flipped_classroom_materials WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM flipped_classroom_materials WHERE id = ?').get(id) || null;
  },

  /**
   * Get material by timetable entry
   */
  async findByTimetableEntry(timetableEntryId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        'SELECT * FROM flipped_classroom_materials WHERE timetable_entry_id = $1 AND is_published = TRUE LIMIT 1',
        [timetableEntryId]
      );
      return res.rows[0] || null;
    }
    return db.prepare(
      'SELECT * FROM flipped_classroom_materials WHERE timetable_entry_id = ? AND is_published = 1 LIMIT 1'
    ).get(timetableEntryId) || null;
  },

  /**
   * List materials with filters
   */
  async listMaterials({ schoolId, classId, subjectId, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['school_id = ?', 'is_published = TRUE'];
    const params = [schoolId];

    if (classId) { conditions.push('class_id = ?'); params.push(classId); }
    if (subjectId) { conditions.push('subject_id = ?'); params.push(subjectId); }

    const where = conditions.join(' AND ');
    const countWhere = params.length;

    if (isPostgresConfigured()) {
      params.push(limit, offset);
      const [dataRes, countRes] = await Promise.all([
        pgQuery(`SELECT * FROM flipped_classroom_materials WHERE ${where} ORDER BY created_at DESC LIMIT $${countWhere + 1} OFFSET $${countWhere + 2}`, params),
        pgQuery(`SELECT COUNT(*) as total FROM flipped_classroom_materials WHERE ${where}`, params.slice(0, countWhere)),
      ]);
      return { materials: dataRes.rows, total: parseInt(countRes.rows[0].total) };
    }

    params.push(limit, offset);
    const materials = db.prepare(`SELECT * FROM flipped_classroom_materials WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM flipped_classroom_materials WHERE ${where}`).get(...params.slice(0, countWhere));
    return { materials, total };
  },

  /**
   * Record student view
   */
  async recordView(studentId, materialId, timeSpent = 0) {
    const id = generateId('vw');

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO student_flipped_views (id, student_id, material_id, time_spent_seconds, viewed_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, material_id) DO UPDATE SET
          time_spent_seconds = student_flipped_views.time_spent_seconds + $4,
          viewed_at = CURRENT_TIMESTAMP
      `, [id, studentId, materialId, timeSpent]);
    } else {
      db.prepare(`
        INSERT OR REPLACE INTO student_flipped_views (id, student_id, material_id, time_spent_seconds, viewed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(id, studentId, materialId, timeSpent);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PERIODIC TABLE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const periodicTableRepo = {
  /**
   * Get all elements
   */
  async getAllElements() {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM periodic_table_elements ORDER BY atomic_number');
      return res.rows;
    }
    return db.prepare('SELECT * FROM periodic_table_elements ORDER BY atomic_number').all();
  },

  /**
   * Get element by atomic number
   */
  async getElementByNumber(atomicNumber) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM periodic_table_elements WHERE atomic_number = $1', [atomicNumber]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM periodic_table_elements WHERE atomic_number = ?').get(atomicNumber);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAM PARSER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const examParserRepo = {
  /**
   * Create parser queue entry
   */
  async createQueueEntry({ teacherId, schoolId, filename, filePath, fileContent, mimeType }) {
    const id = generateId('prs');
    const entry = {
      id,
      teacher_id: teacherId,
      school_id: schoolId,
      original_filename: filename,
      file_path: filePath,
      file_size_bytes: fileContent?.length || 0,
      mime_type: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'pending',
    };

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO exam_parser_queue (${Object.keys(entry).join(', ')})
        VALUES (${Object.keys(entry).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `, Object.values(entry));
      return res.rows[0];
    }

    const cols = Object.keys(entry).join(', ');
    const placeholders = Object.keys(entry).map(() => '?').join(', ');
    db.prepare(`INSERT INTO exam_parser_queue (${cols}) VALUES (${placeholders})`).run(...Object.values(entry));
    return this.findById(id);
  },

  /**
   * Find queue entry by ID
   */
  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM exam_parser_queue WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM exam_parser_queue WHERE id = ?').get(id) || null;
  },

  /**
   * Update queue entry with parsed result
   */
  async updateWithResult(id, { questions, questionsCount, confidence }) {
    const questionsJson = JSON.stringify(questions);

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE exam_parser_queue 
        SET status = 'completed', 
            parsed_questions_json = $1, 
            questions_count = $2, 
            parsing_confidence = $3,
            processed_at = CURRENT_TIMESTAMP,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [questionsJson, questionsCount, confidence, id]);
    } else {
      db.prepare(`
        UPDATE exam_parser_queue 
        SET status = 'completed', 
            parsed_questions_json = ?, 
            questions_count = ?, 
            parsing_confidence = ?,
            processed_at = datetime('now'),
            completed_at = datetime('now')
        WHERE id = ?
      `).run(questionsJson, questionsCount, confidence, id);
    }

    return this.findById(id);
  },

  /**
   * Update status to failed
   */
  async markFailed(id, errorMessage) {
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE exam_parser_queue SET status = 'failed', error_message = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2
      `, [errorMessage, id]);
    } else {
      db.prepare(`UPDATE exam_parser_queue SET status = 'failed', error_message = ?, processed_at = datetime('now') WHERE id = ?`).run(errorMessage, id);
    }
  },
};
