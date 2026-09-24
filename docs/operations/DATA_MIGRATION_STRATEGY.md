# Chiến Lược Di Chuyển Dữ Liệu EduPortal (Data Migration Strategy)

Tài liệu hướng dẫn chiến lược và công cụ di chuyển dữ liệu từ SQLite (demo/dev) sang PostgreSQL (production) một cách an toàn.

---

## 1. Phân Tích Nguồn Dữ Liệu (Data Source Analysis)

### 1.1. SQLite (Development/Demo Database)

**Vị trí:** `./database.sqlite` (local file)

**Mục đích:** Development và demo local

**Dữ liệu hiện có:**
- ~17 users (admin, teachers, students, parents)
- ~4 classes (10A1, 10A2, 11A1, 7B)
- ~13 students
- ~12 subjects
- ~4 assignments với questions
- ~12 grades
- ~20 attendance records
- ~6 announcements
- ~8 study resources
- ~3 notices

**Hardcoded IDs pattern:**
```
Prefix        Entity              Example
──────────────────────────────────────────────
usr_*         Users               usr_student_1
std_*         Students            std_khang
cls_*         Classes             cls_10A1
sub_*         Subjects            sub_toan
asg_*         Assignments         asg_toan_10
grd_*         Grades              grd_1
att_*         Attendance          att_std_sample_1_2024-10-21
ay_*          Academic Years      ay_2024_2025
sem_*         Semesters           sem_2024_1
tch_*         Teachers            tch_mailan
prt_*         Parents             prt_vanhoi
ann_*         Announcements       ann_global_1
notif_*       Notices            notif_1
msg_*         Messages            msg_1
```

### 1.2. PostgreSQL (Neon Cloud - Production)

**Mục đích:** Production database - Single Source of Truth

**Schema:** 34 migrations (0001 → 0034)

**Multi-tenant ready:** Tất cả bảng đều có `school_id`

### 1.3. Phân Loại Dữ Liệu (Data Classification)

| Loại | Mô tả | Ví dụ | Migration |
|------|--------|--------|-----------|
| **Production Data** | Dữ liệu thật từ trường học | Users, Grades, Attendance | ✅ Migrate |
| **Demo Data** | Dữ liệu mẫu để test | Sample students, Test assignments | ⚠️ Selective |
| **Seed Data** | Dữ liệu khởi tạo hệ thống | Admin accounts, Default subjects | ⚠️ Preserve core |

---

## 2. Nguyên Tắc Di Chuyển An Toàn (Safety Principles)

### 2.1. Nguyên Tắc Bắt Buộc

1. **✅ Dry-Run First** — Luôn chạy dry-run trước khi thực hiện
2. **✅ Idempotent** — Migration có thể chạy nhiều lần mà không gây lỗi
3. **✅ Validates Source** — Kiểm tra dữ liệu nguồn trước khi migrate
4. **✅ Maps Legacy IDs** — Ánh xạ old IDs sang new IDs
5. **✅ Records Errors** — Ghi log tất cả lỗi để debug
6. **✅ No Silent Overwrites** — Không ghi đè records production mà không cảnh báo
7. **✅ Preserves Audit Trail** — Giữ nguyên audit logs nếu có

### 2.2. Nguyên Tắc Cấm

- ❌ **KHÔNG BAO GIỜ** chạy migration trực tiếp trên production mà không có backup
- ❌ **KHÔNG BAO GIỜ** xóa dữ liệu nguồn sau khi migrate (giữ lại để rollback)
- ❌ **KHÔNG BAO GIỜ** migrate dữ liệu demo vào production
- ❌ **KHÔNG BAO GIỜ** hardcode credentials hoặc secrets trong migration

---

## 3. ID Mapping Strategy

### 3.1. Legacy ID → New ID Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                    ID MAPPING STRATEGY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SQLite (Source)          PostgreSQL (Target)                   │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │ usr_*        │ ──────► │ UUID v4      │                    │
│  │ std_*        │         │ (Auto-gen)   │                    │
│  │ cls_*        │         └──────────────┘                    │
│  └──────────────┘                                                │
│                                                                  │
│  Mapping Table (migrations/migration_id_map.sql):                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ source_id      │ target_id      │ entity_type │ migrated_at│   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ usr_student_1 │ 550e8400-...  │ user       │ 2026-09-23 │   │
│  │ std_khang      │ 7c9e6679-... │ student    │ 2026-09-23 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Entity Dependency Order

