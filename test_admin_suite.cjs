// Integration test suite for Phase 4: Admin & Executive ERP
const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (dataString) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api' + path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runAdminSuite() {
  console.log('=== STARTING PHASE 4: ADMIN & EXECUTIVE ERP TEST SUITE ===');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  try {
    // 1. Overview
    const overviewRes = await request('GET', '/admin/overview');
    assert(
      overviewRes.status === 200 && overviewRes.data?.data?.kpis?.students?.total,
      'Truy vấn báo cáo tổng quan Ban Giám Hiệu & các chỉ số KPI toàn trường'
    );

    // 2. Query users list
    const usersRes = await request('GET', '/admin/users?role=all');
    assert(
      usersRes.status === 200 && usersRes.data?.users?.length >= 4,
      'Truy vấn danh sách tài khoản người dùng theo phân quyền (Học sinh, GV, PH, Admin)'
    );

    // 3. Create new user
    const testUsername = `user_test_${Date.now()}`;
    const createRes = await request('POST', '/admin/users', {
      username: testUsername,
      email: `${testUsername}@school.edu.vn`,
      password: 'initial_password',
      role: 'teacher',
      name: 'Thầy Đặng Hoàng Nam',
      code: 'GV-TOAN-99',
      phone: '0912 888 999',
    });
    const createdUserId = createRes.data?.userId;
    assert(
      createRes.status === 200 && createRes.data?.success === true && createdUserId,
      'Tạo mới tài khoản giáo viên kèm phân quyền và thông tin định danh'
    );

    // 4. Update user info
    const updateRes = await request('PUT', `/admin/users/${createdUserId}`, {
      name: 'Thầy Đặng Hoàng Nam (ThS)',
      phone: '0912 777 666',
    });
    assert(
      updateRes.status === 200 && updateRes.data?.success === true,
      'Cập nhật hồ sơ thông tin tài khoản người dùng'
    );

    // 5. Reset password
    const resetRes = await request('POST', `/admin/users/${createdUserId}/reset-password`);
    assert(
      resetRes.status === 200 && resetRes.data?.success === true,
      'Đặt lại mật khẩu mặc định (1-click Password Reset) kèm ghi vết kiểm toán'
    );

    // 6. Delete user
    const deleteRes = await request('DELETE', `/admin/users/${createdUserId}`);
    assert(
      deleteRes.status === 200 && deleteRes.data?.success === true,
      'Xóa tài khoản người dùng và đồng bộ audit logs'
    );

    // 7. Institutional classes
    const classesRes = await request('GET', '/admin/classes');
    assert(
      classesRes.status === 200 && classesRes.data?.classes?.length >= 2,
      'Truy vấn danh mục lớp học, khối lớp và giáo viên chủ nhiệm'
    );

    // 8. Create new class
    const createClassRes = await request('POST', '/admin/classes', {
      name: `10A${Math.floor(Math.random() * 50) + 10}`,
      gradeLevel: 10,
      academicYear: '2024-2025',
    });
    assert(
      createClassRes.status === 200 && createClassRes.data?.success === true,
      'Thiết lập và mở lớp học mới theo quy chuẩn khối năm học'
    );

    // 9. Faculty directory
    const teachersRes = await request('GET', '/admin/teachers');
    assert(
      teachersRes.status === 200 && teachersRes.data?.teachers?.length >= 1,
      'Truy vấn danh mục hội đồng sư phạm & phân công chuyên môn giảng dạy'
    );

    // 10. Financial overview
    const finRes = await request('GET', '/admin/financials');
    assert(
      finRes.status === 200 && finRes.data?.financials?.collectionRate,
      'Truy vấn báo cáo tài chính số & tỷ lệ thu học phí qua cổng VietQR Napas'
    );

    // 11. Broadcast notice
    const broadcastRes = await request('POST', '/admin/broadcast', {
      title: 'Thông báo nghỉ lễ từ Ban Giám Hiệu',
      content: 'Nhà trường thông báo kế hoạch nghỉ lễ theo quy định và dặn dò an toàn học sinh.',
    });
    assert(
      broadcastRes.status === 200 && broadcastRes.data?.success === true,
      'Phát thông báo khẩn toàn trường tới tất cả phân hệ học sinh, giáo viên, phụ huynh'
    );

    // 12. Audit logs
    const auditRes = await request('GET', '/admin/audit-logs');
    assert(
      auditRes.status === 200 && auditRes.data?.logs?.length >= 5,
      'Truy xuất nhật ký bảo mật & kiểm toán an toàn thông tin (Audit Logs)'
    );

  } catch (err) {
    console.error('Fatal error during test suite:', err);
  }

  console.log(`\nAdmin Module Suite Results: ${passed}/${total} PASS`);
  if (passed === total) {
    console.log('>>> 100% ADMIN ERP TESTS PASSED <<<');
    process.exitCode = 0;
  } else {
    console.error('>>> SOME TESTS FAILED <<<');
    process.exitCode = 1;
  }
}

runAdminSuite();
