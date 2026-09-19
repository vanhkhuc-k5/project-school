const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:5000${path}`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function testAll() {
  const health = await get('/api/health');
  console.log('1. Health check:', health.status);

  const student = await get('/api/student/dashboard');
  console.log('2. Student Dashboard:', student.data.student.fullName, '| Assignments:', student.data.urgentAssignments.length);

  const teacher = await get('/api/teacher/analytics');
  console.log('3. Teacher Analytics:', teacher.data.currentClass, '| Students:', teacher.data.students.length);

  const parent = await get('/api/parent/children');
  console.log('4. Parent Children:', parent.data.children.length, 'children | First child:', parent.data.children[0].name);

  const admin = await get('/api/admin/overview');
  console.log('5. Admin Overview:', admin.data.schoolName, '| Students KPI:', admin.data.kpis.students.total);
}

testAll().catch(console.error);