```
Migration Order (Topological Sort):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. schools              (base entity)
2. users                (depends on schools)
3. academic_years       (depends on schools)
4. semesters            (depends on academic_years)
5. departments          (depends on schools)
6. subjects             (depends on schools, departments)
7. classes              (depends on schools, academic_years, teachers)
8. teachers             (depends on users, schools)
9. students             (depends on users, schools, classes)
10. parent_students     (depends on parents, students)
11. parent_student_links (depends on parents, students)
12. class_enrollments   (depends on classes, students)
13. teacher_assignments (depends on teachers, classes, subjects)
14. assignments         (depends on schools, creators)
15. assignment_questions (depends on assignments)
16. assignment_submissions (depends on assignments, students)
17. grades              (depends on students, schools)
18. student_competencies (depends on students)
19. attendance_sessions (depends on classes, teachers)
20. attendance_records   (depends on sessions, students)
21. attendance           (depends on students, classes)
22. timetable            (depends on classes, subjects, teachers)
23. tuition_invoices     (depends on students, schools)
24. invoice_line_items    (depends on invoices)
25. tuition_payments      (depends on invoices)
26. announcements        (depends on schools, authors)
27. announcement_reads   (depends on announcements, users)
28. notifications        (depends on users)
29. messages              (depends on users, students)
30. leave_requests        (depends on students, parents)
31. ai_tutor_messages     (depends on students)
32. study_resources       (depends on uploader)
33. audit_logs            (depends on users, schools)
34. refresh_tokens        (depends on users)
35. password_resets       (depends on users)
```

---

## 4. Migration Tool Architecture

### 4.1. Tool Components

```
server/database/migration/
├── migrate-data.js           # Main entry point
├── data-migrator.js          # Core migration engine
├── id-mapper.js              # Legacy ID → New ID mapping
├── validators/
│   ├── source-validator.js   # Validate SQLite data
│   └── target-validator.js    # Validate PostgreSQL data
├── strategies/
│   ├── school-strategy.js     # Schools migration
│   ├── user-strategy.js       # Users migration
│   ├── academic-strategy.js    # Academic years, semesters
│   ├── class-strategy.js       # Classes migration
│   ├── student-strategy.js     # Students migration
│   ├── grade-strategy.js       # Grades migration
│   └── attendance-strategy.js  # Attendance migration
├── reports/
│   └── migration-report.js     # Generate migration reports
└── config/
    └── migration-config.js      # Migration configuration
```

### 4.2. Migration Modes

```javascript
// Migration Modes
const MIGRATION_MODES = {
  DRY_RUN: 'dry-run',      // Chỉ kiểm tra, không thực hiện
  VALIDATE: 'validate',    // Validate dữ liệu nguồn
  PREVIEW: 'preview',      // Xem trước những gì sẽ migrate
  EXECUTE: 'execute',      // Thực hiện migration
  ROLLBACK: 'rollback'     // Rollback migration (nếu có backup)
};
```

---

## 5. Migration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA MIGRATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │ PRE-MIGRATE │ ──► │   VALIDATE  │ ──► │  ID MAPPING & DEPENDENCY│   │
│  │   BACKUP    │     │   SOURCE    │     │        ANALYSIS         │   │
│  └─────────────┘     └─────────────┘     └─────────────────────────┘   │
│         │                   │                      │                     │
│         ▼                   ▼                      ▼                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │   DRY RUN   │ ──► │   PREVIEW   │ ──► │       EXECUTE           │   │
│  │   (Always)  │     │   CHANGES   │     │       MIGRATION         │   │
│  └─────────────┘     └─────────────┘     └─────────────────────────┘   │
│                                                          │             │
│                                                          ▼             │
│                                              ┌─────────────────────────┐ │
│                                              │   POST-MIGRATION        │ │
│                                              │   VALIDATION            │ │
│                                              └─────────────────────────┘ │
│                                                          │             │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    VERIFICATION & REPORT                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │   │
│  │  │ Row Counts │  │ Data Sample │  │ Error Summary & Actions │  │   │
│  │  └────────────┘  └────────────┘  └────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Chi Tiết Từng Entity

