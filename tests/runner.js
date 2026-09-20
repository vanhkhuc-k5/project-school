import { testState, colors } from './helpers/testClient.js';
import { runAuthUnitTests } from './unit/auth.test.js';
import { runDatabaseUnitTests } from './unit/database.test.js';
import { runAuthIntegrationTests } from './integration/auth_endpoints.test.js';
import { runStudentIntegrationTests } from './integration/student_endpoints.test.js';
import { runTeacherIntegrationTests } from './integration/teacher_endpoints.test.js';
import { runParentIntegrationTests } from './integration/parent_endpoints.test.js';
import { runAdminIntegrationTests } from './integration/admin_endpoints.test.js';
import { runAiTutorIntegrationTests } from './integration/ai_tutor_endpoints.test.js';
import { runAcademicCycleE2ETests } from './e2e/academic_cycle.test.js';

async function main() {
  const overallStart = Date.now();
  console.log(`\n${colors.bright}========================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}         EDUPORTAL TEST AUTOMATION & VERIFICATION SYSTEM               ${colors.reset}`);
  console.log(`${colors.bright}========================================================================${colors.reset}`);
  console.log(`Target Environment: Neon Cloud PostgreSQL & Express Real Backend (Port 5000)\n`);

  try {
    // 1. Unit Tests
    await runAuthUnitTests();
    await runDatabaseUnitTests();

    // 2. Integration Tests
    await runAuthIntegrationTests();
    await runStudentIntegrationTests();
    await runTeacherIntegrationTests();
    await runParentIntegrationTests();
    await runAdminIntegrationTests();
    await runAiTutorIntegrationTests();

    // 3. End-to-End Tests
    await runAcademicCycleE2ETests();
  } catch (err) {
    console.error(`\n${colors.red}Critical test runner error: ${err.message}${colors.reset}`);
  }

  const overallDuration = Date.now() - overallStart;

  // Print Summary Table
  console.log(`\n${colors.bright}========================================================================${colors.reset}`);
  console.log(`${colors.bright}                      BẢNG TỔNG KẾT KIỂM THỬ                            ${colors.reset}`);
  console.log(`${colors.bright}========================================================================${colors.reset}`);

  testState.suites.forEach((suite, idx) => {
    const statusText =
      suite.failed === 0
        ? `${colors.green}[PASS]${colors.reset}`
        : `${colors.red}[FAIL]${colors.reset}`;
    const suiteNum = (idx + 1).toString().padStart(2, '0');
    console.log(` ${suiteNum}. ${statusText} ${suite.name} (${suite.passed}/${suite.passed + suite.failed} passed, ${suite.duration}ms)`);
  });

  console.log(`${colors.bright}------------------------------------------------------------------------${colors.reset}`);
  console.log(` Tổng số kiểm thử:  ${colors.bright}${testState.total}${colors.reset}`);
  console.log(` Thành công (PASS): ${colors.green}${colors.bright}${testState.passed}${colors.reset}`);
  console.log(` Thất bại   (FAIL): ${testState.failed > 0 ? colors.red : colors.green}${colors.bright}${testState.failed}${colors.reset}`);
  console.log(` Thời gian thực thi: ${colors.cyan}${overallDuration}ms${colors.reset}`);
  console.log(`${colors.bright}========================================================================${colors.reset}`);

  if (testState.failed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 TẤT CẢ CÁC BÀI TEST ĐÃ VƯỢT QUA 100% THÀNH CÔNG!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ CÓ ${testState.failed} BÀI TEST THẤT BẠI. VUI LÒNG KIỂM TRA LẠI!${colors.reset}\n`);
    process.exit(1);
  }
}

main();
