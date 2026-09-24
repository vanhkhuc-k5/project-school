// =============================================================================
// Audit Repository — Database Operations
// G36 Centralized Audit Trail
// =============================================================================
import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const auditRepository = {
  /**
   * Create a new audit log entry
   */
  async create(entry) {
    const {
      id,
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      schoolId,
      severity,
      category,
      details,
      ipAddress,
      correlationId,
      beforeState,
      afterState,
      metadata,
      createdAt,
    } = entry;

    // Store JSON fields as JSON strings
    const detailsJson = details ? JSON.stringify(details) : null;
    const beforeStateJson = beforeState ? JSON.stringify(beforeState) : null;
    const afterStateJson = afterState ? JSON.stringify(afterState) : null;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO audit_logs (
          id, actor_id, actor_name, actor_role, action, entity_type, entity_id,
          school_id, severity, category, details, ip_address, correlation_id,
          before_state, after_state, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        id,
        actorId,
        actorName,
        actorRole,
        action,
        entityType,
        entityId,
        schoolId,
        severity,
        category,
        detailsJson,
        ipAddress,
        correlationId,
        beforeStateJson,
        afterStateJson,
        metadataJson,
        createdAt,
      ]);
      return entry;
    }

    // SQLite fallback
    db.prepare(`
      INSERT INTO audit_logs (
        id, actor_id, actor_name, actor_role, action, entity_type, entity_id,
        school_id, severity, category, details, ip_address, correlation_id,
        before_state, after_state, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      schoolId,
      severity,
      category,
      detailsJson,
      ipAddress,
      correlationId,
      beforeStateJson,
      afterStateJson,
      metadataJson,
      createdAt,
    );
    return entry;
  },

  /**
   * Find audit log by ID
   */
  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM audit_logs WHERE id = $1
      `, [id]);
      return res.rows[0] || null;
    }

    return db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) || null;
  },

  /**
   * Find many audit logs with filters
   */
  async findMany(filters = {}) {
    const {
      actorId,
      action,
      entityType,
      entityId,
      schoolId,
      severity,
      category,
      startDate,
      endDate,
      correlationId,
      page = 1,
      limit = 50,
    } = filters;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(actorId);
    }

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(entityType);
    }

    if (entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(entityId);
    }

    if (schoolId) {
      conditions.push(`school_id = $${paramIndex++}`);
      params.push(schoolId);
    }

    if (severity) {
      if (Array.isArray(severity)) {
        const placeholders = severity.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`severity IN (${placeholders})`);
        params.push(...severity);
      } else {
        conditions.push(`severity = $${paramIndex++}`);
        params.push(severity);
      }
    }

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (correlationId) {
      conditions.push(`correlation_id = $${paramIndex++}`);
      params.push(correlationId);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const offset = (page - 1) * limit;
    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;

    // Count total
    let total = 0;
    if (isPostgresConfigured()) {
      const countRes = await pgQuery(`
        SELECT COUNT(*) as total FROM audit_logs ${whereClause}
      `, params);
      total = parseInt(countRes.rows[0]?.total || 0, 10);
    } else {
      const countRow = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`).get(...params);
      total = countRow?.total || 0;
    }

    // Get logs
    const orderBy = 'ORDER BY created_at DESC';
    const limitClause = `LIMIT $${limitParam} OFFSET $${offsetParam}`;
    params.push(limit, offset);

    let logs = [];
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM audit_logs ${whereClause} ${orderBy} ${limitClause}
      `, params);
      logs = res.rows;
    } else {
      logs = db.prepare(`SELECT * FROM audit_logs ${whereClause} ${orderBy} ${limitClause}`).all(...params);
    }

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get audit trail for a specific entity
   */
  async findByEntity(entityType, entityId, options = {}) {
    return this.findMany({
      entityType,
      entityId,
      ...options,
    });
  },

  /**
   * Get audit trail for a specific actor
   */
  async findByActor(actorId, options = {}) {
    return this.findMany({
      actorId,
      ...options,
    });
  },

  /**
   * Get security events (warnings and critical)
   */
  async findSecurityEvents(schoolId, options = {}) {
    return this.findMany({
      schoolId,
      severity: ['WARNING', 'CRITICAL'],
      ...options,
    });
  },

  /**
   * Get audit logs by correlation ID (same request)
   */
  async findByCorrelationId(correlationId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM audit_logs 
        WHERE correlation_id = $1 
        ORDER BY created_at ASC
      `, [correlationId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT * FROM audit_logs 
      WHERE correlation_id = ? 
      ORDER BY created_at ASC
    `).all(correlationId);
  },
};
