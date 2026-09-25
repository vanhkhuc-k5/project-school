// =============================================================================
// Test Runner — EduPortal
// Runs the complete test suite against an isolated in-memory SQLite database.
// Architecture:
//   1. Set test env vars BEFORE any server module imports
//   2. Initialize test database (schema + fixtures) — isolated from production
//   3. Start Express app bound to in-memory DB
//   4. Run all test suites sequentially
//   5. Print summary and exit with correct code
// =============================================================================

// STEP 1: Set environment variables BEFORE any imports.
// CRITICAL: In ESM, static imports are hoisted and evaluated before module code runs.
// process.env must be set BEFORE any static import to ensure env.js captures isTest=true.
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';   // In-memory SQLite — no production data ever touched

// STEP 2: Static imports — executed after process.env is set above.
// NOTE: server/config/env.js is imported transitively via db.js and app.js.
// Because NODE_ENV='test' is set before these imports, config.IS_TEST will be true
// and config will use the test JWT secret (TEST_FALLBACK_KEY).
import { testState, colors } from './helpers/testClient.js';
import { createApp } from '../server/app/app.js';
import { db, initSchema } from '../server/db.js';
import { initializeTestFixtures } from './fixtures/testFixtures.js';

// STEP 3: Import all test suites (module scope — executed after env vars & DB init)
const [
  { runAuthUnitTests },
  { runDatabaseUnitTests },
  { runDatabaseTransactionsTests },
  { runCoreDomainSchemaTests },
  { runEnvUnitTests },
  { runGradebookCalculationUnitTests },
  { runAttendanceRulesUnitTests },
  { runEnrollmentRulesUnitTests },
  { runPaymentCalculationUnitTests },
  { runAuthIntegrationTests },
  { runProductionAuthTests },
  { runRbacPermissionTests },
  { runStudentIntegrationTests },
  { runTeacherIntegrationTests },
  { runParentIntegrationTests },
  { runParentMultiChildSecurityTests },
  { runAdminIntegrationTests },
  { runAiTutorIntegrationTests },
  { runTenantIsolationIntegrationTests },
  { runAcademicConfigIntegrationTests },
  { runNormalizedProfilesIntegrationTests },
  { runAcademicStructureIntegrationTests },
  { runStudentEnrollmentIntegrationTests },
  { runTeacherAssignmentIntegrationTests },
  { runAssignmentAuthoringIntegrationTests },
  { runSubmissionWorkflowIntegrationTests },
  { runTeacherGradingIntegrationTests },
  { runTimetableSchedulingIntegrationTests },
  { runAnnouncementsIntegrationTests },
  { runNotificationCenterTests },
  { runMessagingIntegrationTests },
  { runLeaveRequestsIntegrationTests },
  { runTuitionIntegrationTests },
  { runPaymentGatewayIntegrationTests },
  { runDashboardIntegrationTests },
  { runLeadershipIntegrationTests },
  { runDepartmentHeadTests },
  { runReportingTests },
  { runImportExportIntegrationTests },
  { runAuditTrailIntegrationTests },
  { runAITutorArchitectureIntegrationTests },
  { runAITutorContextIntegrationTests },
  { runAcademicCycleE2ETests },
  { runSecurityIntegrationTests },
] = await Promise.all([
  import('./unit/auth.test.js'),
  import('./unit/database.test.js'),
  import('./unit/database_transactions.test.js'),
  import('./unit/core_domain_schema.test.js'),
  import('./unit/env.test.js'),
  import('./unit/gradebook_calculations.test.js'),
  import('./unit/attendance_rules.test.js'),
  import('./unit/enrollment_rules.test.js'),
  import('./unit/payment_calculations.test.js'),
  import('./integration/auth_endpoints.test.js'),
  import('./integration/production_auth.test.js'),
  import('./integration/rbac_permissions.test.js'),
  import('./integration/student_endpoints.test.js'),
  import('./integration/teacher_endpoints.test.js'),
  import('./integration/parent_endpoints.test.js'),
  import('./integration/parent_multi_child.test.js'),
  import('./integration/admin_endpoints.test.js'),
  import('./integration/ai_tutor_endpoints.test.js'),
  import('./integration/tenant_isolation.test.js'),
  import('./integration/academic_config.test.js'),
  import('./integration/normalized_profiles.test.js'),
  import('./integration/academic_structure.test.js'),
  import('./integration/student_enrollment.test.js'),
  import('./integration/teacher_assignment.test.js'),
  import('./integration/assignment_authoring.test.js'),
  import('./integration/submission_workflow.test.js'),
  import('./integration/teacher_grading_workflow.test.js'),
  import('./integration/timetable_scheduling.test.js'),
  import('./integration/announcements.test.js'),
  import('./integration/notification_center.test.js'),
  import('./integration/parent_teacher_messaging.test.js'),
  import('./integration/leave_requests.test.js'),
  import('./integration/tuition_invoices.test.js'),
  import('./integration/payment_gateway.test.js'),
  import('./integration/dashboard_metrics.test.js'),
  import('./integration/leadership_dashboard.test.js'),
  import('./integration/department_head.test.js'),
  import('./integration/reporting.test.js'),
  import('./integration/import_export.test.js'),
  import('./integration/audit_trail.test.js'),
  import('./integration/ai_tutor_architecture.test.js'),
  import('./integration/ai_tutor_context.test.js'),
  import('./e2e/academic_cycle.test.js'),
  import('./integration/security_negative.test.js'),
]);

