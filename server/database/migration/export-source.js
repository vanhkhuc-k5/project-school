/**
 * Data Export Utility
 * 
 * Exports SQLite data to JSON for inspection before migration
 * 
 * Usage:
 *   node server/database/migration/export-source.js [--output=<path>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_OUTPUT = './migration-data-export.json';
const SQLITE_PATH = process.env.SQ_LITE_PATH || './database.sqlite';

// =============================================================================
// TABLES TO EXPORT
// =============================================================================

const TABLES = [
  // Core entities
  'schools',
  'users',
  'teachers',
  'parents',
  
  // Academic structure
  'academic_years',
  'semesters',
  'departments',
  'subjects',
  'classes',
  
  // Enrollments
  'class_enrollments',
  'students',
  'parent_students',
  'parent_student_links',
  
  // Teaching assignments
  'teacher_assignments',
  
  // Assignments
  'assignments',
  'assignment_questions',
  'assignment_submissions',
  
  // Grades
  'grades',
  'student_competencies',
  
  // Attendance
  'attendance_sessions',
  'attendance_records',
  'attendance',
  
  // Schedule
  'timetable',
  
  // Finance
  'tuition_invoices',
  'invoice_line_items',
  'tuition_payments',
  
  // Communication
  'announcements',
  'announcement_reads',
  'notifications',
  'messages',
  'message_conversations',
  'parent_teacher_messages',
  'school_notices',
  
  // Leave requests
  'leave_requests',
  
  // AI Tutor
  'ai_tutor_messages',
  
  // Resources
  'study_resources',
  
  // Audit
  'audit_logs'
];

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

function exportTable(db, tableName) {
  try {
    const stmt = db.prepare(`SELECT * FROM ${tableName}`);
    const rows = stmt.all();
    
    // Get table stats
    const info = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    
    return {
      count: rows.length,
      data: rows
    };
  } catch (err) {
    if (err.message.includes('no such table')) {
      return { count: 0, data: [], error: `Table not found: ${tableName}` };
    }
    return { count: 0, data: [], error: err.message };
  }
}

function analyzeDemoData(rows, tableName) {
  // Check for common demo patterns
  const demoPatterns = {
    test: /test|demo|sample/i,
    email: /example\.com$/,
    codes: /^TEST|^DEMO|^SAMPLE/i
  };
  
  const demoRows = rows.filter(row => {
    // Check various fields for demo patterns
    const fields = [
      row.name, row.email, row.username, row.code, 
      row.title, row.subject
    ].filter(Boolean);
    
    return fields.some(field => {
      if (demoPatterns.test.test(field)) return true;
      if (demoPatterns.email.test(field)) return true;
      if (demoPatterns.codes.test(field)) return true;
      return false;
    });
  });
  
  return {
    total: rows.length,
    demo: demoRows.length,
    real: rows.length - demoRows.length,
    demoPercentage: rows.length > 0 
      ? ((demoRows.length / rows.length) * 100).toFixed(1) + '%'
      : '0%'
  };
}

function exportAllTables(sqlitePath, outputPath) {
  console.log('📤 Data Export Utility');
  console.log('='.repeat(50));
  console.log(`Source: ${sqlitePath}`);
  console.log(`Output: ${outputPath}`);
  console.log('');
  
  // Check if database exists
  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ Database not found: ${sqlitePath}`);
    console.log('Run "npm run seed" first to create the database.');
    process.exit(1);
  }
  
  // Open database
  const db = new Database(sqlitePath, { readonly: true });
  
  console.log('📊 Exporting tables...');
  console.log('');
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    source: sqlitePath,
    tables: {},
    summary: {
      totalTables: 0,
      totalRecords: 0,
      demoRecords: 0
    }
  };
  
  let totalRecords = 0;
  let totalDemoRecords = 0;
  
  for (const tableName of TABLES) {
    const result = exportTable(db, tableName);
    
    if (result.error && result.error.includes('not found')) {
      continue; // Skip non-existent tables
    }
    
    // Analyze demo data
    const analysis = analyzeDemoData(result.data, tableName);
    
    exportData.tables[tableName] = {
      count: result.count,
      data: result.data,
      analysis: analysis
    };
    
    totalRecords += result.count;
    totalDemoRecords += analysis.demo;
    
    // Print progress
    const status = result.error 
      ? `❌ ${result.error}`
      : `✅ ${result.count} records`;
    const demoInfo = analysis.demo > 0 
      ? ` (${analysis.demo} demo)` 
      : '';
    console.log(`  ${tableName.padEnd(30)} ${status}${demoInfo}`);
  }
  
  db.close();
  
  // Summary
  exportData.summary = {
    totalTables: Object.keys(exportData.tables).length,
    totalRecords,
    demoRecords: totalDemoRecords,
    realRecords: totalRecords - totalDemoRecords,
    demoPercentage: totalRecords > 0
      ? ((totalDemoRecords / totalRecords) * 100).toFixed(1) + '%'
      : '0%'
  };
  
  console.log('');
  console.log('='.repeat(50));
  console.log('📋 Summary:');
  console.log(`   Total Tables: ${exportData.summary.totalTables}`);
  console.log(`   Total Records: ${exportData.summary.totalRecords}`);
  console.log(`   Demo Records: ${exportData.summary.demoRecords}`);
  console.log(`   Real Records: ${exportData.summary.realRecords}`);
  console.log(`   Demo Percentage: ${exportData.summary.demoPercentage}`);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write export file
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  console.log(`\n💾 Export saved to: ${outputPath}`);
  
  // Also print some sample data
  console.log('\n📄 Sample Data Preview:');
  console.log('='.repeat(50));
  
  if (exportData.tables.users?.data?.length > 0) {
    console.log('\n👥 Sample Users (first 3):');
    exportData.tables.users.data.slice(0, 3).forEach(u => {
      console.log(`   ${u.id}: ${u.name} (${u.role}) - ${u.email}`);
    });
  }
  
  if (exportData.tables.students?.data?.length > 0) {
    console.log('\n📚 Sample Students (first 3):');
    exportData.tables.students.data.slice(0, 3).forEach(s => {
      console.log(`   ${s.id}: user=${s.user_id}, class=${s.class_id}, GPA=${s.gpa}`);
    });
  }
  
  if (exportData.tables.grades?.data?.length > 0) {
    console.log('\n📝 Sample Grades (first 3):');
    exportData.tables.grades.data.slice(0, 3).forEach(g => {
      console.log(`   ${g.id}: student=${g.student_id}, ${g.subject}=${g.score}`);
    });
  }
  
  return exportData;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  // Parse arguments
  let outputPath = DEFAULT_OUTPUT;
  
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--output=')) {
      outputPath = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
EduPortal Data Export Utility

Usage:
  node server/database/migration/export-source.js [--output=<path>]

Options:
  --output=<path>   Output JSON file path (default: ./migration-data-export.json)
  --help, -h        Show this help message

Example:
  node server/database/migration/export-source.js --output=./data-export.json
      `);
      process.exit(0);
    }
  }
  
  const sqlitePath = path.resolve(SQLITE_PATH);
  exportAllTables(sqlitePath, path.resolve(outputPath));
}

// Run if executed directly
const isMainModule = process.argv[1]?.endsWith('export-source.js');
if (isMainModule) {
  main();
}

export { exportAllTables, exportTable, analyzeDemoData };
