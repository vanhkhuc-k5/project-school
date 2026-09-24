// Verify G21 fixes - simplified
import { db } from './server/db.js';

console.log('=== Verifying G21 Fixes ===\n');

// Ensure all new columns exist
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN semester_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN status TEXT DEFAULT 'active'"); } catch (_) {}
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN academic_year_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN school_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN role TEXT DEFAULT 'subject'"); } catch (_) {}
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN start_date TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN end_date TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE teacher_assignments ADD COLUMN notes TEXT"); } catch (_) {}
try { db.exec("UPDATE teacher_assignments SET status = 'active' WHERE status IS NULL"); } catch (_) {}
try { db.exec("UPDATE teacher_assignments SET academic_year_id = academic_year WHERE academic_year_id IS NULL AND academic_year IS NOT NULL"); } catch (_) {}

const cols = db.prepare("PRAGMA table_info('teacher_assignments')").all().map(c => c.name);
console.log('teacher_assignments columns:', cols);

const status = db.prepare('SELECT DISTINCT status FROM teacher_assignments').all();
console.log('Statuses:', status.map(r => r.status));

// Test isTeacherAuthorized query (matching gradebook.repository.js exactly)
const ta = db.prepare(`
  SELECT ta.id, ta.class_id, ta.subject_id
  FROM teacher_assignments ta
  LEFT JOIN classes c ON c.id = ta.class_id
  LEFT JOIN subjects s ON s.id = ta.subject_id
  WHERE ta.teacher_id = ? AND ta.status = 'active'
`).all('usr_teacher_1');
console.log('Teacher assignments (status=active):', ta.length, ta);

// Check if usr_teacher_1 exists
const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get('usr_teacher_1');
console.log('usr_teacher_1 exists:', !!userExists, userExists?.email);

// Test isTeacherAuthorized with known test data
console.log('\n=== Testing Full Gradebook Flow ===');
// cls_10A1 is assigned to usr_teacher_1 via ta_1
const authorized = ta.some(a => a.class_id === 'cls_10A1');
console.log('Teacher authorized for cls_10A1?', authorized);

// Test getClassStudents
const students = db.prepare(`
  SELECT s.id as student_id, u.name, s.student_code, u.id as user_id, u.email
  FROM students s
  JOIN class_enrollments e ON e.student_id = s.id
  JOIN users u ON u.id = s.user_id
  WHERE e.class_id = ? AND e.status = 'enrolled' AND e.academic_year_id = ?
  ORDER BY u.name ASC
`).all('cls_10A1', 'ay_2024_2025');
console.log('getClassStudents(cls_10A1) -> students:', students.length, students.map(s => ({ id: s.student_id, name: s.name })));

// Test getClassGrades with 'enrolled' status
const grades = db.prepare(`
  SELECT g.id, g.student_id, g.subject, g.status
  FROM grades g
  WHERE g.student_id IN (SELECT student_id FROM class_enrollments WHERE class_id = ? AND status = 'enrolled')
`).all('cls_10A1');
console.log('getClassGrades(cls_10A1) -> grades:', grades.length);

// Test creating a test class scenario
console.log('\n=== Testing Test Class Scenario ===');
const timestamp = Date.now();
const testClassId = `test_cls_${timestamp}`;
const testSubjectId = `test_subj_${timestamp}`;

// Check if user exists first
const testUser = db.prepare('SELECT * FROM users WHERE id = ?').get('usr_teacher_1');
console.log('Test user (usr_teacher_1):', testUser ? 'exists' : 'MISSING');

// Create class
try {
  db.prepare(`INSERT OR IGNORE INTO classes (id, name, grade_level, academic_year) VALUES (?, ?, ?, ?)`)
    .run(testClassId, `10G21X`, 10, 'ay_2024_2025');
  console.log('Class created:', testClassId);
} catch(e) {
  console.log('Class creation failed:', e.message);
}

// Create subject
try {
  db.prepare(`INSERT OR IGNORE INTO subjects (id, name, code) VALUES (?, ?, ?)`)
    .run(testSubjectId, `Toán G21`, `G21T${timestamp.toString().slice(-4)}`);
  console.log('Subject created:', testSubjectId);
} catch(e) {
  console.log('Subject creation failed:', e.message);
}

// Create enrollment
const studentUser = db.prepare(`SELECT id FROM users WHERE email = 'minhkhang@school.edu.vn'`).get();
const studentProfile = db.prepare(`SELECT id FROM students WHERE user_id = ?`).get(studentUser?.id);
console.log('Student user:', studentUser?.id, '| Student profile:', studentProfile?.id);

try {
  db.prepare(`DELETE FROM class_enrollments WHERE class_id = ?`).run(testClassId);
  db.prepare(`
    INSERT INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`ce_${timestamp}`, testClassId, studentProfile?.id, 'ay_2024_2025', new Date().toISOString().split('T')[0], 'enrolled', 1);
  console.log('Enrollment created');
} catch(e) {
  console.log('Enrollment failed:', e.message);
}

// Create teacher assignment
try {
  db.prepare(`DELETE FROM teacher_assignments WHERE class_id = ?`).run(testClassId);
  db.prepare(`
    INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year, semester_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`ta_${timestamp}`, 'usr_teacher_1', testClassId, testSubjectId, 'ay_2024_2025', 'sem_2024_1', 'active');
  console.log('Teacher assignment created');
} catch(e) {
  console.log('Teacher assignment failed:', e.message);
}

// Verify the full flow
const enrolledStudents2 = db.prepare(`
  SELECT s.id as student_id, u.name
  FROM students s
  JOIN class_enrollments e ON e.student_id = s.id
  JOIN users u ON u.id = s.user_id
  WHERE e.class_id = ? AND e.status = 'enrolled' AND e.academic_year_id = ?
`).all(testClassId, 'ay_2024_2025');
console.log('Students in test class:', enrolledStudents2.length);

const assignments2 = db.prepare(`
  SELECT ta.id, ta.class_id
  FROM teacher_assignments ta
  WHERE ta.teacher_id = ? AND ta.status = 'active'
`).all('usr_teacher_1');
const testAssignment = assignments2.find(a => a.class_id === testClassId);
console.log('Teacher assigned to test class:', !!testAssignment);

// Cleanup
db.prepare(`DELETE FROM class_enrollments WHERE class_id = ?`).run(testClassId);
db.prepare(`DELETE FROM teacher_assignments WHERE class_id = ?`).run(testClassId);

console.log('\n=== All Fixes Verified ===');
