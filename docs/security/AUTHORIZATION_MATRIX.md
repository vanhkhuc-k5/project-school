# Ma Trận Phân Quyền & Động Cơ Kiểm Soát Quyền Hạn (Authorization Matrix & Permission Engine)

> **Tài liệu chuẩn mực kỹ thuật (Normative Specification)** cho EduPortal RBAC (Role-Based Access Control) & Fine-grained Permission Engine.
> **Cập nhật lần cuối:** 2026-09-20 (Mục tiêu G09).

---

## 1. Tổng Quan Kiến Trúc Phân Quyền

EduPortal áp dụng mô hình phân quyền đa tầng (**Multi-Tier Authorization Model**):
1. **Lớp 1 — Authentication (`authenticate()`)**: Xác thực JWT access token, kiểm tra hiệu lực phiên, kiểm tra trạng thái khóa tài khoản (`is_active = true`), nạp danh sách vai trò (`roles`) và giải phóng toàn bộ quyền hạn tương ứng (`permissions`), gắn `req.user`, `req.schoolId`.
2. **Lớp 2 — Role Gate (`requireRole(...)`)**: Bộ lọc thô theo vai trò, tương thích ngược với hệ thống cũ và chuẩn hóa alias vai trò (`admin` $\leftrightarrow$ `school_admin`).
3. **Lớp 3 — Permission Engine (`requirePermission()`, `requireAnyPermission()`)**: Bộ lọc tinh vi dạng dot-notation (`domain.action`), đảm bảo từng tác vụ nghiệp vụ có yêu cầu quyền hạn tường minh.
4. **Lớp 4 — Resource Ownership & Tenant Scoping (`requireOwnership()`, `requireSchoolScope()`)**: Kiểm tra quyền sở hữu đối tượng và phạm vi trường học. Tuyệt đối **không** dựa duy nhất vào tên vai trò khi nghiệp vụ yêu cầu tính sở hữu (ví dụ: học sinh chỉ xem và nộp bài tập của chính mình, phụ huynh chỉ xem điểm và nộp đơn nghỉ học cho con của mình).

```
   HTTP Request
        │
        ▼
 ┌────────────────────────────────┐
 │ 1. authenticate()              │ ── 401 Unauthorized (Token invalid/expired)
 └────────────────────────────────┘
        │
        ▼
 ┌────────────────────────────────┐
 │ 2. requireSchoolScope()        │ ── 403 TENANT_FORBIDDEN (Cross-tenant access)
 └────────────────────────────────┘
        │
        ▼
 ┌────────────────────────────────┐
 │ 3. requirePermission(...)      │ ── 403 FORBIDDEN_PERMISSION (Missing permission)
 └────────────────────────────────┘
        │
        ▼
 ┌────────────────────────────────┐
 │ 4. requireOwnership(...)       │ ── 403 FORBIDDEN_OWNERSHIP (Not resource owner)
 └────────────────────────────────┘
        │
        ▼
   Business Logic Controller
```

---

## 2. Danh Mục Vai Trò (System Roles)

Hệ thống định nghĩa 8 vai trò chính thức, kèm cơ chế chuẩn hóa bí danh (alias normalization):

| Mã Vai Trò (`role_id`) | Tên Tiếng Việt | Mô Tả Phạm Vi Nghiệp Vụ |
|---|---|---|
| `super_admin` | Quản Trị Hệ Thống Toàn Cục | Quyền hạn tối cao trên mọi trường học; phục vụ vận hành hạ tầng multi-tenant SaaS. Vượt qua kiểm tra tenant scope & ownership. |
| `school_admin` *(alias `admin`)* | Quản Trị Viên Trường Học | Quản lý người dùng, phân công lớp học, cấu hình trường, tài chính, audit logs trong phạm vi trường học của mình. |
| `principal` | Hiệu Trưởng | Xem báo cáo toàn trường, duyệt bảng điểm, phê duyệt kế hoạch năm học, phát thông báo toàn trường. |
| `vice_principal` | Hiệu Phó | Phụ trách chuyên môn hoặc đào tạo, quản lý lớp học, duyệt giáo án, phát thông báo. |
| `department_head` | Trưởng Bộ Môn | Quản lý môn học, giáo viên tổ chuyên môn, duyệt đề thi, bài tập và kho học liệu bộ môn. |
| `teacher` | Giáo Viên | Quản lý lớp được phân công, tạo và chấm bài tập, vào điểm, điểm danh, gửi thông báo lớp. |
| `student` | Học Sinh | Làm và nộp bài tập của mình, tra cứu điểm số cá nhân, thời khóa biểu, điểm danh, chat gia sư AI. |
| `parent` | Phụ Huynh | Theo dõi kết quả học tập của con cái mình, đóng học phí trực tuyến, nộp đơn nghỉ học, nhắn tin với GVCN. |