### 6.1. Schools

```javascript
// Strategy: SKIP demo schools, MERGE production schools
const schoolStrategy = {
  source: 'sqlite',
  sourceTable: 'schools',
  
  // Demo schools → SKIP
  skipPatterns: [
    'sch_demo_*',
    'sch_test_*',
    /^sch_[a-z]+_[a-z]+$/  // Generic pattern
  ],
  
  // Production schools → MIGRATE with ID mapping
  migrate: async (source, target, idMap) => {
    // Generate new UUID for each school
    const newSchoolId = generateUUID();
    
    // Map old school_id to new for dependent entities
    idMap.add('school', source.id, newSchoolId);
    
    return {
      id: newSchoolId,
      name: source.name,
      code: source.code,
      // ... other fields
    };
  }
};
```

### 6.2. Users

```javascript
// Strategy: SELECTIVE migration based on role and data quality
const userStrategy = {
  // Always migrate: Admin, Teachers (with verified profiles)
  // Conditionally migrate: Students (if real data)
  // Skip: Demo users (usr_demo_*, test_*)
  
  skipPatterns: [
    'usr_demo_*',
    'usr_test_*',
    'usr_sample_*',
    /^.*@example\.com$/,
    /^.*test.*@/  // Email containing 'test'
  ],
  
  requiredFields: ['email', 'password_hash', 'role', 'name'],
  
  transform: (source) => ({
    id: generateUUID(),  // Always generate new ID
    email: source.email.toLowerCase().trim(),
    username: source.username,
    role: normalizeRole(source.role),  // Ensure valid role
    name: source.name.trim(),
    // ... other fields
  })
};
```

### 6.3. Students

```javascript
// Strategy: MIGRATE real students, SKIP demo students
const studentStrategy = {
  // Students linked to demo users → SKIP
  skipConditions: [
    { field: 'user_id', pattern: 'usr_sample_*' },
    { field: 'user_id', pattern: 'usr_demo_*' },
    // Students without real enrollment
    { field: 'enrollment_status', value: 'test' }
  ],
  
  // Update student_code if missing
  transform: (source, idMap) => ({
    id: generateUUID(),
    user_id: idMap.resolve('user', source.user_id),
    current_class_id: idMap.resolve('class', source.class_id),
    school_id: idMap.resolve('school', source.school_id),
    student_code: source.student_code || generateStudentCode(),
    // ... other fields
  })
};
```

### 6.4. Grades

```javascript
// Strategy: MIGRATE all grades for migrated students
const gradeStrategy = {
  // Only migrate grades for students that were migrated
  filter: async (source, idMap) => {
    const studentId = idMap.resolve('student', source.student_id);
    return studentId !== null;  // Only if student was migrated
  },
  
  transform: (source, idMap) => ({
    id: generateUUID(),
    student_id: idMap.resolve('student', source.student_id),
    school_id: idMap.resolve('school', source.school_id),
    academic_year_id: idMap.resolve('academic_year', source.academic_year_id),
    semester_id: idMap.resolve('semester', source.semester_id),
    // ... other fields
  })
};
```

---

## 7. Validation Rules

### 7.1. Source Validation

```javascript
// validators/source-validator.js
const sourceValidationRules = {
  users: {
    requiredFields: ['id', 'email', 'password_hash', 'role', 'name'],
    fieldTypes: {
      email: 'string',
      role: ['admin', 'teacher', 'student', 'parent'],
      password_hash: 'string'  // Must be bcrypt hash
    },
    dataQuality: {
      email: (v) => isValidEmail(v),
      password_hash: (v) => v.startsWith('$2') && v.length >= 60,
      name: (v) => v.length >= 2 && v.length <= 100
    }
  },
  
  students: {
    requiredFields: ['id', 'user_id', 'class_id'],
    referentialIntegrity: {
      user_id: 'users',
      class_id: 'classes'
    }
  },
  
  grades: {
    requiredFields: ['id', 'student_id', 'subject', 'score'],
    scoreRange: {
      score: { min: 0, max: 10 },
      max_score: { min: 0, max: 10 }
    }
  }
};
```

### 7.2. Target Validation

