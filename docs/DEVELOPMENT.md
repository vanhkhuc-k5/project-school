# EDUPORTAL — CẨM NANG PHÁT TRIỂN & TIÊU CHUẨN KỸ THUẬT (DEVELOPER HANDBOOK)
**Mã tài liệu:** `docs/DEVELOPMENT.md`  
**Phiên bản:** 2.0.0 — Engineering Standards & Guidelines  
**Trạng thái:** Bắt buộc tuân thủ cho toàn bộ kỹ sư tham gia dự án  

---

## 1. MÔI TRƯỜNG PHÁT TRIỂN & KHỞI CHẠY CỤC BỘ

### 1.1. Yêu cầu Tiên quyết (Prerequisites)
- **Node.js:** Phiên bản `>= 20.0.0` (Khuyến nghị dùng bản LTS mới nhất).
- **Trình quản lý gói:** `npm` `>= 10.0.0`.
- **Hệ điều hành:** Windows 10/11, macOS, hoặc Linux.
- **Git:** Để quản lý mã nguồn.

### 1.2. Các bước Khởi chạy Cục bộ (Step-by-Step Setup)
1. **Clone mã nguồn và cài đặt dependencies:**
   ```bash
   git clone https://github.com/vanhkhuc-k5/project-school.git
   cd project-school
   npm install
   ```

2. **Cấu hình biến môi trường (`.env`):**
   Sao chép file mẫu và điền thông số kết nối cục bộ của bạn:
   ```bash
   cp .env.example .env
   ```
   > [!CAUTION]
   > Tuyệt đối không commit file `.env` chứa mật khẩu hoặc chuỗi kết nối thật lên Git. File `.env.example` chỉ được chứa giá trị placeholder mẫu.

3. **Khởi tạo và nạp dữ liệu mẫu vào CSDL:**
   ```bash
   npm run seed
   ```
   *Lệnh này khởi tạo schema và nạp dữ liệu tài khoản mẫu của các khối lớp THCS & THPT Việt Nam.*

4. **Chạy ứng dụng trong môi trường phát triển (Đồng thời cả Frontend và Backend):**
   ```bash
   npm run dev:all
   ```
   - **Giao diện Web (Frontend):** `http://localhost:3000` (Vite Hot Module Replacement).
   - **Máy chủ REST API (Backend):** `http://localhost:5000` (Express REST API).

   *Hoặc có thể chạy riêng lẻ tại 2 cửa sổ terminal:*
   ```bash
   # Terminal 1: Chạy Backend
   npm run server
   
   # Terminal 2: Chạy Frontend
   npm run dev
   ```

5. **Chạy kiểm thử tự động xác thực hệ thống:**
   ```bash
   npm test
   ```

---

## 2. QUẢN LÝ BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

Bảng định nghĩa các biến môi trường chuẩn trong `.env.example`:

| Biến môi trường | Bắt buộc? | Mục đích sử dụng | Giá trị mẫu an toàn (Placeholder) |
|---|---|---|---|
| `PORT` | Không | Cổng dịch vụ Backend Express | `5000` |
| `NODE_ENV` | Có | Chế độ chạy ứng dụng | `development` / `production` / `test` |
| `JWT_SECRET` | Có | Khóa bí mật dùng để ký và giải mã JWT | `your-secure-random-jwt-secret-min-32-chars` |
| `DATABASE_URL` | Tùy chọn | Chuỗi kết nối Neon Cloud PostgreSQL | `postgresql://user:password@ep-sample-pooler.region.neon.tech/neondb?sslmode=require` |
| `DB_PATH` | Không | Đường dẫn file SQLite dự phòng khi chạy offline | `./database.sqlite` |
| `BCRYPT_ROUNDS` | Không | Độ phức tạp băm mật khẩu Bcrypt | `10` (Dev/Test) / `12` (Prod) |

---

## 3. QUY CHUẨN LẬP TRÌNH (CODING CONVENTIONS)

