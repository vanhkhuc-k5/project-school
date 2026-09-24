// =============================================================================
// AI Tutor Context Service — G38 Safe Academic Context
// Builds personalized, privacy-safe academic context for AI Tutor responses.
// =============================================================================

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';
import {
  CONTEXT_SOURCES,
  CONTEXT_SOURCE_CONFIG,
  CONTEXT_LIMITS,
  ATTRIBUTION_LABELS,
  SENSITIVE_PATTERNS,
  PRIVACY_TIERS,
  ContextBuildOptions,
} from './ai-tutor-context.types.js';

// ── Token Estimation ─────────────────────────────────────────────────────────────
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// ── Text Utilities ────────────────────────────────────────────────────────────────

function sanitizeText(text) {
  if (!text) return '';
  let result = String(text);
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[đã ẩn]');
  }
  return result;
}

function truncateToTokens(text, maxTokens) {
  if (!text) return '';
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return text;
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars) + '...[đã cắt ngắn]';
}

// ── Context Item Formatter ──────────────────────────────────────────────────────

function formatContextItem(source, data, extra = {}) {
  return {
    source,
    sourceLabel: ATTRIBUTION_LABELS[source] || source,
    data,
    attribution: {
      label: ATTRIBUTION_LABELS[source] || source,
      timestamp: new Date().toISOString(),
      ...extra,
    },
  };
}

// ── Safe Query Helpers ──────────────────────────────────────────────────────────

async function safeQuery(pgSql, sqliteSql, params) {
  try {
    if (isPostgresConfigured()) {
      const res = await pgQuery(pgSql, params);
      return res.rows;
    }
    return db.prepare(sqliteSql).all(...params);
  } catch (err) {
    console.warn('[AI Context] Query failed:', err.message);
    return null;
  }
}

async function safeQueryRow(pgSql, sqliteSql, params) {
  try {
    if (isPostgresConfigured()) {
      const res = await pgQuery(pgSql, params);
      return res.rows[0] || null;
    }
    return db.prepare(sqliteSql).get(...params) || null;
  } catch (err) {
    console.warn('[AI Context] Query failed:', err.message);
    return null;
  }
}

// ── Context Source Builders ────────────────────────────────────────────────────