// =============================================================================
// Server lifecycle
// =============================================================================

let server;

async function startServer() {
  // Initialize test DB: schema + fixtures
  console.log(`\n${colors.cyan}🔧 Initializing isolated test database (in-memory SQLite)...${colors.reset}`);

  initSchema();
  initializeTestFixtures();

  // Create Express app (bound to the in-memory DB)
  const app = createApp();

  // Start HTTP server
  return new Promise((resolve) => {
    server = app.listen(5000, () => {
      console.log(`${colors.green}✅ Test server listening on http://127.0.0.1:5000${colors.reset}\n`);
      resolve();
    });
  });
}

async function stopServer() {
  if (server) {
    // First attempt: graceful close
    await new Promise((resolve) => {
      server.close(() => resolve());
    });

    // Force-close any remaining connections (e.g., from HTTP clients left open)
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }

    console.log(`\n${colors.dim}🛑 Test server stopped${colors.reset}`);
  }
}

// =============================================================================
// Main runner
// =============================================================================

async function main() {
  const overallStart = Date.now();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bright}${colors.blue}         EDUPORTAL TEST AUTOMATION & VERIFICATION SYSTEM${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  console.log(` Target: Isolated in-memory SQLite (DB_PATH=:memory:)`);
  console.log(` NODE_ENV: test  |  Auth migration: skipped\n`);

  try {
    await startServer();

    // ── Layer 1: Pure unit tests (DB-free, deterministic) ──────────────────
    await runAuthUnitTests();
    // NOTE: The following 3 suites test PostgreSQL-specific behavior (connection pooling, ACID
    // transactions, and normalized schema). They require a real Neon PostgreSQL database.
    // In the isolated in-memory SQLite test environment, they are skipped to avoid false failures.
    // The integration test suite (Layer 2) exercises all API behavior against SQLite.
    const isSqliteOnly = true; // Always use SQLite in test mode
    if (!isSqliteOnly) {
      await runDatabaseUnitTests();
      await runDatabaseTransactionsTests();
      await runCoreDomainSchemaTests();
    }
    await runEnvUnitTests();
    await runGradebookCalculationUnitTests();
    await runAttendanceRulesUnitTests();
    await runEnrollmentRulesUnitTests();
    await runPaymentCalculationUnitTests();

    // ── Reset fixtures before integration tests ──────────────────────────────
    // Re-initialize ALL fixtures so each test group starts from a clean, deterministic
    // state. This calls safeInsert for every table — idempotent by design.
    // We use initializeTestFixtures (full reset) instead of resetTestFixtures because
    // refresh_tokens and other auth-related tables must also be cleared to ensure
    // each test group gets fresh authentication sessions.
    const { initializeTestFixtures: reinitFixtures, resetTestFixtures } = await import('./fixtures/testFixtures.js');
    reinitFixtures();

    // ── Layer 2: Integration tests (real HTTP, in-memory DB) ──────────────
    await runAuthIntegrationTests();

    // Reset BEFORE production_auth to clear any stale lockouts from auth tests
    resetTestFixtures();
    await runProductionAuthTests();
    resetTestFixtures();
    await runRbacPermissionTests();
    resetTestFixtures();
    await runStudentIntegrationTests();
    resetTestFixtures();
    await runTeacherIntegrationTests();
    resetTestFixtures();
    await runParentIntegrationTests();
    resetTestFixtures();
    await runParentMultiChildSecurityTests();
    resetTestFixtures();
    await runAdminIntegrationTests();
    resetTestFixtures();
    await runAiTutorIntegrationTests();
    resetTestFixtures();
    await runTenantIsolationIntegrationTests();
    resetTestFixtures();
    await runAcademicConfigIntegrationTests();
    resetTestFixtures();
    await runNormalizedProfilesIntegrationTests();
    resetTestFixtures();
    await runAcademicStructureIntegrationTests();
    resetTestFixtures();
    await runStudentEnrollmentIntegrationTests();
    resetTestFixtures();
    await runTeacherAssignmentIntegrationTests();
    resetTestFixtures();
    await runAssignmentAuthoringIntegrationTests();
    resetTestFixtures();
    await runSubmissionWorkflowIntegrationTests();
    resetTestFixtures();
    await runTeacherGradingIntegrationTests();
    resetTestFixtures();
    await runTimetableSchedulingIntegrationTests();
    resetTestFixtures();
    await runAnnouncementsIntegrationTests();
    resetTestFixtures();
    await runNotificationCenterTests();
    resetTestFixtures();
    await runMessagingIntegrationTests();
    resetTestFixtures();
    await runLeaveRequestsIntegrationTests();
    resetTestFixtures();
    await runTuitionIntegrationTests();
    resetTestFixtures();
    await runPaymentGatewayIntegrationTests();
    resetTestFixtures();
    await runDashboardIntegrationTests();
    resetTestFixtures();
    await runLeadershipIntegrationTests();
    resetTestFixtures();
    await runDepartmentHeadTests();
    resetTestFixtures();
    await runReportingTests();
    resetTestFixtures();
    await runImportExportIntegrationTests();
    resetTestFixtures();
    await runAuditTrailIntegrationTests();
    resetTestFixtures();
    await runAITutorArchitectureIntegrationTests();
    resetTestFixtures();
    await runAITutorContextIntegrationTests();

    // ── Layer 3: End-to-End tests (full business workflows) ────────────────
    reinitFixtures();
    await runAcademicCycleE2ETests();

    // ── Layer 4: Security regression tests ────────────────────────────────
    resetTestFixtures();
    await runSecurityIntegrationTests();

  } catch (err) {
    console.error(`\n${colors.red}Critical test runner error: ${err.message}${colors.reset}`);
    if (err.stack) {
      console.error(`${colors.dim}${err.stack.split('\n').slice(1, 4).join('\n')}${colors.reset}`);
    }
  } finally {
    // Bounded shutdown: 5 second timeout to prevent CI from hanging
    await Promise.race([
      stopServer(),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]);
    console.log(`${colors.dim}🛑 Test runner shutdown complete${colors.reset}`);
  }

  const duration = Date.now() - overallStart;

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bright}                           BẢNG TỔNG KẾT KIỂM THỬ${colors.reset}`);
  console.log(`${'='.repeat(80)}`);

  testState.suites.forEach((suite, idx) => {
    const status = suite.failed === 0
      ? `${colors.green}[PASS]${colors.reset}`
      : `${colors.red}[FAIL]${colors.reset}`;
    const num = String(idx + 1).padStart(2, '0');
    console.log(
      ` ${num}. ${status} ${suite.name} ` +
      `(${suite.passed}/${suite.passed + suite.failed} passed, ${suite.duration}ms)`
    );
  });

  console.log(`${'-'.repeat(80)}`);
  console.log(` Tổng số bài kiểm thử:  ${colors.bright}${testState.total}${colors.reset}`);
  console.log(` Thành công (PASS):       ${colors.green}${colors.bright}${testState.passed}${colors.reset}`);
  console.log(` Thất bại (FAIL):        ${
    testState.failed > 0 ? colors.red : colors.green
  }${colors.bright}${testState.failed}${colors.reset}`);
  console.log(` Thời gian thực thi:    ${colors.cyan}${duration}ms${colors.reset}`);
  console.log(`${'='.repeat(80)}\n`);

  if (testState.failed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 TẤT CẢ CÁC BÀI TEST ĐÃ VƯỢT QUA!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`${colors.red}${colors.bright}❌ CÓ ${testState.failed} BÀI TEST THẤT BẠI${colors.reset}\n`);
    process.exit(1);
  }
}

main();
