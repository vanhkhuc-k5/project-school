// Integration test suite for Phase 3: Parent Engagement & Digital Finance
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

async function runParentSuite() {
  console.log('=== STARTING PHASE 3: PARENT ENGAGEMENT & DIGITAL FINANCE TEST SUITE ===');
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
    // 1. Get children profile
    const childrenRes = await request('GET', '/parent/children');
    assert(
      childrenRes.status === 200 && childrenRes.data?.data?.children?.length >= 2,
      'Truy vấn danh sách học sinh theo phụ huynh (đa con: Khôi 10A1 & Châu 7B)'
    );

    // 2. VietQR Tuition payment
    const tuitionPayRes = await request('POST', '/parent/tuition/inv_std_khoi_t11/pay');
    assert(
      tuitionPayRes.status === 200 && tuitionPayRes.data?.success === true,
      'Xác nhận thanh toán học phí trực tuyến bằng chuẩn VietQR Napas 24/7'
    );

    // 3. Confirm meeting notice
    const confirmRes = await request('POST', '/parent/notices/notif_1/confirm');
    assert(
      confirmRes.status === 200 && confirmRes.data?.success === true,
      'Xác nhận tham dự họp phụ huynh trên sổ liên lạc điện tử'
    );

    // 4. Submit Leave request (Đơn xin nghỉ học)
    const leaveRes = await request('POST', '/parent/leave-requests', {
      studentId: 'std_khoi',
      startDate: '2024-11-04',
      endDate: '2024-11-05',
      reasonType: 'Bệnh/Sức khỏe',
      reasonDetail: 'Em Khôi bị sốt cao cần nằm viện theo dõi 2 ngày.',
      emergencyPhone: '0988 776 655',
    });
    assert(
      leaveRes.status === 200 && leaveRes.data?.success === true && leaveRes.data?.id,
      'Gửi đơn xin nghỉ học trực tuyến (e-Leave) kèm lý do và số khẩn cấp'
    );

    // 5. Query leave requests
    const getLeaveRes = await request('GET', '/parent/leave-requests?studentId=std_khoi');
    assert(
      getLeaveRes.status === 200 && getLeaveRes.data?.requests?.some((r) => r.reason_type === 'Bệnh/Sức khỏe'),
      'Truy vấn lịch sử đơn xin nghỉ học và trạng thái duyệt của GVCN'
    );

    // 6. Direct messaging with teacher
    const sendMsgRes = await request('POST', '/parent/messages', {
      studentId: 'std_khoi',
      content: 'Chào cô Lan, gia đình vừa gửi đơn xin nghỉ 2 ngày cho cháu Khôi do sốt cao, phiền cô duyệt giúp ạ.',
      senderName: 'Bác Nguyễn Văn Thành (Phụ huynh)',
    });
    assert(
      sendMsgRes.status === 200 && sendMsgRes.data?.success === true && sendMsgRes.data?.message?.id,
      'Gửi tin nhắn trao đổi 2 chiều trực tiếp tới Giáo viên Chủ nhiệm'
    );

    // 7. Query message history
    const getMsgRes = await request('GET', '/parent/messages?studentId=std_khoi');
    assert(
      getMsgRes.status === 200 && getMsgRes.data?.messages?.length >= 3,
      'Truy vấn toàn bộ lịch sử hội thoại giữa phụ huynh và giáo viên'
    );

    // 8. Detailed Gradebook
    const gradesRes = await request('GET', '/parent/grades-detail?studentId=std_khoi');
    assert(
      gradesRes.status === 200 && gradesRes.data?.data?.subjects?.length >= 8 && gradesRes.data?.data?.gpa,
      'Truy vấn bảng điểm học tập chi tiết 10 môn kèm điểm kiểm tra định kỳ'
    );

    // 9. Tuition Invoices History
    const invoicesRes = await request('GET', '/parent/invoices?studentId=std_khoi');
    assert(
      invoicesRes.status === 200 && invoicesRes.data?.pastInvoices?.length >= 2,
      'Truy vấn lịch sử biên lai thu học phí điện tử các tháng trước'
    );

  } catch (err) {
    console.error('Fatal error during test suite:', err);
  }

  console.log(`\nParent Module Suite Results: ${passed}/${total} PASS`);
  if (passed === total) {
    console.log('>>> 100% PARENT MODULE TESTS PASSED <<<');
    process.exitCode = 0;
  } else {
    console.error('>>> SOME TESTS FAILED <<<');
    process.exitCode = 1;
  }
}

runParentSuite();
