# Hướng Dẫn Kiến Trúc Module Chuẩn (Domain Module Architecture Guide)

Tài liệu này quy định quy chuẩn kiến trúc cho toàn bộ các module nghiệp vụ trong EduPortal. Bất kỳ module nghiệp vụ mới nào (`users`, `schools`, `students`, `teachers`, `attendance`, `assignments`, `grades`, `schedules`, v.v.) đều bắt buộc tuân theo kiến trúc 5 tầng mẫu đã được triển khai hoàn chỉnh tại module tham chiếu [`server/modules/auth`](./auth).

---

## 1. Cấu Trúc Thư Mục Một Module

Mỗi domain nằm trong thư mục con riêng tại `server/modules/<domain_name>/`:
```
server/modules/<domain_name>/
├── <domain_name>.schema.js      # Zod validation schemas cho request body/query/params
├── <domain_name>.repository.js  # Tầng lưu trữ & truy vấn SQL (Data Access Layer)
├── <domain_name>.service.js     # Tầng nghiệp vụ & logic xử lý (Business Logic Layer)
├── <domain_name>.controller.js  # Tầng xử lý HTTP request/response (Presentation Layer)
├── <domain_name>.routes.js      # Tầng định tuyến & liên kết middleware (Routing Layer)
└── index.js                     # Barrel export module
```

---

## 2. Trách Nhiệm Từng Tầng (Separation of Concerns)

| Tầng | Tên File | Được Phép Làm | Tuyệt Đối Cấm |
|---|---|---|---|
| **Schema** | `*.schema.js` | Khai báo Zod object, validate kiểu dữ liệu, thông điệp lỗi tiếng Việt thân thiện | Truy vấn database, gọi service |
| **Repository** | `*.repository.js` | Viết truy vấn SQL (Postgres qua `pgQuery` / SQLite qua `db`), map dữ liệu hàng bảng | Nhận đối tượng HTTP `req`/`res`, xử lý logic nghiệp vụ |
| **Service** | `*.service.js` | Kiểm tra điều kiện nghiệp vụ, mã hóa, tính toán, ném operational errors (`AppError`) | Nhận đối tượng HTTP `req`/`res`, viết câu lệnh SQL trực tiếp |
| **Controller** | `*.controller.js` | Đọc `req.body`, `req.params`, `req.user`, gọi service tương ứng, trả `res.status(..).json(..)`, đẩy lỗi qua `next(err)` | Viết logic nghiệp vụ, gọi trực tiếp database/SQL, tự format lỗi 500 |
| **Routes** | `*.routes.js` | Tạo `express.Router()`, gắn `validateRequest(...)`, `authenticateToken`, `requireRole(...)`, chuyển tới controller | Viết handler inline, xử lý database |

---

## 3. Quy Chuẩn Xử Lý Lỗi (Error Handling)

Tất cả các tầng đều ném các lớp con của `AppError` từ `server/shared/errors/index.js`:
- `BadRequestError(message, details)` (400)
- `UnauthorizedError(message)` (401)
- `ForbiddenError(message)` (403)
- `NotFoundError(message)` (404)
- `ConflictError(message)` (409)
- `ValidationError(message, details)` (400)

Middleware tập trung `errorHandler` tại `server/shared/errors/errorHandler.js` sẽ tự động bắt và trả về định dạng response chuẩn:
```json
{
  "success": false,
  "status": 401,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Mật khẩu không chính xác"
  },
  "message": "Mật khẩu không chính xác"
}
```

---

## 4. Checklist Di Chuyển Module Mới (Migration Checklist)

Khi di chuyển hoặc tạo một domain mới (ví dụ `students`):
1. [ ] **Schema (`students.schema.js`)**: Tạo Zod schema cho các endpoint mutation (`createStudentSchema`, `updateStudentSchema`, query filters).
2. [ ] **Repository (`students.repository.js`)**: Di chuyển toàn bộ câu lệnh `SELECT`, `INSERT`, `UPDATE`, `DELETE` từ file route cũ vào Repository.
3. [ ] **Service (`students.service.js`)**: Di chuyển các đoạn tính toán điểm trung bình, xếp hạng, kiểm tra trùng lặp vào Service.
4. [ ] **Controller (`students.controller.js`)**: Viết các phương thức controller gọn gàng, bọc `try...catch(err) { next(err); }`.
5. [ ] **Routes (`students.routes.js`)**: Gắn schema và controller vào Router.
6. [ ] **Mount vào App (`server/app/routes.js`)**: Khai báo route mới vào bảng định tuyến trung tâm.
7. [ ] **Chạy kiểm thử**: Đảm bảo `npm run typecheck`, `npm run lint`, `npm test` đều PASS 100%.