> [!NOTE]
> **Quy tắc Tương Thích Ngược:** Mọi lệnh kiểm tra `requireRole('admin')` hoặc người dùng có token cũ mang `role: 'admin'` đều được tự động chuẩn hóa sang `school_admin`, đảm bảo 100% không làm gãy các luồng hiện tại.

---

## 3. Danh Mục Quyền Hạn Hạt Nhân (Granular Permissions Dictionary)

Các quyền hạn được đặt tên theo quy chuẩn **`{domain}.{action}`**:

| Mã Quyền Hạn (`id`) | Phân Nhóm | Mô Tả Nghiệp Vụ |
|---|---|---|
| `user.read` | Users | Đọc danh sách và chi tiết tài khoản người dùng trong trường |
| `user.create` | Users | Tạo tài khoản người dùng mới (học sinh, giáo viên, phụ huynh) |
| `user.update` | Users | Cập nhật thông tin tài khoản người dùng |
| `user.disable` | Users | Khóa hoặc vô hiệu hóa tài khoản người dùng |
| `student.read` | Students | Xem hồ sơ học sinh, danh sách học sinh |
| `student.update` | Students | Cập nhật hồ sơ học sinh |
| `teacher.read` | Teachers | Xem thông tin hồ sơ giáo viên |
| `teacher.manage` | Teachers | Phân công công tác, bổ nhiệm hoặc quản lý giáo viên |
| `class.read` | Classes | Xem thời khóa biểu, danh sách lớp học, môn học |
| `class.manage` | Classes | Tạo mới, sửa đổi, sắp xếp danh sách lớp học |
| `attendance.read` | Attendance | Xem nhật ký điểm danh chuyên cần |
| `attendance.take` | Attendance | Điểm danh học sinh theo tiết hoặc ngày |
| `attendance.correct`| Attendance | Sửa đổi hoặc đính chính kết quả điểm danh sau khi đã chốt |
| `assignment.read` | Assignments| Xem danh sách và chi tiết đề bài tập |
| `assignment.create`| Assignments| Tạo đề bài tập mới |
| `assignment.grade` | Assignments| Chấm điểm, nhận xét bài nộp của học sinh |
| `assignment.submit`| Assignments| Nộp bài tập cá nhân |
| `grade.read` | Grades | Tra cứu điểm số |
| `grade.create` | Grades | Nhập điểm mới |
| `grade.update` | Grades | Sửa điểm |
| `grade.publish` | Grades | Công bố bảng điểm chính thức tới học sinh/phụ huynh |
| `announcement.read`| Broadcast | Đọc thông báo, tin tức nhà trường |
| `announcement.publish`| Broadcast| Đăng tải thông báo toàn trường hoặc liên lớp |
| `tuition.read` | Tuition | Xem hóa đơn học phí, lịch sử giao dịch |
| `tuition.manage` | Tuition | Tạo đợt thu học phí, quản lý tài chính, đối soát giao dịch |
| `tuition.pay` | Tuition | Thanh toán hóa đơn học phí (VietQR Napas) |
| `audit.read` | Audit | Tra cứu nhật ký kiểm toán hệ thống (`audit_logs`) |
| `leave_request.read`| Operations | Xem danh sách đơn xin nghỉ học |
| `leave_request.create`| Operations| Nộp đơn xin phép nghỉ học |
| `leave_request.approve`| Operations| Duyệt hoặc từ chối đơn xin phép nghỉ học |
| `message.read` | Messaging | Xem lịch sử tin nhắn trao đổi phụ huynh - giáo viên |
| `message.send` | Messaging | Gửi tin nhắn trao đổi phụ huynh - giáo viên |
| `ai_tutor.read` | AI Tutor | Xem lịch sử trợ giảng Socratic AI |
| `ai_tutor.chat` | AI Tutor | Tương tác trò chuyện giải bài tập với gia sư AI |
| `study_resource.read`| Learning | Đọc và tải tài liệu học tập, học liệu điện tử |
| `study_resource.upload`| Learning| Đăng tải học liệu, đề cương |
| `school.manage` | Tenancy | Quản lý cấu hình trường học (thông tin, niên khóa, kỳ học) |

---

## 4. Ma Trận Phân Quyền Vai Trò $\times$ Quyền Hạn (Role $\times$ Permission Matrix)

Ký hiệu:
- **`✔`** : Được phân quyền trực tiếp.
- **`*`** : Chỉ áp dụng cho tài nguyên do chính mình sở hữu hoặc lớp mình phụ trách.
- **`-`** : Không có quyền (bị từ chối `403 Forbidden`).