### 3.1. Quy chuẩn Frontend (React & CSS)
- **Tên Component & File:** Đặt theo chuẩn `PascalCase` (ví dụ: `StudentGradesCard.tsx`, `CreateAssignmentModal.tsx`).
- **Trách nhiệm đơn nhất:** Mỗi component chỉ làm một việc rõ ràng. Component tối đa không quá 300 dòng mã; nếu vượt quá, phải tách thành các sub-components.
- **Không hardcode mã màu:** Tuyệt đối không dùng mã hex `#1C6FA8` rải rác trong JSX. Phải sử dụng token CSS đã cấu hình trong `tailwind.config.js` (ví dụ: `bg-primary`, `text-ocean`, `bg-sky-light`, `border-hairline`).
- **Tuân thủ DESIGN.md:** Thiết kế giao diện theo phong cách **Scandinavian Banking App**:
  - Viền mỏng 1px hairline (`border-hairline`).
  - Nền phụ Pale Sky (`#EBF3F8`), điểm nhấn Midnight Navy (`#0F3D5C`) và Deep Ocean Blue (`#1C6FA8`).
  - Bo góc vừa phải (`rounded-lg` hoặc `rounded-xl`).
  - Typography: Font `Be Vietnam Pro` hoặc font hệ thống thanh lịch.
- **Không nhúng Business Logic vào JSX:** Xử lý tính toán điểm trung bình, xếp loại, gọi API phải đưa vào custom hook hoặc helper function.

### 3.2. Quy chuẩn Backend (Express & Node.js)
- **Cấu trúc phân lớp nghiêm ngặt:**
  - `Controller`: Nhận `req`, gọi schema validation, gọi `Service`, trả `res.json(...)`.
  - `Service`: Chứa toàn bộ nghiệp vụ. Không truy vấn DB trực tiếp.
  - `Repository`: Chứa câu lệnh truy vấn SQL. Luôn ràng buộc `school_id`.
- **Xử lý bất đồng bộ:** Luôn dùng `async / await` kèm `try ... catch` chuẩn hóa hoặc wrap qua async error handler. Không dùng callback lồng nhau.
- **Không hardcode danh tính:** Tuyệt đối không viết cứng ID người dùng (`usr_student_1`), ID học sinh (`std_khang`), ID lớp (`cls_10A1`) trong code backend.
- **Bảo mật Unicode & Tiếng Việt:** Đảm bảo toàn bộ câu truy vấn, xử lý chuỗi và băm mật khẩu bảo toàn đúng ký tự có dấu của Tiếng Việt UTF-8.

---

## 4. RANH GIỚI MODULE & NGUYÊN TẮC BẤT KHẢ XÂM PHẠM

1. **Không truy cập DB từ Route Handler:** Tuyệt đối cấm import đối tượng DB (`db` hay `pool`) vào các file khai báo router.
2. **Không phụ thuộc Mock Data trong Production:** Thư mục `src/mock/` chỉ phục vụ mục đích kiểm thử visual độc lập. Khi build production, không được import mock data làm state khởi tạo trong React.
3. **Mọi thay đổi Dữ liệu đều phải có Audit Trail:** Mọi thao tác tạo mới, cập nhật, xóa bản ghi người dùng, điểm số, lịch học, học phí bắt buộc ghi vết vào bảng `audit_logs`.
4. **Tenant Scoping là Bắt buộc:** Mọi truy vấn dữ liệu trường học đều phải kiểm tra và gán `school_id`. Không để một trường đọc được dữ liệu của trường khác.

---

## 5. ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DoD)

Một tính năng hoặc mục tiêu (Goal) chỉ được coi là **HOÀN THÀNH (DONE)** khi và chỉ khi:

