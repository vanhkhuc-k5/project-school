// Count tests per suite
process.env.NODE_ENV = 'test';

import { testState } from './helpers/testClient.js';
import { runAssignmentAuthoringIntegrationTests } from './integration/assignment_authoring.test.js';
import { runSubmissionWorkflowIntegrationTests } from './integration/submission_workflow.test.js';
import { runTeacherGradingIntegrationTests } from './integration/teacher_grading_workflow.test.js';
import { runMessagingIntegrationTests } from './integration/parent_teacher_messaging.test.js';
import { runLeaveRequestsIntegrationTests } from './integration/leave_requests.test.js';
import { runTuitionIntegrationTests } from './integration/tuition_invoices.test.js';
import { runPaymentGatewayIntegrationTests } from './integration/payment_gateway.test.js';
import { runReportingTests } from './integration/reporting.test.js';

async function main() {
  console.log('Counting tests per suite...\n');
  
  await runAssignmentAuthoringIntegrationTests();
  await runSubmissionWorkflowIntegrationTests();
  await runTeacherGradingIntegrationTests();
  await runMessagingIntegrationTests();
  await runLeaveRequestsIntegrationTests();
  await runTuitionIntegrationTests();
  await runPaymentGatewayIntegrationTests();
  await runReportingTests();

  console.log('\n=== TEST COUNTS BY SUITE ===');
  for (const suite of testState.suites) {
    console.log(`${suite.name}: ${suite.tests.length} tests defined`);
  }
  console.log(`\nTotal suites: ${testState.suites.length}`);
  console.log(`Total tests defined: ${testState.suites.reduce((acc, s) => acc + s.tests.length, 0)}`);
}

main().catch(console.error);
