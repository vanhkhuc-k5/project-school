import http from 'http';

// ANSI terminal colors
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Global Test Registry
export const testState = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: [],
  currentSuite: null,
};

export async function describe(suiteName, fn) {
  const suite = { name: suiteName, tests: [], passed: 0, failed: 0, duration: 0 };
  testState.suites.push(suite);
  testState.currentSuite = suite;
  console.log(`\n${colors.cyan}${colors.bright}▶ [SUITE] ${suiteName}${colors.reset}`);

  // 1. Thu thập danh sách test cases
  try {
    await fn();
  } catch (err) {
    console.error(`${colors.red}  Suite definition error: ${err.message}${colors.reset}`);
    return;
  }

  // 2. Thực thi tuần tự từng test case bất đồng bộ
  const start = Date.now();
  for (const t of suite.tests) {
    testState.total++;
    const testStart = Date.now();
    try {
      await t.fn();
      const duration = Date.now() - testStart;
      testState.passed++;
      suite.passed++;
      console.log(`  ${colors.green}✔ PASS${colors.reset} ${t.name} ${colors.gray}(${duration}ms)${colors.reset}`);
    } catch (err) {
      const duration = Date.now() - testStart;
      testState.failed++;
      suite.failed++;
      console.log(`  ${colors.red}✖ FAIL${colors.reset} ${t.name} ${colors.gray}(${duration}ms)${colors.reset}`);
      console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
      if (err.stack) {
        const relevantStack = err.stack.split('\n').slice(1, 3).join('\n');
        console.log(`    ${colors.gray}${relevantStack}${colors.reset}`);
      }
    }
  }
  suite.duration = Date.now() - start;
}

export function test(testName, testFn) {
  if (testState.currentSuite) {
    testState.currentSuite.tests.push({ name: testName, fn: testFn });
  }
}

export const it = test;

// Expect assertion library
export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} (${typeof expected}) but got ${JSON.stringify(actual)} (${typeof actual})`);
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected deep equality:\n  Expected: ${b}\n  Actual:   ${a}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, received ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, received ${actual}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined value, received ${actual}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toContain(item) {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(item)) {
          throw new Error(`Expected string to contain "${item}"`);
        }
      } else {
        throw new Error(`toContain requires array or string, received ${typeof actual}`);
      }
    },
  };
}

// HTTP API Request Helper
export function apiRequest(method, path, body = null, token = null, port = 5000) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (dataString) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api' + path,
        method,
        headers,
        timeout: 10000,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = responseBody ? JSON.parse(responseBody) : null;
          } catch {
            parsed = responseBody;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', (err) => {
      reject(new Error(`API request error [${method} ${path}]: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`API request timeout [${method} ${path}] after 10000ms`));
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

// Convenience helpers
export const api = {
  get: (path, token, port) => apiRequest('GET', path, null, token, port),
  post: (path, body, token, port) => apiRequest('POST', path, body, token, port),
  put: (path, body, token, port) => apiRequest('PUT', path, body, token, port),
  delete: (path, token, port) => apiRequest('DELETE', path, null, token, port),
};
