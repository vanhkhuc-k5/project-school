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

// Maximum time for a single test before it's considered hung
const TEST_TIMEOUT_MS = 20000; // 20 seconds per test

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
    console.log(`[TEST START] ${suite.name} :: ${t.name}`);
    let timedOut = false;
    try {
      // Bounded test execution - prevents hanging tests from blocking CI
      await Promise.race([
        t.fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`TEST_TIMEOUT: "${t.name}" exceeded ${TEST_TIMEOUT_MS}ms`)), TEST_TIMEOUT_MS)
        ),
      ]);
      const duration = Date.now() - testStart;
      testState.passed++;
      suite.passed++;
      console.log(`[TEST END] ${suite.name} :: ${t.name} → PASS (${duration}ms)`);
      console.log(`  ${colors.green}✔ PASS${colors.reset} ${t.name} ${colors.gray}(${duration}ms)${colors.reset}`);
    } catch (err) {
      const duration = Date.now() - testStart;
      testState.failed++;
      suite.failed++;
      if (err.message?.includes('TEST_TIMEOUT')) {
        console.log(`  ${colors.red}✖ TIMEOUT${colors.reset} ${t.name} ${colors.gray}(${duration}ms)${colors.reset}`);
        console.log(`    ${colors.red}${err.message}${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✖ FAIL${colors.reset} ${t.name} ${colors.gray}(${duration}ms)${colors.reset}`);
        console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
        if (err.stack) {
          const relevantStack = err.stack.split('\n').slice(1, 3).join('\n');
          console.log(`    ${colors.gray}${relevantStack}${colors.reset}`);
        }
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
function createExpect(actual) {
  const matchers = {
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
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, received ${JSON.stringify(actual)}`);
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
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeOneOf(validValues) {
      if (!validValues.includes(actual)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be one of ${JSON.stringify(validValues)}`);
      }
    },
    toBeNaN() {
      if (!Number.isNaN(actual)) {
        throw new Error(`Expected ${actual} to be NaN`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be null`);
      }
    },
    toMatch(pattern) {
      const str = String(actual);
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
      if (!regex.test(str)) {
        throw new Error(`Expected "${str}" to match ${regex}`);
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

  // Support for .not negation
  const not = {};
  for (const [matcher, fn] of Object.entries(matchers)) {
    not[matcher] = (...args) => {
      try {
        fn(...args);
        // If no error thrown, the assertion passed, so we need to fail
        throw new Error(`Expected NOT ${matcher}(${args.map(a => JSON.stringify(a)).join(', ')}) but it passed`);
      } catch (e) {
        // If error contains our custom message, it failed as expected
        if (e.message.includes(`Expected NOT ${matcher}`)) {
          throw e;
        }
        // Otherwise, the matcher threw an error which means the negated assertion passed
        return;
      }
    };
  }

  matchers.not = not;
  return matchers;
}

export function expect(actual) {
  return createExpect(actual);
}

// HTTP API Request Helper
export function apiRequest(method, path, body = null, tokenOrOptions = null, port = 5000) {
  return new Promise((resolve, reject) => {
    let token = null;
    let customHeaders = {};

    if (typeof tokenOrOptions === 'string') {
      token = tokenOrOptions;
    } else if (tokenOrOptions && typeof tokenOrOptions === 'object') {
      token = tokenOrOptions.token || null;
      customHeaders = tokenOrOptions.headers || {};
      if (tokenOrOptions.cookie) {
        customHeaders['Cookie'] = tokenOrOptions.cookie;
      }
    }

    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'x-test-runner': 'true',
      ...customHeaders,
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
        timeout: 15000,
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
      reject(new Error(`API request timeout [${method} ${path}] after 15000ms`));
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
  post: (path, body, tokenOrOptions, portOrHeaders) => {
    // Detect if 4th argument is headers object or port number
    let options = tokenOrOptions;
    let port = portOrHeaders;
    if (typeof portOrHeaders === 'object' && portOrHeaders !== null) {
      // 4th arg is headers, merge with token options
      options = {
        token: tokenOrOptions,
        headers: portOrHeaders,
      };
      port = undefined; // Use default port
    }
    return apiRequest('POST', path, body, options, port);
  },
  put: (path, body, token, port) => apiRequest('PUT', path, body, token, port),
  patch: (path, body, token, port) => apiRequest('PATCH', path, body, token, port),
  delete: (path, token, port) => apiRequest('DELETE', path, null, token, port),
  // Raw POST without JSON serialization
  postRaw: (path, rawBody, tokenOrOptions) => {
    return new Promise((resolve, reject) => {
      let token = null;
      let customHeaders = {};
      if (typeof tokenOrOptions === 'string') {
        token = tokenOrOptions;
      } else if (tokenOrOptions) {
        token = tokenOrOptions.token || null;
        customHeaders = tokenOrOptions.headers || {};
      }
      const headers = {
        'Content-Type': 'text/plain',
        'x-test-runner': 'true',
        ...customHeaders,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5000,
          path: '/api' + path,
          method: 'POST',
          headers,
          timeout: 15000,
        },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => { responseBody += chunk; });
          res.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(responseBody); } catch { parsed = responseBody; }
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          });
        }
      );
      req.on('error', (err) => reject(new Error(`API request error: ${err.message}`)));
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(rawBody);
      req.end();
    });
  },
};
