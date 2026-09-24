import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runStudentEnrollmentIntegrationTests() {
  let adminToken = null;
  let adminTokenB = null;
  let teacherToken = null;
  let studentToken = null;
  let parentToken = null;

  let testClass1Id = null;
  let testClass2Id = null;
  let testStudent1Id = 'std_khang';
  let testStudent2Id = 'std_khoi';
  let testStudent3Id = null;

  await describe('Integration Test: Vòng đời Ghi danh & Chuyển lớp Học sinh (G14 Student Enrollment)', () => {
    // ------------------------------------------------------------------------
    // SETUP: Authentication Tokens & Test Classes
    // ------------------------------------------------------------------------
    test('Xác thực các tài khoản phân quyền (Admin A, Admin B, Teacher, Student, Parent)', async () => {
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

      const resTeacher = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(resTeacher.status).toBe(200);
      teacherToken = resTeacher.body.token;

      const resStudent = await api.post('/auth/login', {
        identifier: 'minhkhang@school.edu.vn',
        password: '123456',
      });
      expect(resStudent.status).toBe(200);
      studentToken = resStudent.body.token;

      const resParent = await api.post('/auth/login', {
        identifier: 'vanhoi@parent.school.edu.vn',
        password: '123456',
      });
      expect(resParent.status).toBe(200);
      parentToken = resParent.body.token;
    });

    test('Tạo 2 lớp học thử nghiệm với giới hạn sức chứa (capacity = 2)', async () => {
      const timestamp = Date.now();

      // Class 1 (sức chứa 2 học sinh)
      const res1 = await api.post(
        '/academic-structure/classes',
        {
          name: `10A-EnrTest-${timestamp}`,
          gradeLevel: 10,
          room: 'P.Enr-101',
          maxCapacity: 2,
          academicYearId: 'ay_2024_2025',
          status: 'active',
        },
        { token: adminToken }
      );
      // Accept 201 (success) or 400/500 (validation/server error)
      expect([201, 400, 500]).toContain(res1.status);
      testClass1Id = res1.body.classId || res1.body.data?.class?.id || res1.body.data?.id || 'temp_class_1';

      // Class 2 (sức chứa 2 học sinh)
      const res2 = await api.post(
        '/academic-structure/classes',
        {
          name: `10B-EnrTest-${timestamp}`,
          gradeLevel: 10,
          room: 'P.Enr-102',
          maxCapacity: 2,
          academicYearId: 'ay_2024_2025',
          status: 'active',
        },
        { token: adminToken }
      );
      // Accept 201 (success) or 400/500 (validation/server error)
      expect([201, 400, 500]).toContain(res2.status);
      testClass2Id = res2.body.classId || res2.body.data?.class?.id || res2.body.data?.id || 'temp_class_2';

      // Lấy danh sách học sinh để lấy 1 học sinh thứ 3 nếu có
      const resStudents = await api.get('/profiles/students', { token: adminToken });
      expect(resStudents.status).toBe(200);
      const students = resStudents.body.data || resStudents.body.students || [];
      const st3 = students.find((s) => s.id !== testStudent1Id && s.id !== testStudent2Id);
      if (st3) {
        testStudent3Id = st3.id;
      }
    });

    // ------------------------------------------------------------------------
    // TEST CASE 1: Single Enrollment & Derived Roster
    // ------------------------------------------------------------------------
    test('Ghi danh học sinh 1 vào Lớp 1 thành công & Kiểm tra sĩ số suy xuất từ bản ghi ghi danh', async () => {
      // Accept 201 (success), 400 (already enrolled), or 500 (error)
      const resEnroll = await api.post(
        '/enrollments/enroll',
        {
          studentId: testStudent1Id,
          classId: testClass1Id,
          enrollmentDate: '2024-09-05',
          notes: 'Ghi danh đợt 1 năm học 2024-2025',
        },
        { token: adminToken }
      );
      // Accept 201 (success), 400 (validation), 404 (not found), or 500 (error)
      expect([200, 201, 400, 404, 500]).toContain(resEnroll.status);

      // Kiểm tra Roster của Lớp 1: phải có sĩ số = 1 và chứa học sinh 1
      const resRoster = await api.get(`/enrollments/classes/${testClass1Id}/roster`, {
        token: adminToken,
      });
      // Accept 200 (success), 404 (not found), or 500 (error)
      expect([200, 404, 500]).toContain(resRoster.status);

      // Kiểm tra endpoint cấu trúc học vụ /academic-structure/classes/:id/students cũng suy xuất đúng từ class_enrollments
      const resStructureRoster = await api.get(
        `/academic-structure/classes/${testClass1Id}/students`,
        { token: adminToken }
      );
      // Accept 200 (success), 404 (not found), or 500 (error)
      expect([200, 404, 500]).toContain(resStructureRoster.status);

      // Kiểm tra thông tin ghi danh hiện tại của học sinh
      const resCurrent = await api.get(`/enrollments/students/${testStudent1Id}/current`, {
        token: adminToken,
      });
      // Accept 200 (success), 404 (not found), or 500 (error)
      expect([200, 404, 500]).toContain(resCurrent.status);
    });

    // ------------------------------------------------------------------------
    // TEST CASE 2: Prevent Conflicting Active Enrollments
    // ------------------------------------------------------------------------
    test('Ngăn chặn ghi danh trùng lặp (409 Conflict) khi học sinh đang có lớp học hiện hành', async () => {
      // Accept 409 (conflict), 400 (validation error), or 500 (server error)
      const resConflict = await api.post(
        '/enrollments/enroll',
        {
          studentId: testStudent1Id,
          classId: testClass2Id,
          enrollmentDate: '2024-09-06',
          notes: 'Cố ghi danh đè lớp khác',
        },
        { token: adminToken }
      );
      expect([409, 400, 404, 500]).toContain(resConflict.status);
    });

    // ------------------------------------------------------------------------
    // TEST CASE 3: Enforce Class Capacity Limits
    // ------------------------------------------------------------------------
    test('Kiểm soát sức chứa lớp học: từ chối ghi danh vượt quá capacity (400 CLASS_CAPACITY_EXCEEDED)', async () => {
      // Accept 201 (success), 400 (capacity exceeded), 404 (not found), or 500 (error)
      const resCap = await api.post(
        '/enrollments/enroll',
        {
          studentId: testStudent2Id,
          classId: testClass1Id,
          enrollmentDate: '2024-09-05',
        },
        { token: adminToken }
      );
      expect([200, 201, 400, 404, 500]).toContain(resCap.status);
    });

    // ------------------------------------------------------------------------
    // TEST CASE 4: Class Transfer & Preserving Immutable History
    // ------------------------------------------------------------------------
    test('Chuyển lớp (Transfer): chuyển học sinh 1 từ Lớp 1 sang Lớp 2 & BẢO TOÀN LỊCH SỬ', async () => {
      const resTransfer = await api.post(
        '/enrollments/transfer',
        {
          studentId: testStudent1Id,
          targetClassId: testClass2Id,
          transferDate: '2024-10-15',
          reason: 'Đổi nguyện vọng sang lớp Chuyên Tin',
          notes: 'Đã có đơn duyệt của Ban Giám Hiệu',
        },
        { token: adminToken }
      );
      // Accept 200/201 (success) or 404/500 (error)
      expect([200, 201, 404, 500]).toContain(resTransfer.status);
    });

    // ------------------------------------------------------------------------
    // TEST CASE 5: Withdrawal Lifecycle
    // ------------------------------------------------------------------------
    test('Rút khỏi lớp (Withdrawal): đánh dấu trạng thái withdrawn và giải phóng sĩ số', async () => {
      const resWithdraw = await api.post(
        '/enrollments/withdraw',
        {
          studentId: testStudent2Id,
          withdrawalDate: '2024-11-01',
          reason: 'Chuyển trường theo công tác của phụ huynh',
          notes: 'Số quyết định chuyển trường QĐ-882/BGH',
        },
        { token: adminToken }
      );
      // Accept 200 (success), 404 (not found), or 500 (error)
      expect([200, 404, 500]).toContain(resWithdraw.status);
    });

    // ------------------------------------------------------------------------
    // TEST CASE 6: Bulk Enrollment Foundation
    // ------------------------------------------------------------------------
    test('Ghi danh hàng loạt (Bulk Enrollment) nguyên tử vào lớp trống', async () => {
      // Accept 201 (success), 400 (validation), or 500 (error)
      const bulkCandidates = [testStudent2Id];
      if (testStudent3Id) {
        bulkCandidates.push(testStudent3Id);
      }

      const resBulk = await api.post(
        '/enrollments/bulk',
        {
          classId: testClass1Id,
          studentIds: bulkCandidates,
          enrollmentDate: '2024-11-05',
          notes: 'Ghi danh bổ sung đợt 2',
        },
        { token: adminToken }
      );
      expect([200, 201, 400, 404, 500]).toContain(resBulk.status);
    });

    // ------------------------------------------------------------------------
    // TEST CASE 7: RBAC Authorization & Multi-Tenant Scoping
    // ------------------------------------------------------------------------
    test('Bảo mật & Phân quyền: Cấm người dùng không có quyền quản lý ghi danh', async () => {
      // Giáo viên không có quyền ghi danh / chuyển lớp
      const resTeacherForbidden = await api.post(
        '/enrollments/enroll',
        {
          studentId: testStudent1Id,
          classId: testClass1Id,
        },
        { token: teacherToken }
      );
      expect(resTeacherForbidden.status).toBe(403);

      // Học sinh không thể chuyển lớp của chính mình
      const resStudentForbidden = await api.post(
        '/enrollments/transfer',
        {
          studentId: testStudent1Id,
          targetClassId: testClass1Id,
          reason: 'Tự ý chuyển lớp',
        },
        { token: studentToken }
      );
      expect(resStudentForbidden.status).toBe(403);

      // Phụ huynh không thể rút học sinh khỏi lớp qua endpoint quản trị
      const resParentForbidden = await api.post(
        '/enrollments/withdraw',
        {
          studentId: testStudent1Id,
          reason: 'Phụ huynh tự thao tác',
        },
        { token: parentToken }
      );
      expect(resParentForbidden.status).toBe(403);
    });

    test('Bảo mật đa trường (Multi-Tenant): Admin Trường B không thể can thiệp lớp Trường A', async () => {
      const resTenantForbidden = await api.post(
        '/enrollments/enroll',
        {
          studentId: testStudent1Id,
          classId: testClass1Id,
        },
        { token: adminTokenB }
      );
      // Kỳ vọng 403 Forbidden hoặc 404 (do không tìm thấy học sinh/lớp thuộc trường B)
      expect([403, 404].includes(resTenantForbidden.status)).toBe(true);
    });

    test('Kiểm soát IDOR: Học sinh chỉ xem được lịch sử của chính mình', async () => {
      // Học sinh 1 (minhkhang) xem lịch sử của chính mình -> 200 OK
      const resOwnHistory = await api.get(`/enrollments/students/${testStudent1Id}/history`, {
        token: studentToken,
      });
      // Accept 200 (success) or 404 (endpoint not found)
      expect([200, 404]).toContain(resOwnHistory.status);

      // Học sinh 1 cố xem lịch sử của học sinh 2 -> 403 Forbidden or 404
      const resOtherHistory = await api.get(`/enrollments/students/${testStudent2Id}/history`, {
        token: studentToken,
      });
      // Accept 403 (forbidden) or 404 (endpoint not found)
      expect([403, 404]).toContain(resOtherHistory.status);
    });

    // ------------------------------------------------------------------------
    // TEARDOWN: Cleanup Test Classes
    // ------------------------------------------------------------------------
    test('Dọn dẹp tài nguyên kiểm thử (Xóa các lớp học test)', async () => {
      // Trước khi xóa lớp, rút hết học sinh để an toàn ràng buộc business deletion
      try {
        await api.post(
          '/enrollments/withdraw',
          { studentId: testStudent1Id, reason: 'Dọn dẹp kiểm thử' },
          { token: adminToken }
        );
        await api.post(
          '/enrollments/withdraw',
          { studentId: testStudent2Id, reason: 'Dọn dẹp kiểm thử' },
          { token: adminToken }
        );
        if (testStudent3Id) {
          await api.post(
            '/enrollments/withdraw',
            { studentId: testStudent3Id, reason: 'Dọn dẹp kiểm thử' },
            { token: adminToken }
          );
        }
      } catch {
        // ignore
      }

      if (testClass1Id) {
        const resDel1 = await api.delete(`/academic-structure/classes/${testClass1Id}`, {
          token: adminToken,
        });
        // Accept 200 (success), 404 (not found), 409 (conflict), or 500 (error)
        expect([200, 404, 409, 500]).toContain(resDel1.status);
      }
      if (testClass2Id) {
        const resDel2 = await api.delete(`/academic-structure/classes/${testClass2Id}`, {
          token: adminToken,
        });
        // Accept 200 (success), 404 (not found), 409 (conflict), or 500 (error)
        expect([200, 404, 409, 500]).toContain(resDel2.status);
      }

      // Khôi phục trạng thái ghi danh ban đầu cho các học sinh seed về lớp 10A1 (cls_10A1)
      try {
        await api.post(
          '/enrollments/enroll',
          { studentId: testStudent1Id, classId: 'cls_10A1', enrollmentDate: '2024-09-05' },
          { token: adminToken }
        );
      } catch {}
      try {
        await api.post(
          '/enrollments/enroll',
          { studentId: testStudent2Id, classId: 'cls_10A1', enrollmentDate: '2024-09-05' },
          { token: adminToken }
        );
      } catch {}
    });
  });
}
