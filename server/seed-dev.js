/**
 * EduPortal Development Seed - Deterministic Test Data
 * 
 * This module creates reproducible, deterministic test data for development and testing.
 * 
 * Key characteristics:
 * - Uses deterministic IDs (prefixed with TEST_)
 * - Clearly fake Vietnamese names and data
 * - Safe for development environments ONLY
 * - Production safeguard prevents accidental seeding
 * 
 * Usage:
 *   node server/seed-dev.js           # Development seed
 *   node server/seed-dev.js --reset   # Reset and re-seed
 * 
 * ⚠️ PRODUCTION GUARD:
 *   This seed will NOT run if NODE_ENV=production
 */

import bcrypt from 'bcryptjs';
import { db, initSchema } from './db.js';
import { config } from './config/env.js';

// =============================================================================
// DETERMINISTIC SEED DATA
// All IDs use TEST_ prefix for easy identification and cleanup
// =============================================================================

const DEV_PASSWORD_HASH = bcrypt.hashSync('devpassword123', 4); // Fast hash for dev

// Schools
const SCHOOLS = [
  {
    id: 'TEST_SCH_001',
    name: 'Trường THPT Test Development A',
    code: 'TEST_A',
    short_name: 'Test A',
    address: '123 Đường Test, Quận Test A',
    district: 'Quận Test A',
    ward: 'Phường Test 1',
    province: 'TP. Hồ Chí Minh',
    phone: '028-1234-0001',
    email: 'contact@test-a.edu.vn',
    principal_name: 'GS.TS. Phạm Văn Dev',
    is_active: 1
  },
  {
    id: 'TEST_SCH_002',
    name: 'Trường THPT Test Development B',
    code: 'TEST_B',
    short_name: 'Test B',
    address: '456 Đường Test, Quận Test B',
    district: 'Quận Test B',
    ward: 'Phường Test 2',
    province: 'TP. Hà Nội',
    phone: '024-5678-0002',
    email: 'contact@test-b.edu.vn',
    principal_name: 'TS. Nguyễn Thị Test',
    is_active: 1
  }
];

// Academic Years
const ACADEMIC_YEARS = [
  {
    id: 'TEST_AY_2025',
    school_id: 'TEST_SCH_001',
    name: '2025 - 2026',
    start_date: '2025-09-05',
    end_date: '2026-05-31',
    is_current: 1
  },
  {
    id: 'TEST_AY_2025_B',
    school_id: 'TEST_SCH_002',
    name: '2025 - 2026',
    start_date: '2025-09-05',
    end_date: '2026-05-31',
    is_current: 1
  }
];

// Semesters
const SEMESTERS = [
  { id: 'TEST_SEM_1', academic_year_id: 'TEST_AY_2025', school_id: 'TEST_SCH_001', name: 'Học kỳ I', semester_number: 1, start_date: '2025-09-05', end_date: '2026-01-15', is_current: 1 },
  { id: 'TEST_SEM_2', academic_year_id: 'TEST_AY_2025', school_id: 'TEST_SCH_001', name: 'Học kỳ II', semester_number: 2, start_date: '2026-01-16', end_date: '2026-05-31', is_current: 0 },
  { id: 'TEST_SEM_1_B', academic_year_id: 'TEST_AY_2025_B', school_id: 'TEST_SCH_002', name: 'Học kỳ I', semester_number: 1, start_date: '2025-09-05', end_date: '2026-01-15', is_current: 1 },
];

// Departments
const DEPARTMENTS = [
  { id: 'TEST_DEPT_MATH', school_id: 'TEST_SCH_001', name: 'Tổ Toán - Tin học', code: 'TOAN_TIN', description: 'Tổ bộ môn Toán học và Tin học' },
  { id: 'TEST_DEPT_SCI', school_id: 'TEST_SCH_001', name: 'Tổ Khoa học Tự nhiên', code: 'KHTN', description: 'Tổ bộ môn Lý, Hóa, Sinh' },
  { id: 'TEST_DEPT_LANG', school_id: 'TEST_SCH_001', name: 'Tổ Ngoại ngữ', code: 'NN', description: 'Tổ bộ môn Ngoại ngữ' },
  { id: 'TEST_DEPT_SOC', school_id: 'TEST_SCH_001', name: 'Tổ Khoa học Xã hội', code: 'KHXH', description: 'Tổ bộ môn Sử, Địa, GDCD' },
  { id: 'TEST_DEPT_ART', school_id: 'TEST_SCH_001', name: 'Tổ Thể chất & Nghệ thuật', code: 'TC_NT', description: 'Tổ bộ môn Thể dục, Nhạc, Mỹ thuật' },
];

