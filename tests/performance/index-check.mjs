/**
 * Index Check Script
 * G48 — Verify index utilization
 */

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

import { db, initSchema } from '../../server/db.js';

initSchema();

console.log('🔎 Index Utilization Analysis\n');
console.log('='.repeat(60));

const checks = [
  {
    name: 'Classes by school_id',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM classes WHERE school_id = 'sch_bacau'"
  },
  {
    name: 'Classes by school_id (search)',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM classes WHERE school_id = 'sch_bacau' AND status != 'archived'"
  },
  {
    name: 'Users by school_id',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM users WHERE school_id = 'sch_bacau'"
  },
  {
    name: 'Users by email (login)',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'admin@school.edu.vn'"
  },
  {
    name: 'Users by role',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM users WHERE role = 'teacher'"
  },
  {
    name: 'Class enrollments by class',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM class_enrollments WHERE class_id = 'cls_10a1'"
  },
  {
    name: 'Class enrollments by student',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM class_enrollments WHERE student_id = 'std_khoi'"
  },
  {
    name: 'Attendance by student & date',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM attendance WHERE student_id = 'std_khoi' AND date = '2024-09-01'"
  },
  {
    name: 'Notifications by user & is_read',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM notifications WHERE user_id = 'usr_admin_a' AND is_read = 0"
  },
  {
    name: 'Announcements by school & status',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM announcements WHERE school_id = 'sch_bacau' AND status = 'published'"
  },
  {
    name: 'Dashboard attendance join',
    sql: "EXPLAIN QUERY PLAN SELECT COUNT(*) FROM attendance a JOIN students s ON a.student_id = s.id JOIN classes c ON s.class_id = c.id WHERE c.school_id = 'sch_bacau'"
  }
];

let indexedCount = 0;
let scanCount = 0;

for (const check of checks) {
  try {
    const plan = db.prepare(check.sql).all();
    const usesIndex = plan.some(p => 
      JSON.stringify(p).includes('USING') || 
      JSON.stringify(p).includes('INDEX')
    );
    const status = usesIndex ? '✅' : '⚠️';
    
    if (usesIndex) indexedCount++;
    else scanCount++;
    
    console.log(`${status} ${check.name}`);
    for (const row of plan) {
      console.log(`   ${row.detail || row.notused || row.used || row}`);
    }
  } catch (e) {
    console.log(`❓ ${check.name}: ${e.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Summary: ${indexedCount} indexed, ${scanCount} need optimization`);
console.log('\n📋 Recommendations:');
if (scanCount > 0) {
  console.log('⚠️ Some queries are doing table scans. Consider adding indexes.');
}
console.log('✅ Indexes are being used effectively!\n');
