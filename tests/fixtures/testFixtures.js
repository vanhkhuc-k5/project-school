/**
 * Test Fixtures - EduPortal
 * 
 * Provides deterministic, production-independent test data.
 * Used by integration tests and E2E tests.
 * 
 * This ensures all tests have consistent, reproducible data
 * regardless of execution order or environment.
 */

import { db } from '../../server/db.js';
import bcrypt from 'bcryptjs';
import { config } from '../../server/config/env.js';

// BCRYPT_ROUNDS must match config.BCRYPT_ROUNDS from env.js
// In test mode: 4 rounds (set by env.js)
// In other modes: varies based on environment
const BCRYPT_ROUNDS = config.BCRYPT_ROUNDS;
const passwordHash = bcrypt.hashSync('123456', BCRYPT_ROUNDS);

// ============================================================
// CANONICAL TEST WORLD
// ============================================================

// Schools
export const SCHOOL_A = 'sch_bacau';  // THPT Chuyên Bắc Âu
export const SCHOOL_B = 'sch_hoasen'; // THCS Hoa Sen

// Academic Years
export const ACADEMIC_YEAR_A = 'ay_2025_2026';
export const ACADEMIC_YEAR_B = 'ay_2025_2026_b';

// Semesters
export const SEMESTER_A1 = 'sem_2025_hk1';
export const SEMESTER_A2 = 'sem_2025_hk2';
export const SEMESTER_B1 = 'sem_2025_hk1_b';

// Users
export const USERS = {
  // New canonical users
  adminA: 'usr_admin_a',
  principalA: 'usr_principal_a',
  teacherA: 'usr_teacher_a',
  teacherA2: 'usr_teacher_a2',
  teacherB: 'usr_teacher_b',
  studentA1: 'usr_student_a1',
  studentA2: 'usr_student_a2',
  studentB1: 'usr_student_b1',
  parentA: 'usr_parent_a',
  parentB: 'usr_parent_b',
  // Legacy seeded users used by integration tests
  admin: 'usr_admin_school',
  teacherMailan: 'usr_teacher_mailan',
  studentKhang: 'usr_student_khang',
  parentVanHoi: 'usr_parent_vanhoi',
};

// Classes
export const CLASSES = {
  classA1: 'cls_10a1',
  classA2: 'cls_10a2',
  classB1: 'cls_7b',
};

// Legacy students used by integration tests
export const STUDENTS = {
  khang: 'stu_khang',  // matches parent_endpoints.test.js student "std_khoi"
};

// Subjects
export const SUBJECTS = {
  math: 'sub_math',
  physics: 'sub_physics',
  literature: 'sub_literature',
};

// ============================================================
// FIXTURE INITIALIZATION
// ============================================================

/**
 * Initialize all test fixtures.
 * This function is idempotent - safe to call multiple times.
 */
