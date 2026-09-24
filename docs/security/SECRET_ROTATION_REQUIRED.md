# THÔNG BÁO YÊU CẦU XOAY VÒNG KHÓA BẢO MẬT (SECRET ROTATION REQUIRED)
**Mã tài liệu:** `docs/security/SECRET_ROTATION_REQUIRED.md`  
**Mức độ ưu tiên:** CRITICAL  
**Ngày phát hiện:** 20/09/2026  
**Trạng thái:** Chờ Quản trị viên thực hiện (Pending Action by Administrator)  

---

## 1. TỔNG QUAN SỰ CỐ & LÝ DO CẦN XOAY VÒNG KHÓA

Trong quá trình kiểm định mã nguồn (Goal G00 & G02), hệ thống phát hiện file `.env.example` ở các commit trước đây đã vô tình chứa chuỗi kết nối trực tiếp (connection string) đến cơ sở dữ liệu **Neon Cloud PostgreSQL** thực tế.

Mặc dù file `.env.example` hiện tại đã được khử khuẩn (sanitized) bằng chuỗi placeholder an toàn:
```bash
DATABASE_URL=postgresql://username:password@ep-sample-pooler.region.neon.tech/neondb?sslmode=require
```
Tuy nhiên, theo quy chuẩn bảo mật công nghiệp (CWE-538, OWASP Secrets Management): **Bất kỳ thông tin xác thực nào đã từng xuất hiện trong lịch sử Git đều phải được coi là đã bị lộ và bắt buộc phải được xoay vòng (rotated) ngay lập tức trên máy chủ đích.**

> [!CAUTION]
> **Quy tắc an toàn:** Hệ thống tự động Antigravity **KHÔNG ĐƯỢC PHÉP** tự ý kết nối và xoay vòng mật khẩu từ xa trên Neon Cloud Console của bạn. Quản trị viên hệ thống phải chủ động thực hiện các bước bên dưới.

---

## 2. DANH MỤC THÔNG TIN CẦN XOAY VÒNG (ROTATION CHECKLIST)

| Dịch vụ / Khóa bí mật | Vị trí từng bị ảnh hưởng | Trạng thái | Mức độ khẩn cấp |
|---|---|---|---|
| **Mật khẩu Role `neondb_owner` trên Neon Cloud** | Lịch sử Git `.env.example` | **Cần đổi mật khẩu mới trên Neon Console** | **CRITICAL** |
| **JWT Secret (`JWT_SECRET`)** | Khai báo trong `.env` | **Cần sinh khóa ngẫu nhiên 256-bit mới** | **HIGH** |
| **Mật khẩu Quản trị viên Mặc định** | Codebase seed demo mode | **Đã loại bỏ backdoor `admin@2026`** | **HOÀN THÀNH** |

---

## 3. HƯỚNG DẪN TỪNG BƯỚC THỰC HIỆN XOAY VÒNG KHÓA

### Bước 1: Xoay vòng Mật khẩu Cơ sở Dữ liệu Neon PostgreSQL
1. Đăng nhập vào bảng điều khiển Neon: [https://console.neon.tech](https://console.neon.tech).
2. Chọn Project của EduPortal (ví dụ endpoint có tiền tố `ep-jolly-river-...`).
3. Truy cập mục **Roles / Databases** ở menu bên trái.
4. Tại role `neondb_owner` (hoặc role chính của ứng dụng), nhấp vào menu hành động (biểu tượng 3 chấm) $\rightarrow$ chọn **Reset password**.
5. Sao chép chuỗi kết nối mới được cấp.
6. Mở file `.env` cục bộ trên máy của bạn (file này đã được `.gitignore` bảo vệ) và cập nhật:
   ```env
   DATABASE_URL=postgresql://neondb_owner:<MAT_KHAU_MOI>@<HOST_NEON_POOLER>/neondb?sslmode=require
   ```

### Bước 2: Sinh Khóa Bí Mật JWT Mới (JWT Secret)
Khóa bí mật JWT dùng để ký và xác thực phiên đăng nhập của người dùng. Trong môi trường production, khóa này bắt buộc phải có độ dài tối thiểu 32 ký tự ngẫu nhiên.

Chạy lệnh sau trên terminal (Linux/macOS/Git Bash hoặc PowerShell) để sinh chuỗi ngẫu nhiên 64 ký tự an toàn:
```bash
# Sử dụng OpenSSL
openssl rand -hex 32

# Hoặc sử dụng Node.js Crypto
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cập nhật vào file `.env` trên môi trường triển khai:
```env
JWT_SECRET=<CHUOI_HEX_VUA_SINH>
```

### Bước 3: Xác thực Kết nối Sau Khi Đổi Khóa
Sau khi cập nhật file `.env`, kiểm tra lại trạng thái kết nối bằng lệnh:
```bash
npm test
```
Bộ kiểm thử sẽ tự động chạy suite `Unit Test: Kết nối & Toàn vẹn Dữ liệu Neon PostgreSQL`. Khi cả 6 test cases đều **PASS**, chứng tỏ thông tin xác thực mới đã hoạt động hoàn hảo.

---

## 4. CHÍNH SÁCH QUẢN LÝ BÍ MẬT DÀI HẠN (SECRETS POLICY)

1. **Tuyệt đối không commit file `.env`:** Chỉ commit file `.env.example` chứa các giá trị placeholder mang tính mô tả.
2. **Không in secret ra log:** Hệ thống không bao giờ ghi giá trị chuỗi kết nối hay token JWT ra terminal hoặc log files.
3. **Fail Early trong Production:** Module `server/config/env.js` đã được thiết lập để tự động dừng tiến trình khởi động nếu `JWT_SECRET` bị thiếu hoặc ngắn hơn 32 ký tự khi chạy ở chế độ `NODE_ENV=production`.
4. **Định kỳ xoay vòng khóa:** Khuyến nghị thực hiện xoay vòng khóa JWT định kỳ 90 ngày một lần và xoay vòng mật khẩu database định kỳ 180 ngày một lần.
