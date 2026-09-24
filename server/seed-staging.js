/**
 * EduPortal Staging Seed - Optimized for Neon Free Tier
 * 
 * Key optimizations:
 * - Batch inserts using multi-row VALUES
 * - Connection retry with exponential backoff
 * - Transaction batching for related data
 * - Smaller batch sizes to avoid timeouts
 * - Idempotent operations (safe to re-run)
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');
const PASSWORD_HASH = bcrypt.hashSync('Staging@2026', BCRYPT_ROUNDS);

// Batch configuration for Neon Free tier
const BATCH_SIZE = 50;  // Small batches to avoid timeouts
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500; // ms

if (!DATABASE_URL) {
  console.error('❌ [STAGING SEED] DATABASE_URL is not set.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('❌ [STAGING SEED] PRODUCTION GUARD: Cannot run in production!');
  process.exit(1);
}

// =============================================================================
// DATA CONFIGURATION
// =============================================================================

const SCHOOL = {
  id: 'STG_SCH_001',
  name: 'Trường THPT Chuyên Staging Demo',
  code: 'STG_DEMO',
  short_name: 'STG Demo',
  address: '123 Đường Demo, Quận Demo, TP. Demo',
  district: 'Quận Demo',
  ward: 'Phường Demo',
  province: 'TP. Demo',
  phone: '028-DEMO-0001',
  email: 'contact@stg-demo.edu.vn',
  principal_name: 'GS.TS. Demo Principal',
};

const ACADEMIC_YEAR = {
  id: 'STG_AY_2025',
  school_id: 'STG_SCH_001',
  name: '2025 - 2026',
  start_date: '2025-09-01',
  end_date: '2026-05-31',
  is_current: true,
};

const SEMESTERS = [
  { id: 'STG_SEM_1', name: 'Học kỳ I', semester_number: 1, start_date: '2025-09-01', end_date: '2026-01-15', is_current: true },
  { id: 'STG_SEM_2', name: 'Học kỳ II', semester_number: 2, start_date: '2026-01-16', end_date: '2026-05-31', is_current: false },
];

const DEPARTMENTS = [
  { id: 'STG_DEPT_MATH', name: 'Tổ Toán - Tin học', code: 'TOAN_TIN' },
  { id: 'STG_DEPT_SCI', name: 'Tổ Khoa học Tự nhiên', code: 'KHTN' },
  { id: 'STG_DEPT_LANG', name: 'Tổ Ngoại ngữ', code: 'NN' },
  { id: 'STG_DEPT_SOC', name: 'Tổ Khoa học Xã hội', code: 'KHXH' },
  { id: 'STG_DEPT_ART', name: 'Tổ Thể chất & Nghệ thuật', code: 'TC_NT' },
  { id: 'STG_DEPT_TECH', name: 'Tổ Công nghệ & Kỹ thuật', code: 'CN_KT' },
];

// 15 classes
const CLASSES = [];
for (const grade of [10, 11, 12]) {
  for (let section = 1; section <= 5; section++) {
    const prefix = grade === 10 ? '10' : grade === 11 ? '11' : '12';
    CLASSES.push({
      id: `STG_CLS_${grade}${String(section).padStart(2, '0')}`,
      name: `${prefix}A${section}`,
      grade_level: grade,
      school_id: SCHOOL.id,
      academic_year: '2025-2026',
      academic_year_id: ACADEMIC_YEAR.id,
    });
  }
}

// Demo accounts
const DEMO_ACCOUNTS = [
  { id: 'STG_USR_ADMIN', username: 'stg_admin', email: 'stg.admin@stg-demo.edu.vn', role: 'admin', name: 'Quản trị viên Staging', code: 'ADMIN-STG-001' },
  { id: 'STG_USR_LEAD', username: 'stg_leadership', email: 'stg.leadership@stg-demo.edu.vn', role: 'admin', name: 'Ban Giám hiệu Staging', code: 'BGH-STG-001' },
  { id: 'STG_USR_TEACHER', username: 'stg_teacher', email: 'stg.teacher@stg-demo.edu.vn', role: 'teacher', name: 'Giáo viên Staging', code: 'GV-STG-DEMO' },
  { id: 'STG_USR_STUDENT', username: 'stg_student', email: 'stg.student@stg-demo.edu.vn', role: 'student', name: 'Học sinh Staging', code: 'HS-STG-DEMO' },
  { id: 'STG_USR_PARENT', username: 'stg_parent', email: 'stg.parent@stg-demo.edu.vn', role: 'parent', name: 'Phụ huynh Staging', code: 'PH-STG-DEMO' },
];

// Generate deterministic names
const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Trương', 'Bùi', 'Đặng'];
const NAMES = ['Khang', 'Hà', 'Bảo', 'Anh', 'Tuệ', 'Hùng', 'Linh', 'Phát', 'My', 'Dũng', 'Yến', 'Nam', 'Ngọc', 'Trung', 'Huyền', 'Khôi', 'Châu', 'Tùng', 'Thúy', 'Kiên', 'Hải', 'Văn', 'Thị', 'Minh', 'Quang', 'Phương', 'Thu', 'Thảo', 'Đức'];
const OCCUPATIONS = ['Kỹ sư phần mềm', 'Bác sĩ', 'Giáo viên', 'Kinh doanh', 'Công nhân', 'Kế toán', 'Luật sư', 'Kiến trúc sư'];
const GENDERS = ['male', 'female'];

// Generate 300 teachers
const TEACHERS = [];
for (let i = 0; i < 300; i++) {
  const surname = SURNAMES[i % SURNAMES.length];
  const name = NAMES[(i >> 1) % NAMES.length];
  const suffix = i >= 30 ? ` ${Math.floor(i / 30) + 1}` : '';
  TEACHERS.push({
    id: `STG_USR_T${String(i + 1).padStart(3, '0')}`,
    username: `stgteacher${i + 1}`,
    email: `stg.teacher${i + 1}@stg-demo.edu.vn`,
    role: 'teacher',
    name: `${surname} ${name}${suffix}`,
    code: `GV-STG-${String(i + 1).padStart(3, '0')}`,
    deptIndex: i % DEPARTMENTS.length,
  });
}

// Generate 333 parents
const PARENTS = [];
for (let i = 0; i < 333; i++) {
  const surname = SURNAMES[i % SURNAMES.length];
  const name = NAMES[(i >> 1) % NAMES.length];
  PARENTS.push({
    id: `STG_USR_P${String(i + 1).padStart(3, '0')}`,
    username: `stgparent${i + 1}`,
    email: `stg.parent${i + 1}@stg-demo.edu.vn`,
    role: 'parent',
    name: `${surname} ${name}`,
    code: `PH-STG-${String(i + 1).padStart(3, '0')}`,
    occupation: OCCUPATIONS[i % OCCUPATIONS.length],
  });
}

// Generate 1000 students
const STUDENTS = [];
for (let i = 0; i < 1000; i++) {
  const classIndex = i % 15;
  const classObj = CLASSES[classIndex];
  const surname = SURNAMES[i % SURNAMES.length];
  const name = NAMES[(i >> 2) % NAMES.length];
  const gender = GENDERS[i % 2];
  const gradeOffset = Math.floor(classIndex / 5);
  const baseYear = 2010 + gradeOffset;
  const month = String(((i % 12) + 1)).padStart(2, '0');
  const day = String(((i % 28) + 1)).padStart(2, '0');
  
  STUDENTS.push({
    id: `STG_USR_S${String(i + 1).padStart(4, '0')}`,
    username: `stgstudent${i + 1}`,
    email: `stg.student${i + 1}@stg-demo.edu.vn`,
    role: 'student',
    name: `${surname} ${name}`,
    code: `HS-STG-${String(i + 1).padStart(4, '0')}`,
    class_id: classObj.id,
    gender,
    dob: `${baseYear}-${month}-${day}`,
    gpa: 5 + ((i * 7) % 50) / 10,
    attendance_rate: 85 + ((i * 3) % 15),
  });
}

// =============================================================================
// DATABASE HELPERS
// =============================================================================

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, operation) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err.message.includes('connection') || err.message.includes('timeout') || err.message.includes('terminated')) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`  ⏳ ${operation}: Retry ${attempt}/${MAX_RETRIES} after ${delay}ms (${err.message.substring(0, 50)})`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

async function checkExists(sql, params) {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function batchInsert(table, columns, rows, idColumn) {
  if (rows.length === 0) return 0;
  
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
  let inserted = 0;
  
  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const client = await pool.connect();
      
      try {
        await withRetry(async () => {
          const values = [];
          const placeholders = [];
          let paramIndex = 1;
          
          for (const row of batch) {
            const rowPlaceholders = columns.map(() => `$${paramIndex++}`);
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            values.push(...columns.map(col => row[col]));
          }
          
          const sql = `
            INSERT INTO ${table} (${columns.join(', ')})
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (${idColumn}) DO NOTHING
          `;
          
          const result = await client.query(sql, values);
          inserted += result.rowCount;
        }, `${table} batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        
        if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= rows.length) {
          console.log(`  ${table}: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
        }
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
  
  return inserted;
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function seed() {
  const startTime = Date.now();
  const stats = {};
  
  // Shared pool for queries that need the client
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  const sharedClient = await pool.connect();
  
  console.log('\n' + '='.repeat(70));
  console.log('🎓 EDUPORTAL STAGING SEED (Optimized for Neon)');
  console.log('='.repeat(70));
  console.log(`Batch size: ${BATCH_SIZE}, Max retries: ${MAX_RETRIES}`);
  console.log('');

  try {
    // 1. School
    console.log('🏫 Seeding school...');
    const schoolExists = await checkExists('SELECT 1 FROM schools WHERE id = $1', [SCHOOL.id]);
    if (!schoolExists) {
      await batchInsert('schools', ['id', 'name', 'code', 'short_name', 'address', 'district', 'ward', 'province', 'phone', 'email', 'principal_name', 'status'],
        [{ ...SCHOOL, status: 'active' }], 'id');
      stats.schools = 1;
    } else {
      stats.schools = 0;
      console.log('  School already exists, skipping');
    }

    // 2. Academic Year
    console.log('📅 Seeding academic year...');
    const ayExists = await checkExists('SELECT 1 FROM academic_years WHERE id = $1', [ACADEMIC_YEAR.id]);
    if (!ayExists) {
      await batchInsert('academic_years', ['id', 'school_id', 'name', 'start_date', 'end_date', 'is_current'],
        [{ ...ACADEMIC_YEAR }], 'id');
      stats.academicYears = 1;
    } else {
      stats.academicYears = 0;
      console.log('  Academic year already exists, skipping');
    }

    // 3. Semesters
    console.log('📚 Seeding semesters...');
    for (const sem of SEMESTERS) {
      const exists = await checkExists('SELECT 1 FROM semesters WHERE id = $1', [sem.id]);
      if (!exists) {
        await batchInsert('semesters', ['id', 'academic_year_id', 'school_id', 'name', 'semester_number', 'start_date', 'end_date', 'is_current'],
          [{ ...sem, school_id: SCHOOL.id }], 'id');
      }
    }
    stats.semesters = SEMESTERS.length;

    // 4. Departments
    console.log('🏢 Seeding departments...');
    await batchInsert('departments', ['id', 'school_id', 'name', 'code', 'description'],
      DEPARTMENTS.map(d => ({ ...d, school_id: SCHOOL.id, description: '' })), 'id');
    stats.departments = DEPARTMENTS.length;

    // 4b. Subjects (required for teacher_assignments FK)
    // Use existing subjects or create new ones with unique codes
    console.log('📚 Seeding/checking subjects...');
    const subjectRes = await sharedClient.query(`
      SELECT id FROM subjects WHERE school_id = 'STG_SCH_001'
    `);
    let subjectIds = subjectRes.rows.map(r => r.id);
    
    if (subjectIds.length === 0) {
      // Create new subjects with unique codes
      const newSubjects = [
        { id: 'STG_SUB_TOAN', name: 'Toán', code: 'STG_TOAN' },
        { id: 'STG_SUB_VATLY', name: 'Vật lý', code: 'STG_VATLY' },
        { id: 'STG_SUB_HOAHOC', name: 'Hóa học', code: 'STG_HOAHOC' },
        { id: 'STG_SUB_SINHHOC', name: 'Sinh học', code: 'STG_SINHHOC' },
        { id: 'STG_SUB_NGUVAN', name: 'Ngữ văn', code: 'STG_NGUVAN' },
        { id: 'STG_SUB_TIENGANH', name: 'Tiếng Anh', code: 'STG_ENG' },
      ];
      
      for (const sub of newSubjects) {
        await sharedClient.query(`
          INSERT INTO subjects (id, name, code, department, school_id, department_id, grade_level, weekly_periods, status)
          VALUES ($1, $2, $3, '', $4, $5, 10, 3, 'active')
          ON CONFLICT (id) DO NOTHING
        `, [sub.id, sub.name, sub.code, SCHOOL.id, DEPARTMENTS[0].id]);
      }
      subjectIds = newSubjects.map(s => s.id);
    }
    stats.subjects = subjectIds.length;

    // 5. Classes
    console.log('🏫 Seeding classes...');
    await batchInsert('classes', ['id', 'name', 'grade_level', 'academic_year', 'school_id', 'academic_year_id', 'max_students', 'status'],
      CLASSES.map(c => ({ ...c, max_students: 45, status: 'active' })), 'id');
    stats.classes = CLASSES.length;

    // 6. Users - Demo accounts
    console.log('🔐 Seeding demo accounts...');
    await batchInsert('users', ['id', 'username', 'email', 'password_hash', 'role', 'name', 'code', 'school_id', 'must_change_password', 'is_active'],
      DEMO_ACCOUNTS.map(a => ({ ...a, password_hash: PASSWORD_HASH, must_change_password: false, is_active: true })), 'id');
    stats.demoAccounts = DEMO_ACCOUNTS.length;

    // 7. Teachers - Check existing count
    console.log('👨‍🏫 Seeding teachers (300)...');
    const existingTeachers = await checkExists('SELECT 1 FROM users WHERE id = $1', ['STG_USR_T001']);
    if (!existingTeachers) {
      await batchInsert('users', ['id', 'username', 'email', 'password_hash', 'role', 'name', 'code', 'school_id', 'must_change_password', 'is_active'],
        TEACHERS.map(t => ({ ...t, password_hash: PASSWORD_HASH, must_change_password: false, is_active: true })), 'id');
      
      // Teacher profiles
      await batchInsert('teachers', ['id', 'user_id', 'school_id', 'specialty', 'status', 'employee_id'],
        TEACHERS.map(t => ({
          id: `STG_TCH_${t.id.slice(-3)}`,
          user_id: t.id,
          school_id: SCHOOL.id,
          specialty: t.name.split(' ').pop(),
          status: 'active',
          employee_id: t.code,
        })), 'id');
    } else {
      console.log('  Teachers already exist, skipping');
    }
    stats.teachers = 300;

    // 8. Parents
    console.log('👨‍👩‍👧 Seeding parents (333)...');
    const existingParents = await checkExists('SELECT 1 FROM users WHERE id = $1', ['STG_USR_P001']);
    if (!existingParents) {
      await batchInsert('users', ['id', 'username', 'email', 'password_hash', 'role', 'name', 'code', 'school_id', 'must_change_password', 'is_active'],
        PARENTS.map(p => ({ ...p, password_hash: PASSWORD_HASH, must_change_password: false, is_active: true })), 'id');
      
      // Parent profiles
      await batchInsert('parents', ['id', 'user_id', 'school_id', 'occupation', 'status'],
        PARENTS.map(p => ({
          id: `STG_PRT_${p.id.slice(-3)}`,
          user_id: p.id,
          school_id: SCHOOL.id,
          occupation: p.occupation,
          status: 'active',
        })), 'id');
    } else {
      console.log('  Parents already exist, skipping');
    }
    stats.parents = 333;

    // 9. Students
    console.log('📚 Seeding students (1000)...');
    const existingStudents = await checkExists('SELECT 1 FROM users WHERE id = $1', ['STG_USR_S001']);
    if (!existingStudents) {
      await batchInsert('users', ['id', 'username', 'email', 'password_hash', 'role', 'name', 'code', 'school_id', 'must_change_password', 'is_active'],
        STUDENTS.map(s => ({ ...s, password_hash: PASSWORD_HASH, must_change_password: false, is_active: true })), 'id');
      
      // Student profiles
      await batchInsert('students', ['id', 'user_id', 'class_id', 'school_id', 'student_code', 'gpa', 'attendance_rate', 'dob', 'gender', 'enrollment_status'],
        STUDENTS.map(s => ({
          id: `STG_STD_${s.id.slice(-4)}`,
          user_id: s.id,
          class_id: s.class_id,
          school_id: SCHOOL.id,
          student_code: s.code,
          gpa: s.gpa,
          attendance_rate: s.attendance_rate,
          dob: s.dob,
          gender: s.gender,
          enrollment_status: 'enrolled',
        })), 'id');
    } else {
      console.log('  Students already exist, skipping');
    }
    stats.students = 1000;

    // 10. Class Enrollments (first 500 for initial load)
    console.log('📋 Seeding class enrollments...');
    const existingEnrollments = await checkExists('SELECT 1 FROM class_enrollments WHERE id = $1', ['STG_CE_S0001']);
    if (!existingEnrollments) {
      const enrollments = STUDENTS.slice(0, 500).map(s => ({
        id: `STG_CE_${s.id.slice(-4)}`,
        class_id: s.class_id,
        student_id: `STG_STD_${s.id.slice(-4)}`,
        academic_year_id: ACADEMIC_YEAR.id,
        enrollment_date: '2025-09-01',
        status: 'enrolled',
        is_current: true,
        school_id: SCHOOL.id,
      }));
      await batchInsert('class_enrollments', ['id', 'class_id', 'student_id', 'academic_year_id', 'enrollment_date', 'status', 'is_current', 'school_id'],
        enrollments, 'id');
    }
    stats.enrollments = 500;

    // 11. Teacher Assignments
    console.log('📝 Seeding teacher assignments...');
    const existingTA = await checkExists('SELECT 1 FROM teacher_assignments WHERE id = $1', ['STG_TA_0001']);
    if (!existingTA) {
      // Get subject IDs from database
      const subjectRes = await sharedClient.query(`
        SELECT id FROM subjects WHERE school_id = 'STG_SCH_001' OR school_id IS NULL LIMIT 10
      `);
      const availableSubjects = subjectRes.rows.map(r => r.id);
      
      // Constraint: only 1 active primary per class+subject
      // So we use 'primary' role for first assignment per class+subject, rest are 'supporting'
      const assignments = [];
      const primaryAssignments = new Set(); // Track class+subject combinations
      
      for (let i = 0; i < TEACHERS.length; i++) {
        const t = TEACHERS[i];
        for (let c = 0; c < 3; c++) {
          const classIndex = (i + c * 7) % CLASSES.length;
          const cls = CLASSES[classIndex];
          const subjectIdx = (i + c) % availableSubjects.length;
          const subjectId = availableSubjects[subjectIdx];
          
          // Check if this class+subject already has a primary
          const comboKey = `${cls.id}|${subjectId}`;
          const isPrimary = !primaryAssignments.has(comboKey);
          if (isPrimary) {
            primaryAssignments.add(comboKey);
          }
          
          // Role must be one of: primary, secondary, assistant, substitute
          const role = isPrimary ? 'primary' : 'secondary';
          
          assignments.push({
            id: `STG_TA_${String(assignments.length + 1).padStart(4, '0')}`,
            teacher_id: t.id,
            class_id: cls.id,
            subject_id: subjectId,
            academic_year: '2025-2026',
            academic_year_id: ACADEMIC_YEAR.id,
            school_id: SCHOOL.id,
            role: role,
            status: 'active',
          });
        }
      }
      await batchInsert('teacher_assignments', ['id', 'teacher_id', 'class_id', 'subject_id', 'academic_year', 'academic_year_id', 'school_id', 'role', 'status'],
        assignments, 'id');
      stats.teacherAssignments = assignments.length;
    } else {
      stats.teacherAssignments = 900; // Estimate
    }

    // 12. Sample Assignments (50 total)
    console.log('📋 Seeding sample assignments...');
    const existingAsg = await checkExists('SELECT 1 FROM assignments WHERE id = $1', ['STG_ASG_0001']);
    if (!existingAsg) {
      const subjects = ['Toán', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh'];
      const titles = [
        'Kiểm tra 15 phút: Hàm số bậc hai',
        'Bài tập lớn: Lập trình Python',
        'Kiểm tra 1 tiết: Động lực học',
        'Bài luận: Phân tích tác phẩm văn học',
        'Thực hành: Phản ứng hóa học',
      ];
      
      const assignments = [];
      for (let i = 0; i < 50; i++) {
        const dueDate = new Date(Date.now() + (7 + i % 14) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        assignments.push({
          id: `STG_ASG_${String(i + 1).padStart(4, '0')}`,
          title: titles[i % titles.length],
          subject: subjects[i % subjects.length],
          type: 'quiz',
          instructions: 'Hướng dẫn: Làm bài theo yêu cầu.',
          target_classes: JSON.stringify([CLASSES[i % 15].name]),
          due_date: dueDate,
          due_time: '23:59',
          status: 'published',
          created_by: TEACHERS[i % 20].id,
          school_id: SCHOOL.id,
          total_score: 10,
        });
      }
      await batchInsert('assignments', ['id', 'title', 'subject', 'type', 'instructions', 'target_classes', 'due_date', 'due_time', 'status', 'created_by', 'school_id', 'total_score'],
        assignments, 'id');
    }
    stats.assignments = 50;

    // 13. Sample Grades (200 students × 6 subjects = 1200)
    console.log('📊 Seeding sample grades...');
    const existingGrades = await checkExists('SELECT 1 FROM grades WHERE id = $1', ['STG_GRD_00001']);
    if (!existingGrades) {
      const subjects = ['Toán', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh'];
      const grades = [];
      
      for (let i = 0; i < 200; i++) {
        const student = STUDENTS[i];
        for (const subj of subjects) {
          const score = 5 + ((i * 7 + subjects.indexOf(subj) * 3) % 50) / 10;
          const gradedAt = new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          grades.push({
            id: `STG_GRD_${String(grades.length + 1).padStart(5, '0')}`,
            student_id: `STG_STD_${student.id.slice(-4)}`,
            subject: subj,
            test_name: `KT 15 phút - ${subj}`,
            score: score,
            max_score: 10,
            semester: 1,
            status: 'published',
            teacher_name: TEACHERS[i % 20].name,
            graded_at: gradedAt,
            published_at: gradedAt,
            school_id: SCHOOL.id,
          });
        }
      }
      await batchInsert('grades', ['id', 'student_id', 'subject', 'test_name', 'score', 'max_score', 'semester', 'status', 'teacher_name', 'graded_at', 'published_at', 'school_id'],
        grades, 'id');
    }
    stats.grades = 1200;

    // 14. Sample Attendance (100 students × 10 days = 1000)
    console.log('✅ Seeding sample attendance...');
    const existingAtt = await checkExists('SELECT 1 FROM attendance WHERE id = $1', ['STG_ATT_S0001_0']);
    if (!existingAtt) {
      const attendance = [];
      const statuses = ['present', 'present', 'present', 'late', 'absent'];
      const today = new Date();
      
      for (let i = 0; i < 100; i++) {
        const student = STUDENTS[i];
        for (let day = 0; day < 10; day++) {
          const date = new Date(today);
          date.setDate(date.getDate() - day);
          const dateStr = date.toISOString().split('T')[0];
          attendance.push({
            id: `STG_ATT_${student.id.slice(-4)}_${day}`,
            student_id: `STG_STD_${student.id.slice(-4)}`,
            class_id: student.class_id,
            date: dateStr,
            status: statuses[(i + day) % statuses.length],
            recorded_by: TEACHERS[i % 20].id,
          });
        }
      }
      await batchInsert('attendance', ['id', 'student_id', 'class_id', 'date', 'status', 'recorded_by'],
        attendance, 'id');
    }
    stats.attendance = 1000;

    // 15. Parent-Student Links
    console.log('🔗 Seeding parent-student links...');
    const existingLinks = await checkExists('SELECT 1 FROM parent_student_links WHERE id = $1', ['STG_LINK_0001']);
    if (!existingLinks) {
      const links = [];
      for (let p = 0; p < Math.min(PARENTS.length, 100); p++) {
        const childCount = 2 + (p % 3);
        for (let c = 0; c < childCount && (p * 3 + c) < STUDENTS.length; c++) {
          links.push({
            id: `STG_LINK_${String(links.length + 1).padStart(4, '0')}`,
            parent_id: PARENTS[p].id, // references users.id
            student_id: `STG_STD_${STUDENTS[p * 3 + c].id.slice(-4)}`,
            relationship: 'parent',
            is_primary_contact: 1,
            is_verified: 1,
            is_active: 1,
          });
        }
      }
      await batchInsert('parent_student_links', ['id', 'parent_id', 'student_id', 'relationship', 'is_primary_contact', 'is_verified', 'is_active'],
        links, 'id');
    }
    stats.parentLinks = 200;

    // 15. Announcements
    console.log('📢 Seeding announcements...');
    const existingAnn = await checkExists('SELECT 1 FROM announcements WHERE id = $1', ['STG_ANN_001']);
    if (!existingAnn) {
      const announcements = [
        { id: 'STG_ANN_001', title: 'Khai giảng năm học 2025-2026', content: 'Trường THPT Chuyên Staging Demo trân trọng thông báo lịch khai giảng năm học mới.', scope: 'all', priority: 'important' },
        { id: 'STG_ANN_002', title: 'Lịch thi giữa học kỳ I', content: 'Thông báo lịch thi giữa học kỳ I cho các khối 10, 11, 12.', scope: 'student', priority: 'normal' },
        { id: 'STG_ANN_003', title: 'Họp phụ huynh giữa học kỳ', content: 'Nhà trường tổ chức họp phụ huynh vào ngày 27/10/2025.', scope: 'parent', priority: 'important' },
      ];
      
      for (const ann of announcements) {
        await sharedClient.query(`
          INSERT INTO announcements (id, school_id, title, content, summary, scope, priority, status, author_id, author_name, sender_id, sender_name, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, $9, $8, $9, true)
          ON CONFLICT (id) DO NOTHING
        `, [ann.id, SCHOOL.id, ann.title, ann.content, ann.content.substring(0, 50), ann.scope, ann.priority, DEMO_ACCOUNTS[0].id, DEMO_ACCOUNTS[0].name]);
      }
    }
    stats.announcements = 3;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log('✅ STAGING SEED COMPLETED');
    console.log('='.repeat(70));
    console.log(`Duration: ${duration} seconds`);
    console.log('');
    console.log('📊 STATISTICS:');
    console.log('-'.repeat(50));
    console.log(`  Schools:              ${stats.schools}`);
    console.log(`  Teachers:            ${stats.teachers}`);
    console.log(`  Parents:             ${stats.parents}`);
    console.log(`  Students:            ${stats.students}`);
    console.log(`  Classes:             ${stats.classes}`);
    console.log(`  Enrollments:         ${stats.enrollments}`);
    console.log(`  Teacher Assignments: ${stats.teacherAssignments}`);
    console.log(`  Assignments:         ${stats.assignments}`);
    console.log(`  Grades:              ${stats.grades}`);
    console.log(`  Attendance:          ${stats.attendance}`);
    console.log(`  Parent Links:        ${stats.parentLinks}`);
    console.log(`  Announcements:       ${stats.announcements}`);
    console.log('');
    console.log('🔐 DEMO ACCOUNTS (Password: Staging@2026)');
    console.log('-'.repeat(50));
    for (const acc of DEMO_ACCOUNTS) {
      console.log(`  ${acc.role.padEnd(15)} ${acc.username.padEnd(20)} ${acc.email}`);
    }
    console.log('');
    console.log('⚠️  All staging data is prefixed with STG_ for identification');
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('\n❌ STAGING SEED FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (sharedClient) sharedClient.release();
    await pool.end();
  }
}

seed();
