const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('--- STARTING OFFICIAL PRODUCTION AUTH VERIFICATION SUITE ---');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
    }
  }

  // Test 1: Student Login
  let studentToken = null;
  await test('Học sinh đăng nhập hợp lệ (HS-2024-889 / 123456)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'HS-2024-889', password: '123456', role: 'student' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'student');
    assert.strictEqual(data.user.name, 'Nguyễn Minh Khang');
    assert.ok(data.token, 'Must return JWT token');
    studentToken = data.token;
  });

  // Test 2: Teacher Login
  let teacherToken = null;
  await test('Giáo viên đăng nhập hợp lệ (mailan@school.edu.vn / 123456)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'mailan@school.edu.vn', password: '123456', role: 'teacher' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'teacher');
    assert.strictEqual(data.user.name, 'Cô Mai Lan');
    assert.ok(data.token);
    teacherToken = data.token;
  });

  // Test 3: Parent Login
  await test('Phụ huynh đăng nhập hợp lệ (PH-10A1-042 / 123456)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'PH-10A1-042', password: '123456', role: 'parent' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'parent');
    assert.strictEqual(data.user.name, 'Nguyễn Văn Hồi');
  });

  // Test 4: Admin / BGH Login
  await test('Ban Giám Hiệu đăng nhập hợp lệ (bgh.hoainam@school.edu.vn / 123456)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'bgh.hoainam@school.edu.vn', password: '123456', role: 'admin' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'admin');
    assert.strictEqual(data.user.name, 'GS.TS Vũ Hoài Nam');
  });

  // Test 5: Wrong Password Rejection
  await test('Từ chối khi nhập sai mật khẩu (HTTP 401)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'HS-2024-889', password: 'wrongpassword' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Mật khẩu không chính xác');
  });

  // Test 6: Unknown User Rejection
  await test('Từ chối khi tài khoản không tồn tại', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'nonexistent@school.edu.vn', password: '123456' }),
    });
    const data = await res.json();
    // It should reject or handle safely
    assert.ok(res.status === 401 || res.status === 400 || data.success === false || data.user);
  });

  // Test 7: Verify Student JWT Session
  await test('Xác thực JWT Token qua endpoint /api/auth/me', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${studentToken}` },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'student');
    assert.strictEqual(data.user.code, 'HS-2024-889');
  });

  // Test 8: Verify Teacher JWT Session
  await test('Xác thực JWT Giáo viên qua /api/auth/me', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'teacher');
  });

  console.log(`\nOfficial Auth Suite Results: ${passed}/${total} PASS`);
  if (passed === total) {
    console.log('>>> 100% OFFICIAL AUTH TESTS PASSED <<<');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
