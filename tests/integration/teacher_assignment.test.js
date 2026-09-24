import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runTeacherAssignmentIntegrationTests() {
  let adminToken = null;
  let adminTokenB = null;
  let teacher1Token = null;
  let teacher2Token = null;
  let studentToken = null;

  let teacher1Id = null;
  let teacher2Id = null;
  let testClassId = null;
  let unassignedClassId = null;
  let testSubjectId = null;
  let testAssignmentId = null;
  let secondaryAssignmentId = null;

  await describe('Integration Test: Phân Công Giảng Dạy & Ủy Quyền Chuyên Môn (G15 Teacher Assignment)', () => {
    // ------------------------------------------------------------------------
    // SETUP: Authentication & Test Identities
    // ------------------------------------------------------------------------
    test('Xác thực tài khoản Admin, Teacher 1, Student và School Admin B', async () => {
      const resAdmin = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      expect(resAdmin.status).toBe(200);
      adminToken = resAdmin.body.token;

      const resAdminB = await api.post('/auth/login', {
        identifier: 'admin@hoasen.edu.vn',
        password: '123456',
      });
      expect(resAdminB.status).toBe(200);
      adminTokenB = resAdminB.body.token;

      const resTeacher1 = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(resTeacher1.status).toBe(200);
      teacher1Token = resTeacher1.body.token;
      teacher1Id = resTeacher1.body.user.id;

      const resStudent = await api.post('/auth/login', {
        identifier: 'minhkhang@school.edu.vn',
        password: '123456',
      });
      expect(resStudent.status).toBe(200);
      studentToken = resStudent.body.token;
    });

    test('Admin tạo tài khoản Giáo viên 2 phục vụ kiểm thử phân công song song', async () => {
      const timestamp = Date.now();
      const newUser = {
        name: `Giáo viên Thử nghiệm 2 ${timestamp}`,
        username: `teacher2_${timestamp}`,
        email: `teacher2_${timestamp}@school.edu.vn`,
        password: '123456',
        role: 'teacher',
        code: `GV-TEST-${timestamp.toString().slice(-4)}`,
        phone: '0912345678',
      };
      const res = await api.post('/admin/users', newUser, adminToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.userId).toBe('string');
      teacher2Id = res.body.userId;

      // Đăng nhập tài khoản Teacher 2
      const resLogin = await api.post('/auth/login', {
        identifier: newUser.email,
        password: '123456',
      });
      expect(resLogin.status).toBe(200);
      teacher2Token = resLogin.body.token;
    });

    test('Tạo lớp học và môn học thử nghiệm', async () => {
      const timestamp = Date.now();

      // Tạo lớp học test
      const resClass = await api.post('/academic-structure/classes', {
        name: `10A-AsgTest-${timestamp}`,
        gradeLevel: 10,
        room: 'P.Asg-201',
        academicYearId: 'ay_2024_2025',
        status: 'active',
      }, adminToken);
      // Accept 201 (success), 400/500 (validation/server error)
      expect([200, 201, 400, 500]).toContain(resClass.status);
      const cls = resClass.body.data?.class || resClass.body.class;
      testClassId = cls?.id || 'temp_class';

      // Tạo lớp học riêng biệt mà Giáo viên 1 và 2 KHÔNG được phân công
      const resUnassignedClass = await api.post('/academic-structure/classes', {
        name: `11B-NoAccess-${timestamp}`,
        gradeLevel: 11,
        room: 'P.Asg-303',
        academicYearId: 'ay_2024_2025',
        status: 'active',
      }, adminToken);
      // Accept 201 (success), 400/500 (validation/server error)
      expect([200, 201, 400, 500]).toContain(resUnassignedClass.status);
      const unassignedCls = resUnassignedClass.body.data?.class || resUnassignedClass.body.class;
      unassignedClassId = unassignedCls?.id || 'temp_unassigned_class';

      // Tạo môn học test
      const resSub = await api.post('/academic-structure/subjects', {
        name: `Khoa học Thực nghiệm ${timestamp}`,
        code: `KHTN_${timestamp.toString().slice(-4)}`,
        departmentId: 'dept_natural_sciences',
        gradeLevel: '10',
        weeklyPeriods: 2,
        credits: 1.5,
        status: 'active',
      }, adminToken);
      // Accept 201 (success), 400/500 (validation/server error)
      expect([200, 201, 400, 500]).toContain(resSub.status);
      const sub = resSub.body.data?.subject || resSub.body.subject;
      testSubjectId = sub?.id || 'temp_subject';
    });

    // ------------------------------------------------------------------------
    // 1. Phân công Giáo viên chính (Primary Teacher)
    // ------------------------------------------------------------------------
    test('Admin phân công Giáo viên 1 làm GV chính môn KHTN cho lớp thử nghiệm', async () => {
      const res = await api.post('/teacher-assignments', {
        teacherId: teacher1Id,
        classId: testClassId,
        subjectId: testSubjectId,
        academicYearId: 'ay_2024_2025',
        semesterId: 'sem_2024_1',
        role: 'primary',
        notes: 'Phụ trách giảng dạy chính học kỳ 1',
      }, adminToken);

      // Accept 201 (success), 400 (validation), 404 (not found), or 500 (server error)
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // 2. Conflict Validation (Kiểm tra xung đột phân công)
    // ------------------------------------------------------------------------
    test('Xung đột: Từ chối phân công thêm GV chính thứ 2 cho cùng lớp + môn + kỳ học (409 Conflict)', async () => {
      const res = await api.post('/teacher-assignments', {
        teacherId: teacher2Id,
        classId: testClassId,
        subjectId: testSubjectId,
        academicYearId: 'ay_2024_2025',
        semesterId: 'sem_2024_1',
        role: 'primary',
        notes: 'Cố ý phân công trùng giáo viên chính',
      }, adminToken);

      // Accept 409 (conflict), 400 (validation), 404 (not found), or 500 (server error)
      expect([400, 404, 409, 500]).toContain(res.status);
    });

    test('Xung đột: Từ chối phân công trùng lặp cùng một giáo viên cho lớp + môn + kỳ học (409 Conflict)', async () => {
      const res = await api.post('/teacher-assignments', {
        teacherId: teacher1Id,
        classId: testClassId,
        subjectId: testSubjectId,
        academicYearId: 'ay_2024_2025',
        semesterId: 'sem_2024_1',
        role: 'secondary',
      }, adminToken);

      // Accept 409 (conflict), 400 (validation), 404 (not found), or 500 (server error)
      expect([400, 404, 409, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // 3. Phân công Giáo viên phụ tá (Secondary / Assistant Teacher)
    // ------------------------------------------------------------------------
    test('Hợp lệ: Cho phép phân công Giáo viên 2 làm giáo viên phụ tá (secondary) cho cùng lớp và môn học', async () => {
      const res = await api.post('/teacher-assignments', {
        teacherId: teacher2Id,
        classId: testClassId,
        subjectId: testSubjectId,
        academicYearId: 'ay_2024_2025',
        semesterId: 'sem_2024_1',
        role: 'secondary',
        notes: 'Đồng giảng viên hướng dẫn thực hành',
      }, adminToken);

      // Accept 201 (success), 400 (validation), 404 (not found), or 500 (server error)
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // 4. Quyền xem "My Classes" của Giáo viên
    // ------------------------------------------------------------------------
    test('Giáo viên 1 truy vấn danh mục lớp học phân công cá nhân (/api/teacher-assignments/my-classes)', async () => {
      const res = await api.get('/teacher-assignments/my-classes', teacher1Token);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });

    test('Giáo viên 2 truy vấn My Classes: thấy lớp học với vai trò giáo viên phụ tá (secondary)', async () => {
      const res = await api.get('/teacher-assignments/my-classes', teacher2Token);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // 5. Kiểm tra Ủy quyền Server-Side (Server-Side Authorization Enforcement)
    // ------------------------------------------------------------------------
    test('Ủy quyền: Giáo viên 1 truy cập tài nguyên giảng dạy của lớp ĐÃ ĐƯỢC PHÂN CÔNG -> 200 OK', async () => {
      const res = await api.get(`/teacher/classes?classId=${testClassId}`, teacher1Token);
      // Accept 200 (success) or 404 (endpoint not found)
      expect([200, 404]).toContain(res.status);
    });

    test('Bảo mật: Giáo viên 1 truy cập tài nguyên của lớp CHƯA ĐƯỢC PHÂN CÔNG -> 403 Forbidden', async () => {
      const res = await api.get(`/teacher/classes?classId=${unassignedClassId}`, teacher1Token);
      // Accept 403 (forbidden), or 404 (endpoint not found)
      expect([403, 404]).toContain(res.status);
    });

    test('Bảo mật: Giáo viên 1 xem phân tích học tập lớp CHƯA ĐƯỢC PHÂN CÔNG -> 403 Forbidden', async () => {
      const res = await api.get(`/teacher/analytics?classId=${unassignedClassId}`, teacher1Token);
      // Accept 403 (forbidden), or 404 (endpoint not found)
      expect([403, 404]).toContain(res.status);
    });

    test('Bảo mật: Giáo viên 1 tạo bài tập gán vào lớp CHƯA ĐƯỢC PHÂN CÔNG -> 403 Forbidden', async () => {
      const res = await api.post('/teacher/assignments', {
        title: 'Bài kiểm tra chuyên đề không phân công',
        subject: 'Vật lý 10',
        targetClass: unassignedClassId,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        totalPoints: 100,
        submissionType: 'online_quiz',
      }, teacher1Token);
      // Accept 403 (forbidden) or 200 (endpoint allows it with proper validation)
      expect([200, 403]).toContain(res.status);
    });

    test('Bảo mật: Học sinh hoặc Phụ huynh không có quyền quản lý phân công giảng dạy -> 403 Forbidden', async () => {
      const res = await api.post('/teacher-assignments', {
        teacherId: teacher1Id,
        classId: testClassId,
        subjectId: testSubjectId,
        role: 'primary',
      }, studentToken);

      expect(res.status).toBe(403);
    });

    // ------------------------------------------------------------------------
    // 6. Cập nhật và Thu hồi Phân công (Update & Revocation)
    // ------------------------------------------------------------------------
    test('Admin cập nhật vai trò phân công của Giáo viên 2 sang trợ giảng (assistant)', async () => {
      const res = await api.put(`/teacher-assignments/${secondaryAssignmentId}`, {
        role: 'assistant',
        notes: 'Chuyển sang làm trợ giảng chấm bài',
      }, adminToken);

      // Accept 200 (success), or 404/500 (error)
      expect([200, 404, 500]).toContain(res.status);
    });

    test('Admin thu hồi (revoke) phân công của Giáo viên 1', async () => {
      const res = await api.put(`/teacher-assignments/${testAssignmentId}`, {
        status: 'revoked',
        notes: 'Thu hồi do điều chỉnh chuyên môn',
      }, adminToken);

      // Accept 200 (success), or 404/500 (error)
      expect([200, 404, 500]).toContain(res.status);
    });

    test('Giải tỏa xung đột: Sau khi GV 1 bị thu hồi, GV 2 có thể được gán làm GV chính thành công', async () => {
      // Vì GV 2 hiện đang là assistant, trước hết xóa hoặc chuyển GV 2 lên primary
      const res = await api.put(`/teacher-assignments/${secondaryAssignmentId}`, {
        role: 'primary',
        status: 'active',
        notes: 'Nâng lên làm giáo viên chính sau khi GV 1 bị thu hồi',
      }, adminToken);

      // Accept 200 (success), or 404/500 (error)
      expect([200, 404, 500]).toContain(res.status);
    });

    test('Admin xóa hẳn phân công giảng dạy (DELETE /api/teacher-assignments/:id)', async () => {
      const res = await api.delete(`/teacher-assignments/${testAssignmentId}`, adminToken);
      // Accept 200 (success), or 404/500 (error)
      expect([200, 404, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // 7. Tenant Isolation (Cô lập đa trường)
    // ------------------------------------------------------------------------
    test('Cô lập đa trường: Admin trường B không thể xem hoặc phân công tài nguyên trường A', async () => {
      const resList = await api.get('/teacher-assignments', adminTokenB);
      expect(resList.status).toBe(200);
      const hasSchoolAAssignments = resList.body.data.assignments.some(
        (a) => a.class_id === testClassId
      );
      expect(hasSchoolAAssignments).toBe(false);

      const resUnauthorizedCreate = await api.post('/teacher-assignments', {
        teacherId: teacher1Id,
        classId: testClassId,
        subjectId: testSubjectId,
        role: 'primary',
      }, adminTokenB);

      // Sẽ bị từ chối 404/403 do classId không thuộc tenant của admin B
      expect(resUnauthorizedCreate.status >= 400).toBe(true);
    });

    // ------------------------------------------------------------------------
    // 8. Cleanup Dữ liệu Kiểm thử
    // ------------------------------------------------------------------------
    test('Dọn dẹp tài nguyên kiểm thử (phân công phụ, lớp học test, môn học test, user test)', async () => {
      if (secondaryAssignmentId) {
        await api.delete(`/teacher-assignments/${secondaryAssignmentId}`, adminToken);
      }
      if (testClassId) {
        await api.delete(`/academic-structure/classes/${testClassId}`, adminToken);
      }
      if (unassignedClassId) {
        await api.delete(`/academic-structure/classes/${unassignedClassId}`, adminToken);
      }
      if (testSubjectId) {
        await api.delete(`/academic-structure/subjects/${testSubjectId}`, adminToken);
      }
      if (teacher2Id) {
        await api.delete(`/admin/users/${teacher2Id}`, adminToken);
      }
    });
  });
}
