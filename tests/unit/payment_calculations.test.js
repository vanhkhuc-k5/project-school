// =============================================================================
// Unit Tests — Payment Calculations (G43)
// =============================================================================
// These tests verify tuition and payment calculation rules.
// They are DB-free, pure unit tests of deterministic functions.
// =============================================================================

import { describe, test, expect } from '../helpers/testClient.js';

// ============================================================
// PAYMENT STATUS
// ============================================================

const PAYMENT_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  OVERDUE: 'overdue',
  PARTIAL: 'partial',
  WAIVED: 'waived',
  REFUNDED: 'refunded',
};

// ============================================================
// HELPER FUNCTIONS (Pure/Deterministic)
// ============================================================

/**
 * Calculate tuition amount based on student type and grade level
 */
export function calculateBaseTuition(studentType, gradeLevel, schoolTuitionRates) {
  const rate = schoolTuitionRates[studentType]?.[gradeLevel];
  if (rate === undefined) {
    throw new Error(`No tuition rate defined for ${studentType} grade ${gradeLevel}`);
  }
  return rate;
}

/**
 * Calculate late payment penalty
 */
export function calculateLatePenalty(amount, dueDate, paidDate, penaltyRate = 0.01, gracePeriodDays = 7) {
  const due = new Date(dueDate);
  const paid = new Date(paidDate);
  
  // Grace period
  const graceEnd = new Date(due);
  graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
  
  // No penalty if paid within grace period
  if (paid <= graceEnd) return 0;
  
  // Days overdue
  const daysOverdue = Math.ceil((paid - graceEnd) / (1000 * 60 * 60 * 24));
  const penalty = Math.round(amount * penaltyRate * daysOverdue);
  
  // Cap penalty at 50% of original amount
  return Math.min(penalty, amount * 0.5);
}

/**
 * Check if payment is overdue
 */
export function isOverdue(dueDate, checkDate = new Date()) {
  const due = new Date(dueDate);
  const check = new Date(checkDate);
  return check > due;
}

/**
 * Calculate payment due status
 */
export function getPaymentStatus(invoice, paidAmount = 0, checkDate = new Date()) {
  const dueDate = new Date(invoice.dueDate);
  const check = new Date(checkDate);
  
  // Fully paid
  if (paidAmount >= invoice.totalAmount) {
    return PAYMENT_STATUS.PAID;
  }
  
  // Waived
  if (invoice.status === PAYMENT_STATUS.WAIVED) {
    return PAYMENT_STATUS.WAIVED;
  }
  
  // Overdue
  if (check > dueDate && paidAmount < invoice.totalAmount) {
    return PAYMENT_STATUS.OVERDUE;
  }
  
  // Partial
  if (paidAmount > 0 && paidAmount < invoice.totalAmount) {
    return PAYMENT_STATUS.PARTIAL;
  }
  
  // Unpaid but not yet due
  return PAYMENT_STATUS.UNPAID;
}

/**
 * Calculate remaining balance
 */
