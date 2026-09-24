# ADR-001: PostgreSQL Single Source of Truth, Deterministic SQL Migrations & Database Access Strategy

- **Trạng thái (Status):** Đã phê duyệt (Accepted)
- **Ngày quyết định (Date):** 2026-09-20
- **Người đề xuất (Author):** Principal Software Architect & Core Engineering Team
- **Phạm vi (Scope):** Toàn bộ hệ thống EduPortal (Backend, Data Access Layer, Deployment, Testing)

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context)

Trong giai đoạn nguyên mẫu ban đầu (Prototype), EduPortal cùng lúc duy trì ba cơ chế truy cập dữ liệu không nhất quán:
1. **SQLite cục bộ (`better-sqlite3`):** Chạy trên file `database.sqlite` với chế độ WAL. Đóng vai trò làm fallback tự động cho hầu hết các route.
2. **Neon Cloud PostgreSQL (`pg.Pool`):** Được cấu hình qua `DATABASE_URL`, nhưng trước đó chỉ có duy nhất `server/routes/auth.js` là thực sự truy vấn dữ liệu từ PostgreSQL.
3. **Supabase Client stub (`@supabase/supabase-js`):** Tồn tại rải rác trong code nhưng không có cấu hình thực tế trong production, gây ra các thông báo log giả lập gây nhầm lẫn.

### Rủi ro kiến trúc đã được nhận diện trong G00 (Baseline Audit):
- **Hiện tượng phân mảnh dữ liệu (Split-brain):** Người dùng có thể được tạo trên PostgreSQL nhưng một số nghiệp vụ khác (như bài tập, học bạ, học phí) lại ghi vào SQLite cục bộ.
- **Silent Fallback nguy hiểm:** Khi kết nối PostgreSQL gặp sự cố, hệ thống âm thầm fallback sang SQLite cục bộ mà không báo lỗi, làm mất tính toàn vẹn dữ liệu của môi trường production.
- **Thiếu cơ chế Migration phiên bản hóa:** Việc khởi tạo schema phụ thuộc vào chuỗi SQL trong `server/db.js:initSchema()` thay vì các file migration có thể kiểm toán, đảo ngược và triển khai tự động trong CI/CD.
- **Thiếu đảm bảo giao dịch (Transactions):** Các thao tác nhiều bảng (như tạo học sinh đồng thời tạo tài khoản, hoặc nộp bài và ghi nhận điểm số) không được bọc trong giao dịch ACID, tiềm ẩn nguy cơ dữ liệu mồ côi (orphaned rows).

---

## 2. Các Phương Án Được Đánh Giá (Options Evaluated)

### Phương án A: Prisma ORM
- **Ưu điểm:** Khả năng tự sinh type client, cộng đồng lớn.
- **Nhược điểm:** Yêu cầu tải binary engine viết bằng Rust, kích thước nặng, khởi động chậm (cold-start), thường gặp trục trặc khi chạy trong môi trường Windows hạn chế quyền tải binary, và can thiệp quá sâu vào cơ chế connection pooling của PostgreSQL.

### Phương án B: Drizzle ORM
- **Ưu điểm:** Nhẹ, sinh TypeScript types trực tiếp từ schema, hỗ trợ tốt PostgreSQL và Neon.
- **Nhược điểm:** Vẫn cần một lớp abstraction bổ sung và có thể tạo rào cản khi cần tinh chỉnh các câu lệnh SQL hiệu năng cao hoặc tính năng nâng cao của PostgreSQL.

### Phương án C: Deterministic Versioned SQL Migrations + Managed pg.Pool Connection (Lựa chọn được duyệt)
- **Ưu điểm:**
  - 100% minh bạch: Các thay đổi schema được thể hiện dưới dạng các file `.sql` thuần túy, có thể review trực tiếp bằng mắt và kiểm soát hoàn toàn bằng Git.
  - Không phụ thuộc bên thứ ba (Zero ORM lock-in): Trực tiếp sử dụng driver chuẩn `pg` đã được tối ưu cho Neon Cloud.
  - Bảng kiểm soát `schema_migrations` lưu trữ mã băm SHA-256 ngăn chặn việc sửa đổi ngầm các migration đã áp dụng.
  - Khả năng kiểm soát giao dịch nguyên khối tuyệt đối (`BEGIN ... COMMIT ... ROLLBACK`).
  - Dễ dàng tích hợp với các công cụ CI/CD chuẩn công nghiệp.