| Quyền Hạn (`Permission`) | `super_admin` | `school_admin` | `principal` | `vice_principal` | `department_head` | `teacher` | `student` | `parent` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **`user.read`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* | - | - |
| **`user.create`** | ✔ | ✔ | - | - | - | - | - | - |
| **`user.update`** | ✔ | ✔ | - | - | - | - | - | - |
| **`user.disable`** | ✔ | ✔ | - | - | - | - | - | - |
| **`student.read`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* | ✔* |
| **`student.update`** | ✔ | ✔ | - | - | - | ✔* | - | - |
| **`teacher.read`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | - | - |
| **`teacher.manage`** | ✔ | ✔ | ✔ | ✔ | ✔* | - | - | - |
| **`class.read`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **`class.manage`** | ✔ | ✔ | ✔ | ✔ | - | - | - | - |
| **`attendance.read`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* | ✔* |
| **`attendance.take`** | ✔ | ✔ | - | - | - | ✔ | - | - |
| **`attendance.correct`**| ✔ | ✔ | ✔ | ✔ | - | ✔* | - | - |
| **`assignment.read`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | - |
| **`assignment.create`**| ✔ | ✔ | - | - | ✔ | ✔ | - | - |
| **`assignment.grade`** | ✔ | ✔ | - | - | ✔ | ✔ | - | - |
| **`assignment.submit`**| ✔ | - | - | - | - | - | ✔* | - |
| **`grade.read`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* | ✔* |
| **`grade.create`** | ✔ | ✔ | - | - | ✔ | ✔ | - | - |
| **`grade.update`** | ✔ | ✔ | - | - | ✔ | ✔ | - | - |
| **`grade.publish`** | ✔ | ✔ | ✔ | ✔ | ✔ | - | - | - |
| **`announcement.read`**| ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **`announcement.publish`**| ✔ | ✔ | ✔ | ✔ | - | ✔* | - | - |
| **`tuition.read`** | ✔ | ✔ | ✔ | ✔ | - | - | - | ✔* |
| **`tuition.manage`** | ✔ | ✔ | ✔ | - | - | - | - | - |
| **`tuition.pay`** | ✔ | - | - | - | - | - | - | ✔* |
| **`audit.read`** | ✔ | ✔ | ✔ | - | - | - | - | - |
| **`leave_request.read`**| ✔ | ✔ | ✔ | ✔ | - | ✔ | - | ✔* |
| **`leave_request.create`**| ✔ | - | - | - | - | - | - | ✔* |
| **`leave_request.approve`**| ✔ | ✔ | ✔ | ✔ | - | ✔ | - | - |
| **`message.read`** | ✔ | ✔ | - | - | - | ✔ | - | ✔* |
| **`message.send`** | ✔ | ✔ | - | - | - | ✔ | - | ✔* |
| **`ai_tutor.read`** | ✔ | ✔ | - | - | - | ✔ | ✔ | - |
| **`ai_tutor.chat`** | ✔ | ✔ | - | - | - | ✔ | ✔ | - |
| **`study_resource.read`**| ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | - |
| **`study_resource.upload`**| ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | - | - |
| **`school.manage`** | ✔ | ✔ | ✔ | - | - | - | - | - |

---

## 5. Quy Chuẩn Kiểm Tra Sở Hữu Tài Nguyên (Resource Ownership Rules)

> [!IMPORTANT]
> **Nguyên tắc cốt tử:** Không bao giờ dựa thuần túy vào tên vai trò khi nghiệp vụ yêu cầu tính sở hữu cá nhân. Nếu chỉ kiểm tra vai trò `parent`, phụ huynh A có thể xem điểm và nộp đơn nghỉ học của học sinh con phụ huynh B.

### 5.1. Phụ Huynh & Học Sinh (`parent_students`)
- **Quy tắc:** Phụ huynh chỉ được truy cập dữ liệu của học sinh có liên kết trực tiếp (`students.parent_id = parent_user_id`) hoặc có quan hệ bản ghi hợp lệ trong bảng `parent_students`.
- **Thực thi:**
  ```javascript
  const relCheck = await pgQuery(`
    SELECT ps.id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = $1 AND ps.student_id = $2
  `, [parentUserId, childId]);
  const isAuthorized = student.parent_id === parentUserId || relCheck.rows.length > 0;
  ```
- **Áp dụng tại:** `GET /parent/children/:id`, `POST /parent/leave-requests`, `POST /parent/tuition/:id/pay`.