export function calculateRemainingBalance(invoice, paidAmount) {
  return Math.max(0, invoice.totalAmount - paidAmount);
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(totalAmount, discountPercent) {
  return Math.round(totalAmount * (discountPercent / 100));
}

/**
 * Apply sibling discount
 */
export function applySiblingDiscount(amount, siblingCount, discountPercent = 10) {
  if (siblingCount < 2) return 0;
  
  // Each additional sibling after the first gets the discount
  const additionalSiblings = siblingCount - 1;
  const maxDiscount = additionalSiblings * discountPercent;
  
  return Math.round(amount * (Math.min(maxDiscount, 50) / 100));
}

/**
 * Calculate payment breakdown for installment plans
 */
export function calculateInstallmentPlan(totalAmount, installmentCount) {
  if (installmentCount < 2) {
    return [{ amount: totalAmount, dueDate: null, isComplete: true }];
  }
  
  const baseAmount = Math.floor(totalAmount / installmentCount);
  const remainder = totalAmount - (baseAmount * installmentCount);
  
  const installments = [];
  const now = new Date();
  
  for (let i = 0; i < installmentCount; i++) {
    const dueDate = new Date(now);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    installments.push({
      installmentNumber: i + 1,
      amount: baseAmount + (i === 0 ? remainder : 0),
      dueDate: dueDate.toISOString().split('T')[0],
      isComplete: false,
    });
  }
  
  return installments;
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount, invoiceTotal, alreadyPaid) {
  const errors = [];
  
  if (amount <= 0) {
    errors.push('Payment amount must be positive');
  }
  
  const remaining = invoiceTotal - alreadyPaid;
  if (amount > remaining) {
    errors.push(`Payment amount exceeds remaining balance of ${remaining}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Generate payment reference number
 */
export function generatePaymentRef(schoolCode, studentId, timestamp) {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const shortId = studentId.slice(-6).toUpperCase();
  return `${schoolCode}-${dateStr}-${shortId}`;
}

// ============================================================
// TESTS
// ============================================================

export async function runPaymentCalculationUnitTests() {
  await describe('Unit Test: Late Payment Penalty Calculation', () => {
    
    test('No penalty within grace period', () => {
      const dueDate = '2026-09-01';
      const paidDate = '2026-09-05';
      const penalty = calculateLatePenalty(1000000, dueDate, paidDate, 0.01, 7);
      expect(penalty).toBe(0);
    });

    test('Penalty calculated after grace period', () => {
      const dueDate = '2026-09-01';
      // Grace period: Sep 1 + 7 days = Sep 8
      // Paid Sep 11 = 3 days late (Sep 9, 10, 11)
      const paidDate = '2026-09-11';
      const penalty = calculateLatePenalty(1000000, dueDate, paidDate, 0.01, 7);
      // 1% per day * 3 days = 3% of 1,000,000 = 30,000
      expect(penalty).toBe(30000);
    });

    test('Penalty capped at 50% of original amount', () => {
      const dueDate = '2026-09-01';
      const paidDate = '2026-12-01'; // 90 days late
      const penalty = calculateLatePenalty(1000000, dueDate, paidDate, 0.01, 7);
      // Would be 830,000 but capped at 500,000
      expect(penalty).toBe(500000);
    });

    test('Penalty on exact grace period end date is zero', () => {
      const dueDate = '2026-09-01';
      const paidDate = '2026-09-08'; // Exactly 7 days after due
      const penalty = calculateLatePenalty(1000000, dueDate, paidDate, 0.01, 7);
      expect(penalty).toBe(0);
    });
  });

  await describe('Unit Test: Payment Status Detection', () => {
    
    test('PAID status when fully paid', () => {
      const invoice = { dueDate: '2026-09-01', totalAmount: 1000000 };
      const status = getPaymentStatus(invoice, 1000000);
      expect(status).toBe(PAYMENT_STATUS.PAID);
    });

    test('OVERDUE status when past due date and not fully paid', () => {
      const invoice = { dueDate: '2026-09-01', totalAmount: 1000000 };
      const status = getPaymentStatus(invoice, 0, '2026-09-15');
      expect(status).toBe(PAYMENT_STATUS.OVERDUE);
    });

    test('PARTIAL status when partially paid', () => {
      const invoice = { dueDate: '2026-09-01', totalAmount: 1000000 };
      const status = getPaymentStatus(invoice, 500000, '2026-08-15');
      expect(status).toBe(PAYMENT_STATUS.PARTIAL);
    });

    test('UNPAID status when not yet due', () => {
      const invoice = { dueDate: '2026-09-01', totalAmount: 1000000 };
      const status = getPaymentStatus(invoice, 0, '2026-08-15');
      expect(status).toBe(PAYMENT_STATUS.UNPAID);
    });

    test('WAIVED status preserved', () => {
      const invoice = { dueDate: '2026-09-01', totalAmount: 1000000, status: 'waived' };
      const status = getPaymentStatus(invoice, 0);
      expect(status).toBe(PAYMENT_STATUS.WAIVED);
    });
  });

  await describe('Unit Test: Balance Calculation', () => {
    
    test('Remaining balance calculated correctly', () => {
      const balance = calculateRemainingBalance({ totalAmount: 1000000 }, 300000);
      expect(balance).toBe(700000);
    });

    test('Balance cannot be negative', () => {
      const balance = calculateRemainingBalance({ totalAmount: 1000000 }, 1500000);
      expect(balance).toBe(0);
    });

    test('Full payment results in zero balance', () => {
      const balance = calculateRemainingBalance({ totalAmount: 1000000 }, 1000000);
      expect(balance).toBe(0);
    });
  });

  await describe('Unit Test: Discount Calculations', () => {
    
    test('Discount calculated correctly', () => {
      const discount = calculateDiscount(1000000, 10);
      expect(discount).toBe(100000);
    });

    test('Sibling discount for 2 siblings', () => {
      const discount = applySiblingDiscount(1000000, 2, 10);
      // First sibling gets no discount, second gets 10%
      expect(discount).toBe(100000);
    });

    test('Sibling discount for 3 siblings', () => {
      const discount = applySiblingDiscount(1000000, 3, 10);
      // 2 additional siblings * 10% = 20%
      expect(discount).toBe(200000);
    });

    test('Sibling discount capped at 50%', () => {
      const discount = applySiblingDiscount(1000000, 10, 10);
      // 9 siblings * 10% = 90% but capped at 50%
      expect(discount).toBe(500000);
    });

    test('No sibling discount for single child', () => {
      const discount = applySiblingDiscount(1000000, 1, 10);
      expect(discount).toBe(0);
    });
  });

  await describe('Unit Test: Installment Plan', () => {
    
    test('Single payment returns one installment', () => {
      const plan = calculateInstallmentPlan(1000000, 1);
      expect(plan.length).toBe(1);
      expect(plan[0].amount).toBe(1000000);
      expect(plan[0].isComplete).toBe(true);
    });

    test('Two installments are equal', () => {
      const plan = calculateInstallmentPlan(1000000, 2);
      expect(plan.length).toBe(2);
      expect(plan[0].amount).toBe(500000);
      expect(plan[1].amount).toBe(500000);
    });

    test('Three installments handle remainder', () => {
      const plan = calculateInstallmentPlan(1000001, 3);
      expect(plan.length).toBe(3);
      // 1000001 / 3 = 333333.667; base = floor = 333333
      // remainder = 1000001 - 333333*3 = 1000001 - 999999 = 2
      // First installment: 333333 + 2 = 333335
      expect(plan[0].amount).toBe(333335);
      expect(plan[1].amount).toBe(333333);
      expect(plan[2].amount).toBe(333333);
    });

    test('Installments have correct due dates', () => {
      const plan = calculateInstallmentPlan(1000000, 3);
      expect(plan[0].installmentNumber).toBe(1);
      expect(plan[1].installmentNumber).toBe(2);
      expect(plan[2].installmentNumber).toBe(3);
    });
  });

  await describe('Unit Test: Payment Validation', () => {
    
    test('Valid payment amount passes', () => {
      const result = validatePaymentAmount(500000, 1000000, 0);
      expect(result.valid).toBe(true);
    });

    test('Negative payment fails', () => {
      const result = validatePaymentAmount(-100000, 1000000, 0);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Payment amount must be positive');
    });

    test('Zero payment fails', () => {
      const result = validatePaymentAmount(0, 1000000, 0);
      expect(result.valid).toBe(false);
    });

    test('Overpayment fails', () => {
      const result = validatePaymentAmount(600000, 1000000, 500000);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds remaining balance');
    });

    test('Exact remaining balance passes', () => {
      const result = validatePaymentAmount(500000, 1000000, 500000);
      expect(result.valid).toBe(true);
    });
  });

  await describe('Unit Test: Payment Reference Generation', () => {
    
    test('Reference number format is correct', () => {
      const ref = generatePaymentRef('BAC_AU', 'std_a1_12345', '2026-09-15T10:30:00Z');
      // Output: BAC_AU-20260915-1_12345 (last 6 chars of 'std_a1_12345' = '1_12345')
      expect(ref).toMatch(/^BAC_AU-\d{8}-[A-Z0-9_]{5,7}$/);
    });

    test('Date is encoded correctly', () => {
      const ref = generatePaymentRef('BAC_AU', 'std_a1_12345', '2026-09-15T10:30:00Z');
      expect(ref).toContain('20260915');
    });

    test('Student ID uses last 6 characters', () => {
      const ref = generatePaymentRef('BAC_AU', 'STD000001', '2026-09-15T10:30:00Z');
      // Last 6 chars of 'STD000001' = '000001'
      expect(ref).toContain('000001');
    });
  });

  await describe('Unit Test: Tuition Base Rate Calculation', () => {
    
    const tuitionRates = {
      dayStudent: {
        6: 1500000,
        7: 1500000,
        8: 1600000,
        9: 1600000,
        10: 1700000,
        11: 1800000,
        12: 2000000,
      },
      boarding: {
        6: 3000000,
        7: 3000000,
        8: 3200000,
        9: 3200000,
        10: 3500000,
        11: 3800000,
        12: 4000000,
      },
    };

    test('Day student rate by grade level', () => {
      const rate = calculateBaseTuition('dayStudent', 10, tuitionRates);
      expect(rate).toBe(1700000);
    });

    test('Boarding student rate by grade level', () => {
      const rate = calculateBaseTuition('boarding', 12, tuitionRates);
      expect(rate).toBe(4000000);
    });

    test('Invalid student type throws error', () => {
      let error = null;
      try {
        calculateBaseTuition('invalid', 10, tuitionRates);
      } catch (e) {
        error = e;
      }
      expect(error).not.toBe(null);
      expect(error.message).toContain('No tuition rate defined');
    });

    test('Invalid grade level throws error', () => {
      let error = null;
      try {
        calculateBaseTuition('dayStudent', 5, tuitionRates);
      } catch (e) {
        error = e;
      }
      expect(error).not.toBe(null);
    });
  });
}
