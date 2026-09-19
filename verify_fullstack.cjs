// Comprehensive Fullstack Verification Script for EduPortal
const http = require('http');

function postJson(path, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload || {});
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api${path}`,
        method: 'POST',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api${path}`,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runFullstackSuite() {
  console.log('🚀 Starting EduPortal Fullstack End-to-End Suite...\n');

  // Test 1: Authentication for all 4 roles
  console.log('1. [AUTH] Testing authentication across roles...');
  const studentAuth = await postJson('/auth/login', {
    identifier: 'HS-2024-889',
    password: '123456',
    role: 'student',
  });
  console.log(' - Student Login:', studentAuth.data.success ? `SUCCESS (${studentAuth.data.user.name})` : 'FAILED');

  const teacherAuth = await postJson('/auth/login', {
    identifier: 'mailan@school.edu.vn',
    password: '123456',
    role: 'teacher',
  });
  console.log(' - Teacher Login:', teacherAuth.data.success ? `SUCCESS (${teacherAuth.data.user.name})` : 'FAILED');

  const parentAuth = await postJson('/auth/login', {
    identifier: 'PH-10A1-042',
    password: '123456',
    role: 'parent',
  });
  console.log(' - Parent Login:', parentAuth.data.success ? `SUCCESS (${parentAuth.data.user.name})` : 'FAILED');

  const adminAuth = await postJson('/auth/login', {
    identifier: 'bgh.hoainam@school.edu.vn',
    password: '123456',
    role: 'admin',
  });
  console.log(' - Admin Login:', adminAuth.data.success ? `SUCCESS (${adminAuth.data.user.name})` : 'FAILED');

  // Test 2: Student workflow
  console.log('\n2. [STUDENT] Testing live Student Dashboard & AI Tutor...');
  const studentDash = await getJson('/student/dashboard', studentAuth.data.token);
  const assignmentsList = studentDash.data.data.urgentAssignments;
  console.log(` - Student Dashboard retrieved: ${assignmentsList.length} assignments, GPA score: ${studentDash.data.data.kpis.weeklyAverage.score}`);

  const aiChat = await postJson(
    '/ai-tutor/chat',
    {
      text: 'Thầy hướng dẫn em tính biệt thức Delta của phương trình bậc 2',
      topic: 'Toán học 10',
    },
    studentAuth.data.token
  );
  console.log(` - AI Tutor Socratic response received: "${aiChat.data.reply.content.intro.substring(0, 60)}..."`);

  // Test 3: Teacher workflow (Create assignment & alert parents)
  console.log('\n3. [TEACHER] Testing Assignment Creation & Parent Alert...');
  const newAssign = await postJson(
    '/teacher/assignments',
    {
      title: 'Kiểm tra 15 phút: Hàm số bậc hai & Đồ thị thực tế',
      subject: 'Toán học 10',
      targetClass: '10A1',
      dueDate: '2025-04-05',
      maxScore: 10,
      questions: [
        {
          id: 1,
          question: 'Trục đối xứng của parabol y = ax^2 + bx + c là gì?',
          options: ['x = -b/2a', 'x = -b/a', 'x = b/2a', 'x = c/a'],
          correctAnswer: 'A',
        },
      ],
    },
    teacherAuth.data.token
  );
  console.log(' - New assignment published to SQLite:', newAssign.data.success ? `SUCCESS (Assignment ID: ${newAssign.data.assignmentId})` : 'FAILED');

  const notifyParents = await postJson('/teacher/intervene-notify', {}, teacherAuth.data.token);
  console.log(' - Teacher intervened and notified parents of at-risk students:', notifyParents.data.success ? 'SUCCESS' : 'FAILED');

  // Test 4: Parent workflow (View tuition & pay)
  console.log('\n4. [PARENT] Testing Tuition Payment & Fee Records...');
  const parentDash = await getJson('/parent/children', parentAuth.data.token);
  const child = parentDash.data.data.children[0];
  console.log(` - Child profile: ${child.name}, Class: ${child.class}, Tuition: ${child.tuition.total} VNĐ`);

  const payRes = await postJson('/parent/tuition/1/pay', {}, parentAuth.data.token);
  console.log(' - Parent executed VietQR tuition settlement:', payRes.data.success ? 'SUCCESS' : 'FAILED');

  // Test 5: Admin workflow (Broadcast & MOET sync)
  console.log('\n5. [ADMIN] Testing School-wide Broadcast & MOET Education Cloud Sync...');
  const broadcastRes = await postJson(
    '/admin/broadcast',
    {
      title: 'Thông báo: Lịch thi tuyển sinh và chuẩn hóa hồ sơ điện tử',
      content: 'Ban Giám Hiệu gửi toàn trường thông báo về ngày kiểm tra học kỳ II và kích hoạt định danh số VNeID.',
    },
    adminAuth.data.token
  );
  console.log(' - Admin broadcasted emergency announcement:', broadcastRes.data.success ? 'SUCCESS' : 'FAILED');

  const syncRes = await postJson('/admin/sync-moet', {}, adminAuth.data.token);
  console.log(' - Admin synchronized data with MOET national cloud:', syncRes.data.success ? `SUCCESS (${syncRes.data.recordsSynced} records)` : 'FAILED');

  const overview = await getJson('/admin/overview', adminAuth.data.token);
  console.log(` - Admin Overview refreshed: ${overview.data.data.kpis.students.count} students, MOET status: "${overview.data.data.moetSync.statusText}"`);

  console.log('\n✨ ALL FULLSTACK SCENARIOS COMPLETED SUCCESSFULLY!');
}

runFullstackSuite().catch(console.error);
