# AGENTS.md — Portal Quản Lý Trường Học (EduPortal)

## 1. Tổng quan dự án

Đây là repo cho **EduPortal — Cổng thông tin & Học tập số quản lý trường học** (subdomain riêng, ví dụ `portal.truonghoc.edu.vn`) — KHÔNG phải trang chủ công khai của trường. Portal gồm hệ thống đăng nhập phân quyền và dashboard riêng cho từng vai trò: Admin, Hiệu trưởng, Hiệu phó, Trưởng bộ môn, Giáo viên, Học sinh, Phụ huynh.

**Trạng thái hiện tại:**  
Hệ thống đã hoàn thiện giai đoạn **Fullstack Prototype** (gồm 16 màn hình React, Express REST API backend, CSDL quan hệ 18 bảng chạy SQLite WAL mode & Neon Cloud PostgreSQL adapter, và 57 bài test tự động 100% PASS). Dự án đang bước vào giai đoạn tái cấu trúc và hoàn thiện để đạt chuẩn **Production-grade Modular Monolith**.

Mọi quyết định kiến trúc và lộ trình triển khai chi tiết được quy định tại:
- [`docs/audit/CURRENT_STATE.md`](./docs/audit/CURRENT_STATE.md) — Báo cáo kiểm định hiện trạng thực tế.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Kiến trúc hệ thống mục tiêu.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — Lộ trình nâng cấp qua từng giai đoạn.
- [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) — Quy chuẩn lập trình và Definition of Done.

---

## 2. Tech Stack

- **Frontend:** React 18 + Tailwind CSS (tiến hóa lên TypeScript).
- **Backend:** Express 5 + Node.js ESM (tiến hóa lên TypeScript, phân tầng Controller $\rightarrow$ Service $\rightarrow$ Repository).
- **Cơ sở dữ liệu:** PostgreSQL (Neon Cloud) là Single Source of Truth; SQLite WAL chỉ đóng vai trò dự phòng dev/test offline.
- **Quy chuẩn Giao diện:** Tuân thủ tuyệt đối theo file [`DESIGN.md`](./DESIGN.md) ở gốc thư mục — không tự ý đổi màu, font, hoặc style khác với DESIGN.md.
- **Icon:** Bộ Lucide React outline nhất quán (không trộn nhiều style icon khác nhau trong cùng dự án).

---

## 3. Cấu trúc Thư mục

```
src/
  components/       -> component dùng chung (Button, Card, Input, Badge, Modal...)
  layouts/          -> layout riêng theo vai trò (TeacherLayout, StudentLayout, ParentLayout, AdminLayout...)
  pages/
    auth/           -> đăng nhập, quên mật khẩu
    teacher/        -> dashboard, lớp học, bài tập, phân tích năng lực, báo cáo, tạo bài tập
    student/        -> dashboard, bài tập, gia sư AI, điểm số, thời khóa biểu, điểm danh, tài liệu
    parent/         -> dashboard, con cái, bảng điểm, học phí VietQR, đơn nghỉ phép, tin nhắn
    admin/          -> dashboard toàn trường, quản lý tài khoản, lớp học, tài chính, audit logs
  mock/             -> dữ liệu giả lập chỉ dùng cho kiểm thử visual độc lập
  services/         -> typed client API service layer kết nối Backend /api/v1
server/
  index.js          # Express app entrypoint
  db.js             # SQLite runtime connection
  postgres.js       # Neon Cloud PostgreSQL connection pool
  middleware/       # JWT auth, RBAC, tenant scoping, Zod validation
  routes/           # API endpoints (đang được chuyển đổi sang Controller-Service-Repository)
  seed.js           # Seeder dữ liệu thực tế
tests/              # Bộ kiểm thử tự động 57 bài test (Unit, Integration, E2E)
docs/               # Tài liệu kiến trúc, kiểm định và hướng dẫn phát triển
```

---

## 4. Phân quyền & Vai trò (Roles & Permissions)

| Vai trò | Hiện trạng trong DB | Menu & Nghiệp vụ chính |
|---|---|---|
| **Admin** | Đã cài đặt (`admin`) | Quản lý tài khoản, phân quyền, cấu hình hệ thống, log hoạt động |
| **Hiệu trưởng / Hiệu phó** | Thuộc nhóm Admin | Báo cáo toàn trường, duyệt kế hoạch, quản lý nhân sự |
| **Trưởng bộ môn** | Thuộc nhóm Teacher | Kho học liệu bộ môn, duyệt giáo án, theo dõi tổ chuyên môn |
| **Giáo viên** | Đã cài đặt (`teacher`) | Lớp học, bài tập, chấm điểm, phân tích điểm mạnh/yếu, nhắn tin |
| **Học sinh** | Đã cài đặt (`student`) | Bài tập, kho học liệu, điểm số, thời khóa biểu, chuyên cần, chat AI gia sư |
| **Phụ huynh** | Đã cài đặt (`parent`) | Kết quả học tập của con, thông báo, nộp đơn nghỉ phép, học phí |

> [!IMPORTANT]
> **Quy tắc bảo mật:** Route của vai trò nào chỉ vai trò đó (và Admin) truy cập được. Luôn kiểm tra quyền server-side (server-side authorization), tuyệt đối không dựa vào việc "ẩn menu trên UI" để coi là bảo mật.

---

## 5. 30 Nguyên Tắc Bất Khả Xâm Phạm (Non-Negotiable Rules)

