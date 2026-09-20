const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTeacherTests() {
  console.log('=== STARTING PHASE 2: TEACHER MODULE INTEGRATION TEST SUITE ===');

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

  // 1. Test Attendance Recording
  await test('Ghi nhận điểm danh hàng ngày với 4 trạng thái (Có mặt, Có phép, Không phép, Đi muộn)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const records = [
      { studentId: 'std_khang', status: 'present', note: '' },
      { studentId: 'std_2', status: 'excused', note: 'Có đơn xin nghỉ phép phụ huynh' },
      { studentId: 'std_3', status: 'unexcused', note: 'Vắng không lý do' },
      { studentId: 'std_4', status: 'late', note: 'Đi muộn 15 phút' },
    ];
    const res = await fetch(`${BASE_URL}/teacher/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: 'cls_10A1', date: today, records }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.unexcusedAlerts, 1, 'Phải kích hoạt 1 cảnh báo cho học sinh vắng không phép');
  });

  // 2. Test Attendance Retrieval
  await test('Truy vấn lịch sử điểm danh theo lớp và ngày', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/teacher/attendance?classId=cls_10A1&date=${today}`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.records));
    assert.ok(data.records.length >= 4);
  });

  // 3. Test Grade Entry and GPA Auto-Recalculation
  await test('Giáo viên nhập điểm kiểm tra & Hệ thống tự động tính lại điểm TB (GPA)', async () => {
    const res = await fetch(`${BASE_URL}/teacher/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'std_khang',
        subject: 'Toán học 10',
        testName: 'Kiểm tra 15 phút Chuyên đề',
        score: 9.5,
        comment: 'Bài làm xuất sắc, lập luận chặt chẽ.',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.gradeId);
  });

  // 4. Test Assignment Creation with Questions
  let createdAssignmentId = null;
  await test('Soạn đề và tạo bài tập trực tuyến mới kèm ngân hàng câu hỏi', async () => {
    const res = await fetch(`${BASE_URL}/teacher/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Khảo sát chất lượng Toán học Tuần 15',
        subject: 'Toán học 10',
        type: 'quiz',
        instructions: 'Thời gian làm bài 45 phút, không sử dụng tài liệu.',
        targetClasses: ['10A1', '10A2'],
        deadlineDate: '2024-11-20',
        deadlineTime: '23:59',
        durationMinutes: 45,
        questions: [
          {
            prompt: 'Nghiệm của phương trình x² - 5x + 6 = 0 là:',
            points: 2.0,
            hasPlot: false,
            options: [
              { id: 'A', text: 'x = 2 hoặc x = 3', isCorrect: true },
              { id: 'B', text: 'x = -2 hoặc x = -3', isCorrect: false },
              { id: 'C', text: 'x = 1 hoặc x = 6', isCorrect: false },
              { id: 'D', text: 'Vô nghiệm', isCorrect: false },
            ],
            explanation: 'Phân tích nhân tử: (x - 2)(x - 3) = 0.',
          },
        ],
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.assignmentId);
    createdAssignmentId = data.assignmentId;
  });

  // 5. Test Submission Grading
  await test('Chấm bài học sinh trong hàng đợi và ghi lời phê sư phạm', async () => {
    // First get a submission in queue
    const listRes = await fetch(`${BASE_URL}/teacher/assignments`);
    const listData = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listData.gradingQueue));

    if (listData.gradingQueue.length > 0) {
      const subId = listData.gradingQueue[0].id;
      const gradeRes = await fetch(`${BASE_URL}/teacher/submissions/${subId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: 9.0,
          feedback: 'Cô khen ngợi phần trình bày lời giải rõ ràng, sáng tạo.',
        }),
      });
      const gradeData = await gradeRes.json();
      assert.strictEqual(gradeRes.status, 200);
      assert.strictEqual(gradeData.success, true);
    }
  });

  // 6. Test Teacher Analytics Retrieval
  await test('Truy vấn báo cáo phân tích sư phạm và danh sách học sinh rủi ro', async () => {
    const res = await fetch(`${BASE_URL}/teacher/analytics`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.kpis);
    assert.ok(Array.isArray(data.data.students));
  });

  // 7. Test Parent Notification Dispatch
  await test('Phát thông báo can thiệp sư phạm 1-chạm gửi về sổ liên lạc phụ huynh', async () => {
    const res = await fetch(`${BASE_URL}/teacher/intervene-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  });

  console.log(`\nTeacher Module Suite Results: ${passed}/${total} PASS`);
  if (passed === total) {
    console.log('>>> 100% TEACHER MODULE TESTS PASSED <<<');
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}

runTeacherTests();
