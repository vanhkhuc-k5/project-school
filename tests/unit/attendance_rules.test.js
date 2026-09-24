// =============================================================================
// Unit Tests — Attendance Rules (G43)
// =============================================================================
// These tests verify attendance validation and calculation rules.
// They are DB-free, pure unit tests of deterministic functions.
// =============================================================================

import { describe, test, expect } from '../helpers/testClient.js';

// ============================================================
// ATTENDANCE STATUS TYPES
// ============================================================

const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

const ATTENDANCE_RATE = {
  PRESENT: 1.0,
  ABSENT: 0.0,
  LATE: 0.75,    // Late arrival counts as 75%
  EXCUSED: 1.0,  // Excused absence counts as present
};

// ============================================================
// HELPER FUNCTIONS (Pure/Deterministic)
// ============================================================

/**
 * Calculate attendance rate for a student
 */
export function calculateAttendanceRate(records) {
  if (!records || records.length === 0) return null;

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const record of records) {
    totalWeight += 1;
    // Status values are lowercase ('present') but rate keys are uppercase
    const key = record.status ? record.status.toUpperCase() : null;
    earnedWeight += (key && ATTENDANCE_RATE[key] !== undefined) ? ATTENDANCE_RATE[key] : 0;
  }

  return (earnedWeight / totalWeight) * 100;
}

/**
 * Check if a student can be marked late
 */
export function canMarkLate(recordedAt, scheduleStartTime, gracePeriodMinutes = 15) {
  const recorded = new Date(recordedAt);
  const scheduled = new Date(scheduleStartTime);
  const graceMs = gracePeriodMinutes * 60 * 1000;
  
  return recorded - scheduled > 0 && recorded - scheduled <= graceMs;
}

/**
 * Validate attendance session
 */
