# AGENTS.md — Portal quản lý trường học

## 1. Tổng quan dự án

Đây là repo cho **portal quản lý trường học** (subdomain riêng, ví dụ `portal.truonghoc.edu.vn`) — KHÔNG phải trang chủ công khai của trường. Portal gồm hệ thống đăng nhập phân quyền và dashboard riêng cho từng vai trò: Admin, Hiệu trưởng, Hiệu phó, Trưởng bộ môn, Giáo viên, Học sinh, Phụ huynh.

Giai đoạn hiện tại: **chỉ dựng frontend** (UI + dữ liệu giả/mock), chưa nối backend/database thật. Mọi dữ liệu hiển thị đều là dữ liệu mẫu, đặt ở một chỗ tách biệt để sau này thay bằng API thật mà không phải sửa component.

## 2. Tech stack

- React + Tailwind CSS (thống nhất theo yêu cầu build gửi cho Antigravity)
- Nguồn thiết kế: project Stitch tên **TruongHoc-Portal**, lấy qua Stitch MCP
- Design tokens (màu, font, spacing, bo góc, shadow...) tuân thủ tuyệt đối theo file `DESIGN.md` ở gốc thư mục — không tự ý đổi màu, font, hoặc style khác với DESIGN.md.
- Icon: bộ outline nhất quán (không trộn nhiều style icon khác nhau trong cùng dự án).

## 3. Cấu trúc thư mục đề xuất

```
src/
  components/       -> component dùng chung (Button, Card, Input, Badge, Modal...)
  layouts/           -> layout riêng theo vai trò (TeacherLayout, StudentLayout, ParentLayout, AdminLayout...)
  pages/
    auth/             -> đăng nhập, quên mật khẩu
    teacher/          -> dashboard, lớp học, bài tập, phân tích năng lực
    student/           -> dashboard, bài tập, gia sư AI, điểm số
    parent/            -> dashboard, thông báo, học phí
    admin/             -> dashboard toàn trường, quản lý tài khoản
  mock/               -> dữ liệu giả (users, classes, assignments, grades...)
  routes/             -> định tuyến, bảo vệ route theo vai trò
```

Mỗi vai trò có layout + navigation riêng — không dùng chung 1 sidebar cho tất cả vai trò, vì menu mỗi vai trò khác nhau (xem mục 4).

## 4. Phân quyền / vai trò

| Vai trò | Menu chính |
|---|---|
| Admin | Quản lý tài khoản, phân quyền, cấu hình hệ thống, log hoạt động |
| Hiệu trưởng / Hiệu phó | Báo cáo toàn trường, duyệt kế hoạch, quản lý nhân sự |
| Trưởng bộ môn | Kho học liệu bộ môn, duyệt giáo án, theo dõi tổ |
| Giáo viên | Lớp học, bài tập, chấm điểm, phân tích điểm mạnh/yếu, nhắn tin |
| Học sinh | Bài tập, kho học liệu, điểm số, chat AI gia sư |
| Phụ huynh | Kết quả học tập của con, thông báo, học phí |

Route của vai trò nào chỉ vai trò đó (và Admin) truy cập được — luôn bọc route trong kiểm tra quyền, không dựa vào việc "ẩn menu" để coi là bảo mật.

## 5. Danh sách màn hình cần dựng

- [x] Đăng nhập / chọn vai trò
- [x] Dashboard Giáo viên
- [x] Dashboard Học sinh (kèm lối vào AI gia sư)
- [x] Trang chat AI gia sư
- [x] Trang giáo viên tạo bài tập
- [x] Trang phân tích điểm mạnh/điểm yếu
- [x] Dashboard Phụ huynh
- [x] Dashboard Admin / Ban giám hiệu

Khi hoàn thành màn nào, tick vào đây để theo dõi tiến độ qua các phiên làm việc.

## 6. Quy tắc code

- Component nhỏ, mỗi component một trách nhiệm rõ ràng, đặt tên PascalCase.
- Không hardcode mã màu trong component — luôn dùng token đã khai báo trong `tailwind.config` (sinh ra từ DESIGN.md).
- Dữ liệu mock đặt trong `src/mock`, có shape (cấu trúc dữ liệu) rõ ràng, để sau này ghép API thật chỉ cần đổi nguồn dữ liệu, không sửa UI.
- Không tự ý cài thêm thư viện ngoài React + Tailwind nếu chưa hỏi qua — tránh phình dự án không cần thiết.
- Ưu tiên giải pháp đơn giản nhất đáp ứng đúng yêu cầu, không thêm tính năng ngoài phạm vi đang làm.

## 7. Quy tắc an toàn

- Không tự động deploy hoặc push lên production.
- Không tự ý xoá file/thư mục ngoài phạm vi đang chỉnh sửa.
- Trước khi thay đổi lớn về cấu trúc thư mục hoặc routing, tóm tắt kế hoạch và chờ xác nhận trước khi thực hiện.
- Khi không chắc ý định của tôi, hỏi lại thay vì tự đoán rồi làm.

## 8. Giao tiếp

- Trả lời ngắn gọn, không giải thích lại các khái niệm cơ bản về React/Tailwind.
- Khi đề xuất thay đổi, nói rõ "vì sao" chứ không chỉ "làm gì".
- Nếu phát hiện lỗi hoặc điểm bất hợp lý trong lúc làm việc khác, dừng lại và báo ngay thay vì im lặng bỏ qua.
