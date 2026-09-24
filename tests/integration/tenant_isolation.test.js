import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runTenantIsolationIntegrationTests() {
  let teacherTokenA = null;
  let adminTokenA = null;
  let parentTokenA = null;
  let studentTokenA = null;

  await describe('Negative Integration Tests: Multi-School Tenant Isolation (/api/*)', () => {
    test('Khởi tạo phiên đăng nhập cho các vai trò thuộc Trường A (THPT Chuyên Bắc Âu)', async () => {
      // 1. Teacher School A
      const resTeacher = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(resTeacher.status).toBe(200);
      expect(resTeacher.body.user.school_id).toBe('sch_bacau');
      teacherTokenA = resTeacher.body.token;

      // 2. Admin School A
      const resAdmin = await api.post('/auth/login', {
        identifier: 'bgh.hoainam@school.edu.vn',
        password: '123456',
      });
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.user.school_id).toBe('sch_bacau');
      adminTokenA = resAdmin.body.token;

      // 3. Parent School A
      const resParent = await api.post('/auth/login', {
        identifier: 'vanhoi@parent.school.edu.vn',
        password: '123456',
      });
      expect(resParent.status).toBe(200);
      expect(resParent.body.user.school_id).toBe('sch_bacau');
      parentTokenA = resParent.body.token;

      // 4. Student School A
      const resStudent = await api.post('/auth/login', {
        identifier: 'minhkhang@school.edu.vn',
        password: '123456',
      });
      expect(resStudent.status).toBe(200);
      expect(resStudent.body.user.school_id).toBe('sch_bacau');
      studentTokenA = resStudent.body.token;
    });

    // ------------------------------------------------------------------------
    // Scenario 1: Teacher from School A cannot read School B students/classes
    // ------------------------------------------------------------------------
    test('Giáo viên Trường A KHÔNG THỂ đọc danh sách lớp hoặc học sinh của Trường B (cls_hoasen_10A1)', async () => {
      const res = await api.get('/teacher/classes?classId=cls_hoasen_10A1', teacherTokenA);
      // 403 = explicit tenant forbid, 404 = endpoint/resource not found (still secure)
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Giáo viên Trường A KHÔNG THỂ đọc báo cáo phân tích học tập (analytics) của lớp thuộc Trường B', async () => {
      const res = await api.get('/teacher/analytics?classId=cls_hoasen_10A1', teacherTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // ------------------------------------------------------------------------
    // Scenario 2: Admin from School A cannot mutate School B classes or users
    // ------------------------------------------------------------------------
    test('Admin Trường A KHÔNG THỂ chỉnh sửa thông tin lớp học của Trường B (cls_hoasen_10A1)', async () => {
      const res = await api.put('/admin/classes/cls_hoasen_10A1', {
        name: 'Hacked Class Name',
        grade_level: 11,
      }, adminTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Admin Trường A KHÔNG THỂ xóa lớp học của Trường B (cls_hoasen_10A1)', async () => {
      const res = await api.delete('/admin/classes/cls_hoasen_10A1', adminTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Admin Trường A KHÔNG THỂ chỉnh sửa người dùng của Trường B (usr_teacher_hoasen)', async () => {
      const res = await api.put('/admin/users/usr_teacher_hoasen', {
        name: 'Tên sửa đổi trái phép',
      }, adminTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Admin Trường A KHÔNG THỂ xóa tài khoản người dùng của Trường B (usr_teacher_hoasen)', async () => {
      const res = await api.delete('/admin/users/usr_teacher_hoasen', adminTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // ------------------------------------------------------------------------
    // Scenario 3: Parent cannot access unrelated child
    // ------------------------------------------------------------------------
    test('Phụ huynh Trường A KHÔNG THỂ truy cập chi tiết học sinh thuộc Trường B (std_hoasen_1)', async () => {
      const res = await api.get('/parent/children/std_hoasen_1', parentTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Phụ huynh Trường A KHÔNG THỂ nộp đơn xin nghỉ phép cho học sinh thuộc Trường B', async () => {
      const res = await api.post('/parent/leave-requests', {
        studentId: 'std_hoasen_1',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        reason: 'Khám bệnh',
      }, parentTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // ------------------------------------------------------------------------
    // Scenario 4: Student cannot access unrelated submission
    // ------------------------------------------------------------------------
    test('Học sinh Trường A KHÔNG THỂ truy cập bài nộp bài tập của Trường B (sub_hoasen_1)', async () => {
      const res = await api.get('/student/submissions/sub_hoasen_1', studentTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Học sinh Trường A KHÔNG THỂ truy cập đề thi bài tập của Trường B (asg_hoasen_1)', async () => {
      const res = await api.get('/student/assignments/asg_hoasen_1', studentTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // ------------------------------------------------------------------------
    // Scenario 5: Prevention of client-supplied school_id privilege escalation
    // ------------------------------------------------------------------------
    test('Client truyền kèm tham số gian lận ?schoolId=sch_hoasen bị chặn 403 TENANT_FORBIDDEN', async () => {
      const res = await api.get('/teacher/classes?schoolId=sch_hoasen', teacherTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Client truyền kèm tham số gian lận trong body { schoolId: "sch_hoasen" } bị chặn 403 TENANT_FORBIDDEN', async () => {
      const res = await api.put('/admin/classes/cls_10A1', {
        schoolId: 'sch_hoasen',
        name: '10A1-Updated',
      }, adminTokenA);
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // ------------------------------------------------------------------------
    // Scenario 6: Manipulated resource IDs return safe 403/404 behavior
    // ------------------------------------------------------------------------
    test('Truy vấn ID lớp học không tồn tại trả về 404 an toàn (không crash server)', async () => {
      const res = await api.get('/teacher/classes?classId=cls_nonexistent_99999', teacherTokenA);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('Truy vấn ID bài nộp không tồn tại trả về 404 an toàn', async () => {
      const res = await api.get('/student/submissions/sub_nonexistent_99999', studentTokenA);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('Truy vấn ID học sinh không tồn tại trả về 404 an toàn', async () => {
      const res = await api.get('/parent/children/std_nonexistent_99999', parentTokenA);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('Thao tác sửa đổi ID người dùng không tồn tại trả về 404 an toàn', async () => {
      const res = await api.put('/admin/users/usr_nonexistent_99999', { name: 'Test' }, adminTokenA);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
}
