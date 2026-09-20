# EduPortal — Cổng Quản Lý & Học Tập Số Chuẩn Bắc Âu (Fullstack)

[![Repository](https://img.shields.io/badge/GitHub-vanhkhuc--k5%2Fproject--school-0F3D5C?logo=github)](https://github.com/vanhkhuc-k5/project-school)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Tailwind%20%7C%20Express%20%7C%20Neon%20PostgreSQL-1C6FA8)](https://github.com/vanhkhuc-k5/project-school)
[![Tests](https://img.shields.io/badge/Tests-57%2F57%20PASS%20(100%25)-success)](https://github.com/vanhkhuc-k5/project-school)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

Hệ thống quản lý trường học và học tập thông minh đa phân hệ (Admin, Giáo viên, Học sinh, Phụ huynh) tích hợp Trợ lý Gia sư AI Socratic, ngân hàng dữ liệu thực tế **Neon Cloud PostgreSQL** (19 bảng dữ liệu chuẩn hóa 3NF) cùng chế độ dự phòng SQLite WAL mode, và hệ thống kiểm thử tự động toàn diện.

---

## 🌟 Tính Năng Nổi Bật

1. **Phân quyền đa vai trò (Multi-Role Authentication & RBAC)**
   - **Học sinh (Student):** Dashboard KPI cá nhân hóa, thời khóa biểu điện tử tương tác (Weekly Grid / Day Focus), sổ theo dõi chuyên cần & điểm danh quẹt thẻ RFID, bài tập hạn chót khẩn cấp, bảng điểm và Gia sư AI Socratic 24/7.
   - **Giáo viên (Teacher):** Phân tích năng lực chuyên sâu (radar & ma trận), cảnh báo học sinh cần can thiệp sư phạm, tạo bài tập trắc nghiệm/tự luận đa định dạng, quản lý lớp học và xuất bảng điểm.
   - **Phụ huynh (Parent):** Theo dõi nhiều con (multi-child switcher), thời khóa biểu, điểm kiểm tra, nộp đơn xin nghỉ học trực tuyến, thông báo trường học và cổng thanh toán học phí VietQR Napas trực tuyến.
   - **Ban Giám Hiệu & Admin:** Thống kê vĩ mô toàn trường, phân bổ học lực, quản lý tài khoản người dùng, phát thông báo khẩn toàn trường và đồng bộ dữ liệu học bạ số quốc gia (MOET Cloud Sync).

2. **Cơ Sở Dữ Liệu Thực Tế (Neon Cloud PostgreSQL & SQLite Fallback)**
   - 19 bảng chuẩn hóa: `users`, `classes`, `students`, `teachers`, `subjects`, `assignments`, `assignment_questions`, `assignment_submissions`, `grades`, `student_competencies`, `tuition_invoices`, `school_notices`, `audit_logs`, `ai_tutor_messages`, `leave_requests`, `parent_teacher_messages`, `study_resources`...
   - Seeder dữ liệu thực tế chuẩn chương trình THCS & THPT Việt Nam (Toán 10, Vật lý, Anh văn 11, Hóa học...).
   - Lưu trữ nhật ký bảo mật (Security Audit Trail) theo thời gian thực cho mọi thao tác.

3. **Giao Diện Thiết Kế Chuẩn Scandinavian Banking App**
   - Tuân thủ thiết kế tối giản, thanh lịch từ dự án Stitch **TruongHoc-Portal** và `DESIGN.md`.
   - Màu sắc chủ đạo: Midnight Navy (`#0F3D5C`), Deep Ocean Blue (`#1C6FA8`), Pale Sky (`#EBF3F8`), Pure White (`#FFFFFF`).
   - Đường viền 1px hairline tinh tế, typography Be Vietnam Pro, hiển thị sắc nét trên mọi thiết bị.

---

## 📂 Cấu Trúc Dự Án

```
project_school/
├── server/
│   ├── db.js                 # SQLite WAL database connection & schema
│   ├── seed.js               # Seeder dữ liệu mẫu thực tế trường học VN
│   ├── index.js              # Express REST API server entrypoint (port 5000)
│   ├── middleware/
│   │   └── auth.js           # JWT Authentication & RBAC protection
│   └── routes/
│       ├── auth.js           # Đăng nhập & cấp phát JWT token
│       ├── student.js        # Dashboard học sinh & nộp bài tập
│       ├── teacher.js        # Phân tích học sinh, giao bài & can thiệp
│       ├── parent.js         # Dữ liệu con cái, thanh toán VietQR & xác nhận họp
│       ├── admin.js          # KPI toàn trường, phát thông báo & đồng bộ MOET
│       └── aiTutor.js        # Chat Socratic AI Tutor & lịch sử hội thoại
├── src/
│   ├── components/           # Button, Card, Badge, Modal, Input...
│   ├── context/              # AuthContext (đồng bộ JWT với API & localStorage)
│   ├── layouts/              # Teacher, Student, Parent, Admin Layouts
│   ├── pages/                # Màn hình chuyên biệt cho từng vai trò
│   ├── services/
│   │   └── api.js            # Client API Service Layer kết nối Backend
│   └── mock/                 # Mock fallback an toàn nếu backend offline
├── database.sqlite           # File SQLite Database lưu trữ cục bộ
└── package.json
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Khởi tạo & nạp dữ liệu cơ sở dữ liệu
```bash
npm run seed
```

### 3. Chạy toàn bộ hệ thống (Frontend + Backend đồng thời)
```bash
npm run dev:all
```
- **Frontend:** `http://localhost:3000` (Vite Hot Module Replacement)
- **Backend API:** `http://localhost:5000` (Express REST API)

Hoặc chạy từng dịch vụ riêng biệt:
```bash
# Terminal 1: Backend Server
npm run server

# Terminal 2: Frontend App
npm run dev
```

---

## 🔑 Tài Khoản Thử Nghiệm

| Vai trò | Mã định danh / Email | Mật khẩu |
|---|---|---|
| **Học sinh** | `HS-2024-889` | `123456` |
| **Giáo viên** | `mailan@school.edu.vn` | `123456` |
| **Phụ huynh** | `PH-10A1-042` | `123456` |
| **Ban Giám Hiệu** | `bgh.hoainam@school.edu.vn` | `123456` |

---

## 🧪 Hệ Thống Kiểm Thử Tự Động (Automated Testing Suite)

Dự án tích hợp sẵn bộ kiểm thử tự động toàn diện với **57 bài test (100% PASS)**:
```bash
npm test
```

Bộ kiểm thử bao gồm 9 test suites:
1. **Unit Test: Mật mã & Xác thực JWT** (Bcrypt hash/compare, Unicode/Tiếng Việt, token expiry).
2. **Unit Test: Kết nối & Toàn vẹn Dữ liệu Neon PostgreSQL** (Kiểm tra kết nối, 19 bảng, khóa ngoại).
3. **Integration Test: Xác thực & Phân quyền (/api/auth)** (Đăng nhập 4 vai trò, /auth/me, 401, 403).
4. **Integration Test: Phân hệ Học sinh (/api/student)** (Dashboard, bài tập, bảng điểm, thời khóa biểu, chuyên cần).
5. **Integration Test: Phân hệ Giáo viên (/api/teacher)** (Dashboard, roster, analytics, tạo đề trắc nghiệm).
6. **Integration Test: Phân hệ Phụ huynh (/api/parent)** (Danh sách con, học phí, nhắn tin, đơn nghỉ phép).
7. **Integration Test: Phân hệ Quản trị & BGH (/api/admin)** (Overview, CRUD users, classes, subjects, audit log).
8. **Integration Test: Trợ lý AI Gia sư Socratic (/api/ai-tutor)** (Chat Socratic, lịch sử tin nhắn, validation).
9. **End-to-End Test: Vòng đời học vụ liên vai trò** (Teacher giao bài -> Student làm & nộp bài -> Parent xem điểm).

---

## 📄 Báo Cáo Dự Án

Báo cáo dự án bản đầy đủ dành cho bên đặt hàng đã được kết xuất sẵn tại:
- [`BAO_CAO_DU_AN_EDUPORTAL.pdf`](./BAO_CAO_DU_AN_EDUPORTAL.pdf) (9 trang, phân tích chi tiết Kiến trúc hệ thống, Báo cáo kiểm thử và Lộ trình nâng cấp).