export function validateAttendanceSession(session) {
  const errors = [];
  
  if (!session.classId) errors.push('classId is required');
  if (!session.teacherId) errors.push('teacherId is required');
  if (!session.date) errors.push('date is required');
  if (!session.period) errors.push('period is required');
  if (session.status && !['active', 'closed', 'draft'].includes(session.status)) {
    errors.push('Invalid session status');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate attendance record
 */
export function validateAttendanceRecord(record) {
  const errors = [];
  
  if (!record.sessionId) errors.push('sessionId is required');
  if (!record.studentId) errors.push('studentId is required');
  if (!record.status) errors.push('status is required');
  if (record.status && !Object.values(ATTENDANCE_STATUS).includes(record.status)) {
    errors.push(`Invalid status: ${record.status}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Check if attendance record can be modified
 */
export function canModifyAttendance(session, currentUser) {
  // Session must be active
  if (session.status !== 'active') return false;
  
  // Only the teacher who created it or admin can modify
  if (currentUser.role === 'admin' || currentUser.role === 'school_admin') return true;
  if (currentUser.role === 'teacher' && session.teacherId === currentUser.id) return true;
  
  return false;
}

/**
 * Calculate class attendance summary
 */
export function calculateClassAttendanceSummary(records) {
  const summary = {
    total: records.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    rate: 0,
  };
  
  for (const record of records) {
    if (record.status === ATTENDANCE_STATUS.PRESENT) summary.present++;
    else if (record.status === ATTENDANCE_STATUS.ABSENT) summary.absent++;
    else if (record.status === ATTENDANCE_STATUS.LATE) summary.late++;
    else if (record.status === ATTENDANCE_STATUS.EXCUSED) summary.excused++;
  }
  
  summary.rate = calculateAttendanceRate(records) || 0;
  return summary;
}

// ============================================================
// TESTS
// ============================================================

export async function runAttendanceRulesUnitTests() {
  await describe('Unit Test: Attendance Status & Rate Calculation', () => {
    
    test('PRESENT status counts as 100% attendance', () => {
      const records = [
        { status: ATTENDANCE_STATUS.PRESENT },
        { status: ATTENDANCE_STATUS.PRESENT },
        { status: ATTENDANCE_STATUS.PRESENT },
      ];
      const rate = calculateAttendanceRate(records);
      expect(rate).toBe(100);
    });

    test('ABSENT status counts as 0% attendance', () => {
      const records = [
        { status: ATTENDANCE_STATUS.ABSENT },
        { status: ATTENDANCE_STATUS.ABSENT },
      ];
      const rate = calculateAttendanceRate(records);
      expect(rate).toBe(0);
    });

    test('LATE status counts as 75% attendance', () => {
      const records = [
        { status: ATTENDANCE_STATUS.LATE },
      ];
      const rate = calculateAttendanceRate(records);
      expect(rate).toBe(75);
    });

    test('EXCUSED status counts as 100% attendance', () => {
      const records = [
        { status: ATTENDANCE_STATUS.EXCUSED },
        { status: ATTENDANCE_STATUS.EXCUSED },
      ];
      const rate = calculateAttendanceRate(records);
      expect(rate).toBe(100);
    });

    test('Mixed attendance rates calculated correctly', () => {
      const records = [
        { status: ATTENDANCE_STATUS.PRESENT },   // 100%
        { status: ATTENDANCE_STATUS.ABSENT },    // 0%
        { status: ATTENDANCE_STATUS.LATE },      // 75%
        { status: ATTENDANCE_STATUS.EXCUSED },  // 100%
      ];
      // (100 + 0 + 75 + 100) / 4 = 68.75%
      const rate = calculateAttendanceRate(records);
      expect(rate).toBe(68.75);
    });

    test('Empty records return null', () => {
      const rate = calculateAttendanceRate([]);
      expect(rate).toBe(null);
    });

    test('Null records return null', () => {
      const rate = calculateAttendanceRate(null);
      expect(rate).toBe(null);
    });
  });

  await describe('Unit Test: Late Arrival Detection', () => {
    
    test('Arrival within grace period is marked as late', () => {
      const scheduled = '2026-09-15T07:00:00Z';
      const recorded = '2026-09-15T07:10:00Z'; // 10 minutes late
      const result = canMarkLate(recorded, scheduled, 15);
      expect(result).toBe(true);
    });

    test('Arrival exactly at scheduled time is not late', () => {
      const scheduled = '2026-09-15T07:00:00Z';
      const recorded = '2026-09-15T07:00:00Z';
      const result = canMarkLate(recorded, scheduled, 15);
      expect(result).toBe(false);
    });

    test('Arrival after grace period is not marked late', () => {
      const scheduled = '2026-09-15T07:00:00Z';
      const recorded = '2026-09-15T07:30:00Z'; // 30 minutes late
      const result = canMarkLate(recorded, scheduled, 15);
      expect(result).toBe(false);
    });

    test('Early arrival is not marked late', () => {
      const scheduled = '2026-09-15T07:00:00Z';
      const recorded = '2026-09-15T06:45:00Z'; // 15 minutes early
      const result = canMarkLate(recorded, scheduled, 15);
      expect(result).toBe(false);
    });

    test('Default grace period is 15 minutes', () => {
      const scheduled = '2026-09-15T07:00:00Z';
      const recorded = '2026-09-15T07:10:00Z'; // 10 minutes late
      const result = canMarkLate(recorded, scheduled);
      expect(result).toBe(true);
    });
  });

  await describe('Unit Test: Attendance Session Validation', () => {
    
    test('Valid session passes validation', () => {
      const session = {
        classId: 'cls_10a1',
        teacherId: 'usr_teacher_a',
        date: '2026-09-15',
        period: 1,
        status: 'active',
      };
      const result = validateAttendanceSession(session);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('Missing classId fails validation', () => {
      const session = {
        teacherId: 'usr_teacher_a',
        date: '2026-09-15',
        period: 1,
      };
      const result = validateAttendanceSession(session);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('classId is required');
    });

    test('Missing teacherId fails validation', () => {
      const session = {
        classId: 'cls_10a1',
        date: '2026-09-15',
        period: 1,
      };
      const result = validateAttendanceSession(session);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('teacherId is required');
    });

    test('Invalid status fails validation', () => {
      const session = {
        classId: 'cls_10a1',
        teacherId: 'usr_teacher_a',
        date: '2026-09-15',
        period: 1,
        status: 'invalid_status',
      };
      const result = validateAttendanceSession(session);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid session status');
    });

    test('Multiple missing fields return all errors', () => {
      const session = {};
      const result = validateAttendanceSession(session);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  await describe('Unit Test: Attendance Record Validation', () => {
    
    test('Valid record passes validation', () => {
      const record = {
        sessionId: 'sess_001',
        studentId: 'std_a1',
        status: ATTENDANCE_STATUS.PRESENT,
      };
      const result = validateAttendanceRecord(record);
      expect(result.valid).toBe(true);
    });

    test('Missing sessionId fails validation', () => {
      const record = {
        studentId: 'std_a1',
        status: ATTENDANCE_STATUS.PRESENT,
      };
      const result = validateAttendanceRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sessionId is required');
    });

    test('Invalid status fails validation', () => {
      const record = {
        sessionId: 'sess_001',
        studentId: 'std_a1',
        status: 'invalid_status',
      };
      const result = validateAttendanceRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid status');
    });
  });

  await describe('Unit Test: Attendance Modification Rules', () => {
    
    test('Admin can modify any active session', () => {
      const session = { status: 'active', teacherId: 'other_teacher' };
      const user = { id: 'admin_1', role: 'admin' };
      const canModify = canModifyAttendance(session, user);
      expect(canModify).toBe(true);
    });

    test('School admin can modify any active session', () => {
      const session = { status: 'active', teacherId: 'other_teacher' };
      const user = { id: 'admin_1', role: 'school_admin' };
      const canModify = canModifyAttendance(session, user);
      expect(canModify).toBe(true);
    });

    test('Teacher can modify their own session', () => {
      const session = { status: 'active', teacherId: 'teacher_1' };
      const user = { id: 'teacher_1', role: 'teacher' };
      const canModify = canModifyAttendance(session, user);
      expect(canModify).toBe(true);
    });

    test('Teacher cannot modify another teacher session', () => {
      const session = { status: 'active', teacherId: 'teacher_1' };
      const user = { id: 'teacher_2', role: 'teacher' };
      const canModify = canModifyAttendance(session, user);
      expect(canModify).toBe(false);
    });

    test('Cannot modify closed session', () => {
      const session = { status: 'closed', teacherId: 'teacher_1' };
      const user = { id: 'teacher_1', role: 'teacher' };
      const canModify = canModifyAttendance(session, user);
      expect(canModify).toBe(false);
    });

    test('Cannot modify draft session', () => {
      const session = { status: 'draft', teacherId: 'teacher_1' };
      const user = { id: 'admin_1', role: 'admin' };
      const canModify = canModifyAttendance(session, user);
      expect(canModify).toBe(false);
    });
  });

  await describe('Unit Test: Class Attendance Summary', () => {
    
    test('Calculate summary with all statuses', () => {
      const records = [
        { status: ATTENDANCE_STATUS.PRESENT },
        { status: ATTENDANCE_STATUS.PRESENT },
        { status: ATTENDANCE_STATUS.ABSENT },
        { status: ATTENDANCE_STATUS.LATE },
        { status: ATTENDANCE_STATUS.EXCUSED },
      ];
      const summary = calculateClassAttendanceSummary(records);
      
      expect(summary.total).toBe(5);
      expect(summary.present).toBe(2);
      expect(summary.absent).toBe(1);
      expect(summary.late).toBe(1);
      expect(summary.excused).toBe(1);
      // Rate: (2*100 + 1*0 + 1*75 + 1*100) / 5 = 375/5 = 75%
      // Uses same weighted average as calculateAttendanceRate
      expect(summary.rate).toBe(75);
    });

    test('Empty records returns zero summary', () => {
      const summary = calculateClassAttendanceSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.present).toBe(0);
      expect(summary.rate).toBe(0);
    });
  });
}