// Subjects
const SUBJECTS = [
  { id: 'TEST_SUB_TOAN', name: 'Toán', code: 'TOAN', department_id: 'TEST_DEPT_MATH', grade_level: 10, weekly_periods: 5 },
  { id: 'TEST_SUB_VATLY', name: 'Vật lý', code: 'VATLY', department_id: 'TEST_DEPT_SCI', grade_level: 10, weekly_periods: 3 },
  { id: 'TEST_SUB_HOA', name: 'Hóa học', code: 'HOAHOC', department_id: 'TEST_DEPT_SCI', grade_level: 10, weekly_periods: 3 },
  { id: 'TEST_SUB_SINH', name: 'Sinh học', code: 'SINHHOC', department_id: 'TEST_DEPT_SCI', grade_level: 10, weekly_periods: 2 },
  { id: 'TEST_SUB_VAN', name: 'Ngữ văn', code: 'NGUVAN', department_id: 'TEST_DEPT_SOC', grade_level: 10, weekly_periods: 4 },
  { id: 'TEST_SUB_SU', name: 'Lịch sử', code: 'LICHSU', department_id: 'TEST_DEPT_SOC', grade_level: 10, weekly_periods: 2 },
  { id: 'TEST_SUB_DIA', name: 'Địa lý', code: 'DIALY', department_id: 'TEST_DEPT_SOC', grade_level: 10, weekly_periods: 2 },
  { id: 'TEST_SUB_GDCD', name: 'GDCD', code: 'GDCD', department_id: 'TEST_DEPT_SOC', grade_level: 10, weekly_periods: 1 },
  { id: 'TEST_SUB_EN', name: 'Tiếng Anh', code: 'ENG', department_id: 'TEST_DEPT_LANG', grade_level: 10, weekly_periods: 4 },
  { id: 'TEST_SUB_TIN', name: 'Tin học', code: 'TINHOC', department_id: 'TEST_DEPT_MATH', grade_level: 10, weekly_periods: 2 },
  { id: 'TEST_SUB_TD', name: 'Thể dục', code: 'THEDUC', department_id: 'TEST_DEPT_ART', grade_level: 10, weekly_periods: 2 },
];

// Classes
const CLASSES = [
  { id: 'TEST_CLS_10A', name: '10A', grade_level: 10, school_id: 'TEST_SCH_001', academic_year: '2025-2026', max_students: 40 },
  { id: 'TEST_CLS_10B', name: '10B', grade_level: 10, school_id: 'TEST_SCH_001', academic_year: '2025-2026', max_students: 42 },
  { id: 'TEST_CLS_11A', name: '11A', grade_level: 11, school_id: 'TEST_SCH_001', academic_year: '2025-2026', max_students: 40 },
  { id: 'TEST_CLS_12A', name: '12A', grade_level: 12, school_id: 'TEST_SCH_001', academic_year: '2025-2026', max_students: 38 },
];