1. Đọc kỹ mã nguồn liên quan trước khi sửa đổi bất kỳ phần nào.
2. Không bao giờ tin tưởng các tuyên bố trong README mà không kiểm chứng trực tiếp từ mã nguồn.
3. Tuân thủ tuyệt đối `DESIGN.md` cho toàn bộ thiết kế giao diện UI.
4. Giữ nguyên hành vi đang hoạt động trừ khi hành vi đó không an toàn hoặc được thay thế rõ ràng theo mục tiêu đã duyệt.
5. Không tự động deploy hoặc push mã nguồn lên môi trường production.
6. Không bao giờ in ra, để lộ hoặc commit các bí mật (passwords, tokens, connection strings).
7. Không bao giờ thực hiện các thao tác phá hủy cơ sở dữ liệu trên database production hoặc chưa xác định.
8. Luôn sử dụng migration cho các thay đổi về schema cơ sở dữ liệu.
9. Không âm thầm xóa dữ liệu người dùng hiện có.
10. Không hardcode user IDs, class IDs, school IDs hoặc danh tính demo trong mã nguồn.
11. Không sử dụng việc ẩn menu trên frontend làm cơ chế phân quyền bảo mật.
12. Mọi thao tác backend được bảo vệ đều phải thực thi kiểm tra quyền ở server-side.
13. Xác thực và validate toàn bộ dữ liệu đầu vào từ bên ngoài (Zod validation).
14. Sử dụng định dạng response và mã lỗi nhất quán (`{ success, data, error, meta }`).
15. Không đưa vào microservices, Kafka, Redis, Kubernetes nếu chưa có yêu cầu kỹ thuật chứng minh.
16. Ưu tiên kiến trúc đơn giản, dễ bảo trì hơn là các lớp trừu tượng phức tạp không cần thiết.
17. Tránh cài đặt thêm dependencies không cần thiết; thư viện mới phải giải quyết bài toán kiến trúc cụ thể.
18. Không để lại các tính năng giả định (stubs/placeholders) được giới thiệu như là đã sẵn sàng cho production.
19. Loại bỏ hoàn toàn mock fallback ra khỏi các luồng production.
20. Mọi tính năng giao diện bắt buộc xử lý đủ 5 trạng thái: Loading, Empty, Success, Validation và Error.
21. Mọi thay đổi dữ liệu trọng yếu (mutation) đều phải tạo một bản ghi kiểm toán (`audit_logs`).
22. Mọi truy vấn liên quan đến dữ liệu thuộc trường học đều phải ràng buộc phạm vi trường (`school_id`).
23. Bảo vệ tối đa thông tin định danh cá nhân (PII) của học sinh và phụ huynh.
24. Bảo tồn nguyên vẹn hiển thị Tiếng Việt và mã hóa Unicode UTF-8 trên toàn hệ thống.
25. Khả năng tiếp cận (Accessibility) phải đáp ứng yêu cầu WCAG về bàn phím, focus, độ tương phản và touch target trong `DESIGN.md`.
26. Không thực hiện refactor các phần không liên quan trong lúc thực hiện một mục tiêu cụ thể.
27. Không tạo ra các lớp "God Service" hay "God Controller" đa năng ôm đồm quá nhiều nghiệp vụ.
28. Ưu tiên các khái niệm domain tường minh và mã nguồn dễ đọc.
29. Không để lại TODO/FIXME khi hoàn tất mục tiêu trừ khi được ghi nhận rõ ràng vào phạm vi tương lai.
30. Tuân thủ quy trình làm việc 5 bước và Định nghĩa Hoàn thành (DoD).

---

## 6. Quy Trình Làm Việc 5 Bước Cho Từng Mục Tiêu (Working Method)

1. **A. Inspect (Khảo sát):**
   - Khảo sát các file liên quan.
   - Nhận diện hành vi hiện tại.
   - Nhận diện dependencies và nguy cơ hồi quy (regressions).
2. **B. Plan (Lập kế hoạch):**
   - Tạo implementation checklist ngắn gọn.
   - Xác định rõ thay đổi về schema / API / UI.
   - Nêu rõ tác động migration và hệ quả bảo mật.
3. **C. Implement (Thực thi):**
   - Làm việc tuần tự, theo từng bước nhỏ (incrementally).
   - Giữ các modules biệt lập.
   - Bảo toàn tương thích ngược khi hợp lý.
4. **D. Verify (Kiểm định):**
   - Chạy lint và typecheck.
   - Chạy unit tests và integration tests liên quan.
   - Chạy build (`npm run build`).
   - Kiểm tra trực tiếp các luồng chính trên trình duyệt ở cả độ rộng desktop và mobile.
5. **E. Report (Báo cáo kết quả):**
   - Danh sách files đã thay đổi.
   - Database migrations đã thêm.
   - API endpoints đã thêm / sửa.
   - Tests đã thêm / kết quả chạy test.
   - Các cải tiến bảo mật.
   - Các hạn chế đã biết còn lại.

---

## 7. Định Nghĩa Hoàn Thành Toàn Cầu (Global Definition of Done)

Một mục tiêu **KHÔNG** được coi là hoàn thành chỉ vì giao diện đã hiển thị.  
Một mục tiêu chỉ hoàn thành khi:
- Đã kết nối end-to-end từ giao diện tới database.
- Không còn phụ thuộc vào hardcoded demo IDs.
- Quyền hạn được kiểm tra và thực thi chặt chẽ ở server-side.
- Dữ liệu đầu vào được validate rõ ràng.
- Xử lý lỗi đầy đủ, thân thiện.
- Các bài kiểm thử tự động liên quan đều PASS (không có test nào bị fail).
- Build thành công không có lỗi.
- Không đưa vào hoặc làm lộ bất kỳ secret nào.
- Migrations có thể đảo ngược hoặc được lập tài liệu an toàn.
- Tài liệu kỹ thuật được cập nhật đồng bộ khi hành vi/API/schema thay đổi.
- Không gây hồi quy (regression) trên các luồng nghiệp vụ quan trọng hiện có.