---

## 3. Quyết Định Kiến Trúc (Architectural Decision)

### 3.1. PostgreSQL Là Nguồn Chân Lý Duy Nhất (Single Source of Truth)
- Toàn bộ dữ liệu của môi trường Production **bắt buộc** phải đọc và ghi trên PostgreSQL (Neon Cloud).
- Triệt tiêu hoàn toàn cơ chế "silent fallback". Nếu kết nối tới PostgreSQL thất bại trong môi trường production, ứng dụng **phải dừng ngay lập tức khi khởi động (fail-fast)** hoặc trả mã lỗi HTTP 503 thay vì âm thầm chuyển sang SQLite.
- Cơ sở dữ liệu SQLite chỉ được phép sử dụng khi chạy kiểm thử độc lập ngoại tuyến (offline tests) với cờ môi trường được chỉ định tường minh (`ALLOW_SQLITE_DEV=true` hoặc `DB_CLIENT=sqlite`).

### 3.2. Cơ Chế Migration Xác Thực (Deterministic Migrations)
- Mọi thay đổi schema đều phải được định nghĩa bằng các file SQL đánh số tăng dần trong thư mục `server/shared/database/migrations/`:
  - `0001_baseline_schema.sql`: Khởi tạo 19 bảng hiện hữu với cú pháp `CREATE TABLE IF NOT EXISTS`.
  - `0002_schema_migrations_and_indexes.sql`: Bổ sung indexes và hoàn thiện ràng buộc khóa ngoại.
- Bảng `schema_migrations` được tạo tự động để ghi nhận:
  - `id`: Định danh khóa chính tự tăng.
  - `version`: Số phiên bản (ví dụ `0001`, `0002`).
  - `name`: Tên file migration.
  - `checksum`: Mã băm SHA-256 của nội dung file SQL tại thời điểm thực thi.
  - `applied_at`: Dấu thời gian áp dụng.
- Nếu checksum của một migration đã áp dụng bị thay đổi sau đó, công cụ migration sẽ từ chối chạy và đưa ra cảnh báo can thiệp trái phép (tamper warning).

### 3.3. Hỗ Trợ Giao Dịch ACID (ACID Transactions)
- Cung cấp hàm bọc giao dịch chuẩn:
  ```javascript
  await withTransaction(async (client) => {
    // Các câu lệnh SQL thực thi trong cùng 1 transaction
  });
  ```
- Tự động thực thi `BEGIN` trước khi gọi callback, `COMMIT` khi thành công, và `ROLLBACK` khi xảy ra bất kỳ lỗi nào, sau đó giải phóng client về connection pool.

### 3.4. Chiến Lược Kiểm Thử (Test Database Strategy)
- Kiểm thử tích hợp tự động mặc định chạy trên nhánh PostgreSQL của Neon Cloud.
- Tính năng Neon Branching cho phép tạo các nhánh database cô lập (ephemeral branches) cho từng môi trường CI/CD mà không ảnh hưởng tới dữ liệu chính.
- Trong trường hợp nhà phát triển làm việc ngoại tuyến không có Internet, kiểm thử có thể chạy qua SQLite bộ nhớ tạm thời khi bật `ALLOW_SQLITE_DEV=true`.

---

## 4. Hệ Quả & Tác Động (Consequences)

### Tích cực:
1. **Toàn vẹn dữ liệu tuyệt đối:** Loại bỏ hoàn toàn nguy cơ mất đồng bộ giữa các môi trường lưu trữ.
2. **Khả năng kiểm toán (Auditability):** Mọi thay đổi cấu trúc bảng đều có lịch sử rõ ràng trong Git và trong bảng `schema_migrations`.
3. **An toàn giao dịch:** Các thao tác quan trọng (thanh toán học phí, nộp bài, điểm danh) được đảm bảo tính nguyên tử (Atomicity).
4. **Không làm gián đoạn dữ liệu hiện hữu:** Quá trình baselining bảo tồn 100% dữ liệu của 19 bảng đang chạy trên Neon Cloud.

### Tiêu cực & Biện pháp khắc phục:
- **Yêu cầu kết nối mạng khi phát triển cục bộ:** Nhà phát triển cần có kết nối mạng tới Neon Cloud.  
  *Khắc phục:* Duy trì cờ `ALLOW_SQLITE_DEV=true` cho các kịch bản offline biệt lập có cảnh báo rõ ràng.