export function initializeTestFixtures() {
  console.log('🎯 Initializing test fixtures...');

  createSchools();
  createAcademicYears();
  createSemesters();
  createDepartments();
  createUsers();
  createClasses();
  createSubjects();
  createTeacherProfiles();
  createParentProfiles();
  createStudentProfiles();
  createLegacyStudentKhang();
  createParentStudentLinks();
  createClassEnrollments();
  createTeacherAssignments();
  createTimetable();
  createAssignments();
  createAssignmentQuestions();
  createSubmissions();
  createGrades();
  createAttendance();
  createAnnouncements();
  createTuitionInvoices();
  createNotifications();
  createMessages();
  createLeaveRequests();

  // Reset lockout state in case fixtures were loaded into a DB with stale failed_login state
  try { db.exec(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL`); } catch (_) {}

  console.log('✅ Test fixtures initialized');
}

/**
 * Reset fixtures for clean test state.
 * Only resets tables that tests modify.
 */
export function resetTestFixtures() {
  console.log('🔄 Resetting test fixtures...');
  
  // Clear mutable tables
  db.exec(`
    DELETE FROM assignment_submissions;
    DELETE FROM grades;
    DELETE FROM leave_requests;
    DELETE FROM messages;
    DELETE FROM notifications;
    DELETE FROM tuition_payments;
  `);
  // Reset failed login attempts and lockouts so auth tests are deterministic
  db.exec(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL`);
  
  console.log('✅ Test fixtures reset');
}

// ============================================================
// HELPERS
// ============================================================

function safeInsert(table, sql, ...params) {
  try {
    db.prepare(sql).run(...params);
  } catch (err) {
    // Ignore duplicate key errors (idempotent)
    if (!err.message.includes('UNIQUE constraint')) {
      // Also ignore NOT NULL / CHECK constraint violations for optional fields
      const ignorable = [
        'UNIQUE constraint',
        'NOT NULL constraint failed',  // optional column not provided
        'CHECK constraint failed',       // optional enum value
        'FOREIGN KEY constraint',
      ].some(prefix => err.message.includes(prefix));
      if (!ignorable) {
        console.warn(`[Fixture] ${table}: ${err.message}`);
      }
    }
  }
}

// ============================================================
// SCHOOLS
// ============================================================

function createSchools() {
  safeInsert('schools', `
    INSERT OR IGNORE INTO schools (id, name, code, short_name, address, phone, email, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, SCHOOL_A, 'Trường THPT Chuyên Bắc Âu', 'BACAU_THPT', 'THPT Bắc Âu', '123 Đường ABC, Quận 1, TP.HCM', '024.3855.8888', 'contact@bacau.edu.vn', 1);
  
  safeInsert('schools', `
    INSERT OR IGNORE INTO schools (id, name, code, short_name, address, phone, email, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, SCHOOL_B, 'THCS Hoa Sen', 'HOASEN', 'THCS Hoa Sen', '456 Đường XYZ, Quận 2, TP.HCM', '0902345678', 'contact@hoasen.edu.vn', 1);
}

// ============================================================
// ACADEMIC YEARS
// ============================================================

function createAcademicYears() {
  // Use INSERT OR REPLACE to ensure is_current=1 is applied even if row already exists
  // (seed.js may have inserted it with is_current=0 or different value)
  safeInsert('academic_years', `
    INSERT OR REPLACE INTO academic_years (id, school_id, name, start_date, end_date, is_current, semester_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, ACADEMIC_YEAR_A, SCHOOL_A, '2024 - 2025', '2024-09-01', '2025-05-31', 1, 2);
  
  safeInsert('academic_years', `
    INSERT OR REPLACE INTO academic_years (id, school_id, name, start_date, end_date, is_current, semester_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, ACADEMIC_YEAR_B, SCHOOL_B, '2024 - 2025', '2024-09-01', '2025-05-31', 1, 2);

  // Ensure ONLY sch_bacau's year has is_current=1 and other schools' years have is_current=0
  // This fixes cases where seed.js or other fixtures may have set multiple years as current
  try {
    db.prepare(`UPDATE academic_years SET is_current = 0 WHERE school_id = ? AND id != ?`)
      .run(SCHOOL_A, ACADEMIC_YEAR_A);
    db.prepare(`UPDATE academic_years SET is_current = 0 WHERE school_id = ? AND id != ?`)
      .run(SCHOOL_B, ACADEMIC_YEAR_B);
    db.prepare(`UPDATE academic_years SET is_current = 1 WHERE id = ?`)
      .run(ACADEMIC_YEAR_A);
    db.prepare(`UPDATE academic_years SET is_current = 1 WHERE id = ?`)
      .run(ACADEMIC_YEAR_B);
  } catch (_) {}
}

// ============================================================
// SEMESTERS
// ============================================================

function createSemesters() {
  // Use INSERT OR REPLACE to ensure data is correct even if row already exists
  safeInsert('semesters', `
    INSERT OR REPLACE INTO semesters (id, academic_year_id, school_id, name, start_date, end_date, is_current, semester_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, SEMESTER_A1, ACADEMIC_YEAR_A, SCHOOL_A, 'Học kỳ 1', '2024-09-01', '2024-12-31', 1, 1);
  
  safeInsert('semesters', `
    INSERT OR REPLACE INTO semesters (id, academic_year_id, school_id, name, start_date, end_date, is_current, semester_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, SEMESTER_A2, ACADEMIC_YEAR_A, SCHOOL_A, 'Học kỳ 2', '2025-01-01', '2025-05-31', 0, 2);
  
  // School B semester
  safeInsert('semesters', `
    INSERT OR REPLACE INTO semesters (id, academic_year_id, school_id, name, start_date, end_date, is_current, semester_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, SEMESTER_B1, ACADEMIC_YEAR_B, SCHOOL_B, 'Học kỳ 1', '2024-09-01', '2024-12-31', 1, 1);

  // Ensure ONLY the designated semester has is_current=1 per school
  try {
    db.prepare(`UPDATE semesters SET is_current = 0 WHERE school_id = ? AND academic_year_id = ?`)
      .run(SCHOOL_A, ACADEMIC_YEAR_A);
    db.prepare(`UPDATE semesters SET is_current = 0 WHERE school_id = ? AND academic_year_id = ?`)
      .run(SCHOOL_B, ACADEMIC_YEAR_B);
    db.prepare(`UPDATE semesters SET is_current = 1 WHERE id = ?`)
      .run(SEMESTER_A1);
    db.prepare(`UPDATE semesters SET is_current = 1 WHERE id = ?`)
      .run(SEMESTER_B1);
  } catch (_) {}
}

// ============================================================
// USERS
// ============================================================

function createUsers() {
  // Admin & Leadership
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.adminA, 'admin_a', 'admin_a@test.edu.vn', passwordHash, 'admin', 'Nguyễn Admin', 'ADMIN-A001', '0901111111', SCHOOL_A, 0);
  
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.principalA, 'principal_a', 'principal_a@test.edu.vn', passwordHash, 'admin', 'Trần Hiệu Trưởng', 'HT-A001', '0902222222', SCHOOL_A, 0);
  
  // Teachers
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.teacherA, 'teacher_a', 'teacher_a@test.edu.vn', passwordHash, 'teacher', 'Cô Giáo A', 'GV-A001', '0903333333', SCHOOL_A, 0);
  
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.teacherA2, 'teacher_a2', 'teacher_a2@test.edu.vn', passwordHash, 'teacher', 'Thầy Giáo A2', 'GV-A002', '0904444444', SCHOOL_A, 0);
  
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.teacherB, 'teacher_b', 'teacher_b@test.edu.vn', passwordHash, 'teacher', 'Thầy Giáo B', 'GV-B001', '0905555555', SCHOOL_B, 0);
  
  // Students
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.studentA1, 'student_a1', 'student_a1@test.edu.vn', passwordHash, 'student', 'Học Sinh A1', 'HS-A001', '0906666666', SCHOOL_A, 0);
  
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.studentA2, 'student_a2', 'student_a2@test.edu.vn', passwordHash, 'student', 'Học Sinh A2', 'HS-A002', '0907777777', SCHOOL_A, 0);
  
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.studentB1, 'student_b1', 'student_b1@test.edu.vn', passwordHash, 'student', 'Học Sinh B1', 'HS-B001', '0908888888', SCHOOL_B, 0);
  
  // Hoa Sen student for tenant isolation tests
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_student_hoasen', 'student_hoasen', 'student_hoasen@test.edu.vn', passwordHash, 'student', 'Học Sinh Hoa Sen', 'HS-HS001', '0909999000', SCHOOL_B, 0);
  
  // Hoa Sen teacher for tenant isolation tests
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_teacher_hoasen', 'teacher_hoasen', 'teacher_hoasen@test.edu.vn', passwordHash, 'teacher', 'Giáo Viên Hoa Sen', 'GV-HS001', '0909999001', SCHOOL_B, 0);
  
  // Parents
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.parentA, 'parent_a', 'parent_a@test.edu.vn', passwordHash, 'parent', 'Phụ Huynh A', 'PH-A001', '0909999999', SCHOOL_A, 0);
  
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.parentB, 'parent_b', 'parent_b@test.edu.vn', passwordHash, 'parent', 'Phụ Huynh B', 'PH-B001', '0910000000', SCHOOL_B, 0);

  // Legacy seeded users for backward compatibility with integration tests
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.admin, 'admin', 'admin@school.edu.vn', passwordHash, 'admin', 'Quản Trị Viên', 'ADMIN001', '0900000001', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_minhkhang', 'minhkhang', 'minhkhang@school.edu.vn', passwordHash, 'student', 'Nguyễn Minh Khang', 'HS-2024-889', '0900000003', SCHOOL_A, 0);

  // School B admin for multi-tenant tests
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_admin_hoasen', 'admin_hoasen', 'admin@hoasen.edu.vn', passwordHash, 'admin', 'Quản Trị Viên Hoa Sen', 'ADMIN-HS001', '0900000100', SCHOOL_B, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_hoainam', 'hoainam', 'bgh.hoainam@school.edu.vn', passwordHash, 'admin', 'Trần Hóa Nam', 'BGH001', '0900000005', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_nguyenvanteo', 'nguyenvanteo', 'nguyenvanteo@school.edu.vn', passwordHash, 'teacher', 'Nguyễn Văn Tèo', 'GV002', '0900000010', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_nguyenvana', 'nguyenvana', 'nguyenvana@school.edu.vn', passwordHash, 'teacher', 'Nguyễn Văn A', 'GV003', '0900000011', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_giaovien1', 'giaovien1', 'giaovien1@school.edu.vn', passwordHash, 'teacher', 'Giáo Viên Một', 'GV101', '0900000020', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_hocsinh1', 'hocsinh1', 'hocsinh1@school.edu.vn', passwordHash, 'student', 'Học Sinh Một', 'HS001', '0900000030', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_test_student', 'teststudent', 'student@school.edu.vn', passwordHash, 'student', 'Test Student', 'TST001', '0900000040', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'usr_teacher_test', 'teachertest', 'teacher@test.com', passwordHash, 'teacher', 'Teacher Test', 'TT001', '0900000050', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.teacherMailan, 'mailan', 'mailan@school.edu.vn', passwordHash, 'teacher', 'Cô Mai Lan', 'GV001', '0900000002', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.studentKhang, 'khanghs', 'khang@student.school.edu.vn', passwordHash, 'student', 'Nguyễn Minh Khang', 'HS-2024-889', '0900000003', SCHOOL_A, 0);

  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.parentVanHoi, 'vanhoi', 'vanhoi@parent.school.edu.vn', passwordHash, 'parent', 'Nguyễn Văn Hồi', 'PH001', '0900000004', SCHOOL_A, 0);
}

// ============================================================
// CLASSES
// ============================================================

function createClasses() {
  // School A classes
  safeInsert('classes', `
    INSERT OR IGNORE INTO classes (id, name, grade_level, academic_year, school_id, homeroom_teacher_id, academic_year_id, grade_level_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, CLASSES.classA1, '10A1', 10, '2024-2025', SCHOOL_A, USERS.teacherA, ACADEMIC_YEAR_A, 'gl_10');
  
  safeInsert('classes', `
    INSERT OR IGNORE INTO classes (id, name, grade_level, academic_year, school_id, homeroom_teacher_id, academic_year_id, grade_level_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, CLASSES.classA2, '10A2', 10, '2024-2025', SCHOOL_A, USERS.teacherA2, ACADEMIC_YEAR_A, 'gl_10');
  
  // School B class (10A1 - for tenant isolation tests)
  safeInsert('classes', `
    INSERT OR IGNORE INTO classes (id, name, grade_level, academic_year, school_id, homeroom_teacher_id, academic_year_id, grade_level_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'cls_hoasen_10A1', '10A1', 10, '2024-2025', SCHOOL_B, USERS.teacherB, ACADEMIC_YEAR_B, 'gl_10');
  
  // School B class (7B - standard)
  safeInsert('classes', `
    INSERT OR IGNORE INTO classes (id, name, grade_level, academic_year, school_id, homeroom_teacher_id, academic_year_id, grade_level_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, CLASSES.classB1, '7B', 7, '2024-2025', SCHOOL_B, USERS.teacherB, ACADEMIC_YEAR_B, 'gl_7');
}

// ============================================================
// SUBJECTS
// ============================================================

function createSubjects() {
  // School A subjects
  safeInsert('subjects', `
    INSERT OR IGNORE INTO subjects (id, school_id, name, code, grade_levels, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `, SUBJECTS.math, SCHOOL_A, 'Toán học', 'MATH', '10,11,12', 1);
  
  safeInsert('subjects', `
    INSERT OR IGNORE INTO subjects (id, school_id, name, code, grade_levels, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `, SUBJECTS.physics, SCHOOL_A, 'Vật lý', 'PHY', '10,11,12', 1);
  
  safeInsert('subjects', `
    INSERT OR IGNORE INTO subjects (id, school_id, name, code, grade_levels, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `, SUBJECTS.literature, SCHOOL_A, 'Ngữ văn', 'LIT', '10,11,12', 1);
  
  // School B subjects
  safeInsert('subjects', `
    INSERT OR IGNORE INTO subjects (id, school_id, name, code, grade_levels, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'sub_math_b', SCHOOL_B, 'Toán học', 'MATH', '6,7,8,9', 1);
}

// ============================================================
// TEACHER PROFILES
// ============================================================

function createTeacherProfiles() {
  safeInsert('teachers', `
    INSERT OR IGNORE INTO teachers (id, user_id, school_id, specialty, status, employee_id, subjects)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'tch_a', USERS.teacherA, SCHOOL_A, 'Toán học', 'active', 'GV-A001', '["Toán 10"]');
  
  safeInsert('teachers', `
    INSERT OR IGNORE INTO teachers (id, user_id, school_id, specialty, status, employee_id, subjects)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'tch_a2', USERS.teacherA2, SCHOOL_A, 'Vật lý', 'active', 'GV-A002', '["Vật lý 10"]');
  
  safeInsert('teachers', `
    INSERT OR IGNORE INTO teachers (id, user_id, school_id, specialty, status, employee_id, subjects)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'tch_b', USERS.teacherB, SCHOOL_B, 'Toán học', 'active', 'GV-B001', '["Toán 7"]');
}

// ============================================================
// PARENT PROFILES
// ============================================================

function createParentProfiles() {
  safeInsert('parents', `
    INSERT OR IGNORE INTO parents (id, user_id, school_id, occupation, status)
    VALUES (?, ?, ?, ?, ?)
  `, 'prt_a', USERS.parentA, SCHOOL_A, 'Kỹ sư phần mềm', 'active');
  
  safeInsert('parents', `
    INSERT OR IGNORE INTO parents (id, user_id, school_id, occupation, status)
    VALUES (?, ?, ?, ?, ?)
  `, 'prt_b', USERS.parentB, SCHOOL_B, 'Giáo viên', 'active');

  safeInsert('parents', `
    INSERT OR IGNORE INTO parents (id, user_id, school_id, occupation, status)
    VALUES (?, ?, ?, ?, ?)
  `, 'prt_vanhoi', USERS.parentVanHoi, SCHOOL_A, 'Kinh doanh', 'active');
}

// ============================================================
// STUDENT PROFILES
// ============================================================

function createStudentProfiles() {
  // School A students
  safeInsert('students', `
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, gpa, attendance_rate, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'std_a1', USERS.studentA1, CLASSES.classA1, SCHOOL_A, 8.5, 98.5, 'active');
  
  safeInsert('students', `
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, gpa, attendance_rate, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'std_a2', USERS.studentA2, CLASSES.classA1, SCHOOL_A, 8.8, 99.0, 'active');
  
  // School B student
  safeInsert('students', `
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, gpa, attendance_rate, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'std_b1', USERS.studentB1, CLASSES.classB1, SCHOOL_B, 8.2, 97.0, 'active');
  
  // School B student for tenant isolation tests (std_hoasen_1)
  safeInsert('students', `
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, student_code, gpa, attendance_rate, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'std_hoasen_1', 'usr_student_hoasen', 'cls_hoasen_10A1', SCHOOL_B, 'HS-HOASEN-001', 8.5, 98.0, 'active');
  
  // Legacy student used by many integration tests (Nguyễn Minh Khang)
  safeInsert('students', `
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, student_code, gpa, attendance_rate, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'std_minhkhang', 'usr_minhkhang', CLASSES.classA1, SCHOOL_A, 'HS-2024-889', 8.0, 95.0, 'active');
}

// ============================================================
// PARENT-STUDENT LINKS
// ============================================================

function createParentStudentLinks() {
  // New normalized parent_student_links table (used by parent API)
  // parent_id here is the parents.id (e.g., 'prt_a'), NOT user_id
  safeInsert('parent_student_links', `
    INSERT OR IGNORE INTO parent_student_links (id, parent_id, student_id, relationship, is_primary_contact, is_verified, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'psl_a_a1', 'prt_a', 'std_a1', 'father', 1, 1, 1);

  safeInsert('parent_student_links', `
    INSERT OR IGNORE INTO parent_student_links (id, parent_id, student_id, relationship, is_primary_contact, is_verified, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'psl_a_a2', 'prt_a', 'std_a2', 'father', 1, 1, 1);

  safeInsert('parent_student_links', `
    INSERT OR IGNORE INTO parent_student_links (id, parent_id, student_id, relationship, is_primary_contact, is_verified, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'psl_b_b1', 'prt_b', 'std_b1', 'mother', 1, 1, 1);

  // Legacy parent_students table (fallback for older code)
  safeInsert('parent_students', `
    INSERT OR IGNORE INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'ps_a_a1', 'prt_a', 'std_a1', 'father', 1, 1);

  safeInsert('parent_students', `
    INSERT OR IGNORE INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'ps_a_a2', 'prt_a', 'std_a2', 'father', 1, 1);

  safeInsert('parent_students', `
    INSERT OR IGNORE INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'ps_b_b1', 'prt_b', 'std_b1', 'mother', 1, 1);
}

// ============================================================
// DEPARTMENTS
// ============================================================

function createDepartments() {
  safeInsert('departments', `
    INSERT OR IGNORE INTO departments (id, school_id, name, code, is_active)
    VALUES (?, ?, ?, ?, ?)
  `, 'dept_toan', SCHOOL_A, 'Tổ Toán', 'TOAN', 1);

  safeInsert('departments', `
    INSERT OR IGNORE INTO departments (id, school_id, name, code, is_active)
    VALUES (?, ?, ?, ?, ?)
  `, 'dept_ngvan', SCHOOL_A, 'Tổ Ngữ Văn', 'NGVAN', 1);

  safeInsert('departments', `
    INSERT OR IGNORE INTO departments (id, school_id, name, code, is_active)
    VALUES (?, ?, ?, ?, ?)
  `, 'dept_nnhu', SCHOOL_A, 'Tổ Ngoại ngữ', 'NNHU', 1);
}

// ============================================================
// LEGACY STUDENT FOR PARENT TESTS
// ============================================================

function createLegacyStudentKhang() {
  // Legacy student account for integration tests (minhkhang@school.edu.vn)
  // The "Nguyễn Minh Khang" account used by many integration tests
  safeInsert('students', `
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, student_code, gpa, attendance_rate, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'std_minhkhang', 'usr_minhkhang', CLASSES.classA1, SCHOOL_A, 'HS-2024-889', 8.0, 95.0, 'active');

  // Also create the legacy std_khoi alias for parent tests
  safeInsert('students', `
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, student_code, gpa, attendance_rate, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'std_khoi', USERS.studentKhang, CLASSES.classA1, SCHOOL_A, 'std_khoi', 8.0, 95.0, 'active');

  // The legacy khang user (khang@student.school.edu.vn)
  safeInsert('users', `
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, USERS.studentKhang, 'khanghs', 'khang@student.school.edu.vn', passwordHash, 'student', 'Nguyễn Minh Khang', 'HS-2024-889', '0900000003', SCHOOL_A, 0);

  // Link Van Hoi parent to std_khoi (for parent_endpoints.test.js)
  safeInsert('parent_student_links', `
    INSERT OR IGNORE INTO parent_student_links (id, parent_id, student_id, relationship, is_primary_contact, is_verified, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'psl_vanhoi_khoi', 'prt_vanhoi', 'std_khoi', 'father', 1, 1, 1);

  // Also link via parent_students for fallback
  safeInsert('parent_students', `
    INSERT OR IGNORE INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'ps_vanhoi_khoi', 'prt_vanhoi', 'std_khoi', 'father', 1, 1);

  // Class enrollment for khang (std_khoi)
  safeInsert('class_enrollments', `
    INSERT OR IGNORE INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'ce_khoi_10a1', CLASSES.classA1, 'std_khoi', ACADEMIC_YEAR_A, '2025-09-01', 'enrolled', 1, SCHOOL_A);

  // Class enrollment for minhkhang
  safeInsert('class_enrollments', `
    INSERT OR IGNORE INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'ce_minhkhang_10a1', CLASSES.classA1, 'std_minhkhang', ACADEMIC_YEAR_A, '2025-09-01', 'enrolled', 1, SCHOOL_A);
}

// ============================================================
// CLASS ENROLLMENTS
// ============================================================

function createClassEnrollments() {
  // Student A1 in class A1
  safeInsert('class_enrollments', `
    INSERT OR IGNORE INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'ce_a1_a1', CLASSES.classA1, 'std_a1', ACADEMIC_YEAR_A, '2025-09-01', 'enrolled', 1, SCHOOL_A);
  
  // Student A2 in class A1
  safeInsert('class_enrollments', `
    INSERT OR IGNORE INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'ce_a2_a1', CLASSES.classA1, 'std_a2', ACADEMIC_YEAR_A, '2025-09-01', 'enrolled', 1, SCHOOL_A);
  
  // Student B1 in class B1
  safeInsert('class_enrollments', `
    INSERT OR IGNORE INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'ce_b1_b1', CLASSES.classB1, 'std_b1', ACADEMIC_YEAR_B, '2025-09-01', 'enrolled', 1, SCHOOL_B);
}

// ============================================================
// TEACHER ASSIGNMENTS
// ============================================================

function createTeacherAssignments() {
  // Teacher A assigned to class A1, Math
  safeInsert('teacher_assignments', `
    INSERT OR IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year)
    VALUES (?, ?, ?, ?, ?)
  `, 'ta_a_a1', USERS.teacherA, CLASSES.classA1, SUBJECTS.math, '2025-2026');

  // Teacher A2 assigned to class A1, Physics
  safeInsert('teacher_assignments', `
    INSERT OR IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year)
    VALUES (?, ?, ?, ?, ?)
  `, 'ta_a2_a1', USERS.teacherA2, CLASSES.classA1, SUBJECTS.physics, '2025-2026');

  // Teacher B assigned to class B1, Math (School B)
  safeInsert('teacher_assignments', `
    INSERT OR IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year)
    VALUES (?, ?, ?, ?, ?)
  `, 'ta_b_b1', USERS.teacherB, CLASSES.classB1, 'sub_math_b', '2025-2026');
}

// ============================================================
// TIMETABLE
// ============================================================

function createTimetable() {
  const days = [1, 2, 3, 4, 5]; // Monday to Friday
  
  // Create timetable slots for class A1
  days.forEach(day => {
    for (let period = 1; period <= 5; period++) {
      safeInsert('timetable', `
        INSERT OR IGNORE INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, period, start_time, end_time, room, status, semester_id, academic_year_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, 
        `tt_a1_${day}_${period}`, CLASSES.classA1, SUBJECTS.math, USERS.teacherA, day, period,
        `${8 + (period - 1)}:00`, `${8 + period}:00`, 'P101', 'active', SEMESTER_A1, ACADEMIC_YEAR_A
      );
    }
  });
}

// ============================================================
// ASSIGNMENTS
// ============================================================

function createAssignments() {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const pastDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Published assignment with future due date (for Student A1/A2)
  safeInsert('assignments', `
    INSERT OR IGNORE INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, status, created_by, school_id, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'asg_pub_1', 'Bài tập Toán - Phương trình', 'Toán học', 'quiz', 'Làm bài trắc nghiệm', JSON.stringify(['10A1']), futureDate, '23:59', 'published', USERS.teacherA, SCHOOL_A, 10);
  
  // Another published assignment
  safeInsert('assignments', `
    INSERT OR IGNORE INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, status, created_by, school_id, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'asg_pub_2', 'Bài kiểm tra Vật lý', 'Vật lý', 'quiz', 'Làm bài tự luận', JSON.stringify(['10A1']), futureDate, '17:00', 'published', USERS.teacherA2, SCHOOL_A, 10);
  
  // Draft assignment (not visible to students)
  safeInsert('assignments', `
    INSERT OR IGNORE INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, status, created_by, school_id, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'asg_draft_1', 'Bài tập nháp', 'Ngữ văn', 'essay', 'Viết bài', JSON.stringify(['10A1']), futureDate, '23:59', 'draft', USERS.teacherA, SCHOOL_A, 10);
  
  // Expired assignment (past due date)
  safeInsert('assignments', `
    INSERT OR IGNORE INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, status, created_by, school_id, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'asg_expired_1', 'Bài kiểm tra cũ', 'Toán học', 'quiz', 'Bài đã hết hạn', JSON.stringify(['10A1']), pastDate, '23:59', 'published', USERS.teacherA, SCHOOL_A, 10);
  
  // School B assignment (isolated)
  safeInsert('assignments', `
    INSERT OR IGNORE INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, status, created_by, school_id, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'asg_school_b', 'Bài tập School B', 'Toán học', 'quiz', 'Bài của trường B', JSON.stringify(['7B']), futureDate, '23:59', 'published', USERS.teacherB, SCHOOL_B, 10);
}

// ============================================================
// ASSIGNMENT QUESTIONS
// ============================================================

function createAssignmentQuestions() {
  safeInsert('assignment_questions', `
    INSERT OR IGNORE INTO assignment_questions (id, assignment_id, question_order, prompt, points, has_plot, options)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'q_pub_1_1', 'asg_pub_1', 1, 'Tìm nghiệm của phương trình x² - 4 = 0', 1, 0, JSON.stringify([
    { id: 'A', text: 'A. x = ±2', isCorrect: true },
    { id: 'B', text: 'B. x = 2', isCorrect: false },
    { id: 'C', text: 'C. x = -2', isCorrect: false },
    { id: 'D', text: 'D. x = 4', isCorrect: false }
  ]));
  
  safeInsert('assignment_questions', `
    INSERT OR IGNORE INTO assignment_questions (id, assignment_id, question_order, prompt, points, has_plot, options)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'q_pub_1_2', 'asg_pub_1', 2, 'Cho hàm số y = 2x + 1. Hệ số góc là?', 1, 0, JSON.stringify([
    { id: 'A', text: 'A. 2', isCorrect: true },
    { id: 'B', text: 'B. 1', isCorrect: false },
    { id: 'C', text: 'C. -2', isCorrect: false },
    { id: 'D', text: 'D. 0', isCorrect: false }
  ]));
}

// ============================================================
// SUBMISSIONS
// ============================================================

function createSubmissions() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  // Student A1 submitted assignment
  safeInsert('assignment_submissions', `
    INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, status, submitted_at, score)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'sub_a1_1', 'asg_pub_1', 'std_a1', 'submitted', yesterday, 8.5);
  
  // Student A1 another submission
  safeInsert('assignment_submissions', `
    INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, status, submitted_at, score)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'sub_a1_2', 'asg_pub_2', 'std_a1', 'submitted', yesterday, 9.0);
  
  // Student A2 has no submissions yet (for testing pending assignments)
  
  // School B submissions for tenant isolation tests
  safeInsert('assignment_submissions', `
    INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, status, submitted_at, score)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'sub_hoasen_1', 'asg_school_b', 'std_hoasen_1', 'submitted', yesterday, 8.0);
}

// ============================================================
// GRADES (PUBLISHED)
// ============================================================

function createGrades() {
  const now = new Date();
  const pastDate = now.toISOString().split('T')[0];
  
  // Published grades for Student A1
  safeInsert('grades', `
    INSERT OR IGNORE INTO grades (id, student_id, subject, test_name, score, max_score, semester, status, teacher_name, graded_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'grd_a1_1', 'std_a1', 'Toán học', 'Kiểm tra 15 phút - Chương 1', 8.5, 10, 1, 'published', 'Cô Giáo A', pastDate, pastDate);
  
  safeInsert('grades', `
    INSERT OR IGNORE INTO grades (id, student_id, subject, test_name, score, max_score, semester, status, teacher_name, graded_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'grd_a1_2', 'std_a1', 'Vật lý', 'Kiểm tra 1 tiết - Động lực học', 9.0, 10, 1, 'published', 'Thầy Giáo A2', pastDate, pastDate);
  
  safeInsert('grades', `
    INSERT OR IGNORE INTO grades (id, student_id, subject, test_name, score, max_score, semester, status, teacher_name, graded_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'grd_a1_3', 'std_a1', 'Toán học', 'Kiểm tra hệ số 2', 7.5, 10, 1, 'published', 'Cô Giáo A', pastDate, pastDate);
  
  // Draft grade for Student A1 (not visible to students)
  safeInsert('grades', `
    INSERT OR IGNORE INTO grades (id, student_id, subject, test_name, score, max_score, semester, status, teacher_name, graded_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'grd_a1_draft', 'std_a1', 'Ngữ văn', 'Bài kiểm tra nháp', 8.0, 10, 1, 'draft', 'Cô Giáo A', pastDate, null);
  
  // Published grades for Student A2
  safeInsert('grades', `
    INSERT OR IGNORE INTO grades (id, student_id, subject, test_name, score, max_score, semester, status, teacher_name, graded_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'grd_a2_1', 'std_a2', 'Toán học', 'Kiểm tra 15 phút', 9.5, 10, 1, 'published', 'Cô Giáo A', pastDate, pastDate);
  
  // Published grades for Student B1 (School B)
  safeInsert('grades', `
    INSERT OR IGNORE INTO grades (id, student_id, subject, test_name, score, max_score, semester, status, teacher_name, graded_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'grd_b1_1', 'std_b1', 'Toán học', 'Kiểm tra 15 phút', 8.0, 10, 1, 'published', 'Thầy Giáo B', pastDate, pastDate);
}

// ============================================================
// ATTENDANCE
// ============================================================

function createAttendance() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Create attendance sessions for class A1
  safeInsert('attendance_sessions', `
    INSERT OR IGNORE INTO attendance_sessions (id, class_id, subject_id, teacher_id, date, period, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'att_sess_1', CLASSES.classA1, SUBJECTS.math, USERS.teacherA, today, 1, 'active');
  
  // Student A1 - Present
  safeInsert('attendance_records', `
    INSERT OR IGNORE INTO attendance_records (id, session_id, student_id, status)
    VALUES (?, ?, ?, ?)
  `, 'att_rec_a1_1', 'att_sess_1', 'std_a1', 'present');
  
  // Student A2 - Present
  safeInsert('attendance_records', `
    INSERT OR IGNORE INTO attendance_records (id, session_id, student_id, status)
    VALUES (?, ?, ?, ?)
  `, 'att_rec_a2_1', 'att_sess_1', 'std_a2', 'present');
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================

function createAnnouncements() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  
  // School A announcement
  safeInsert('announcements', `
    INSERT OR IGNORE INTO announcements (id, school_id, title, content, scope, priority, status, author_id, author_name, published_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'ann_a_1', SCHOOL_A, 'Thông báo nghỉ lễ', 'Trường nghỉ lễ 2/9', 'all', 'normal', 'published', USERS.adminA, 'Admin A', yesterday, 1);
  
  // School B announcement
  safeInsert('announcements', `
    INSERT OR IGNORE INTO announcements (id, school_id, title, content, scope, priority, status, author_id, author_name, published_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'ann_b_1', SCHOOL_B, 'Thông báo School B', 'Thông báo của trường B', 'all', 'normal', 'published', USERS.adminB || 'usr_admin_b', 'Admin B', yesterday, 1);
}

// ============================================================
// TUITION INVOICES
// ============================================================

function createTuitionInvoices() {
  const now = new Date();
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const overdueDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Unpaid invoice for Student A1
  safeInsert('tuition_invoices', `
    INSERT OR IGNORE INTO tuition_invoices (id, student_id, school_id, period, total_amount, due_date, status, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'inv_a1_1', 'std_a1', SCHOOL_A, 'Tháng 9/2025', 3500000, dueDate, 'unpaid', JSON.stringify([
    { label: 'Học phí chính khóa', amount: '2.000.000 đ' },
    { label: 'Bán trú', amount: '1.500.000 đ' }
  ]));
  
  // Paid invoice for Student A2
  safeInsert('tuition_invoices', `
    INSERT OR IGNORE INTO tuition_invoices (id, student_id, school_id, period, total_amount, due_date, status, paid_at, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'inv_a2_1', 'std_a2', SCHOOL_A, 'Tháng 9/2025', 3500000, overdueDate, 'paid', now.toISOString(), JSON.stringify([
    { label: 'Học phí chính khóa', amount: '2.000.000 đ' },
    { label: 'Bán trú', amount: '1.500.000 đ' }
  ]));
  
  // Invoice for Student B1 (School B)
  safeInsert('tuition_invoices', `
    INSERT OR IGNORE INTO tuition_invoices (id, student_id, school_id, period, total_amount, due_date, status, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, 'inv_b1_1', 'std_b1', SCHOOL_B, 'Tháng 9/2025', 2500000, dueDate, 'unpaid', JSON.stringify([
    { label: 'Học phí', amount: '2.500.000 đ' }
  ]));
}

// ============================================================
// NOTIFICATIONS
// ============================================================

function createNotifications() {
  const now = new Date().toISOString();
  
  safeInsert('notifications', `
    INSERT OR IGNORE INTO notifications (id, user_id, title, content, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'notif_a1_1', USERS.studentA1, 'Bài tập mới', 'Có bài tập mới được giao', 'info', 0, now);
  
  safeInsert('notifications', `
    INSERT OR IGNORE INTO notifications (id, user_id, title, content, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, 'notif_parent_a_1', USERS.parentA, 'Thông báo điểm', 'Điểm của con đã được công bố', 'info', 0, now);
}

// ============================================================
// MESSAGES
// ============================================================

function createMessages() {
  const now = new Date().toISOString();
  
  // Parent A sent message to Teacher A
  safeInsert('messages', `
    INSERT OR IGNORE INTO messages (id, sender_id, receiver_id, content, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'msg_1', USERS.parentA, USERS.teacherA, 'Xin chào cô, tôi muốn hỏi về tình hình học tập của con tôi.', 0, now);
  
  // Teacher A replied
  safeInsert('messages', `
    INSERT OR IGNORE INTO messages (id, sender_id, receiver_id, content, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'msg_2', USERS.teacherA, USERS.parentA, 'Chào anh/chị, con đang tiến bộ tốt. Cụ thể...', 0, now);
}

// ============================================================
// LEAVE REQUESTS
// ============================================================

function createLeaveRequests() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Pending leave request
  safeInsert('leave_requests', `
    INSERT OR IGNORE INTO leave_requests (id, student_id, parent_id, start_date, end_date, reason_type, reason_detail, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'lr_a1_1', 'std_a1', USERS.parentA, tomorrow, nextWeek, 'Sickness', 'Con bị sốt', 'pending', now.toISOString());
  
  // Approved leave request
  safeInsert('leave_requests', `
    INSERT OR IGNORE INTO leave_requests (id, student_id, parent_id, start_date, end_date, reason_type, reason_detail, status, reviewed_by, reviewed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'lr_a1_2', 'std_a1', USERS.parentA, '2025-09-15', '2025-09-16', 'Family', 'Gia đình có việc', 'approved', USERS.teacherA, now.toISOString(), '2025-09-10');
}

// ============================================================
// EXPORT TEST CREDENTIALS
// ============================================================

export const TEST_CREDENTIALS = {
  adminA: { email: 'admin_a@test.edu.vn', password: '123456' },
  teacherA: { email: 'teacher_a@test.edu.vn', password: '123456' },
  teacherA2: { email: 'teacher_a2@test.edu.vn', password: '123456' },
  teacherB: { email: 'teacher_b@test.edu.vn', password: '123456' },
  studentA1: { email: 'student_a1@test.edu.vn', password: '123456' },
  studentA2: { email: 'student_a2@test.edu.vn', password: '123456' },
  studentB1: { email: 'student_b1@test.edu.vn', password: '123456' },
  parentA: { email: 'parent_a@test.edu.vn', password: '123456' },
  parentB: { email: 'parent_b@test.edu.vn', password: '123456' },
};
