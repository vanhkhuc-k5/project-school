// =============================================================================
// Unit Tests — Enrollment Rules (G43)
// =============================================================================
// These tests verify student enrollment validation and state transition rules.
// They are DB-free, pure unit tests of deterministic functions.
// =============================================================================

import { describe, test, expect } from '../helpers/testClient.js';

// ============================================================
// ENROLLMENT STATUS TYPES
// ============================================================

const ENROLLMENT_STATUS = {
  ENROLLED: 'enrolled',
  TRANSFERRED: 'transferred',
  WITHDRAWN: 'withdrawn',
  GRADUATED: 'graduated',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
};

const ENROLLMENT_TRANSITIONS = {
  enrolled: ['transferred', 'withdrawn', 'graduated', 'suspended'],
  pending: ['enrolled', 'withdrawn'],
  transferred: [],
  withdrawn: ['enrolled', 'pending'],
  graduated: [],
  suspended: ['enrolled', 'withdrawn'],
};

// ============================================================
// HELPER FUNCTIONS (Pure/Deterministic)
// ============================================================

/**
 * Check if enrollment status transition is valid
 */
export function canTransition(fromStatus, toStatus) {
  if (!ENROLLMENT_TRANSITIONS[fromStatus]) return false;
  return ENROLLMENT_TRANSITIONS[fromStatus].includes(toStatus);
}

/**
 * Check if student can enroll in class
 */
export function canEnrollInClass(student, classObj, academicYear) {
  const errors = [];
  
  // Student must be active
  if (student.enrollmentStatus !== 'active') {
    errors.push('Student is not in active status');
  }
  
  // Class must be active
  if (classObj.status !== 'active') {
    errors.push('Class is not active');
  }
  
  // Student grade level must match class grade level
  if (student.gradeLevel !== classObj.gradeLevel) {
    errors.push('Student grade level does not match class grade level');
  }
  
  // Academic year must be current
  if (!academicYear.isCurrent) {
    errors.push('Academic year is not current');
  }
  
  // Check capacity
  if (classObj.currentEnrollment >= classObj.maxCapacity) {
    errors.push('Class is at maximum capacity');
  }
  
  return { canEnroll: errors.length === 0, errors };
}

/**
 * Check if student can withdraw from class
 */
export function canWithdrawFromClass(enrollment, currentDate, academicYear) {
  const errors = [];
  
  // Cannot withdraw after 30% of academic year
  const yearStart = new Date(academicYear.startDate);
  const yearEnd = new Date(academicYear.endDate);
  const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24);
  const elapsedDays = (new Date(currentDate) - yearStart) / (1000 * 60 * 60 * 24);
  const elapsedPercent = (elapsedDays / totalDays) * 100;
  
  if (elapsedPercent > 30) {
    errors.push('Cannot withdraw after 30% of academic year has passed');
  }
  
  // Must be currently enrolled
  if (enrollment.status !== ENROLLMENT_STATUS.ENROLLED) {
    errors.push('Student is not currently enrolled');
  }
  
  return { canWithdraw: errors.length === 0, errors };
}

/**
 * Check if enrollment can be transferred
 */
export function canTransferEnrollment(enrollment, newClass, currentDate, academicYear) {
  const errors = [];
  
  // Can only transfer enrolled students
  if (enrollment.status !== ENROLLMENT_STATUS.ENROLLED) {
    errors.push('Only enrolled students can be transferred');
  }
  
  // Cannot transfer after 50% of year
  const yearStart = new Date(academicYear.startDate);
  const yearEnd = new Date(academicYear.endDate);
  const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24);
  const elapsedDays = (new Date(currentDate) - yearStart) / (1000 * 60 * 60 * 24);
  const elapsedPercent = (elapsedDays / totalDays) * 100;
  
  if (elapsedPercent > 50) {
    errors.push('Cannot transfer after 50% of academic year has passed');
  }
  
  // Target class must be active
  if (newClass.status !== 'active') {
    errors.push('Target class is not active');
  }
  
  // Target class must have capacity
  if (newClass.currentEnrollment >= newClass.maxCapacity) {
    errors.push('Target class is at maximum capacity');
  }
  
  // Grade levels must match
  if (enrollment.gradeLevel !== newClass.gradeLevel) {
    errors.push('Cannot transfer to different grade level');
  }
  
  return { canTransfer: errors.length === 0, errors };
}

/**
 * Validate enrollment record
 */
