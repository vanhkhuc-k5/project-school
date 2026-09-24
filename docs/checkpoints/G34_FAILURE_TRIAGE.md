# G34 FAILURE TRIAGE — EduPortal
**Checkpoint:** G34 Stabilization Pass  
**Date:** September 22, 2026  

---

## FAILURE INVENTORY

### Tenant Isolation (15/17 PASS - 2 FAIL)

| ID | Test | Endpoint | Expected | Actual | Category | Root Cause | Fix |
|----|------|----------|----------|--------|----------|------------|-----|
| TI-01 | Parent School A cannot access School B student | GET /parent/children/:id | 403 TENANT_FORBIDDEN | 403 NOT_AUTHORIZED | TEST_BUG | Error code string mismatch, security works correctly | Update test expectation OR standardize error codes |
| TI-02 | Parent School A cannot submit leave for School B student | POST /parent/leave-requests | 403 TENANT_FORBIDDEN | 403 undefined | TEST_BUG | Error code undefined, security may be broken | Investigate leave-requests endpoint error handling |

### Permitted Flows (7/8 PASS - 1 FAIL)

| ID | Test | Endpoint | Expected | Actual | Category | Root Cause | Fix |
|----|------|----------|----------|--------|----------|------------|-----|
| PF-01 | Teacher can view assignment dashboard | GET /teacher/dashboard | 200 | ECONNREFUSED | ENVIRONMENT_BUG | Server crash during test run | Server stability investigation |

### Student Endpoints (3/7 PASS - 4 FAIL)

| ID | Test | Endpoint | Expected | Actual | Category | Root Cause | Fix |
|----|------|----------|----------|--------|----------|------------|-----|
| SE-01 | Student Dashboard overview | GET /student/dashboard | 200 | 500 | PRODUCT_BUG | Internal server error | Investigate dashboard service |
| SE-02 | Student assignments list | GET /student/assignments | data array | false | PRODUCT_BUG | Query returns empty/invalid | Check assignment service |
| SE-03 | Student grades | GET /student/grades | 200 | 500 | PRODUCT_BUG | Internal server error | Investigate gradebook service |
| SE-04 | Student timetable | GET /student/timetable | 200 | ECONNREFUSED | ENVIRONMENT_BUG | Server crash | Server stability |

### Parent Endpoints (3/6 PASS - 3 FAIL)

| ID | Test | Endpoint | Expected | Actual | Category | Root Cause | Fix |
|----|------|----------|----------|--------|----------|------------|-----|
| PE-01 | Parent login | POST /auth/login | 200 | ECONNRESET | ENVIRONMENT_BUG | Server instability | Server stability |
| PE-02 | Parent children list | GET /parent/children | 200 | ECONNREFUSED | ENVIRONMENT_BUG | Server crash | Server stability |
| PE-03 | Parent dashboard | GET /parent/dashboard | 200 | ECONNREFUSED | ENVIRONMENT_BUG | Server crash | Server stability |

### Parent Multi-Child (23/41 PASS - 18 FAIL)

Multiple failures related to:
- Inactive child links
- Announcements for children
- Admin bypassing parent-child relationship
- Error code mismatches

**Category: MIXED (TEST_BUG + PRODUCT_BUG + FIXTURE_BUG)**

### Assignment Authoring (14/25 PASS - 11 FAIL)

**Category: PRODUCT_BUG + FIXTURE_BUG**

Need to investigate:
- Teacher assignment authorization
- Class membership validation
- Subject association
- Publication state

### Submission Workflow (4/21 PASS - 17 FAIL)

**Category: PRODUCT_BUG + FIXTURE_BUG**

Major dependency broken:
- Student enrollment validation
- Assignment audience filtering
- Deadline validation
- Submission persistence

### Teacher Grading (5/17 PASS - 12 FAIL)

**Category: PRODUCT_BUG**

- Grade submission
- Score validation
- Publication state
- Student visibility

### Timetable (15/18 PASS - 3 FAIL)

**Category: PRODUCT_BUG + FIXTURE_BUG**

- Semester filtering
- Current year
- Class membership

### Messaging (12/27 PASS - 15 FAIL)

**Category: PRODUCT_BUG + FIXTURE_BUG**

- Parent-teacher relationship
- Conversation persistence
- School scope

### Leave Requests (11/29 PASS - 18 FAIL)

**Category: PRODUCT_BUG + FIXTURE_BUG**

- Request creation
- State machine (SUBMITTED/APPROVED/REJECTED)
- Review authorization

### Tuition (5/24 PASS - 19 FAIL)

**Category: PRODUCT_BUG + FIXTURE_BUG**

- Invoice generation
- Line items
- Decimal handling
- Authorization

### Payment Gateway (10/14 PASS - 4 FAIL)

**Category: PRODUCT_BUG + TEST_BUG**

- Provider abstraction
- Webhook handling
- Idempotency

### Reporting (35/36 PASS - 1 FAIL)

**Category: CONTRACT_MISMATCH**

Single failure - need exact diagnosis.

### E2E Academic Cycle (3/5 PASS - 2 FAIL)

**Category: DEPENDENCY_FAILURE**

Fails because dependent features (submission, grading) are broken.

---

## SUMMARY BY CATEGORY

| Category | Count | Priority |
|----------|-------|----------|
| PRODUCT_BUG | ~60 | HIGH |
| TEST_BUG | ~15 | LOW |
| FIXTURE_BUG | ~30 | MEDIUM |
| CONTRACT_MISMATCH | ~1 | MEDIUM |
| ENVIRONMENT_BUG | ~8 | HIGH |
| DEPENDENCY_FAILURE | ~2 | MEDIUM |

---

## WORK ORDER

1. **ENVIRONMENT_BUG (8)** - Server stability
2. **PRODUCT_BUG Core (15)** - Student, Parent, Tenant Isolation
3. **PRODUCT_BUG Features (45)** - Assignment, Submission, Grading, etc.
4. **TEST_BUG (15)** - Error code mismatches
5. **FIXTURE_BUG (30)** - Missing test data
6. **CONTRACT_MISMATCH (1)** - Reporting

---

*Last updated: September 22, 2026*
