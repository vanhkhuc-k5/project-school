#!/usr/bin/env node
// =============================================================================
// EduPortal Pre-Push Git Hook
// This script is invoked by .git/hooks/pre-push (no extension)
// It runs quality gates before allowing a push to GitHub.
// =============================================================================

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function runNpmScript(scriptName) {
  const start = Date.now();
  log(`\n▶ ${BOLD}${scriptName}${RESET}`, CYAN);
  
  const result = spawnSync('npm', ['run', scriptName], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    timeout: 300000 // 5 min max
  });
  
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  
  if (result.status === 0) {
    log(`  ✅ PASS (${duration}s)`, GREEN);
    return { success: true, duration: parseFloat(duration) };
  } else {
    log(`  ❌ FAIL (${duration}s)`, RED);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.log(result.stderr);
    return { success: false, duration: parseFloat(duration) };
  }
}

async function main() {
  console.log(`\n${BOLD}${'═'.repeat(70)}`);
  log(`  EDUPORTAL PRE-PUSH QUALITY GATE`, BOLD);
  console.log(`${'═'.repeat(70)}${RESET}`);
  console.log(`  Target: ${BOLD}main${RESET} branch | Node ${process.version}`);
  console.log(`  Time: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = [];
  let allPassed = true;

  // Step 1: TypeScript Type Check
  const typecheck = runNpmScript('typecheck');
  results.push({ name: 'TypeScript', ...typecheck });
  if (!typecheck.success) allPassed = false;

  // Step 2: Unit & Integration Tests
  const test = runNpmScript('test');
  results.push({ name: 'Tests', ...test });
  if (!test.success) allPassed = false;

  // Step 3: Production Build
  const build = runNpmScript('build');
  results.push({ name: 'Build', ...build });
  if (!build.success) allPassed = false;

  // Summary
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
    return 0;
  } else {
    log(`\n  💥 QUALITY GATES FAILED!`, RED);
    log(`  ❌ Please fix errors before pushing.`, RED);
    console.log(`\n  Common fixes:`);
    console.log(`    • ${CYAN}npm run lint:fix${RESET}  — Auto-fix linting issues`);
    console.log(`    • ${CYAN}npm run typecheck${RESET}  — Check TypeScript errors`);
    console.log(`    • ${CYAN}npm test${RESET}           — Run tests to see failures\n`);
    return 1;
  }
}

main().then(code => process.exit(code)).catch(err => {
  log(`\n💥 Unexpected error: ${err.message}`, RED);
  process.exit(1);
});
