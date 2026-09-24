/**
 * Debug schema creation
 */

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.DATABASE_URL = '';

import('../../server/db.js').then(async (m) => {
  const { db, initSchema } = m;
  
  console.log('🔍 Debugging schema creation...\n');
  
  // Initialize schema first
  try {
    initSchema();
    console.log('✅ initSchema() completed');
  } catch (e) {
    console.log('❌ initSchema() failed:', e.message);
  }
  
  // Try creating tables one by one
  const tableOrder = [
    'schools',
    'users',
    'academic_years',
    'semesters',
    'departments',
    'subjects',
    'classes',
    'class_enrollments',
    'students',
    'parents',
    'teachers',
    'teacher_assignments',
    'assignments',
    'assignment_questions',
    'assignment_submissions',
    'grades',
    'grade_categories',
    'attendance',
    'attendance_sessions',
    'attendance_records',
    'announcements',
    'announcement_reads',
    'announcement_categories',
    'notifications',
    'messages',
    'parent_student_links',
    'school_notices',
    'refresh_tokens',
    'password_resets',
    'leave_requests',
    'timetable',
    'audit_logs',
    'tuition_invoices',
    'invoice_line_items',
    'payment_transactions',
    'dashboard_metrics',
    'grade_calculation_configs',
    'grade_calculation_snapshots',
  ];
  
  for (const tableName of tableOrder) {
    try {
      const result = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`).get();
      if (result) {
        console.log(`✅ ${tableName} exists`);
        console.log(`   SQL: ${result.sql.substring(0, 100)}...`);
      } else {
        console.log(`❌ ${tableName} does NOT exist`);
      }
    } catch (e) {
      console.log(`❌ ${tableName}: ${e.message}`);
    }
  }
  
  // Check class_enrollments specifically
  console.log('\n📋 class_enrollments columns:');
  try {
    const cols = db.prepare('PRAGMA table_info(class_enrollments)').all();
    cols.forEach(c => console.log(`  - ${c.name} (${c.type})`));
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
});
