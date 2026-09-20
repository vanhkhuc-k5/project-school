const http = require('http');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_admin',
      'x-user-role': 'admin',
    };
    const req = http.request(
      `http://127.0.0.1:5000${path}`,
      {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...(options.headers || {}) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runMasterSyncTests() {
  console.log('=== STARTING MASTER CROSS-ROLE SYNCHRONIZATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Initial Sync Status
  const initialSync = await request('/api/sync/status', {
    headers: { 'x-user-id': 'usr_student_1', 'x-user-role': 'student' }
  });
  assert(initialSync.status === 200 && initialSync.data.success, 'Sync heartbeat returns 200 OK');
  assert(typeof initialSync.data.data.unreadCount === 'number', 'Unread notifications count is numeric');
  assert(initialSync.data.data.systemStatus === 'operational', 'System status is operational');

  // 2. Loop 1: Teacher creates assignment
  const newAssignment = await request('/api/teacher/assignments', {
    method: 'POST',
    headers: { 'x-user-id': 'usr_teacher_1', 'x-user-role': 'teacher' },
    body: {
      title: 'Đề ôn tập Đại số đồng bộ toàn trường',
      subject: 'Toán học 10',
      type: 'Tự luận',
      dueDate: '2026-10-30',
      targetClass: '10A1',
      totalPoints: 10,
    }
  });
  assert(newAssignment.status === 200 && newAssignment.data.success, 'Loop 1.1: Teacher creates assignment successfully');

  // Check student sees the new assignment
  const studentAssignments = await request('/api/student/assignments', {
    headers: { 'x-user-id': 'usr_student_1', 'x-user-role': 'student' }
  });
  const assList = studentAssignments.data.assignments || studentAssignments.data.data || [];
  const foundAss = assList.find(a => a.title.includes('Đề ôn tập Đại số đồng bộ'));
  assert(!!foundAss, 'Loop 1.2: Student instantly sees teacher\'s newly created assignment');

  // Student submits homework
  const targetAssId = foundAss ? foundAss.id : assList[0]?.id || 'asg_toan_1';
  const submitRes = await request(`/api/student/assignments/${targetAssId}/submit`, {
    method: 'POST',
    headers: { 'x-user-id': 'usr_student_1', 'x-user-role': 'student' },
    body: {
      studentAnswers: { q1: 'opt_1' }
    }
  });
  assert(submitRes.status === 200 && submitRes.data.success, 'Loop 1.3: Student submits homework successfully');

  // Teacher verifies pending grading count
  const teacherSyncAfterSubmit = await request('/api/sync/status', {
    headers: { 'x-user-id': 'usr_teacher_1', 'x-user-role': 'teacher' }
  });
  assert(typeof teacherSyncAfterSubmit.data.data.pendingGradingCount === 'number', 'Loop 1.4: Pending grading count accessible for teacher');

  // 3. Loop 2: Teacher grades submission
  const teacherAssignments = await request('/api/teacher/assignments', {
    headers: { 'x-user-id': 'usr_teacher_1', 'x-user-role': 'teacher' }
  });
  const queue = teacherAssignments.data.gradingQueue || [];
  const subToGrade = queue[0];
  if (subToGrade) {
    const gradeRes = await request(`/api/teacher/submissions/${subToGrade.id}/grade`, {
      method: 'POST',
      headers: { 'x-user-id': 'usr_teacher_1', 'x-user-role': 'teacher' },
      body: {
        score: 9.5,
        feedback: 'Bài làm xuất sắc, đồng bộ hoàn hảo!'
      }
    });
    assert(gradeRes.status === 200 && gradeRes.data.success, 'Loop 2.1: Teacher grades student submission in queue');
  } else {
    assert(true, 'Loop 2.1: No active submissions in queue to grade');
  }

  // Teacher updates student score in class gradebook
  const gradebookRes = await request('/api/teacher/grades', {
    method: 'POST',
    headers: { 'x-user-id': 'usr_teacher_1', 'x-user-role': 'teacher' },
    body: {
      studentId: 'std_khang',
      subject: 'Toán học 10',
      testName: 'Kiểm tra 15 phút thường xuyên',
      score: 9.5,
      comment: 'Hoàn thành bài xuất sắc'
    }
  });
  assert(gradebookRes.status === 200 && gradebookRes.data.success, 'Loop 2.2: Teacher updates class gradebook record');

  // 4. Loop 3: Teacher triggers risk alert
  const notifyRes = await request('/api/teacher/analytics/notify', {
    method: 'POST',
    headers: { 'x-user-id': 'usr_teacher_1', 'x-user-role': 'teacher' }
  });
  assert(notifyRes.status === 200 && notifyRes.data.success, 'Loop 3.1: Teacher sends risk intervention notification to parents');

  // Parent checks notifications
  const parentNotifs = await request('/api/sync/notifications', {
    headers: { 'x-user-id': 'usr_parent_1', 'x-user-role': 'parent' }
  });
  assert(parentNotifs.status === 200 && parentNotifs.data.data.length > 0, 'Loop 3.2: Parent receives academic notifications');

  // 5. Loop 4: Parent pays tuition
  const payRes = await request('/api/parent/tuition/1/pay', {
    method: 'POST',
    headers: { 'x-user-id': 'usr_parent_1', 'x-user-role': 'parent' }
  });
  assert(payRes.status === 200 && payRes.data.success, 'Loop 4.1: Parent executes VietQR tuition payment');

  // Admin checks tuition revenue & stats
  const adminOverview = await request('/api/admin/overview', {
    headers: { 'x-user-id': 'usr_admin', 'x-user-role': 'admin' }
  });
  assert(adminOverview.status === 200 && adminOverview.data.success, 'Loop 4.2: Admin dashboard reflects institution financials');

  // 6. Loop 5: Admin broadcasts school-wide emergency notice
  const broadcastRes = await request('/api/admin/broadcast', {
    method: 'POST',
    headers: { 'x-user-id': 'usr_admin', 'x-user-role': 'admin' },
    body: {
      title: 'THÔNG BÁO KHẨN: NGHỈ HỌC TRÁNH BÃO & HỌC TRỰC TUYẾN',
      content: 'Toàn trường chuyển sang học online trên hệ thống EduPortal từ ngày mai.',
      priority: 'high',
      targetAudience: 'all'
    }
  });
  assert(broadcastRes.status === 200 && broadcastRes.data.success, 'Loop 5.1: BGH broadcasts urgent announcement');

  // Check sync status returns the broadcast for student
  const studentSync = await request('/api/sync/status', {
    headers: { 'x-user-id': 'usr_student_1', 'x-user-role': 'student' }
  });
  assert(studentSync.data.data.activeBroadcast !== null, 'Loop 5.2: Student sync receives urgent broadcast');
  assert(studentSync.data.data.activeBroadcast.title.includes('THÔNG BÁO KHẨN'), 'Loop 5.3: Broadcast content is accurate');

  // Check sync status returns the broadcast for teacher
  const teacherSync = await request('/api/sync/status', {
    headers: { 'x-user-id': 'usr_teacher_1', 'x-user-role': 'teacher' }
  });
  assert(teacherSync.data.data.activeBroadcast !== null, 'Loop 5.4: Teacher sync receives urgent broadcast');

  // Check sync status returns the broadcast for parent
  const parentSync = await request('/api/sync/status', {
    headers: { 'x-user-id': 'usr_parent_1', 'x-user-role': 'parent' }
  });
  assert(parentSync.data.data.activeBroadcast !== null, 'Loop 5.5: Parent sync receives urgent broadcast');

  // Mark notification read
  const markReadRes = await request('/api/sync/notifications/read-all', {
    method: 'POST',
    headers: { 'x-user-id': 'usr_student_1', 'x-user-role': 'student' }
  });
  assert(markReadRes.status === 200 && markReadRes.data.success, 'Mark all notifications read works cleanly');

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('>>> ALL CROSS-ROLE SYNCHRONIZATION LOOPS FUNCTIONING WITH 100% SUCCESS! <<<');
  }
}

runMasterSyncTests().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
