#!/usr/bin/env node
// =============================================================================
// Pre-Push Quality Gate — EduPortal G50
// Runs before every `git push` to ensure code quality gates pass.
// Usage: npm run verify
// =============================================================================

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function runCommand(name, cmd) {
  const start = Date.now();
  log(`\n▶ ${BOLD}${name}${RESET}`, CYAN);
  
  try {
    const output = execSync(cmd, { 
      encoding: 'utf8',
      stdio: 'inherit', // Stream output directly to terminal - prevents pipe buffer deadlock
      timeout: 600000 // 10 min max - allows 883 tests to complete
    });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    log(`  ✅ PASS (${duration}s)`, GREEN);
    return { success: true, output, duration: parseFloat(duration) };
  } catch (error) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    log(`  ❌ FAIL (${duration}s)`, RED);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    return { success: false, duration: parseFloat(duration), error };
  }
}

async function main() {
  console.log(`\n${BOLD}${'='.repeat(70)}`);
  log(`  EDUPORTAL PRE-PUSH QUALITY GATE`, BOLD);
  console.log(`${'='.repeat(70)}${RESET}`);
  console.log(`  Target: ${BOLD}main${RESET} branch | Node ${process.version}`);
  console.log(`  Time: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`${'='.repeat(70)}\n`);

  const results = [];
  let allPassed = true;

  // ── Step 1: TypeScript Type Check ────────────────────────────────────────
  const typecheck = runCommand(
    'STEP 1: TypeScript Type Check (tsc --noEmit)',
    'npm run typecheck'
  );
  results.push({ name: 'TypeScript', ...typecheck });
  if (!typecheck.success) allPassed = false;

  // ── Step 2: Unit & Integration Tests ──────────────────────────────────────
  const test = runCommand(
    'STEP 2: Unit & Integration Tests (883 tests)',
    'npm test'
  );
  results.push({ name: 'Tests', ...test });
  if (!test.success) allPassed = false;

  // ── Step 3: Production Build ─────────────────────────────────────────────
  const build = runCommand(
    'STEP 3: Production Build (vite build)',
    'npm run build'
  );
  results.push({ name: 'Build', ...build });
  if (!build.success) allPassed = false;

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${'─'.repeat(70)}`);
  log(`  QUALITY GATE SUMMARY`, BOLD);
  console.log(`${'─'.repeat(70)}\n`);

  let totalTime = 0;
  for (const r of results) {
    const status = r.success ? '✅ PASS' : '❌ FAIL';
    const statusColor = r.success ? GREEN : RED;
    const time = r.duration.toFixed(1);
    totalTime += r.duration;
    log(`  ${status}  ${r.name.padEnd(15)} (${time}s)`, statusColor);
  }

  console.log(`\n  ${BOLD}Total time: ${totalTime.toFixed(1)}s${RESET}`);
  console.log(`${'─'.repeat(70)}\n`);

  if (allPassed) {
    log(`\n  🎉 ALL QUALITY GATES PASSED!`, GREEN);
    log(`  ✅ Ready to push to GitHub!`, GREEN);
    console.log(`\n  Run: ${CYAN}git push origin main${RESET}\n`);
    process.exit(0);
  } else {
    log(`\n  💥 QUALITY GATES FAILED!`, RED);
    log(`  ❌ Please fix errors before pushing.`, RED);
    console.log(`\n  Common fixes:`);
    console.log(`    • ${CYAN}npm run lint:fix${RESET}  — Auto-fix linting issues`);
    console.log(`    • ${CYAN}npm run typecheck${RESET}  — Check TypeScript errors`);
    console.log(`    • ${CYAN}npm test${RESET}           — Run tests to see failures\n`);
    process.exit(1);
  }
}

main().catch(err => {
  log(`\n💥 Unexpected error: ${err.message}`, RED);
  process.exit(1);
});