- [ ] **Kết nối End-to-End:** Dữ liệu hiển thị trên giao diện được lấy thực tế từ Backend và Database (không phụ thuộc dữ liệu mock).
- [ ] **Không có ID giả định cứng:** Không có hardcoded ID nào còn sót lại trong luồng nghiệp vụ.
- [ ] **Bảo vệ Phân quyền Server-side:** Endpoint được bảo vệ bằng middleware kiểm tra token và quyền thực tế; không chỉ dựa vào việc ẩn nút trên giao diện.
- [ ] **Kiểm tra Dữ liệu Đầu vào (Validation):** Mọi request body và tham số URL đều được validate qua Schema rõ ràng.
- [ ] **Xử lý Đủ 5 Trạng thái UX:** Có đủ giao diện cho Loading, Empty, Error, Success và Form Validation.
- [ ] **Kiểm thử Tự động Vượt qua:** Toàn bộ bộ test hiện tại và các test mới viết đều **PASS 100%**.
- [ ] **Build Thành công:** Lệnh `npm run build` chạy thành công không có lỗi typecheck hay bundler syntax.
- [ ] **Không lộ Bí mật:** Không có secret, password, connection string nào bị đưa vào mã nguồn hay commit Git.
- [ ] **Tài liệu Được Cập nhật:** Các file tài liệu liên quan (`ARCHITECTURE.md`, `ROADMAP.md`, `CURRENT_STATE.md`) được cập nhật tương ứng với các thay đổi vừa tạo.

---

## 6. CHÍNH SÁCH MIGRATION CƠ SỞ DỮ LIỆU (DATABASE MIGRATION POLICY)

1. **Không DDL trong Application Code:** Tuyệt đối không gọi `CREATE TABLE`, `ALTER TABLE` bên trong các route handler hay service (loại bỏ thói quen `db.exec` trong `parent.js`).
2. **File Migration Có Thứ tự & Phiên bản:** Toàn bộ thay đổi schema phải được viết trong các file SQL đặt tại thư mục `migrations/`, đặt tên theo quy tắc:
   ```
   migrations/
   ├── 001_initial_schema.sql
   ├── 002_add_multitenant_school_id.sql
   └── 003_rbac_permissions_schema.sql
   ```
3. **Khả năng Đảo ngược (Reversible Migrations):** Mỗi migration phải có phần rollback (Down migration) tương ứng.
4. **An toàn Dữ liệu:** Không chạy migration xóa cột (`DROP COLUMN`) hoặc xóa bảng (`DROP TABLE`) nếu chưa có script backup dữ liệu trước đó.

---

## 7. YÊU CẦU KIỂM THỬ (TESTING REQUIREMENTS)

### 7.1. Cấu trúc Bộ Test
- **Unit Tests:** Kiểm tra các hàm nghiệp vụ thuần túy (tính GPA, xếp loại học sinh, format thời gian, hàm băm mật khẩu).
- **Integration Tests:** Kiểm tra từng API endpoint (gửi HTTP request, kiểm tra status code, cấu trúc response envelope, dữ liệu lưu trong DB).
- **Negative Security Tests:** Bắt buộc viết test cho các trường hợp cố tình vi phạm bảo mật:
  - Gọi API không có header `Authorization` $\rightarrow$ Phải nhận `401`.
  - Học sinh gọi API chấm điểm của giáo viên $\rightarrow$ Phải nhận `403`.
  - Phụ huynh A yêu cầu xem điểm con của phụ huynh B $\rightarrow$ Phải nhận `403` hoặc `404`.
  - Đăng nhập với mật khẩu sai $\rightarrow$ Phải nhận `401`.
- **End-to-End Tests:** Kiểm tra luồng liên kết nhiều vai trò (Giáo viên giao bài $\rightarrow$ Học sinh nộp bài $\rightarrow$ Giáo viên chấm $\rightarrow$ Phụ huynh nhận điểm).

### 7.2. Lệnh Thực thi Kiểm thử
```bash
# Chạy toàn bộ bộ kiểm thử tự động
npm test
```
*Trước khi tạo Pull Request hoặc hoàn tất một mục tiêu, kết quả kiểm thử bắt buộc phải đạt 100% PASS.*