export function validateEnrollmentRecord(enrollment) {
  const errors = [];
  
  if (!enrollment.studentId) errors.push('studentId is required');
  if (!enrollment.classId) errors.push('classId is required');
  if (!enrollment.academicYearId) errors.push('academicYearId is required');
  if (!enrollment.enrollmentDate) errors.push('enrollmentDate is required');
  
  if (enrollment.status && !Object.values(ENROLLMENT_STATUS).includes(enrollment.status)) {
    errors.push(`Invalid status: ${enrollment.status}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Check if student is eligible for graduation
 */
export function isEligibleForGraduation(enrollment, completedCredits, requiredCredits) {
  const errors = [];
  
  if (enrollment.status !== ENROLLMENT_STATUS.ENROLLED) {
    errors.push('Student must be enrolled');
  }
  
  if (completedCredits < requiredCredits) {
    errors.push(`Insufficient credits: ${completedCredits}/${requiredCredits}`);
  }
  
  return { eligible: errors.length === 0, errors };
}

// ============================================================
// TESTS
// ============================================================

export async function runEnrollmentRulesUnitTests() {
  await describe('Unit Test: Enrollment Status Transitions', () => {
    
    test('enrolled -> transferred is valid', () => {
      const result = canTransition('enrolled', 'transferred');
      expect(result).toBe(true);
    });

    test('enrolled -> withdrawn is valid', () => {
      const result = canTransition('enrolled', 'withdrawn');
      expect(result).toBe(true);
    });

    test('enrolled -> graduated is valid', () => {
      const result = canTransition('enrolled', 'graduated');
      expect(result).toBe(true);
    });

    test('enrolled -> suspended is valid', () => {
      const result = canTransition('enrolled', 'suspended');
      expect(result).toBe(true);
    });

    test('pending -> enrolled is valid', () => {
      const result = canTransition('pending', 'enrolled');
      expect(result).toBe(true);
    });

    test('pending -> withdrawn is valid', () => {
      const result = canTransition('pending', 'withdrawn');
      expect(result).toBe(true);
    });

    test('transferred -> enrolled is NOT valid (terminal state)', () => {
      const result = canTransition('transferred', 'enrolled');
      expect(result).toBe(false);
    });

    test('graduated -> enrolled is NOT valid (terminal state)', () => {
      const result = canTransition('graduated', 'enrolled');
      expect(result).toBe(false);
    });

    test('withdrawn -> enrolled is valid (can re-enroll)', () => {
      const result = canTransition('withdrawn', 'enrolled');
      expect(result).toBe(true);
    });

    test('suspended -> enrolled is valid (can reinstate)', () => {
      const result = canTransition('suspended', 'enrolled');
      expect(result).toBe(true);
    });

    test('enrolled -> pending is NOT valid', () => {
      const result = canTransition('enrolled', 'pending');
      expect(result).toBe(false);
    });
  });

  await describe('Unit Test: Class Enrollment Eligibility', () => {
    
    test('Active student can enroll in active class', () => {
      const student = { enrollmentStatus: 'active', gradeLevel: 10 };
      const classObj = { status: 'active', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const academicYear = { isCurrent: true };
      
      const result = canEnrollInClass(student, classObj, academicYear);
      expect(result.canEnroll).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('Inactive student cannot enroll', () => {
      const student = { enrollmentStatus: 'suspended', gradeLevel: 10 };
      const classObj = { status: 'active', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const academicYear = { isCurrent: true };
      
      const result = canEnrollInClass(student, classObj, academicYear);
      expect(result.canEnroll).toBe(false);
      expect(result.errors).toContain('Student is not in active status');
    });

    test('Cannot enroll in inactive class', () => {
      const student = { enrollmentStatus: 'active', gradeLevel: 10 };
      const classObj = { status: 'inactive', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const academicYear = { isCurrent: true };
      
      const result = canEnrollInClass(student, classObj, academicYear);
      expect(result.canEnroll).toBe(false);
      expect(result.errors).toContain('Class is not active');
    });

    test('Cannot enroll in wrong grade level', () => {
      const student = { enrollmentStatus: 'active', gradeLevel: 10 };
      const classObj = { status: 'active', gradeLevel: 11, currentEnrollment: 30, maxCapacity: 40 };
      const academicYear = { isCurrent: true };
      
      const result = canEnrollInClass(student, classObj, academicYear);
      expect(result.canEnroll).toBe(false);
      expect(result.errors).toContain('Student grade level does not match class grade level');
    });

    test('Cannot enroll in past academic year', () => {
      const student = { enrollmentStatus: 'active', gradeLevel: 10 };
      const classObj = { status: 'active', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const academicYear = { isCurrent: false };
      
      const result = canEnrollInClass(student, classObj, academicYear);
      expect(result.canEnroll).toBe(false);
      expect(result.errors).toContain('Academic year is not current');
    });

    test('Cannot enroll in full class', () => {
      const student = { enrollmentStatus: 'active', gradeLevel: 10 };
      const classObj = { status: 'active', gradeLevel: 10, currentEnrollment: 40, maxCapacity: 40 };
      const academicYear = { isCurrent: true };
      
      const result = canEnrollInClass(student, classObj, academicYear);
      expect(result.canEnroll).toBe(false);
      expect(result.errors).toContain('Class is at maximum capacity');
    });
  });

  await describe('Unit Test: Withdrawal Rules', () => {
    
    test('Can withdraw within 30% of academic year', () => {
      const enrollment = { status: 'enrolled' };
      // Academic year: 2025-09-01 to 2026-05-31
      // Current date: 2025-10-01 (within 30%)
      const currentDate = '2025-10-01';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canWithdrawFromClass(enrollment, currentDate, academicYear);
      expect(result.canWithdraw).toBe(true);
    });

    test('Cannot withdraw after 30% of academic year', () => {
      const enrollment = { status: 'enrolled' };
      // Academic year: 2025-09-01 to 2026-05-31
      // Current date: 2026-03-01 (after 30%)
      const currentDate = '2026-03-01';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canWithdrawFromClass(enrollment, currentDate, academicYear);
      expect(result.canWithdraw).toBe(false);
      expect(result.errors).toContain('Cannot withdraw after 30% of academic year has passed');
    });

    test('Cannot withdraw non-enrolled student', () => {
      const enrollment = { status: 'transferred' };
      const currentDate = '2025-10-01';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canWithdrawFromClass(enrollment, currentDate, academicYear);
      expect(result.canWithdraw).toBe(false);
      expect(result.errors).toContain('Student is not currently enrolled');
    });
  });

  await describe('Unit Test: Transfer Rules', () => {
    
    test('Can transfer enrolled student within 50% of year', () => {
      const enrollment = { status: 'enrolled', gradeLevel: 10 };
      const newClass = { status: 'active', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const currentDate = '2025-11-15';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canTransferEnrollment(enrollment, newClass, currentDate, academicYear);
      expect(result.canTransfer).toBe(true);
    });

    test('Cannot transfer after 50% of academic year', () => {
      const enrollment = { status: 'enrolled', gradeLevel: 10 };
      const newClass = { status: 'active', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const currentDate = '2026-03-01';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canTransferEnrollment(enrollment, newClass, currentDate, academicYear);
      expect(result.canTransfer).toBe(false);
      expect(result.errors).toContain('Cannot transfer after 50% of academic year has passed');
    });

    test('Cannot transfer to inactive class', () => {
      const enrollment = { status: 'enrolled', gradeLevel: 10 };
      const newClass = { status: 'inactive', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const currentDate = '2025-11-15';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canTransferEnrollment(enrollment, newClass, currentDate, academicYear);
      expect(result.canTransfer).toBe(false);
      expect(result.errors).toContain('Target class is not active');
    });

    test('Cannot transfer to different grade level', () => {
      const enrollment = { status: 'enrolled', gradeLevel: 10 };
      const newClass = { status: 'active', gradeLevel: 11, currentEnrollment: 30, maxCapacity: 40 };
      const currentDate = '2025-11-15';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canTransferEnrollment(enrollment, newClass, currentDate, academicYear);
      expect(result.canTransfer).toBe(false);
      expect(result.errors).toContain('Cannot transfer to different grade level');
    });

    test('Cannot transfer non-enrolled student', () => {
      const enrollment = { status: 'pending', gradeLevel: 10 };
      const newClass = { status: 'active', gradeLevel: 10, currentEnrollment: 30, maxCapacity: 40 };
      const currentDate = '2025-11-15';
      const academicYear = { startDate: '2025-09-01', endDate: '2026-05-31' };
      
      const result = canTransferEnrollment(enrollment, newClass, currentDate, academicYear);
      expect(result.canTransfer).toBe(false);
      expect(result.errors).toContain('Only enrolled students can be transferred');
    });
  });

  await describe('Unit Test: Enrollment Record Validation', () => {
    
    test('Valid enrollment passes validation', () => {
      const enrollment = {
        studentId: 'std_001',
        classId: 'cls_001',
        academicYearId: 'ay_001',
        enrollmentDate: '2025-09-01',
        status: 'enrolled',
      };
      const result = validateEnrollmentRecord(enrollment);
      expect(result.valid).toBe(true);
    });

    test('Missing studentId fails validation', () => {
      const enrollment = {
        classId: 'cls_001',
        academicYearId: 'ay_001',
        enrollmentDate: '2025-09-01',
      };
      const result = validateEnrollmentRecord(enrollment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('studentId is required');
    });

    test('Invalid status fails validation', () => {
      const enrollment = {
        studentId: 'std_001',
        classId: 'cls_001',
        academicYearId: 'ay_001',
        enrollmentDate: '2025-09-01',
        status: 'invalid_status',
      };
      const result = validateEnrollmentRecord(enrollment);
      expect(result.valid).toBe(false);
    });
  });

  await describe('Unit Test: Graduation Eligibility', () => {
    
    test('Enrolled student with sufficient credits is eligible', () => {
      const enrollment = { status: 'enrolled' };
      const completedCredits = 150;
      const requiredCredits = 120;
      
      const result = isEligibleForGraduation(enrollment, completedCredits, requiredCredits);
      expect(result.eligible).toBe(true);
    });

    test('Student with insufficient credits is not eligible', () => {
      const enrollment = { status: 'enrolled' };
      const completedCredits = 100;
      const requiredCredits = 120;
      
      const result = isEligibleForGraduation(enrollment, completedCredits, requiredCredits);
      expect(result.eligible).toBe(false);
      expect(result.errors[0]).toContain('Insufficient credits');
    });

    test('Non-enrolled student is not eligible', () => {
      const enrollment = { status: 'withdrawn' };
      const completedCredits = 150;
      const requiredCredits = 120;
      
      const result = isEligibleForGraduation(enrollment, completedCredits, requiredCredits);
      expect(result.eligible).toBe(false);
      expect(result.errors).toContain('Student must be enrolled');
    });
  });
}