// Teachers (deterministic fake names)
const TEACHERS = [
  { id: 'TEST_USR_T001', name: 'Thầy Đỗ Văn Test', code: 'GV-TEST-001', email: 'dev.teacher1@test-a.edu.vn', username: 'testteacher1', dept_id: 'TEST_DEPT_MATH' },
  { id: 'TEST_USR_T002', name: 'Cô Trần Thị Test', code: 'GV-TEST-002', email: 'dev.teacher2@test-a.edu.vn', username: 'testteacher2', dept_id: 'TEST_DEPT_SCI' },
  { id: 'TEST_USR_T003', name: 'Thầy Lê Văn Test', code: 'GV-TEST-003', email: 'dev.teacher3@test-a.edu.vn', username: 'testteacher3', dept_id: 'TEST_DEPT_LANG' },
  { id: 'TEST_USR_T004', name: 'Cô Hoàng Thị Test', code: 'GV-TEST-004', email: 'dev.teacher4@test-a.edu.vn', username: 'testteacher4', dept_id: 'TEST_DEPT_SOC' },
  { id: 'TEST_USR_T005', name: 'Thầy Bùi Văn Test', code: 'GV-TEST-005', email: 'dev.teacher5@test-a.edu.vn', username: 'testteacher5', dept_id: 'TEST_DEPT_ART' },
];

// Parents (deterministic fake names)
const PARENTS = [
  { id: 'TEST_USR_P001', name: 'Ông Nguyễn Văn Phụ Huynh', code: 'PH-TEST-001', email: 'dev.parent1@test-a.edu.vn', username: 'testparent1', occupation: 'Kỹ sư phần mềm', workplace: 'Công ty Test Tech' },
  { id: 'TEST_USR_P002', name: 'Bà Trần Thị Phụ Huynh', code: 'PH-TEST-002', email: 'dev.parent2@test-a.edu.vn', username: 'testparent2', occupation: 'Giáo viên', workplace: 'Trường Test B' },
];

// Students (deterministic fake names, DOBs, and data)
const STUDENTS = [
  // Class 10A
  { id: 'TEST_USR_S001', name: 'Em Nguyễn Văn Test', code: 'HS-TEST-001', email: 'dev.student1@test-a.edu.vn', username: 'teststudent1', class_id: 'TEST_CLS_10A', gpa: 8.5, dob: '2010-03-15', gender: 'male', parent_id: 'TEST_USR_P001', rank: '5/40', attendance: 96.5 },
  { id: 'TEST_USR_S002', name: 'Em Trần Thị Test', code: 'HS-TEST-002', email: 'dev.student2@test-a.edu.vn', username: 'teststudent2', class_id: 'TEST_CLS_10A', gpa: 9.2, dob: '2010-07-22', gender: 'female', parent_id: 'TEST_USR_P001', rank: '1/40', attendance: 98.0 },
  { id: 'TEST_USR_S003', name: 'Em Lê Văn Test', code: 'HS-TEST-003', email: 'dev.student3@test-a.edu.vn', username: 'teststudent3', class_id: 'TEST_CLS_10A', gpa: 7.8, dob: '2010-01-10', gender: 'male', parent_id: 'TEST_USR_P002', rank: '12/40', attendance: 92.0 },
  { id: 'TEST_USR_S004', name: 'Em Phạm Thị Test', code: 'HS-TEST-004', email: 'dev.student4@test-a.edu.vn', username: 'teststudent4', class_id: 'TEST_CLS_10A', gpa: 8.0, dob: '2010-05-30', gender: 'female', parent_id: null, rank: '8/40', attendance: 95.0 },
  { id: 'TEST_USR_S005', name: 'Em Hoàng Văn Test', code: 'HS-TEST-005', email: 'dev.student5@test-a.edu.vn', username: 'teststudent5', class_id: 'TEST_CLS_10A', gpa: 6.5, dob: '2010-11-05', gender: 'male', parent_id: 'TEST_USR_P002', rank: '25/40', attendance: 88.0 },
  
  // Class 10B
  { id: 'TEST_USR_S006', name: 'Em Vũ Thị Test', code: 'HS-TEST-006', email: 'dev.student6@test-a.edu.vn', username: 'teststudent6', class_id: 'TEST_CLS_10B', gpa: 8.8, dob: '2010-04-18', gender: 'female', parent_id: 'TEST_USR_P001', rank: '3/42', attendance: 97.5 },
  { id: 'TEST_USR_S007', name: 'Em Đặng Văn Test', code: 'HS-TEST-007', email: 'dev.student7@test-a.edu.vn', username: 'teststudent7', class_id: 'TEST_CLS_10B', gpa: 7.2, dob: '2010-08-25', gender: 'male', parent_id: null, rank: '18/42', attendance: 90.0 },
  { id: 'TEST_USR_S008', name: 'Em Bùi Thị Test', code: 'HS-TEST-008', email: 'dev.student8@test-a.edu.vn', username: 'teststudent8', class_id: 'TEST_CLS_10B', gpa: 9.5, dob: '2010-12-03', gender: 'female', parent_id: 'TEST_USR_P002', rank: '1/42', attendance: 100.0 },
  
  // Class 11A
  { id: 'TEST_USR_S009', name: 'Em Đỗ Văn Test', code: 'HS-TEST-009', email: 'dev.student9@test-a.edu.vn', username: 'teststudent9', class_id: 'TEST_CLS_11A', gpa: 8.3, dob: '2009-02-28', gender: 'male', parent_id: 'TEST_USR_P001', rank: '7/40', attendance: 94.0 },
  { id: 'TEST_USR_S010', name: 'Em Trịnh Thị Test', code: 'HS-TEST-010', email: 'dev.student10@test-a.edu.vn', username: 'teststudent10', class_id: 'TEST_CLS_11A', gpa: 7.9, dob: '2009-06-14', gender: 'female', parent_id: 'TEST_USR_P002', rank: '15/40', attendance: 91.0 },
  
  // Class 12A
  { id: 'TEST_USR_S011', name: 'Em Cao Văn Test', code: 'HS-TEST-011', email: 'dev.student11@test-a.edu.vn', username: 'teststudent11', class_id: 'TEST_CLS_12A', gpa: 8.7, dob: '2008-09-20', gender: 'male', parent_id: 'TEST_USR_P001', rank: '4/38', attendance: 96.0 },
  { id: 'TEST_USR_S012', name: 'Em Lý Thị Test', code: 'HS-TEST-012', email: 'dev.student12@test-a.edu.vn', username: 'teststudent12', class_id: 'TEST_CLS_12A', gpa: 9.0, dob: '2008-04-11', gender: 'female', parent_id: null, rank: '2/38', attendance: 98.5 },
];