export const aiContextService = {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CURRENT SUBJECT CONTEXT
  // Returns student's enrolled class, grade level, and active subjects via
  // teacher_assignments. school_id isolation enforced.
  // ─────────────────────────────────────────────────────────────────────────────
  async getCurrentSubjectContext(studentId, schoolId) {
    // Get student's class and grade from students + classes join
    const studentRow = await safeQueryRow(
      `SELECT st.current_class_id, c.name as class_name, c.grade_level
       FROM students st
       JOIN classes c ON c.id = st.current_class_id
       WHERE st.user_id = $1 AND st.school_id = $2
       LIMIT 1`,
      `SELECT st.current_class_id, c.name as class_name, c.grade_level
       FROM students st
       JOIN classes c ON c.id = st.current_class_id
       WHERE st.user_id = ? AND st.school_id = ?
       LIMIT 1`,
      [studentId, schoolId]
    );

    if (!studentRow) return null;

    const { current_class_id: classId, class_name: className, grade_level: gradeLevel } = studentRow;
    if (!classId) return null;

    // Get active subjects for this class via teacher_assignments
    const subjectRows = await safeQuery(
      `SELECT sub.name, sub.code
       FROM teacher_assignments ta
       JOIN subjects sub ON sub.id = ta.subject_id
       WHERE ta.class_id = $1 AND ta.status = 'active'
       ORDER BY sub.name
       LIMIT 5`,
      `SELECT sub.name, sub.code
       FROM teacher_assignments ta
       JOIN subjects sub ON sub.id = ta.subject_id
       WHERE ta.class_id = ? AND ta.status = 'active'
       ORDER BY sub.name
       LIMIT 5`,
      [classId]
    );

    const subjects = subjectRows
      ? subjectRows.map(r => r.name + (r.code ? ` (${r.code})` : '')).join(', ')
      : 'N/A';

    const text = [
      `Cấp học: Lớp ${gradeLevel || 'N/A'}`,
      `Lớp: ${className || classId}`,
      `Các môn đang học: ${subjects}`,
    ].join(' | ');

    return formatContextItem(CONTEXT_SOURCES.CURRENT_SUBJECT, {
      classId,
      className,
      gradeLevel,
      subjects: subjectRows || [],
      text,
    }, { verified: true });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CURRICULUM TOPIC CONTEXT
  // Returns subjects for the student's grade level in this school.
  // Uses teacher_assignments to find real enrolled subjects.
  // ─────────────────────────────────────────────────────────────────────────────
  async getCurriculumTopicContext(studentId, schoolId) {
    // Get grade level from student's class
    const gradeRow = await safeQueryRow(
      `SELECT c.grade_level
       FROM students st
       JOIN classes c ON c.id = st.current_class_id
       WHERE st.user_id = $1 AND st.school_id = $2
       LIMIT 1`,
      `SELECT c.grade_level
       FROM students st
       JOIN classes c ON c.id = st.current_class_id
       WHERE st.user_id = ? AND st.school_id = ?
       LIMIT 1`,
      [studentId, schoolId]
    );

    const gradeLevel = gradeRow?.grade_level;

    // Build separate PostgreSQL and SQLite queries
    let pgSql, sqliteSql, params;
    if (gradeLevel) {
      pgSql = `SELECT DISTINCT sub.name, sub.code, sub.grade_level
               FROM teacher_assignments ta
               JOIN subjects sub ON sub.id = ta.subject_id
               JOIN classes c ON c.id = ta.class_id
               WHERE ta.school_id = $1 AND c.grade_level = $2 AND ta.status = 'active'
               ORDER BY sub.name
               LIMIT 5`;
      sqliteSql = `SELECT DISTINCT sub.name, sub.code, sub.grade_level
               FROM teacher_assignments ta
               JOIN subjects sub ON sub.id = ta.subject_id
               JOIN classes c ON c.id = ta.class_id
               WHERE ta.school_id = ? AND c.grade_level = ? AND ta.status = 'active'
               ORDER BY sub.name
               LIMIT 5`;
      params = [schoolId, gradeLevel];
    } else {
      pgSql = `SELECT DISTINCT sub.name, sub.code
               FROM teacher_assignments ta
               JOIN subjects sub ON sub.id = ta.subject_id
               WHERE ta.school_id = $1 AND ta.status = 'active'
               ORDER BY sub.name
               LIMIT 5`;
      sqliteSql = `SELECT DISTINCT sub.name, sub.code
               FROM teacher_assignments ta
               JOIN subjects sub ON sub.id = ta.subject_id
               WHERE ta.school_id = ? AND ta.status = 'active'
               ORDER BY sub.name
               LIMIT 5`;
      params = [schoolId];
    }

    const rows = await safeQuery(pgSql, sqliteSql, params);

    if (!rows || rows.length === 0) return null;

    const topicList = rows.map(r => `• ${r.name}` + (r.code ? ` (${r.code})` : '')).join('\n');
    const gradeText = gradeLevel ? ` cấp lớp ${gradeLevel}` : '';
    const text = `Chương trình${gradeText}:\n${topicList}`;

    return formatContextItem(CONTEXT_SOURCES.CURRICULUM_TOPIC, {
      topics: rows,
      summary: `${rows.length} môn trong chương trình${gradeText}`,
      text,
    }, { verified: true });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ASSIGNMENT CONTEXT
  // Returns active, upcoming assignments for the student's class.
  // Scoped to student's class via current_class_id join.
  // PostgreSQL: target_classes is JSONB → use $1::jsonb
  // SQLite: target_classes is TEXT → use LIKE
  // ─────────────────────────────────────────────────────────────────────────────
  async getAssignmentContext(studentId, schoolId) {
    const studentRow = await safeQueryRow(
      `SELECT current_class_id FROM students WHERE user_id = $1 AND school_id = $2`,
      `SELECT current_class_id FROM students WHERE user_id = ? AND school_id = ?`,
      [studentId, schoolId]
    );

    if (!studentRow?.current_class_id) return null;

    const classId = studentRow.current_class_id;

    let rows;
    try {
      if (isPostgresConfigured()) {
        // PostgreSQL: target_classes is JSONB array, e.g. ["10A1","10A2"]
        // Use @> (contains) — check if array contains the class name as text
        const res = await pgQuery(`
          SELECT id, title, subject, due_date, due_time, type
          FROM assignments
          WHERE target_classes @> $1::jsonb
            AND status = 'published'
            AND (due_date >= CURRENT_DATE OR due_date IS NULL)
          ORDER BY due_date ASC NULLS LAST
          LIMIT 3
        `, [JSON.stringify(classId)]);
        rows = res.rows;
      } else {
        rows = db.prepare(`
          SELECT id, title, subject, due_date, due_time, type
          FROM assignments
          WHERE (target_classes LIKE '%' || ? || '%')
            AND status = 'published'
            AND (due_date >= date('now') OR due_date IS NULL)
          ORDER BY due_date ASC
          LIMIT 3
        `).all(classId);
      }
    } catch (err) {
      console.warn('[AI Context] Assignment query failed:', err.message);
      rows = null;
    }

    if (!rows || rows.length === 0) return null;

    const text = [
      `Bài tập đang chờ (${rows.length}):`,
      ...rows.map(a =>
        `• ${a.title} | ${a.subject} | Hạn: ${a.due_date || 'không giới hạn'}`
      ),
    ].join('\n');

    return formatContextItem(CONTEXT_SOURCES.ASSIGNMENT_CONTEXT, {
      assignments: rows.map(a => ({
        id: a.id,
        title: a.title,
        subject: a.subject,
        dueDate: a.due_date,
        dueTime: a.due_time,
        type: a.type,
      })),
      summary: `${rows.length} bài tập đang chờ`,
      text,
    }, { verified: true });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. STUDENT LEARNING HISTORY (PRIVACY-SENSITIVE)
  // Returns only the student's OWN AI tutor conversation topics.
  // Disabled by default — must be explicitly enabled via config.
  // ─────────────────────────────────────────────────────────────────────────────
  async getStudentHistoryContext(studentId, maxMessages = 5) {
    const config = CONTEXT_SOURCE_CONFIG[CONTEXT_SOURCES.STUDENT_HISTORY];

    if (!config.enabled) {
      return null; // Explicitly disabled by default
    }

    const rows = await safeQuery(
      `SELECT DISTINCT topic, created_at
       FROM ai_tutor_messages
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      `SELECT DISTINCT topic, created_at
       FROM ai_tutor_messages
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [studentId, maxMessages]
    );

    if (!rows || rows.length === 0) return null;

    const text = [
      `Các chủ đề đã hỏi gần đây:`,
      ...rows.map((h, i) => `${i + 1}. ${h.topic} (${h.created_at})`),
    ].join('\n');

    return formatContextItem(CONTEXT_SOURCES.STUDENT_HISTORY, {
      history: rows.map(h => ({ topic: h.topic, time: h.created_at })),
      summary: `${rows.length} chủ đề đã hỏi`,
      text,
      privacyTier: PRIVACY_TIERS.STUDENT_PRIVATE,
    }, { privacySensitive: true, verified: true });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. LEARNING RESOURCES CONTEXT
  // Returns study resources for the student's grade level.
  // Note: study_resources lacks school_id — scoped by grade_level.
  // requiresPermission: true — admin/teacher must enable.
  // ─────────────────────────────────────────────────────────────────────────────
  async getLearningResourcesContext(studentId, schoolId, maxResources = 3) {
    // Get grade level from student's class
    const gradeRow = await safeQueryRow(
      `SELECT c.grade_level
       FROM students st
       JOIN classes c ON c.id = st.current_class_id
       WHERE st.user_id = $1 AND st.school_id = $2
       LIMIT 1`,
      `SELECT c.grade_level
       FROM students st
       JOIN classes c ON c.id = st.current_class_id
       WHERE st.user_id = ? AND st.school_id = ?
       LIMIT 1`,
      [studentId, schoolId]
    );

    if (!gradeRow?.grade_level) return null;

    const rows = await safeQuery(
      `SELECT id, title, subject, type, grade_level
       FROM study_resources
       WHERE grade_level = $1
       ORDER BY downloads_count DESC, created_at DESC
       LIMIT $2`,
      `SELECT id, title, subject, type, grade_level
       FROM study_resources
       WHERE grade_level = ?
       ORDER BY downloads_count DESC, created_at DESC
       LIMIT ?`,
      [gradeRow.grade_level, maxResources]
    );

    if (!rows || rows.length === 0) return null;

    const text = [
      `Tài liệu học tập lớp ${gradeRow.grade_level}:`,
      ...rows.map(r => `• ${r.title} (${r.type}) — ${r.subject}`),
    ].join('\n');

    return formatContextItem(CONTEXT_SOURCES.LEARNING_RESOURCE, {
      resources: rows.map(r => ({
        id: r.id,
        title: sanitizeText(r.title),
        subject: r.subject,
        type: r.type,
        gradeLevel: r.grade_level,
      })),
      summary: `${rows.length} tài liệu học tập`,
      text,
    }, { verified: true });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTEXT AGGREGATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Build complete academic context for an AI request.
   * Respects token budget and source availability.
   * No unrestricted SQL — all queries are parameterized and scoped.
   */
  async buildContext({ studentId, schoolId, options = new ContextBuildOptions() }) {
    const contextItems = [];
    let totalTokens = 0;
    const tokenBudget = options.maxTokens || CONTEXT_LIMITS.MAX_TOTAL_TOKENS;

    // 1. Current subject — always attempted first
    const subjectCtx = await this.getCurrentSubjectContext(studentId, schoolId);
    if (subjectCtx) {
      const tokens = estimateTokens(subjectCtx.data.text);
      if (totalTokens + tokens <= tokenBudget) {
        contextItems.push(subjectCtx);
        totalTokens += tokens;
      }
    }

    // 2. Curriculum topics — scoped by grade level
    const topicCtx = await this.getCurriculumTopicContext(studentId, schoolId);
    if (topicCtx) {
      const tokens = estimateTokens(topicCtx.data.text);
      if (totalTokens + tokens <= tokenBudget) {
        contextItems.push(topicCtx);
        totalTokens += tokens;
      }
    }

    // 3. Assignment context
    if (options.includeAssignment) {
      const assignCtx = await this.getAssignmentContext(studentId, schoolId);
      if (assignCtx) {
        const tokens = estimateTokens(assignCtx.data.text);
        if (totalTokens + tokens <= tokenBudget) {
          contextItems.push(assignCtx);
          totalTokens += tokens;
        }
      }
    }

    // 4. Learning resources — requiresPermission: true in config
    if (options.includeResources) {
      const resourceCtx = await this.getLearningResourcesContext(
        studentId,
        schoolId,
        CONTEXT_LIMITS.MAX_RESOURCES
      );
      if (resourceCtx) {
        const tokens = estimateTokens(resourceCtx.data.text);
        if (totalTokens + tokens <= tokenBudget) {
          contextItems.push(resourceCtx);
          totalTokens += tokens;
        }
      }
    }

    // 5. Student learning history — privacy-sensitive, disabled by default
    if (options.includeHistory) {
      const historyCtx = await this.getStudentHistoryContext(
        studentId,
        options.maxHistoryMessages
      );
      if (historyCtx) {
        const tokens = estimateTokens(historyCtx.data.text);
        if (totalTokens + tokens <= tokenBudget) {
          contextItems.push(historyCtx);
          totalTokens += tokens;
        }
      }
    }

    return {
      contextItems,
      metadata: {
        totalItems: contextItems.length,
        estimatedTokens: totalTokens,
        tokenBudget,
        builtAt: new Date().toISOString(),
        sources: contextItems.map(c => c.source),
      },
    };
  },

  /**
   * Format context as a prompt-ready text block.
   */
  formatContextForPrompt(contextResult) {
    if (!contextResult?.contextItems || contextResult.contextItems.length === 0) {
      return null;
    }

    const lines = ['## Ngữ cảnh học tập'];

    for (const item of contextResult.contextItems) {
      lines.push(`\n### ${item.attribution.label}`);
      lines.push(truncateToTokens(item.data.text, CONTEXT_LIMITS.MAX_CONTEXT_PER_SOURCE));
    }

    const fullPrompt = lines.join('\n');
    return truncateToTokens(fullPrompt, contextResult.metadata.tokenBudget);
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMINISTRATION
  // ─────────────────────────────────────────────────────────────────────────────

  getContextConfig() {
    return {
      sources: CONTEXT_SOURCE_CONFIG,
      limits: CONTEXT_LIMITS,
      availableSources: Object.keys(CONTEXT_SOURCE_CONFIG).filter(
        src => CONTEXT_SOURCE_CONFIG[src].enabled
      ),
    };
  },

  isContextSourceAvailable(source, userRole) {
    const config = CONTEXT_SOURCE_CONFIG[source];
    if (!config) return false;
    if (config.privacySensitive && !config.enabled) return false;
    return true;
  },

  validateContextRequest({ studentId, schoolId }) {
    const errors = [];
    if (!studentId) errors.push('studentId is required');
    if (!schoolId) errors.push('schoolId is required');
    return { valid: errors.length === 0, errors };
  },
};