```javascript
// validators/target-validator.js
const targetValidationRules = {
  // Check if record already exists
  conflicts: 'ERROR',  // ERROR, SKIP, OVERWRITE
  
  // Check required fields in PostgreSQL schema
  schemaCompliance: true,
  
  // Check foreign key constraints
  foreignKeys: true,
  
  // Check data types
  dataTypes: true
};
```

---

## 8. Error Handling

### 8.1. Error Categories

| Category | Code | Action |
|----------|------|--------|
| **VALIDATION_ERROR** | E001 | Log & skip record |
| **REFERENCE_ERROR** | E002 | Log & skip record |
| **CONSTRAINT_ERROR** | E003 | Log & skip record |
| **DUPLICATE_ERROR** | E004 | Skip or update based on config |
| **DATA_QUALITY_ERROR** | E005 | Log & skip record |
| **CRITICAL_ERROR** | E999 | Stop migration |

### 8.2. Error Log Format

```json
{
  "timestamp": "2026-09-23T14:30:00.000Z",
  "migration_id": "mig_20260923_001",
  "errors": [
    {
      "code": "E001",
      "entity": "users",
      "source_id": "usr_unknown",
      "field": "email",
      "message": "Invalid email format",
      "severity": "warning",
      "action": "skipped"
    },
    {
      "code": "E002",
      "entity": "grades",
      "source_id": "grd_99",
      "reference": "student_id",
      "target_id": "std_nonexistent",
      "message": "Referenced student not found in migration",
      "severity": "error",
      "action": "skipped"
    }
  ],
  "summary": {
    "total_errors": 2,
    "warnings": 1,
    "errors": 1,
    "critical_errors": 0
  }
}
```

---

## 9. Migration Report

### 9.1. Report Structure

```markdown
# EduPortal Data Migration Report
**Migration ID:** mig_20260923_001  
**Date:** 2026-09-23 14:30:00 UTC  
**Mode:** EXECUTE  
**Source:** SQLite (./database.sqlite)  
**Target:** PostgreSQL (Neon Cloud)  

---

## Summary

| Metric | Value |
|--------|-------|
| Total Records Processed | 1,234 |
| Successfully Migrated | 1,200 |
| Skipped | 30 |
| Errors | 4 |
| Duration | 45.2 seconds |

---

## Entity Breakdown

| Entity | Source Count | Migrated | Skipped | Errors |
|--------|-------------|----------|---------|--------|
| schools | 2 | 2 | 0 | 0 |
| users | 17 | 15 | 2 | 0 |
| classes | 4 | 4 | 0 | 0 |
| students | 13 | 11 | 2 | 0 |
| grades | 12 | 12 | 0 | 0 |
| ... | ... | ... | ... | ... |

---

## ID Mapping (Sample)

| Entity | Source ID | Target ID |
|--------|----------|----------|
| User | usr_student_1 | 550e8400-e29b-41d4-a716-446655440001 |
| Student | std_khang | 7c9e6679-7425-40de-944b-e07fc1f90ae7 |
| Class | cls_10A1 | 3f2504e0-4f89-11ed-9e57-0800200c9a66 |

---

## Errors

### Warnings (2)

1. **[E001]** users: `usr_demo_test` - Email format invalid, skipped
2. **[E001]** students: `std_demo_1` - Missing required field `class_id`, skipped

### Errors (2)

1. **[E002]** grades: `grd_99` - Referenced student `std_nonexistent` not found, skipped
2. **[E003]** attendance: `att_xxx` - Duplicate key constraint violation, skipped

---

## Recommendations

1. Manual review required for 2 skipped students
2. Verify grade continuity for student `std_khang`
3. Consider running data quality checks on source before next migration
```

---

## 10. Rollback Strategy

### 10.1. Rollback Triggers

- Migration errors > 5%
- Data integrity violations detected
- Business logic broken after migration

### 10.2. Rollback Procedure

```bash
# 1. Stop application
pm2 stop eduportal-backend

# 2. Restore from backup
pg_restore --clean --if-exists \
  -d "$STAGING_DATABASE_URL" \
  "backup_before_migration_20260923.dump"

# 3. Verify restoration
npm run db:status
npm test

# 4. Restart application
pm2 restart eduportal-backend

# 5. Verify system health
curl /api/health
```

---

## 11. Staging Migration Workflow

### 11.1. Step-by-Step Procedure