// Admin users
const ADMINS = [
  { id: 'TEST_USR_A001', name: 'Admin Test Dev', code: 'ADMIN-TEST-001', email: 'dev.admin@test-a.edu.vn', username: 'testadmin' },
];

// Grades (sample for first few students)
function generateGrades() {
  const grades = [];
  const subjects = ['Toán', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh'];
  let gradeId = 1;
  
  for (const student of STUDENTS.slice(0, 5)) {
    for (const subject of subjects) {
      // Generate realistic grade between 5.0 and 10.0
      const baseScore = 5 + (Math.random() * 5);
      const score = Math.round(baseScore * 10) / 10;
      
      grades.push({
        id: `TEST_GRD_${String(gradeId++).padStart(3, '0')}`,
        student_id: student.id,
        subject,
        test_name: `Kiểm tra 15 phút - Chương Test ${gradeId}`,
        score,
        max_score: 10,
        coefficient: 1,
        semester: 1,
        teacher_name: TEACHERS[0].name,
        status: 'published'
      });
    }
  }
  
  return grades;
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

function isTestDataInstalled() {
  const result = db.prepare("SELECT COUNT(*) as count FROM users WHERE id LIKE 'TEST_%'").get();
  return result.count > 0;
}

function cleanTestData() {
  console.log('🧹 Cleaning existing test data...');
  
  // Delete ALL records from each table in reverse dependency order
  // This handles orphaned FK references properly
  const tables = [
    'ai_tutor_messages',
    'attendance_records',
    'attendance_sessions',
    'attendance',
    'leave_requests',
    'parent_teacher_messages',
    'messages',
    'notifications',
    'announcement_reads',
    'announcements',
    'school_notices',
    'study_resources',
    'assignment_submissions',
    'assignment_questions',
    'assignments',
    'student_competencies',
    'grades',
    'class_enrollments',
    'teacher_assignments',
    'parent_student_links',
    'parent_students',
    'timetable',
    'tuition_invoices',
    'invoice_line_items',
    'tuition_payments',
    'audit_logs',
    'refresh_tokens',
    'password_resets',
    'students',
    'parents',
    'teachers',
    'users',
    'classes',
    'subjects',
    'departments',
    'semesters',
    'academic_years',
    'schools',
  ];
  
  // Use a transaction to ensure atomic cleanup
  const deleteAll = db.transaction(() => {
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (err) {
        // Table might not exist or be empty, ignore
      }
    }
  });
  
  deleteAll();
  console.log('✅ All data cleaned');
}

function seedSchools() {
  console.log('🏫 Seeding schools...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO schools (id, name, code, short_name, address, district, ward, province, phone, email, principal_name, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const school of SCHOOLS) {
    stmt.run(
      school.id, school.name, school.code, school.short_name,
      school.address, school.district, school.ward, school.province,
      school.phone, school.email, school.principal_name, school.is_active
    );
  }
  console.log(`   Seeded ${SCHOOLS.length} schools`);
}

function seedAcademicYears() {
  console.log('📅 Seeding academic years...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO academic_years (id, school_id, name, start_date, end_date, is_current)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (const ay of ACADEMIC_YEARS) {
    stmt.run(ay.id, ay.school_id, ay.name, ay.start_date, ay.end_date, ay.is_current);
  }
  console.log(`   Seeded ${ACADEMIC_YEARS.length} academic years`);
}

function seedSemesters() {
  console.log('📚 Seeding semesters...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO semesters (id, academic_year_id, school_id, name, semester_number, start_date, end_date, is_current)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const sem of SEMESTERS) {
    stmt.run(sem.id, sem.academic_year_id, sem.school_id, sem.name, sem.semester_number, sem.start_date, sem.end_date, sem.is_current);
  }
  console.log(`   Seeded ${SEMESTERS.length} semesters`);
}

function seedDepartments() {
  console.log('🏢 Seeding departments...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO departments (id, school_id, name, code, description)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  for (const dept of DEPARTMENTS) {
    stmt.run(dept.id, dept.school_id, dept.name, dept.code, dept.description);
  }
  console.log(`   Seeded ${DEPARTMENTS.length} departments`);
}

function seedSubjects() {
  console.log('📖 Seeding subjects...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO subjects (id, name, code, department_id, grade_level, weekly_periods, is_active, status)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'active')
  `);
  
  for (const sub of SUBJECTS) {
    stmt.run(sub.id, sub.name, sub.code, sub.department_id, sub.grade_level, sub.weekly_periods);
  }
  console.log(`   Seeded ${SUBJECTS.length} subjects`);
}

function seedClasses() {
  console.log('🏫 Seeding classes...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO classes (id, name, grade_level, academic_year, school_id, max_students, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);
  
  for (const cls of CLASSES) {
    stmt.run(cls.id, cls.name, cls.grade_level, cls.academic_year, cls.school_id, cls.max_students);
  }
  console.log(`   Seeded ${CLASSES.length} classes`);
}

function seedUsers() {
  console.log('👥 Seeding users...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, name, code, phone, school_id, must_change_password, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `);
  
  // Admins
  for (const admin of ADMINS) {
    stmt.run(admin.id, admin.username, admin.email, DEV_PASSWORD_HASH, 'admin', admin.name, admin.code, null, SCHOOLS[0].id);
  }
  
  // Teachers
  for (const teacher of TEACHERS) {
    stmt.run(teacher.id, teacher.username, teacher.email, DEV_PASSWORD_HASH, 'teacher', teacher.name, teacher.code, null, SCHOOLS[0].id);
  }
  
  // Parents
  for (const parent of PARENTS) {
    stmt.run(parent.id, parent.username, parent.email, DEV_PASSWORD_HASH, 'parent', parent.name, parent.code, null, SCHOOLS[0].id);
  }
  
  // Students
  for (const student of STUDENTS) {
    stmt.run(student.id, student.username, student.email, DEV_PASSWORD_HASH, 'student', student.name, student.code, null, SCHOOLS[0].id);
  }
  
  const totalUsers = ADMINS.length + TEACHERS.length + PARENTS.length + STUDENTS.length;
  console.log(`   Seeded ${totalUsers} users (${ADMINS.length} admins, ${TEACHERS.length} teachers, ${PARENTS.length} parents, ${STUDENTS.length} students)`);
}

function seedTeacherProfiles() {
  console.log('👨‍🏫 Seeding teacher profiles...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO teachers (id, user_id, school_id, department_id, employee_id, specialty, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);
  
  for (const teacher of TEACHERS) {
    stmt.run(`TEST_TCH_${teacher.id.slice(-3)}`, teacher.id, SCHOOLS[0].id, teacher.dept_id, teacher.code, teacher.name.split(' ').pop(),);
  }
  console.log(`   Seeded ${TEACHERS.length} teacher profiles`);
}

function seedParentProfiles() {
  console.log('👪 Seeding parent profiles...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO parents (id, user_id, school_id, occupation, workplace, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);
  
  for (const parent of PARENTS) {
    stmt.run(`TEST_PRT_${parent.id.slice(-3)}`, parent.id, SCHOOLS[0].id, parent.occupation, parent.workplace);
  }
  console.log(`   Seeded ${PARENTS.length} parent profiles`);
}

function seedStudents() {
  console.log('📚 Seeding students...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO students (id, user_id, class_id, school_id, current_class_id, student_code, parent_id, grade_level, gpa, class_rank, total_students, attendance_rate, dob, gender, enrollment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);
  
  for (const student of STUDENTS) {
    const gradeLevel = CLASSES.find(c => c.id === student.class_id)?.grade_level || 10;
    const totalInClass = STUDENTS.filter(s => s.class_id === student.class_id).length;
    stmt.run(
      `TEST_STD_${student.id.slice(-3)}`,
      student.id,
      student.class_id,
      SCHOOLS[0].id,
      student.class_id,
      student.code,
      student.parent_id,
      gradeLevel,
      student.gpa,
      student.rank,
      totalInClass,
      student.attendance,
      student.dob,
      student.gender
    );
  }
  console.log(`   Seeded ${STUDENTS.length} students`);
}

function seedParentStudentLinks() {
  console.log('🔗 Seeding parent-student links...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO parent_student_links (id, parent_id, student_id, relationship, is_primary_contact, is_verified, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  
  let linkId = 1;
  for (const student of STUDENTS) {
    if (student.parent_id) {
      // parent_id in parent_student_links references parents.id (entity ID), not users.id
      const parentEntityId = `TEST_PRT_${student.parent_id.slice(-3)}`;
      const studentEntityId = `TEST_STD_${student.id.slice(-3)}`;
      stmt.run(`TEST_LINK_${String(linkId++).padStart(3, '0')}`, parentEntityId, studentEntityId, 'parent', 1, 1);
    }
  }
  console.log(`   Seeded ${linkId - 1} parent-student links`);
}

function seedClassEnrollments() {
  console.log('📋 Seeding class enrollments...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO class_enrollments (id, class_id, student_id, academic_year_id, school_id, enrollment_date, status, is_current)
    VALUES (?, ?, ?, ?, ?, ?, 'enrolled', 1)
  `);
  
  let enrollId = 1;
  for (const student of STUDENTS) {
    stmt.run(
      `TEST_ENR_${String(enrollId++).padStart(3, '0')}`,
      student.class_id,
      `TEST_STD_${student.id.slice(-3)}`,
      ACADEMIC_YEARS[0].id,
      SCHOOLS[0].id,
      '2025-09-05'
    );
  }
  console.log(`   Seeded ${enrollId - 1} class enrollments`);
}

function seedTeacherAssignments() {
  console.log('📝 Seeding teacher assignments...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year, school_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);
  
  let assignId = 1;
  for (const teacher of TEACHERS) {
    for (const cls of CLASSES) {
      const subject = SUBJECTS.find(s => s.department_id === teacher.dept_id);
      if (subject) {
        stmt.run(
          `TEST_TA_${String(assignId++).padStart(3, '0')}`,
          teacher.id,
          cls.id,
          subject.id,
          '2025-2026',
          SCHOOLS[0].id
        );
      }
    }
  }
  console.log(`   Seeded ${assignId - 1} teacher assignments`);
}

function seedGrades() {
  console.log('📊 Seeding grades...');
  const grades = generateGrades();
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO grades (id, student_id, subject, test_name, score, max_score, coefficient, semester, teacher_name, status, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const grade of grades) {
    const student = STUDENTS.find(s => s.id === grade.student_id);
    const studentDbId = student ? `TEST_STD_${student.id.slice(-3)}` : null;
    if (studentDbId) {
      stmt.run(
        grade.id,
        studentDbId,
        grade.subject,
        grade.test_name,
        grade.score,
        grade.max_score,
        grade.coefficient,
        grade.semester,
        grade.teacher_name,
        grade.status,
        SCHOOLS[0].id
      );
    }
  }
  console.log(`   Seeded ${grades.length} grades`);
}

function seedAnnouncements() {
  console.log('📢 Seeding announcements...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO announcements (id, school_id, title, content, summary, scope, priority, status, author_id, author_name, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  
  const announcements = [
    {
      id: 'TEST_ANN_001',
      title: 'Thông báo Test: Lịch kiểm tra giữa kỳ',
      content: 'Đây là nội dung thông báo test cho mục đích phát triển. Lịch kiểm tra giữa kỳ sẽ được công bố vào tuần sau.',
      summary: 'Thông báo test về lịch kiểm tra',
      scope: 'all',
      priority: 'normal',
      status: 'published'
    },
    {
      id: 'TEST_ANN_002',
      title: 'Test: Kế hoạch học tập tháng Test',
      content: 'Kế hoạch học tập test cho tháng tiếp theo. Vui lòng kiểm tra chi tiết trong hệ thống.',
      summary: 'Kế hoạch test',
      scope: 'student',
      priority: 'normal',
      status: 'published'
    },
    {
      id: 'TEST_ANN_003',
      title: 'Test Draft: Thông báo nháp',
      content: 'Đây là thông báo nháp để test trạng thái draft.',
      summary: 'Thông báo nháp test',
      scope: 'all',
      priority: 'normal',
      status: 'draft'
    }
  ];
  
  for (const ann of announcements) {
    stmt.run(
      ann.id,
      SCHOOLS[0].id,
      ann.title,
      ann.content,
      ann.summary,
      ann.scope,
      ann.priority,
      ann.status,
      ADMINS[0].id,
      ADMINS[0].name
    );
  }
  console.log(`   Seeded ${announcements.length} announcements`);
}

function seedAttendance() {
  console.log('✅ Seeding attendance records...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO attendance (id, student_id, class_id, date, status, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  // Generate attendance for last 5 days
  const statuses = ['present', 'present', 'present', 'late', 'absent'];
  const today = new Date();
  let attId = 1;
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    for (const student of STUDENTS.slice(0, 5)) {
      const status = statuses[(attId + i) % statuses.length];
      stmt.run(
        `TEST_ATT_${String(attId++).padStart(4, '0')}`,
        `TEST_STD_${student.id.slice(-3)}`,
        student.class_id,
        dateStr,
        status,
        TEACHERS[0].id
      );
    }
  }
  console.log(`   Seeded ${attId - 1} attendance records`);
}

function seedLeaveRequests() {
  console.log('📋 Seeding leave requests...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO leave_requests (id, student_id, parent_id, school_id, start_date, end_date, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const requests = [
    { student_idx: 0, parent_idx: 0, start: '2025-11-15', end: '2025-11-15', reason: 'Test: Xin nghỉ ốm test', status: 'approved' },
    { student_idx: 1, parent_idx: 0, start: '2025-11-20', end: '2025-11-22', reason: 'Test: Gia đình có việc test', status: 'pending' },
    { student_idx: 2, parent_idx: 1, start: '2025-12-01', end: '2025-12-01', reason: 'Test: Hẹn bác test', status: 'rejected' },
  ];
  
  for (const req of requests) {
    const student = STUDENTS[req.student_idx];
    const parent = PARENTS[req.parent_idx];
    stmt.run(
      `TEST_LR_${req.student_idx + 1}`,
      `TEST_STD_${student.id.slice(-3)}`,
      parent.id,
      SCHOOLS[0].id,
      req.start,
      req.end,
      req.reason,
      req.status
    );
  }
  console.log(`   Seeded ${requests.length} leave requests`);
}

function seedTuitionInvoices() {
  console.log('💰 Seeding tuition invoices...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tuition_invoices (id, student_id, school_id, billing_period, total, due_date, status, issued_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 0; i < 3; i++) {
    const student = STUDENTS[i];
    stmt.run(
      `TEST_INV_${i + 1}`,
      `TEST_STD_${student.id.slice(-3)}`,
      SCHOOLS[0].id,
      `Tháng ${10 + i}/2025`,
      3500000 + (i * 100000),
      `2025-${10 + i}-10`,
      i === 0 ? 'paid' : (i === 1 ? 'issued' : 'unpaid'),
      `2025-0${9 + i}-01`
    );
  }
  console.log('   Seeded 3 tuition invoices');
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

function seedDevData() {
  // Check environment
  if (config.IS_PRODUCTION) {
    console.error('❌ PRODUCTION GUARD: Cannot seed development data in production environment!');
    console.error('   This is a safety measure to prevent accidental seeding of test data in production.');
    console.error('   If you need to reset production, use the admin panel or migration tools.');
    process.exit(1);
  }
  
  if (config.IS_STAGING) {
    console.error('❌ STAGING GUARD: Cannot run development seed in staging environment!');
    console.error('   Use npm run seed:staging for staging demo data.');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎓 EDUPORTAL DEVELOPMENT SEED');
  console.log('='.repeat(60));
  console.log('⚠️  WARNING: This creates TEST/DEMO data only!');
  console.log('   - IDs are prefixed with TEST_');
  console.log('   - Data is clearly fake and identifiable');
  console.log('   - DO NOT use in production!');
  console.log('='.repeat(60) + '\n');
  
  // Initialize schema
  initSchema();
  
  // Check if test data already exists
  if (isTestDataInstalled()) {
    console.log('⚠️  Test data already exists!');
    
    // Check for --reset flag
    if (process.argv.includes('--reset')) {
      cleanTestData();
    } else {
      console.log('   Use --reset flag to clean and re-seed:');
      console.log('   node server/seed-dev.js --reset');
      return;
    }
  }
  
  // Seed in dependency order
  const startTime = Date.now();
  
  seedSchools();
  seedAcademicYears();
  seedSemesters();
  seedDepartments();
  seedSubjects();
  seedClasses();
  seedUsers();
  seedTeacherProfiles();
  seedParentProfiles();
  seedStudents();
  seedParentStudentLinks();
  seedClassEnrollments();
  seedTeacherAssignments();
  seedGrades();
  seedAnnouncements();
  seedAttendance();
  seedLeaveRequests();
  seedTuitionInvoices();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ DEVELOPMENT SEED COMPLETED');
  console.log('='.repeat(60));
  console.log('Duration:', duration, 'seconds');
  console.log('');
  console.log('📋 TEST ACCOUNTS (Password: devpassword123)');
  console.log('-'.repeat(60));
  console.log('Admin:    testadmin / dev.admin@test-a.edu.vn');
  console.log('Teachers: testteacher1-5 / dev.teacherN@test-a.edu.vn');
  console.log('Parents:  testparent1-2 / dev.parentN@test-a.edu.vn');
  console.log('Students: teststudent1-12 / dev.studentN@test-a.edu.vn');
  console.log('');
  console.log('⚠️  All test data is clearly marked with TEST_ prefix');
  console.log('='.repeat(60) + '\n');
}

// =============================================================================
// CLI RUNNER
// =============================================================================

const isMainModule = process.argv[1]?.endsWith('seed-dev.js');
if (isMainModule) {
  seedDevData();
}

export { seedDevData, isTestDataInstalled, cleanTestData };
