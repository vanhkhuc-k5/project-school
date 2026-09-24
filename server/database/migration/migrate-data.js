/**
 * EduPortal Data Migration Tool
 * 
 * Safely migrates data from SQLite (development/demo) to PostgreSQL (production)
 * 
 * Usage:
 *   node server/database/migration/migrate-data.js --mode=<mode> --source=<source> --target=<target>
 * 
 * Modes:
 *   validate  - Validate source data quality
 *   preview   - Show what would be migrated (dry-run)
 *   execute   - Execute the migration
 *   report    - Generate migration report
 * 
 * Examples:
 *   node server/database/migration/migrate-data.js --mode=validate --source=sqlite
 *   node server/database/migration/migrate-data.js --mode=preview --source=sqlite --target=staging
 *   node server/database/migration/migrate-data.js --mode=execute --source=sqlite --target=staging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import pg from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const MIGRATION_MODES = {
  DRY_RUN: 'dry-run',
  VALIDATE: 'validate',
  PREVIEW: 'preview',
  EXECUTE: 'execute',
  REPORT: 'report'
};

const DEFAULT_CONFIG = {
  // Source (SQLite)
  sqlitePath: process.env.SQ_LITE_PATH || './database.sqlite',
  
  // Target (PostgreSQL)
  pgConnectionString: process.env.DATABASE_URL || process.env.STAGING_DATABASE_URL,
  
  // Migration settings
  batchSize: 100,
  skipDemoData: true,
  generateReports: true,
  reportPath: './migration-reports',
  
  // Skip patterns for demo/test data
  skipPatterns: {
    users: [/^usr_demo_/, /^usr_test_/, /^usr_sample_/, /@example\.com$/, /test/i],
    students: [/^std_demo_/, /^std_test_/, /^std_sample_/],
    classes: [/^cls_demo_/, /^cls_test_/]
  }
};

// =============================================================================
// UTILITIES
// =============================================================================

function generateUUID() {
  return crypto.randomUUID();
}

function generateMigrationId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `mig_${timestamp}`;
}

function isDemoData(id, patterns) {
  if (!patterns || !id) return false;
  return patterns.some(pattern => {
    if (pattern instanceof RegExp) return pattern.test(id);
    return id.startsWith(pattern);
  });
}

// Sanitize string by removing control characters (used for data cleaning)
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // eslint-disable-next-line no-control-regex
  return str.trim().replace(/[\x00-\x1F\x7F]/g, '');
}

// =============================================================================
// MIGRATION REPORT
// =============================================================================

class MigrationReport {
  constructor(migrationId, mode) {
    this.migrationId = migrationId;
    this.mode = mode;
    this.startTime = new Date();
    this.entityStats = new Map();
    this.errors = [];
    this.warnings = [];
    this.skipped = [];
    this.migrated = [];
    this.idMappings = new Map();
  }
  
  addError(code, entity, sourceId, message, details = {}) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      code,
      entity,
      sourceId,
      message,
      ...details
    });
  }
  
  addWarning(code, entity, sourceId, message, details = {}) {
    this.warnings.push({
      timestamp: new Date().toISOString(),
      code,
      entity,
      sourceId,
      message,
      ...details
    });
  }
  
  addSkipped(entity, sourceId, reason) {
    this.skipped.push({ entity, sourceId, reason });
  }
  
  addMigrated(entity, sourceId, targetId) {
    this.migrated.push({ entity, sourceId, targetId });
    this.idMappings.set(`${entity}:${sourceId}`, targetId);
  }
  
  updateEntityStats(entity, stats) {
    const current = this.entityStats.get(entity) || { processed: 0, migrated: 0, skipped: 0, errors: 0 };
    this.entityStats.set(entity, {
      ...current,
      ...stats
    });
  }
  
  getIdMapping(entity, sourceId) {
    return this.idMappings.get(`${entity}:${sourceId}`);
  }
  
  generateReport() {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;
    
    const totalProcessed = Array.from(this.entityStats.values())
      .reduce((sum, s) => sum + (s.processed || 0), 0);
    const totalMigrated = Array.from(this.entityStats.values())
      .reduce((sum, s) => sum + (s.migrated || 0), 0);
    const totalSkipped = this.skipped.length;
    const totalErrors = this.errors.length;
    
    return {
      migrationId: this.migrationId,
      mode: this.mode,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: duration.toFixed(2),
      
      summary: {
        totalProcessed,
        totalMigrated,
        totalSkipped,
        totalErrors,
        successRate: totalProcessed > 0 
          ? ((totalMigrated / totalProcessed) * 100).toFixed(2) + '%' 
          : 'N/A'
      },
      
      entityStats: Object.fromEntries(this.entityStats),
      
      idMappingsSample: Array.from(this.idMappings.entries())
        .slice(0, 10)
        .map(([key, value]) => {
          const [entity, sourceId] = key.split(':');
          return { entity, sourceId, targetId: value };
        }),
      
      errors: this.errors,
      warnings: this.warnings,
      skipped: this.skipped,
      
      recommendations: this.generateRecommendations()
    };
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    if (this.errors.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review and resolve migration errors before production deployment'
      });
    }
    
    if (this.skipped.length > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        action: `Review ${this.skipped.length} skipped records for potential data recovery`
      });
    }
    
    const demoSkipped = this.skipped.filter(s => 
      s.reason?.includes('demo') || s.reason?.includes('test')
    );
    if (demoSkipped.length > 0) {
      recommendations.push({
        priority: 'INFO',
        action: `${demoSkipped.length} demo/test records were intentionally skipped`
      });
    }
    
    return recommendations;
  }
  
  saveReport() {
    const report = this.generateReport();
    const reportPath = path.join(DEFAULT_CONFIG.reportPath, `${this.migrationId}.json`);
    
    // Ensure directory exists
    if (!fs.existsSync(DEFAULT_CONFIG.reportPath)) {
      fs.mkdirSync(DEFAULT_CONFIG.reportPath, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
    
    return reportPath;
  }
  
  printSummary() {
    const report = this.generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Migration ID: ${report.migrationId}`);
    console.log(`Mode: ${report.mode}`);
    console.log(`Duration: ${report.durationSeconds}s`);
    console.log('');
    console.log('Summary:');
    console.log(`  Total Processed: ${report.summary.totalProcessed}`);
    console.log(`  ✅ Migrated: ${report.summary.totalMigrated}`);
    console.log(`  ⏭️  Skipped: ${report.summary.totalSkipped}`);
    console.log(`  ❌ Errors: ${report.summary.totalErrors}`);
    console.log(`  Success Rate: ${report.summary.successRate}`);
    console.log('');
    
    console.log('Entity Breakdown:');
    for (const [entity, stats] of Object.entries(report.entityStats)) {
      console.log(`  ${entity}: ${stats.migrated || 0}/${stats.processed || 0} migrated`);
    }
    
    if (report.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      report.errors.slice(0, 5).forEach(e => {
        console.log(`  [${e.code}] ${e.entity}: ${e.message}`);
      });
      if (report.errors.length > 5) {
        console.log(`  ... and ${report.errors.length - 5} more errors`);
      }
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(r => {
        console.log(`  [${r.priority}] ${r.action}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
    
    return report;
  }
}

// =============================================================================
// ID MAPPER
// =============================================================================

class IdMapper {
  constructor(report) {
    this.mappings = new Map();
    this.report = report;
  }
  
  addMapping(entityType, sourceId, targetId) {
    this.mappings.set(`${entityType}:${sourceId}`, targetId);
    this.report.addMigrated(entityType, sourceId, targetId);
  }
  
  resolve(entityType, sourceId) {
    if (!sourceId) return null;
    const targetId = this.mappings.get(`${entityType}:${sourceId}`);
    if (!targetId && sourceId) {
      // Auto-generate if not mapped (for consistent IDs)
      const newId = generateUUID();
      this.addMapping(entityType, sourceId, newId);
      return newId;
    }
    return targetId;
  }
  
  hasMapping(entityType, sourceId) {
    return this.mappings.has(`${entityType}:${sourceId}`);
  }
  
  getMapping(entityType, sourceId) {
    return this.mappings.get(`${entityType}:${sourceId}`);
  }
  
  getAllMappings(entityType) {
    const result = {};
    for (const [key, value] of this.mappings.entries()) {
      if (key.startsWith(`${entityType}:`)) {
        const sourceId = key.split(':')[1];
        result[sourceId] = value;
      }
    }
    return result;
  }
  
  saveMappings(migrationId) {
    const mappingsPath = path.join(DEFAULT_CONFIG.reportPath, `${migrationId}-mappings.json`);
    
    if (!fs.existsSync(DEFAULT_CONFIG.reportPath)) {
      fs.mkdirSync(DEFAULT_CONFIG.reportPath, { recursive: true });
    }
    
    const mappingsObj = Object.fromEntries(this.mappings);
    fs.writeFileSync(mappingsPath, JSON.stringify(mappingsObj, null, 2));
    console.log(`🗺️  ID mappings saved to: ${mappingsPath}`);
    
    return mappingsPath;
  }
}

// =============================================================================
// VALIDATORS
// =============================================================================

class SourceValidator {
  constructor(sqliteDb, config) {
    this.db = sqliteDb;
    this.config = config;
    this.validationErrors = [];
  }
  
  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
  
  validatePasswordHash(hash) {
    if (!hash || typeof hash !== 'string') return false;
    // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars
    return /^(\$2[aby]?\$[0-9]{2}\$)/.test(hash) && hash.length >= 60;
  }
  
  validateUsers() {
    console.log('🔍 Validating users...');
    const users = this.db.prepare('SELECT * FROM users').all();
    const validUsers = [];
    
    for (const user of users) {
      const errors = [];
      
      if (!this.validateEmail(user.email)) {
        errors.push('Invalid email format');
      }
      
      if (!this.validatePasswordHash(user.password_hash)) {
        errors.push('Invalid password hash (not bcrypt)');
      }
      
      if (!['admin', 'teacher', 'student', 'parent'].includes(user.role)) {
        errors.push(`Invalid role: ${user.role}`);
      }
      
      if (!user.name || user.name.trim().length < 2) {
        errors.push('Name too short or empty');
      }
      
      if (errors.length > 0) {
        this.validationErrors.push({
          entity: 'users',
          id: user.id,
          errors
        });
      } else {
        validUsers.push(user);
      }
    }
    
    console.log(`   Valid: ${validUsers.length}/${users.length}`);
    if (this.validationErrors.length > 0) {
      console.log(`   Invalid: ${this.validationErrors.length}`);
    }
    
    return validUsers;
  }
  
  validateStudents() {
    console.log('🔍 Validating students...');
    const students = this.db.prepare('SELECT * FROM students').all();
    const validStudents = [];
    
    for (const student of students) {
      const errors = [];
      
      if (!student.user_id) {
        errors.push('Missing user_id reference');
      }
      
      if (errors.length > 0) {
        this.validationErrors.push({
          entity: 'students',
          id: student.id,
          errors
        });
      } else {
        validStudents.push(student);
      }
    }
    
    console.log(`   Valid: ${validStudents.length}/${students.length}`);
    return validStudents;
  }
  
  validateGrades() {
    console.log('🔍 Validating grades...');
    const grades = this.db.prepare('SELECT * FROM grades').all();
    const validGrades = [];
    
    for (const grade of grades) {
      const errors = [];
      
      if (!grade.student_id) {
        errors.push('Missing student_id reference');
      }
      
      if (typeof grade.score !== 'number' || grade.score < 0 || grade.score > 10) {
        errors.push(`Invalid score: ${grade.score}`);
      }
      
      if (errors.length > 0) {
        this.validationErrors.push({
          entity: 'grades',
          id: grade.id,
          errors
        });
      } else {
        validGrades.push(grade);
      }
    }
    
    console.log(`   Valid: ${validGrades.length}/${grades.length}`);
    return validGrades;
  }
  
  validateAll() {
    console.log('\n📋 SOURCE DATA VALIDATION');
    console.log('='.repeat(50));
    
    const validUsers = this.validateUsers();
    const validStudents = this.validateStudents();
    const validGrades = this.validateGrades();
    
    console.log('\n' + '='.repeat(50));
    console.log(`Total validation errors: ${this.validationErrors.length}`);
    
    return {
      valid: {
        users: validUsers,
        students: validStudents,
        grades: validGrades
      },
      errors: this.validationErrors
    };
  }
}

// =============================================================================
// DATA MIGRATOR
// =============================================================================

class DataMigrator {
  constructor(sqliteDb, pgPool, idMapper, report, config) {
    this.sqliteDb = sqliteDb;
    this.pgPool = pgPool;
    this.idMapper = idMapper;
    this.report = report;
    this.config = config;
  }
  
  // =============================================================================
  // SCHOOLS
  // =============================================================================
  
  async migrateSchools(execute = false) {
    console.log('\n🏫 Migrating schools...');
    const schools = this.sqliteDb.prepare('SELECT * FROM schools').all();
    let migrated = 0, skipped = 0;
    
    for (const school of schools) {
      if (isDemoData(school.id, this.config.skipPatterns.users)) {
        this.report.addSkipped('schools', school.id, 'Demo school');
        skipped++;
        continue;
      }
      
      const targetId = generateUUID();
      this.idMapper.addMapping('school', school.id, targetId);
      
      if (execute) {
        const query = `
          INSERT INTO schools (id, name, code, short_name, address, district, ward, province, 
                             phone, email, website, logo_url, principal_name, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            code = EXCLUDED.code
        `;
        
        try {
          await this.pgPool.query(query, [
            targetId,
            school.name,
            school.code,
            school.short_name,
            school.address,
            school.district,
            school.ward,
            school.province,
            school.phone,
            school.email,
            school.website,
            school.logo_url,
            school.principal_name,
            school.is_active ?? 1
          ]);
          migrated++;
        } catch (err) {
          this.report.addError('E003', 'schools', school.id, err.message);
        }
      } else {
        migrated++;
      }
    }
    
    this.report.updateEntityStats('schools', { processed: schools.length, migrated, skipped, errors: 0 });
    console.log(`   ${execute ? 'Migrated' : 'Would migrate'}: ${migrated}, Skipped: ${skipped}`);
    return migrated;
  }
  
  // =============================================================================
  // USERS
  // =============================================================================
  
  async migrateUsers(execute = false) {
    console.log('\n👥 Migrating users...');
    const users = this.sqliteDb.prepare('SELECT * FROM users').all();
    let migrated = 0, skipped = 0;
    
    for (const user of users) {
      // Skip demo/test users
      if (isDemoData(user.id, this.config.skipPatterns.users)) {
        this.report.addSkipped('users', user.id, 'Demo/test user');
        skipped++;
        continue;
      }
      
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email)) {
        this.report.addSkipped('users', user.id, 'Invalid email format');
        skipped++;
        continue;
      }
      
      const targetId = generateUUID();
      this.idMapper.addMapping('user', user.id, targetId);
      
      if (execute) {
        const query = `
          INSERT INTO users (id, username, email, password_hash, role, name, code, phone, 
                           avatar, school_id, status, must_change_password, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            name = EXCLUDED.name
        `;
        
        try {
          await this.pgPool.query(query, [
            targetId,
            user.username,
            user.email.toLowerCase().trim(),
            user.password_hash,
            user.role,
            user.name.trim(),
            user.code,
            user.phone,
            user.avatar,
            this.idMapper.resolve('school', user.school_id),
            user.status || 'active',
            user.must_change_password ?? 1,
            user.is_active ?? 1
          ]);
          migrated++;
        } catch (err) {
          this.report.addError('E003', 'users', user.id, err.message);
        }
      } else {
        migrated++;
      }
    }
    
    this.report.updateEntityStats('users', { processed: users.length, migrated, skipped, errors: 0 });
    console.log(`   ${execute ? 'Migrated' : 'Would migrate'}: ${migrated}, Skipped: ${skipped}`);
    return migrated;
  }
  
  // =============================================================================
  // CLASSES
  // =============================================================================
  
  async migrateClasses(execute = false) {
    console.log('\n🏠 Migrating classes...');
    const classes = this.sqliteDb.prepare('SELECT * FROM classes').all();
    let migrated = 0, skipped = 0;
    
    for (const cls of classes) {
      if (isDemoData(cls.id, this.config.skipPatterns.classes)) {
        this.report.addSkipped('classes', cls.id, 'Demo class');
        skipped++;
        continue;
      }
      
      const targetId = generateUUID();
      this.idMapper.addMapping('class', cls.id, targetId);
      
      if (execute) {
        const query = `
          INSERT INTO classes (id, name, grade_level, academic_year, school_id, 
                             homeroom_teacher_id, max_students, room, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            grade_level = EXCLUDED.grade_level
        `;
        
        try {
          await this.pgPool.query(query, [
            targetId,
            cls.name,
            cls.grade_level,
            cls.academic_year,
            this.idMapper.resolve('school', cls.school_id),
            this.idMapper.resolve('user', cls.homeroom_teacher_id),
            cls.max_students ?? 45,
            cls.room,
            cls.status || 'active'
          ]);
          migrated++;
        } catch (err) {
          this.report.addError('E003', 'classes', cls.id, err.message);
        }
      } else {
        migrated++;
      }
    }
    
    this.report.updateEntityStats('classes', { processed: classes.length, migrated, skipped, errors: 0 });
    console.log(`   ${execute ? 'Migrated' : 'Would migrate'}: ${migrated}, Skipped: ${skipped}`);
    return migrated;
  }
  
  // =============================================================================
  // STUDENTS
  // =============================================================================
  
  async migrateStudents(execute = false) {
    console.log('\n📚 Migrating students...');
    const students = this.sqliteDb.prepare('SELECT * FROM students').all();
    let migrated = 0, skipped = 0;
    
    for (const student of students) {
      // Skip students linked to demo users
      if (isDemoData(student.id, this.config.skipPatterns.students)) {
        this.report.addSkipped('students', student.id, 'Demo student');
        skipped++;
        continue;
      }
      
      // Must have valid user_id
      if (!student.user_id || !this.idMapper.hasMapping('user', student.user_id)) {
        this.report.addSkipped('students', student.id, 'User not migrated');
        skipped++;
        continue;
      }
      
      const targetId = generateUUID();
      this.idMapper.addMapping('student', student.id, targetId);
      
      if (execute) {
        const query = `
          INSERT INTO students (id, user_id, class_id, school_id, current_class_id, 
                             student_code, parent_id, grade_level, gpa, class_rank, 
                             total_students, attendance_rate, dob, gender, address, 
                             enrollment_status, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            gpa = EXCLUDED.gpa,
            class_rank = EXCLUDED.class_rank
        `;
        
        try {
          await this.pgPool.query(query, [
            targetId,
            this.idMapper.resolve('user', student.user_id),
            this.idMapper.resolve('class', student.class_id),
            this.idMapper.resolve('school', student.school_id),
            this.idMapper.resolve('class', student.current_class_id),
            student.student_code,
            this.idMapper.resolve('user', student.parent_id),
            student.grade_level,
            student.gpa,
            student.class_rank,
            student.total_students,
            student.attendance_rate,
            student.dob,
            student.gender,
            student.address,
            student.enrollment_status || 'active',
            1
          ]);
          migrated++;
        } catch (err) {
          this.report.addError('E003', 'students', student.id, err.message);
        }
      } else {
        migrated++;
      }
    }
    
    this.report.updateEntityStats('students', { processed: students.length, migrated, skipped, errors: 0 });
    console.log(`   ${execute ? 'Migrated' : 'Would migrate'}: ${migrated}, Skipped: ${skipped}`);
    return migrated;
  }
  
  // =============================================================================
  // GRADES
  // =============================================================================
  
  async migrateGrades(execute = false) {
    console.log('\n📝 Migrating grades...');
    const grades = this.sqliteDb.prepare('SELECT * FROM grades').all();
    let migrated = 0, skipped = 0;
    
    for (const grade of grades) {
      // Must have valid student
      if (!grade.student_id || !this.idMapper.hasMapping('student', grade.student_id)) {
        this.report.addSkipped('grades', grade.id, 'Student not migrated');
        skipped++;
        continue;
      }
      
      const targetId = generateUUID();
      
      if (execute) {
        const query = `
          INSERT INTO grades (id, student_id, subject, test_name, score, max_score, 
                             coefficient, semester, teacher_name, comment, graded_at, 
                             status, school_id, academic_year_id, semester_id,
                             raw_score, subject_id, class_id, published_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO NOTHING
        `;
        
        try {
          await this.pgPool.query(query, [
            targetId,
            this.idMapper.resolve('student', grade.student_id),
            grade.subject,
            grade.test_name,
            grade.score,
            grade.max_score || 10,
            grade.coefficient || 1,
            grade.semester || 1,
            grade.teacher_name,
            grade.comment,
            grade.graded_at,
            grade.status || 'draft',
            this.idMapper.resolve('school', grade.school_id),
            this.idMapper.resolve('academic_year', grade.academic_year_id),
            this.idMapper.resolve('semester', grade.semester_id),
            grade.raw_score,
            this.idMapper.resolve('subject', grade.subject_id),
            this.idMapper.resolve('class', grade.class_id),
            grade.published_at
          ]);
          migrated++;
        } catch (err) {
          this.report.addError('E003', 'grades', grade.id, err.message);
        }
      } else {
        migrated++;
      }
    }
    
    this.report.updateEntityStats('grades', { processed: grades.length, migrated, skipped, errors: 0 });
    console.log(`   ${execute ? 'Migrated' : 'Would migrate'}: ${migrated}, Skipped: ${skipped}`);
    return migrated;
  }
  
  // =============================================================================
  // ACADEMIC YEARS & SEMESTERS
  // =============================================================================
  
  async migrateAcademicYears(execute = false) {
    console.log('\n📅 Migrating academic years and semesters...');
    
    const years = this.sqliteDb.prepare('SELECT * FROM academic_years').all();
    let migratedYears = 0, migratedSemesters = 0, skipped = 0;
    
    for (const year of years) {
      const targetId = generateUUID();
      this.idMapper.addMapping('academic_year', year.id, targetId);
      
      if (execute) {
        try {
          await this.pgPool.query(`
            INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current, semester_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
          `, [
            targetId,
            this.idMapper.resolve('school', year.school_id),
            year.name,
            year.start_date,
            year.end_date,
            year.is_current ?? 0,
            year.semester_number ?? 2
          ]);
          migratedYears++;
        } catch (err) {
          this.report.addError('E003', 'academic_years', year.id, err.message);
        }
      } else {
        migratedYears++;
      }
      
      // Migrate semesters for this year
      const semesters = this.sqliteDb.prepare(
        'SELECT * FROM semesters WHERE academic_year_id = ?'
      ).all(year.id);
      
      for (const sem of semesters) {
        const semTargetId = generateUUID();
        this.idMapper.addMapping('semester', sem.id, semTargetId);
        
        if (execute) {
          try {
            await this.pgPool.query(`
              INSERT INTO semesters (id, academic_year_id, school_id, name, semester_number, 
                                   start_date, end_date, is_current)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO NOTHING
            `, [
              semTargetId,
              targetId,
              this.idMapper.resolve('school', sem.school_id),
              sem.name,
              sem.semester_number || 1,
              sem.start_date,
              sem.end_date,
              sem.is_current ?? 0
            ]);
            migratedSemesters++;
          } catch (err) {
            this.report.addError('E003', 'semesters', sem.id, err.message);
          }
        } else {
          migratedSemesters++;
        }
      }
    }
    
    this.report.updateEntityStats('academic_years', { processed: years.length, migrated: migratedYears, skipped, errors: 0 });
    this.report.updateEntityStats('semesters', { processed: migratedSemesters, migrated: migratedSemesters, skipped: 0, errors: 0 });
    console.log(`   Academic years: ${migratedYears}, Semesters: ${migratedSemesters}`);
    return { years: migratedYears, semesters: migratedSemesters };
  }
  
  // =============================================================================
  // FULL MIGRATION
  // =============================================================================
  
  async migrateAll(execute = false) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 DATA MIGRATION ${execute ? 'EXECUTION' : 'PREVIEW'}`);
    console.log(`${'='.repeat(60)}`);
    
    const pgClient = await this.pgPool.connect();
    
    try {
      // Migration order matters (dependencies)
      await this.migrateSchools(execute);
      await this.migrateAcademicYears(execute);
      await this.migrateUsers(execute);
      await this.migrateClasses(execute);
      await this.migrateStudents(execute);
      await this.migrateGrades(execute);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ MIGRATION ${execute ? 'COMPLETED' : 'PREVIEW'} SUCCESSFULLY`);
      console.log(`${'='.repeat(60)}`);
      
    } finally {
      pgClient.release();
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  // Parse arguments
  let mode = MIGRATION_MODES.PREVIEW;
  let source = 'sqlite';
  let target = 'staging';
  
  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      mode = arg.split('=')[1];
    } else if (arg.startsWith('--source=')) {
      source = arg.split('=')[1];
    } else if (arg.startsWith('--target=')) {
      target = arg.split('=')[1];
    } else if (arg.startsWith('--skip-demo')) {
      config.skipDemoData = arg.split('=')[1] !== 'false';
    }
  }
  
  // Validate mode
  if (!Object.values(MIGRATION_MODES).includes(mode)) {
    console.error(`❌ Invalid mode: ${mode}`);
    console.log('Valid modes: validate, preview, execute, report');
    process.exit(1);
  }
  
  // Create migration report
  const migrationId = generateMigrationId();
  const report = new MigrationReport(migrationId, mode);
  
  console.log(`\n📋 EduPortal Data Migration Tool`);
  console.log(`Migration ID: ${migrationId}`);
  console.log(`Mode: ${mode}`);
  console.log(`Source: ${source}`);
  console.log(`Target: ${target}`);
  console.log(`Skip Demo Data: ${config.skipDemoData}`);
  
  // =========================================================================
  // MODE: VALIDATE
  // =========================================================================
  
  if (mode === MIGRATION_MODES.VALIDATE) {
    console.log('\n🔍 VALIDATION MODE - Checking source data quality...');
    
    // Open SQLite
    const sqlitePath = path.resolve(config.sqlitePath);
    if (!fs.existsSync(sqlitePath)) {
      console.error(`❌ SQLite database not found: ${sqlitePath}`);
      console.log('Run "npm run seed" first to create the database.');
      process.exit(1);
    }
    
    const sqliteDb = new Database(sqlitePath, { readonly: true });
    const validator = new SourceValidator(sqliteDb, config);
    
    const result = validator.validateAll();
    
    sqliteDb.close();
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Validation errors found:');
      result.errors.forEach(e => {
        console.log(`  [${e.entity}:${e.id}] ${e.errors.join(', ')}`);
      });
    }
    
    return;
  }
  
  // =========================================================================
  // MODE: PREVIEW / EXECUTE
  // =========================================================================
  
  // Check PostgreSQL connection
  if (!config.pgConnectionString) {
    console.error('❌ DATABASE_URL or STAGING_DATABASE_URL not set');
    console.log('Set environment variable before running migration:');
    console.log('  export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }
  
  // Open SQLite
  const sqlitePath = path.resolve(config.sqlitePath);
  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite database not found: ${sqlitePath}`);
    console.log('Run "npm run seed" first to create the database.');
    process.exit(1);
  }
  
  console.log(`\n📂 Opening SQLite database: ${sqlitePath}`);
  const sqliteDb = new Database(sqlitePath, { readonly: true });
  
  // Connect to PostgreSQL
  console.log(`🔗 Connecting to PostgreSQL...`);
  const pgPool = new pg.Pool({
    connectionString: config.pgConnectionString,
    ssl: { rejectUnauthorized: false },
    max: 5
  });
  
  try {
    // Test PostgreSQL connection
    await pgPool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
  
  // Create ID mapper
  const idMapper = new IdMapper(report);
  
  // Create migrator
  const migrator = new DataMigrator(sqliteDb, pgPool, idMapper, report, config);
  
  // Execute migration
  const execute = mode === MIGRATION_MODES.EXECUTE;
  
  if (execute) {
    console.log('\n⚠️  WARNING: This will modify the target database!');
    console.log('   Make sure you have a backup before proceeding.');
  }
  
  await migrator.migrateAll(execute);
  
  // Save ID mappings
  idMapper.saveMappings(migrationId);
  
  // Print summary
  report.printSummary();
  
  // Save report
  if (config.generateReports) {
    report.saveReport();
  }
  
  // Cleanup
  sqliteDb.close();
  await pgPool.end();
  
  // Exit with appropriate code
  if (report.errors.length > 0) {
    console.log('\n⚠️  Migration completed with errors. Review the report.');
    process.exit(1);
  }
  
  console.log('\n✅ Migration completed successfully!');
}

// Export for testing
export { DataMigrator, IdMapper, SourceValidator, MigrationReport, MIGRATION_MODES };

// Run if executed directly
const isMainModule = process.argv[1]?.endsWith('migrate-data.js');
if (isMainModule) {
  main().catch(err => {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}