```bash
# ═══════════════════════════════════════════════════════════════════════
# EDUPORTAL DATA MIGRATION — STAGING WORKFLOW
# ═══════════════════════════════════════════════════════════════════════

# STEP 1: PREPARE
# ─────────────────────────────────────────────────────────────────────
# 1.1. Create backup of staging database
pg_dump "$STAGING_DATABASE_URL" \
  --format=custom \
  --file="backup_before_migration_$(date +%Y%m%d_%H%M%S).dump"

# 1.2. Export SQLite data to JSON for inspection
node server/database/migration/export-source.js \
  --source=sqlite \
  --output=./migration/data-export.json

# 1.3. Review exported data
cat ./migration/data-export.json | jq '.users | length'
cat ./migration/data-export.json | jq '.students | length'

# STEP 2: DRY RUN
# ─────────────────────────────────────────────────────────────────────
# 2.1. Validate source data
node server/database/migration/migrate-data.js \
  --mode=validate \
  --source=sqlite \
  --target=staging

# 2.2. Preview migration (no changes)
node server/database/migration/migrate-data.js \
  --mode=preview \
  --source=sqlite \
  --target=staging \
  --output=./migration/preview-report.md

# 2.3. Review preview report
cat ./migration/preview-report.md

# STEP 3: EXECUTE (if preview looks good)
# ─────────────────────────────────────────────────────────────────────
# 3.1. Run migration
node server/database/migration/migrate-data.js \
  --mode=execute \
  --source=sqlite \
  --target=staging \
  --report=./migration/migration-report-$(date +%Y%m%d).md

# 3.2. Review migration report
cat ./migration/migration-report-*.md

# STEP 4: VERIFY
# ─────────────────────────────────────────────────────────────────────
# 4.1. Run tests
npm test

# 4.2. Verify row counts
psql "$STAGING_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$STAGING_DATABASE_URL" -c "SELECT COUNT(*) FROM students;"

# 4.3. Sample data verification
psql "$STAGING_DATABASE_URL" -c "SELECT id, email, role FROM users LIMIT 5;"

# 4.4. Health check
curl http://localhost:5000/api/health

# STEP 5: BUSINESS VERIFICATION
# ─────────────────────────────────────────────────────────────────────
# 5.1. Login as migrated admin
# 5.2. Verify dashboard loads
# 5.3. Verify student grades display correctly
# 5.4. Verify attendance records

# ═══════════════════════════════════════════════════════════════════════
```

---

## 12. Checklist Trước Migration

```markdown
## Pre-Migration Checklist

### Infrastructure
- [ ] Backup của staging database đã được tạo
- [ ] Staging environment đang chạy
- [ ] PostgreSQL connection verified

### Data Quality
- [ ] Source data (SQLite) đã được export và review
- [ ] Invalid records đã được identified
- [ ] Demo data đã được marked để skip

### ID Mapping
- [ ] ID mapping strategy đã được defined
- [ ] Circular dependency đã được resolved
- [ ] Foreign key relationships đã được verified

### Validation
- [ ] Source validation rules đã được defined
- [ ] Target validation rules đã được defined
- [ ] Error handling strategy đã được documented

### Rollback
- [ ] Rollback procedure đã được documented
- [ ] Backup có thể được restore thành công
- [ ] Rollback test đã được performed

### Communication
- [ ] Stakeholders đã được notified
- [ ] Maintenance window đã được scheduled
- [ ] Support team đã được briefed
```

---

## 13. Quick Reference

```bash
# ═══════════════════════════════════════════════════════════════════════
# QUICK REFERENCE — DATA MIGRATION COMMANDS
# ═══════════════════════════════════════════════════════════════════════

# Export SQLite data
node server/database/migration/export-source.js --source=sqlite --output=data-export.json

# Validate source data
node server/database/migration/migrate-data.js --mode=validate --source=sqlite

# Dry-run preview
node server/database/migration/migrate-data.js --mode=preview --source=sqlite --target=staging

# Execute migration
node server/database/migration/migrate-data.js --mode=execute --source=sqlite --target=staging

# Generate migration report
node server/database/migration/migrate-data.js --mode=report --migration-id=mig_xxx

# Rollback (from backup)
pg_restore --clean --if-exists -d "$DATABASE_URL" "backup_file.dump"

# ═══════════════════════════════════════════════════════════════════════
```
