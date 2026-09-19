# EduPortal — Cổng Quản Lý & Học Tập Số Chuẩn Bắc Âu (Fullstack)

[![Repository](https://img.shields.io/badge/GitHub-vanhkhuc--k5%2Fproject--school-0F3D5C?logo=github)](https://github.com/vanhkhuc-k5/project-school)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Tailwind%20%7C%20Express%20%7C%20SQLite-1C6FA8)](https://github.com/vanhkhuc-k5/project-school)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

Hệ thống quản lý trường học và học tập thông minh đa phân hệ (Admin, Giáo viên, Học sinh, Phụ huynh) tích hợp Trợ lý Gia sư AI Socratic, ngân hàng dữ liệu thực tế SQLite WAL mode, và đồng bộ cơ sở dữ liệu ngành giáo dục.

---

## 🌟 Tính Năng Nổi Bật

1. **Phân quyền đa vai trò (Multi-Role Authentication & RBAC)**
   - **Học sinh (Student):** Dashboard KPI cá nhân hóa, bài tập hạn chót khẩn cấp, bảng điểm, thời khóa biểu và Gia sư AI Socratic 24/7.
   - **Giáo viên (Teacher):** Phân tích năng lực chuyên sâu (radar & ma trận), cảnh báo học sinh cần can thiệp sư phạm, tạo bài tập trắc nghiệm/tự luận đa định dạng.
   - **Phụ huynh (Parent):** Theo dõi nhiều con (multi-child switcher), thời khóa biểu, điểm kiểm tra, thông báo trường học và cổng thanh toán học phí VietQR Napas trực tuyến.
   - **Ban Giám Hiệu & Admin:** Thống kê vĩ mô toàn trường, phân bổ học lực, phát thông báo khẩn toàn trường và nút đồng bộ dữ liệu học bạ số quốc gia (MOET Cloud Sync).

2. **Cơ Sở Dữ Liệu Thực Tế (Real SQLite WAL Database)**
   - Schema chuẩn hóa 3NF: `users`, `classes`, `students`, `assignments`, `assignment_questions`, `assignment_submissions`, `grades`, `student_competencies`, `tuition_invoices`, `school_notices`, `audit_logs`, `ai_tutor_messages`.
   - Seeder dữ liệu thực tế chuẩn chương trình THCS & THPT Việt Nam (Toán 10, Vật lý, Anh văn 11, Hóa học...).
   - Hỗ trợ lưu trữ Audit Trail theo thời gian thực cho mọi thao tác.

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

## 🧪 Kiểm Thử Hệ Thống (End-to-End Suite)

Dự án cung cấp script kiểm thử tự động toàn diện:
```bash
node verify_fullstack.cjs
```
Script tự động kiểm tra:
1. Xác thực đăng nhập và cấp JWT cho cả 4 vai trò.
2. Lấy dữ liệu học sinh thực tế & kích hoạt hội thoại AI Tutor Socratic.
3. Giáo viên tạo bài tập mới ghi vào SQLite & gửi can thiệp sư phạm.
4. Phụ huynh thanh toán học phí qua cổng VietQR Napas và cập nhật biên lai.
5. Admin phát thông báo khẩn toàn trường & đồng bộ hồ sơ Bộ GD&ĐT.

---

## 📄 Báo Cáo Dự Án

Báo cáo dự án bản đầy đủ dành cho bên đặt hàng đã được kết xuất sẵn tại:
- [`BAO_CAO_DU_AN_EDUPORTAL.pdf`](./BAO_CAO_DU_AN_EDUPORTAL.pdf) (9 trang, phân tích chi tiết Ưu điểm / Nhược điểm / Đề xuất nâng cấp).
