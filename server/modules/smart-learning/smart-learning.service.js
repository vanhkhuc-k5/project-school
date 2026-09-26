// =============================================================================
// Smart Learning Service — Business Logic Layer
// Implements: Flashcards SM-2, Flipped Classroom, Periodic Table, Exam Parser
// =============================================================================
import * as repo from './smart-learning.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { SM2_QUALITY_LABELS, MASTERY_LEVELS } from './smart-learning.schema.js';

/**
 * Smart Learning Service
 * Business logic for student learning tools
 */
export const smartLearningService = {
  // ─────────────────────────────────────────────────────────────────────────
  // FLASHCARD OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new flashcard deck
   */
  async createDeck({ data, schoolId, userId }) {
    if (!data.title) throw AppError.badRequest('Thiếu tiêu đề bộ thẻ');
    return repo.flashcardRepo.createDeck({ data, schoolId, userId });
  },

  /**
   * List flashcard decks
   */
  async listDecks({ schoolId, subjectId, gradeLevel, deckType, search, page, limit }) {
    return repo.flashcardRepo.listDecks({
      schoolId, subjectId, gradeLevel, deckType, search, page, limit
    });
  },

  /**
   * Get deck with cards
   */
  async getDeck(deckId) {
    const deck = await repo.flashcardRepo.findDeckById(deckId);
    if (!deck) throw AppError.notFound('Không tìm thấy bộ thẻ');

    const cards = await repo.flashcardRepo.getDeckCards(deckId);
    return { ...deck, cards };
  },

  /**
   * Create a flashcard
   */
  async createCard({ data, schoolId, userId }) {
    if (!data.deck_id) throw AppError.badRequest('Thiếu deck_id');
    if (!data.front_text) throw AppError.badRequest('Thiếu nội dung mặt trước');
    if (!data.back_text) throw AppError.badRequest('Thiếu nội dung mặt sau');

    const card = await repo.flashcardRepo.createCard(data);
    return card;
  },

  /**
   * Get cards for study session
   * Combines due cards + new cards
   */
  async getStudyCards({ studentId, deckId, limit = 20 }) {
    // Get due cards first
    const dueCards = await repo.flashcardRepo.getDueCards(studentId, deckId, limit);
    const newCards = await repo.flashcardRepo.getNewCards(studentId, deckId, Math.max(0, limit - dueCards.length));

    return {
      due_cards: dueCards,
      new_cards: newCards,
      total: dueCards.length + newCards.length,
      has_due: dueCards.length > 0,
    };
  },

  /**
   * Review a flashcard with SM-2 algorithm
   */
  async reviewCard({ studentId, cardId, quality, responseTimeMs }) {
    if (quality === undefined) throw AppError.badRequest('Thiếu đánh giá chất lượng');

    const card = await repo.flashcardRepo.findCardById(cardId);
    if (!card) throw AppError.notFound('Không tìm thấy thẻ');

    const progress = await repo.flashcardRepo.updateProgress(studentId, cardId, { quality, responseTimeMs });

    // Return enriched progress
    return {
      card_id: cardId,
      card: {
        front_text: card.front_text,
        back_text: card.back_text,
        phonetic: card.phonetic,
      },
      progress: {
        repetitions: progress.repetitions,
        ease_factor: progress.ease_factor,
        interval_days: progress.interval_days,
        next_review_date: progress.next_review_date,
        mastery_level: progress.mastery_level,
      },
      quality_label: SM2_QUALITY_LABELS[quality] || SM2_QUALITY_LABELS[3],
      message: this._getReviewMessage(quality, progress.interval_days),
    };
  },

  /**
   * Get deck statistics for a student
   */
  async getDeckStats({ studentId, deckId }) {
    const stats = await repo.flashcardRepo.getDeckStats(studentId, deckId);
    const deck = await repo.flashcardRepo.findDeckById(deckId);
    if (!deck) throw AppError.notFound('Không tìm thấy bộ thẻ');

    const mastered = parseInt(stats.mastered || 0);
    const total = parseInt(stats.total_cards || 0);
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return {
      deck_id: deckId,
      deck_title: deck.title,
      total_cards: total,
      mastered,
      review: parseInt(stats.review || 0),
      learning: parseInt(stats.learning || 0),
      due_now: parseInt(stats.due_now || 0),
      mastery_rate: masteryRate,
      avg_ease_factor: parseFloat(stats.avg_ease_factor || 2.5).toFixed(2),
    };
  },

  /**
   * Get all decks with study stats for student
   */
  async getDecksWithStats({ schoolId, studentId, subjectId, gradeLevel, deckType, search, page, limit }) {
    const { decks, total } = await this.listDecks({ schoolId, subjectId, gradeLevel, deckType, search, page, limit });

    // Get stats for each deck
    const decksWithStats = await Promise.all(
      decks.map(async (deck) => {
        try {
          const stats = await this.getDeckStats({ studentId, deckId: deck.id });
          return { ...deck, stats };
        } catch {
          return { ...deck, stats: null };
        }
      })
    );

    return { decks: decksWithStats, total };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FLIPPED CLASSROOM OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create flipped classroom material
   */
  async createFlippedMaterial({ data, schoolId, userId }) {
    if (!data.class_id) throw AppError.badRequest('Thiếu class_id');
    if (!data.title) throw AppError.badRequest('Thiếu tiêu đề');

    return repo.flippedRepo.createMaterial({ data, schoolId, userId });
  },

  /**
   * Get flipped material for a timetable entry
   */
  async getFlippedMaterial(timetableEntryId) {
    const material = await repo.flippedRepo.findByTimetableEntry(timetableEntryId);
    if (!material) {
      // Return null if no material exists (not an error)
      return null;
    }

    // Parse JSON fields
    return {
      ...material,
      warmup_questions: material.warmup_questions_json ? JSON.parse(material.warmup_questions_json) : [],
      key_points: material.key_points ? JSON.parse(material.key_points) : [],
      prerequisites: material.prerequisites ? JSON.parse(material.prerequisites) : [],
    };
  },

  /**
   * List flipped materials
   */
  async listFlippedMaterials({ schoolId, classId, subjectId, page, limit }) {
    return repo.flippedRepo.listMaterials({ schoolId, classId, subjectId, page, limit });
  },

  /**
   * Record student view of material
   */
  async recordMaterialView(studentId, materialId, timeSpentSeconds = 0) {
    return repo.flippedRepo.recordView(studentId, materialId, timeSpentSeconds);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PERIODIC TABLE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all periodic table elements
   */
  async getPeriodicTable() {
    const elements = await repo.periodicTableRepo.getAllElements();
    return elements.map(el => ({
      atomic_number: el.atomic_number,
      symbol: el.symbol,
      name: el.name,
      name_vietnamese: el.name_vietnamese,
      atomic_mass: parseFloat(el.atomic_mass),
      category: el.category,
      group: el.group_number,
      period: el.period_number,
      electron_configuration: el.electron_configuration,
      description: el.description,
    }));
  },

  /**
   * Get element by atomic number
   */
  async getElement(atomicNumber) {
    const element = await repo.periodicTableRepo.getElementByNumber(atomicNumber);
    if (!element) throw AppError.notFound('Không tìm thấy nguyên tố');
    return {
      atomic_number: element.atomic_number,
      symbol: element.symbol,
      name: element.name,
      name_vietnamese: element.name_vietnamese,
      atomic_mass: parseFloat(element.atomic_mass),
      category: element.category,
      group: element.group_number,
      period: element.period_number,
      electron_configuration: element.electron_configuration,
      electronegativity: element.electronegativity ? parseFloat(element.electronegativity) : null,
      density: element.density ? parseFloat(element.density) : null,
      melting_point: element.melting_point ? parseFloat(element.melting_point) : null,
      boiling_point: element.boiling_point ? parseFloat(element.boiling_point) : null,
      discovered_year: element.discovered_year,
      discovered_by: element.discovered_by,
      description: element.description,
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EXAM PARSER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Parse exam document (DOCX)
   * This uses regex-based parsing to extract multiple choice questions
   */
  async parseExamDocument({ teacherId, schoolId, fileContent, filename, subject }) {
    if (!fileContent) throw AppError.badRequest('Thiếu nội dung file');

    // Create queue entry
    const queueEntry = await repo.examParserRepo.createQueueEntry({
      teacherId,
      schoolId,
      filename,
      filePath: `uploads/exams/${Date.now()}_${filename}`,
      fileContent,
    });

    try {
      // Parse the document content
      const questions = this._parseExamContent(fileContent, subject);

      // Update queue with results
      const confidence = this._calculateConfidence(questions);
      const result = await repo.examParserRepo.updateWithResult(queueEntry.id, {
        questions,
        questionsCount: questions.length,
        confidence,
      });

      return {
        queue_id: queueEntry.id,
        status: 'completed',
        questions,
        questions_count: questions.length,
        confidence,
        message: `Đã phân tích thành công ${questions.length} câu hỏi`,
      };
    } catch (error) {
      await repo.examParserRepo.markFailed(queueEntry.id, error.message);
      throw AppError.badRequest(`Lỗi khi phân tích file: ${error.message}`);
    }
  },

  /**
   * Parse raw text content into questions
   */
  _parseExamContent(content, subject) {
    const questions = [];
    
    // Normalize line endings
    const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    
    // Split by question patterns: "Câu 1", "Câu 2", "Question 1:", etc.
    const questionBlocks = text.split(/(?:^|\n)(?:Câu\s*\.?\s*|Question\s*\.?\s*|CÂU\s*\.?\s*)\s*(\d+|[IVX]+)\s*[:.)]/im);
    
    // Process each question block
    for (let i = 1; i < questionBlocks.length; i += 2) {
      const questionNum = questionBlocks[i];
      const blockContent = questionBlocks[i + 1] || '';
      
      if (!blockContent.trim()) continue;

      const question = this._parseQuestionBlock(blockContent, questionNum, subject);
      if (question) {
        questions.push(question);
      }
    }

    // If no structured questions found, try line-by-line parsing
    if (questions.length === 0) {
      const lines = text.split('\n').filter(l => l.trim());
      let currentQuestion = null;
      let currentOptions = [];

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Check if this is a new question
        const questionMatch = trimmed.match(/^(?:Câu\s*\.?\s*|Question\s*\.?\s*)\s*(\d+)\s*[:.)]/i);
        if (questionMatch) {
          // Save previous question
          if (currentQuestion) {
            const q = this._buildQuestion(currentQuestion, currentOptions, subject);
            if (q) questions.push(q);
          }
          
          currentQuestion = trimmed.replace(questionMatch[0], '').trim();
          currentOptions = [];
          continue;
        }

        // Check if this is an option (A., B., C., D. or (A), (B), etc.)
        const optionMatch = trimmed.match(/^([A-D])(?:[\s.)]|[\s]*(?:\(|\.))\s*(.+)/i);
        if (optionMatch && currentQuestion) {
          currentOptions.push({
            key: optionMatch[1].toUpperCase(),
            text: optionMatch[2].trim(),
          });
        } else if (currentQuestion) {
          // Append to question text
          currentQuestion += ' ' + trimmed;
        }
      }

      // Don't forget the last question
      if (currentQuestion) {
        const q = this._buildQuestion(currentQuestion, currentOptions, subject);
        if (q) questions.push(q);
      }
    }

    return questions;
  },

  /**
   * Parse a single question block
   */
  _parseQuestionBlock(block, questionNum, subject) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    
    if (lines.length === 0) return null;

    // First line is usually the question
    let questionText = lines[0];
    let options = [];

    // Extract options
    for (const line of lines.slice(1)) {
      const match = line.match(/^([A-D])(?:[\s.)]|[\s]*(?:\(|\.))\s*(.+)/i);
      if (match) {
        options.push({
          key: match[1].toUpperCase(),
          text: match[2].trim(),
        });
      } else if (!questionText.includes(line)) {
        // Append continuation to question
        questionText += ' ' + line;
      }
    }

    return this._buildQuestion(questionText, options, subject);
  },

  /**
   * Build a standardized question object
   */
  _buildQuestion(questionText, options, subject) {
    if (!questionText) return null;

    // Detect correct answer from formatting hints
    let correctAnswer = 0; // Default to A

    // Check for bold/underline markers like **(A)**, __A__, or color markers
    const answerPatterns = [
      /[*_]{2}\(?([A-D])\)?[*_]{2}/i,  // **A** or __A__
      /<([A-D])>/,                          // <A>
      /\^([A-D])\$/i,                      // ^A$
      /(?:đáp án|answer|correct)[:\s]*([A-D])/i,
    ];

    for (const pattern of answerPatterns) {
      const match = questionText.match(pattern);
      if (match) {
        correctAnswer = match[1].toUpperCase().charCodeAt(0) - 65;
        // Remove the answer marker from question text
        questionText = questionText.replace(pattern, '').trim();
        break;
      }
    }

    // Try to detect from options if one is marked
    options = options.map((opt, idx) => {
      // Check if option text contains markers
      if (/\*\*(A|B|C|D)\*\*/i.test(opt.text) || /^\(A\) \(B\) \(C\) \(D\)/.test(opt.text)) {
        if (opt.text.includes('**') || opt.text.match(/^\([A-D]\)\s*\(/i)) {
          correctAnswer = idx;
        }
      }
      return {
        ...opt,
        text: opt.text.replace(/\*\*/g, '').trim(),
        isCorrect: idx === correctAnswer,
      };
    });

    // Default to 4 options if fewer
    while (options.length < 4) {
      const key = String.fromCharCode(65 + options.length);
      options.push({
        key,
        text: `Phương án ${key}`,
        isCorrect: false,
      });
    }

    // Limit to 4 options
    options = options.slice(0, 4);

    return {
      number: questionText.match(/^\d+/)?.[0] || null,
      prompt: questionText.replace(/^\d+[.:)\s]*/, '').trim(),
      type: 'multiple_choice',
      options,
      correct_answer: correctAnswer,
      difficulty: 'TH', // Default to TH (Thông hiểu)
      max_score: 0.25, // For 4-point exams
      subject: subject || null,
      explanation: '',
    };
  },

  /**
   * Calculate parsing confidence score
   */
  _calculateConfidence(questions) {
    if (questions.length === 0) return 0;

    let totalScore = 0;
    
    for (const q of questions) {
      let score = 50; // Base score
      
      // Full question text
      if (q.prompt && q.prompt.length > 20) score += 10;
      
      // Has 4 options
      if (q.options.length === 4) score += 15;
      
      // All options have content
      const validOptions = q.options.filter(o => o.text.length > 5).length;
      score += validOptions * 5;
      
      // Has difficulty level
      if (q.difficulty) score += 5;
      
      totalScore += Math.min(score, 100);
    }
    
    return Math.round(totalScore / questions.length);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  _getReviewMessage(quality, intervalDays) {
    if (quality < 3) {
      return `Ôn lại sau 1 ngày. Hãy cố gắng hơn!`;
    }
    
    if (intervalDays === 1) {
      return 'Tốt lắm! Tiếp tục ôn tập ngày mai.';
    }
    
    if (intervalDays < 7) {
      return `Hoàn hảo! Ôn lại sau ${intervalDays} ngày.`;
    }
    
    if (intervalDays < 30) {
      return `Xuất sắc! Bạn đang nhớ rất tốt. Ôn lại sau ${intervalDays} ngày.`;
    }
    
    return `Bạn đã thuộc! Ôn lại sau ${intervalDays} ngày.`;
  },
};
