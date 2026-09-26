# G34 TEST DISCOVERY AUDIT

## Executive Summary

This document tracks discrepancies between isolated test runs and full-suite test runs, and the investigation into test state contamination.

## Grading Test Analysis

### Grading Test Files

| File | Tests | Location |
|------|-------|----------|
| `teacher_grading_workflow.test.js` | 17 | `tests/integration/` |

### Grading Test Count Discrepancy

- **Reported isolated:** 12/12 PASS (historical)
- **Full suite reported:** 5/17 PASS (recent run)
- **Actual test count in file:** 17 tests
- **Explanation:** The "12 tests" claim was likely from a subset run or earlier version. The actual test file contains 17 tests.

### Grading Test Failures (Full Suite)

1. `Setup: Admin creates class, subject and teacher assignment` — Expected 200, got 201 (TEST_BUG: wrong status code expectation)
2. `Teacher can open authorized class gradebook` — Expected 200, got 403 (AUTH_BUG: teacher lacks permission)
3. `Draft grades visible to teacher but NOT to student` — Expected 201, got 403 (AUTH_BUG: teacher lacks permission)
4. `Valid score creates draft grade` — Expected 201, got 403 (AUTH_BUG)
5. `Teacher can publish a draft grade` — Expected 201, got 403 (AUTH_BUG)
6. `Student can see published grade` — Expected 201, got 403 (AUTH_BUG)
7. `Bulk-enter all valid scores returns all successes` — Expected 200, got 403 (AUTH_BUG)
8. `Bulk-enter with one invalid score reports failure` — Cannot read 'students' of undefined (CHAIN_BUG: previous failures cascade)
9. `Admin can open class gradebook without teaching assignment` — Expected 200, got 500 (SERVER_BUG: null reference)
10. `Admin can unlock a published grade` — Expected 201, got 403 (AUTH_BUG)
11. `Audit log entry created on grade unlock` — Expected 201, got 403 (CHAIN_BUG: cascades from #10)
12. `Teacher cannot open class without teaching assignment` — (needs verification)

### Timetable Test Analysis

| File | Tests | Location |
|------|-------|----------|
| `timetable_scheduling.test.js` | 18 | `tests/integration/` |

### Timetable Failures (Full Suite)

1. `Admin tạo thành công tiết học mới vào ngày Thứ 7 Tiết 1` — Expected 201, got 409 (CONFLICT: slot already exists)
2. `Admin cập nhật thông tin phòng học của tiết học` — Expected defined, got null (BUG: update returns null)
3. `Admin xóa tiết học khỏi thời khóa biểu` — Expected defined, got null (BUG: delete returns null)

## Root Cause Analysis

### 1. Status Code Mismatches

Multiple tests expect `200` but controllers return `201` for creation:
- `createSubject` → returns 201
- `createClass` → returns 201
- `createGrade` → returns 201
- `publishGrade` → returns 201

**Fix:** Update test expectations to match controller behavior (201 for POST creates).

### 2. Authorization Failures (403)

After G15/G18/G19 suites run, subsequent tests fail with 403. This suggests:
- The teacher used in tests loses permissions
- Or earlier suites create data that interferes with authorization checks

**Likely cause:** Teacher `mailan@school.edu.vn` does not have `grade.create` and `grade.update` permissions.

### 3. Cascade Failures

When setup fails (403), subsequent tests that depend on that data also fail, producing cascading errors like "Cannot read 'students' of undefined".

### 4. Timetable Conflict (409)

A slot with the same `(class_id, day_of_week, period)` already exists from prior test runs, causing 409 CONFLICT on slot creation.

## Test Isolation Strategy

Current state: Tests run on shared database that persists between runs.

**Recommended approach:** Deterministic test fixtures with unique IDs per run.

## Files to Fix

1. `tests/integration/teacher_grading_workflow.test.js` — Fix status codes and authorization
2. `tests/integration/timetable_scheduling.test.js` — Fix conflict handling and null returns
3. `tests/integration/parent_teacher_messaging.test.js` — Fix 401 auth failures
4. `tests/integration/leave_requests.test.js` — Fix leave lifecycle
5. `tests/integration/tuition_invoices.test.js` — Fix invoice management
6. `tests/integration/payment_gateway.test.js` — Fix payment gateway
7. `tests/integration/reporting.test.js` — Fix 1 remaining failure
8. `tests/e2e/academic_cycle.test.js` — Fix 1 failing step

## Discrepancy Explanation

The isolated test runs likely used different test accounts, different database state, or ran only a subset of tests. The full suite exposes real state contamination and authorization issues that only appear when all suites run together.