### 5.2. Học Sinh & Bài Nộp (`assignment_submissions`)
- **Quy tắc:** Học sinh chỉ được tra cứu bài nộp (`GET /student/submissions/:id`) và nộp bài (`POST /student/assignments/:id/submit`) cho chính tài khoản học sinh của mình.
- **Thực thi:**
  ```javascript
  if (submission.student_id !== currentStudentId && !isManager) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN_OWNERSHIP', message: 'Bạn chỉ có quyền xem bài làm của chính mình' });
  }
  ```

### 5.3. Giáo Viên & Lớp Phụ Trách (`teacher_assignments`)
- **Quy tắc:** Giáo viên chỉ được vào điểm và điểm danh học sinh đối với các lớp/môn học mà mình được phân công giảng dạy hoặc làm chủ nhiệm.
- **Ngoại lệ Quản Trị:** `super_admin`, `school_admin`, `principal` có thể xem và can thiệp toàn trường.

---

## 6. Danh Sách Endpoint & Cơ Chế Kiểm Soát Quyền Hạn Thực Tế

| Tuyến Đường (Endpoint) | Phương Thức | Middleware Bảo Vệ | Quyền Hạt Nhân Yêu Cầu |
|---|:---:|---|---|
| `/api/auth/register` | `POST` | `authenticateToken`, `requirePermission` | `user.create` |
| `/api/admin/overview` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `audit.read` |
| `/api/admin/broadcast` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `announcement.publish` |
| `/api/admin/users` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `user.read` |
| `/api/admin/users` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `user.create` |
| `/api/admin/users/:id` | `PUT` | `authenticateToken`, `requireRole`, `requirePermission` | `user.update` |
| `/api/admin/users/:id` | `DELETE` | `authenticateToken`, `requireRole`, `requirePermission` | `user.disable` |
| `/api/admin/classes` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `class.read` |
| `/api/admin/classes` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `class.manage` |
| `/api/admin/classes/:id` | `PUT` | `authenticateToken`, `requireRole`, `requirePermission` | `class.manage` |
| `/api/admin/classes/:id` | `DELETE` | `authenticateToken`, `requireRole`, `requirePermission` | `class.manage` |
| `/api/admin/teachers` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `teacher.read` |
| `/api/admin/financials` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `tuition.manage` |
| `/api/admin/audit-logs` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `audit.read` |
| `/api/admin/subjects` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `class.read` |
| `/api/teacher/dashboard` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.read` |
| `/api/teacher/analytics` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `grade.read` |
| `/api/teacher/assignments` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.read` |
| `/api/teacher/assignments` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.create` |
| `/api/teacher/classes` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `class.read` |
| `/api/teacher/attendance` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `attendance.read` |
| `/api/teacher/attendance` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `attendance.take` |
| `/api/teacher/grades` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `grade.read` |
| `/api/teacher/submissions/:id/grade` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.grade` |
| `/api/teacher/reports` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `grade.read` |
| `/api/student/dashboard` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `student.read` |
| `/api/student/assignments` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.read` |
| `/api/student/assignments/:id` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.read` |
| `/api/student/submissions/:id` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.read` + ownership check |
| `/api/student/assignments/:id/submit`| `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `assignment.submit` + ownership check |
| `/api/student/grades` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `grade.read` |
| `/api/student/timetable` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `class.read` |
| `/api/student/attendance` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `attendance.read` |
| `/api/student/resources` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `study_resource.read` |
| `/api/parent/children` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `student.read` |
| `/api/parent/children/:id` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `student.read` + parent-child relationship check |
| `/api/parent/tuition` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `tuition.read` |
| `/api/parent/tuition/:id/pay` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `tuition.pay` |
| `/api/parent/leave-requests` | `GET`/`POST` | `authenticateToken`, `requireRole`, `requirePermission` | `leave_request.read` / `leave_request.create` + relationship check |
| `/api/parent/messages` | `GET`/`POST` | `authenticateToken`, `requireRole`, `requirePermission` | `message.read` / `message.send` |
| `/api/parent/invoices` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `tuition.read` |
| `/api/ai-tutor/messages` | `GET` | `authenticateToken`, `requireRole`, `requirePermission` | `ai_tutor.read` |
| `/api/ai-tutor/chat` | `POST` | `authenticateToken`, `requireRole`, `requirePermission` | `ai_tutor.chat` |
| `/api/sync/status` | `GET` | `authenticateToken`, `requirePermission` | `announcement.read` |
| `/api/sync/notifications` | `GET` | `authenticateToken`, `requirePermission` | `announcement.read` |
| `/api/sync/trigger` | `POST` | `authenticateToken`, `requirePermission` | `announcement.publish` |
