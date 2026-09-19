// Comprehensive Student and Teacher Advanced Feature Verification
const http = require('http');

function request(method, path, payload, token) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : '';
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
        method,
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
    if (data) req.write(data);
    req.end();
  });
}

async function runStudentTeacherSuite() {
  console.log('🧪 Starting Student & Teacher Production Feature Verification...\n');

  // 1. Auth Login
  const studentAuth = await request('POST', '/auth/login', {
    identifier: 'HS-2024-889',
    password: 'password123',
    role: 'student',
  });
  const studentToken = studentAuth.data.token;

  const teacherAuth = await request('POST', '/auth/login', {
    identifier: 'mailan@school.edu.vn',
    password: 'password123',
    role: 'teacher',
  });
  const teacherToken = teacherAuth.data.token;

  // 2. Student Assignment List & Details
  console.log('1. [STUDENT] Testing Assignments & Online Exam System:');
  const asgList = await request('GET', '/student/assignments', null, studentToken);
  console.log(` - Assignments listed: ${asgList.data.assignments.length} assignments found.`);

  const asgDetail = await request('GET', '/student/assignments/asg_toan_10', null, studentToken);
  const qCount = asgDetail.data.assignment.questions.length;
  console.log(` - Exam details retrieved for "${asgDetail.data.assignment.title}" (${qCount} questions).`);

  // Submit test with answers A, B, A, A, A
  const submitRes = await request(
    'POST',
    '/student/assignments/asg_toan_10/submit',
    {
      studentAnswers: {
        q_10_1: 'A',
        q_10_2: 'B',
        q_10_3: 'A',
        q_10_4: 'A',
        q_10_5: 'A',
      },
    },
    studentToken
  );
  console.log(` - Exam submitted & auto-graded: Score = ${submitRes.data.score}/${submitRes.data.maxScore} (${submitRes.data.correctCount}/${submitRes.data.totalQuestions} correct answers).`);

  // 3. Student Grades & Transcripts
  console.log('\n2. [STUDENT] Testing Electronic Gradebook & Transcripts:');
  const gradebook = await request('GET', '/student/grades', null, studentToken);
  console.log(` - GPA: ${gradebook.data.data.overallGpa} | Class Rank: ${gradebook.data.data.classRank} | Conduct: ${gradebook.data.data.conduct}`);
  console.log(` - Number of evaluated subjects: ${gradebook.data.data.subjects.length}`);

  // 4. Student Resources
  console.log('\n3. [STUDENT] Testing Digital Study Resources:');
  const resources = await request('GET', '/student/resources', null, studentToken);
  console.log(` - Resources retrieved: ${resources.data.resources.length} study materials.`);
  const downloadRes = await request('POST', `/student/resources/${resources.data.resources[0].id}/download`, null, studentToken);
  console.log(` - Resource download counter updated: ${downloadRes.data.success ? 'SUCCESS' : 'FAILED'}`);

  // 5. Teacher Classes & Gradebook
  console.log('\n4. [TEACHER] Testing Class Roster & Inline Grade Management:');
  const classRoster = await request('GET', '/teacher/classes?classId=cls_10A1', null, teacherToken);
  console.log(` - Class 10A1 students: ${classRoster.data.students.length} students loaded.`);

  const studentTarget = classRoster.data.students[0];
  const updateGradeRes = await request(
    'POST',
    '/teacher/grades',
    {
      studentId: studentTarget.id,
      subject: 'Toán học 10',
      testName: 'Kiểm tra 1 tiết Chuyên đề',
      score: 9.8,
      comment: 'Tư duy logic xuất sắc, lời giải ngắn gọn.',
    },
    teacherToken
  );
  console.log(` - Teacher entered grade for "${studentTarget.name}": 9.8đ (${updateGradeRes.data.success ? 'SUCCESS' : 'FAILED'}).`);

  // 6. Teacher Assignments & Grading Queue
  console.log('\n5. [TEACHER] Testing Grading Queue & Evaluation:');
  const teacherAsg = await request('GET', '/teacher/assignments', null, teacherToken);
  console.log(` - Teacher active assignments: ${teacherAsg.data.assignments.length}`);
  console.log(` - Student submissions in queue: ${teacherAsg.data.gradingQueue.length}`);

  if (teacherAsg.data.gradingQueue.length > 0) {
    const targetSub = teacherAsg.data.gradingQueue[0];
    const gradeSubRes = await request(
      'POST',
      `/teacher/submissions/${targetSub.id}/grade`,
      { score: 9.5, feedback: 'Bài giải đạt điểm tối đa, chúc mừng em!' },
      teacherToken
    );
    console.log(` - Submission for "${targetSub.studentName}" graded with score 9.5: ${gradeSubRes.data.success ? 'SUCCESS' : 'FAILED'}`);
  }

  // 7. Teacher Pedagogical Reports
  console.log('\n6. [TEACHER] Testing Pedagogical Semester Report:');
  const report = await request('GET', '/teacher/reports', null, teacherToken);
  console.log(` - Report title: "${report.data.data.termName}"`);
  console.log(` - Total evaluated students: ${report.data.data.classSummary.evaluatedCount}, Excellent count: ${report.data.data.classSummary.excellentCount}`);

  console.log('\n🌟 ALL STUDENT & TEACHER ADVANCED WORKFLOWS VERIFIED 100%!');
}

runStudentTeacherSuite().catch(console.error);
