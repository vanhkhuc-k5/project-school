import http from 'http';

async function test() {
  // Login as admin
  const loginData = JSON.stringify({identifier: 'admin@school.edu.vn', password: '123456'});
  const loginRes = await new Promise((resolve) => {
    const req = http.request({hostname:'127.0.0.1',port:5000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(loginData)}}, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(loginData); req.end();
  });
  const token = loginRes.token;
  console.log('Admin logged in');

  // Create announcement
  const body = JSON.stringify({
    title: 'Test Announcement ' + Date.now(),
    content: 'Test content for creation testing. Minimum 20 characters here.',
    scope: 'all',
    priority: 'normal',
    status: 'draft'
  });
  
  const createRes = await new Promise((resolve) => {
    const req = http.request({hostname:'127.0.0.1',port:5000,path:'/api/announcements',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'Authorization':'Bearer ' + token}}, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({status: res.statusCode, body: JSON.parse(d)}));
    });
    req.write(body); req.end();
  });
  console.log('Create result:', createRes.status, createRes.body.success ? 'SUCCESS' : 'FAILED');
  if (!createRes.body.success) {
    console.log('Error:', createRes.body.error?.message);
  } else {
    console.log('Announcement ID:', createRes.body.data.id);
  }
  
  // List announcements
  const listRes = await new Promise((resolve) => {
    const req = http.request({hostname:'127.0.0.1',port:5000,path:'/api/announcements?limit=10',method:'GET',headers:{'Authorization':'Bearer ' + token}}, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({status: res.statusCode, body: JSON.parse(d)}));
    });
    req.end();
  });
  console.log('List result:', listRes.status, listRes.body.success ? 'SUCCESS' : 'FAILED');
  if (!listRes.body.success) {
    console.log('Error:', listRes.body.error?.message);
  } else {
    console.log('Announcements count:', listRes.body.announcements?.length || 0);
  }
}

test().catch(console.error);
