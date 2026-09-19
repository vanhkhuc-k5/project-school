# Design System: Hệ thống quản lý trường học
**Project ID:** 13610147855023474405

## 1. Visual Theme & Atmosphere

Phong cách tối giản kiểu ngân hàng Bắc Âu (Scandinavian banking app) — sạch, phẳng, đáng tin cậy, không phô trương. Nền trắng chiếm phần lớn màn hình, xanh nước biển chỉ dùng để dẫn hướng sự chú ý (nút chính, trạng thái active, biểu tượng quan trọng). Mật độ thông tin vừa phải, nhiều khoảng trắng, không nhồi nhét. Cảm giác tổng thể: chuyên nghiệp nhưng thân thiện — giống một ứng dụng ngân hàng dễ dùng hơn là một dashboard kỹ thuật. Tránh mọi thứ khiến giao diện trông "do AI tạo ra": không gradient sặc sỡ, không hiệu ứng glow/neon, không bo góc quá tròn kiểu bong bóng, không icon 3D, không nền màu tím-hồng loang.

## 2. Color Palette & Roles

| Tên mô tả | Mã màu | Vai trò chức năng |
|---|---|---|
| Xanh nước biển đậm (Primary Navy) | `#0F3D5C` | Nút hành động chính, header, mục menu đang chọn, tiêu đề quan trọng |
| Xanh dương trung (Ocean Blue) | `#1C6FA8` | Link, icon nhấn mạnh, biểu đồ, trạng thái hover |
| Xanh da trời nhạt (Sky Tint) | `#E8F2FA` | Nền card được làm nổi bật, nền hover nhẹ, badge thông tin |
| Trắng (Base White) | `#FFFFFF` | Nền chính của toàn bộ giao diện |
| Xám nền phụ (Neutral Surface) | `#F4F6F8` | Nền khu vực phụ, phân tách section, nền sidebar |
| Viền mảnh (Hairline Border) | `#E1E6EB` | Viền card, viền input, đường phân tách — thay cho đổ bóng nặng |
| Chữ chính (Text Primary) | `#1B2B3A` | Tiêu đề, nội dung chính |
| Chữ phụ (Text Secondary) | `#5B6B7A` | Mô tả phụ, ghi chú, placeholder |
| Xanh lá thành công (Success) | `#2E8B57` | Bài đã nộp, đã chấm, trạng thái tốt |
| Vàng cảnh báo (Warning) | `#E8A33D` | Sắp đến hạn, cần chú ý |
| Đỏ báo động (Danger) | `#D64545` | Trễ hạn, học lực giảm, lỗi |

**Nguyên tắc dùng màu:** xanh nước biển đậm chỉ xuất hiện ở tối đa 1-2 điểm nhấn mỗi màn hình (nút chính, mục đang active) — không tô cả mảng lớn. Phần còn lại của giao diện giữ trắng/xám nhạt để mắt luôn có chỗ nghỉ, đúng tinh thần "ít nhưng đúng chỗ" của thiết kế ngân hàng.

## 3. Typography Rules

- Font chữ: kiểu sans-serif nhân văn, dễ đọc ở nhiều lứa tuổi (ví dụ Inter, Be Vietnam Pro, hoặc SF Pro) — tránh font hình học quá "công nghệ" kiểu Poppins in đậm toàn màn hình vì dễ trông giả tạo/AI-generated.
- Chỉ dùng 2 độ đậm: 400 (regular) cho nội dung, 500 (medium) cho tiêu đề — không dùng 700 (bold) trừ số liệu KPI lớn.
- Viết thường theo câu (sentence case), không viết hoa toàn bộ (KHÔNG dùng ALL CAPS) — giữ cảm giác thân thiện.
- Cỡ chữ: tiêu đề trang 22px, tiêu đề mục 18px, nội dung 16px (không nhỏ hơn 14px để phụ huynh lớn tuổi vẫn đọc thoải mái), line-height 1.6-1.7.
- Không dùng chữ nghiêng để nhấn mạnh — dùng màu chữ đậm hơn (Text Primary) thay vì in đậm/nghiêng.

## 4. Component Stylings

- **Nút chính (Primary button):** nền xanh nước biển đậm `#0F3D5C`, chữ trắng, bo góc 8px, không đổ bóng, padding rộng rãi (12px x 20px).
- **Nút phụ (Secondary button):** nền trắng, viền mảnh `#E1E6EB`, chữ xanh nước biển — không dùng nút "ghost" mờ nhạt khó nhìn.
- **Card:** nền trắng, viền mảnh 1px `#E1E6EB`, bo góc 12px, không đổ bóng hoặc chỉ đổ bóng rất nhẹ (xem mục 5).
- **Input/Form field:** viền mảnh, bo góc 8px, nền trắng, viền chuyển sang xanh dương `#1C6FA8` khi focus, không dùng viền dày hoặc nền xám đậm.
- **Thanh điều hướng (Sidebar):** nền xám nhạt `#F4F6F8`, mục đang chọn có nền `#E8F2FA` và chữ/icon màu xanh nước biển đậm, không dùng thanh trượt màu mè.
- **Badge trạng thái:** bo góc pill (bo tròn hoàn toàn), nền màu nhạt tương ứng (xanh lá nhạt/vàng nhạt/đỏ nhạt) với chữ đậm cùng tông màu — không dùng nền màu đậm chói.
- **Biểu đồ (Chart):** dùng tối đa 2-3 tông xanh cho dữ liệu chính, xám cho dữ liệu phụ, tránh biểu đồ nhiều màu sặc sỡ.

## 5. Depth & Elevation

Phẳng (flat) là mặc định. Phân tách khu vực bằng viền mảnh `#E1E6EB` thay vì đổ bóng. Chỉ dùng đổ bóng rất nhẹ, khuếch tán (whisper-soft diffused shadow, `0 2px 8px rgba(15,61,92,0.06)`) cho các phần tử nổi lên trên nội dung khác: modal, dropdown, nút chat AI nổi (floating action button). Không dùng đổ bóng nặng, không dùng hiệu ứng kính mờ (glassmorphism).

## 6. Spacing & Layout

- Lưới 8px làm đơn vị cơ sở cho mọi khoảng cách (8, 16, 24, 32px).
- Khoảng trắng rộng rãi giữa các khối nội dung — mật độ thấp hơn dashboard kỹ thuật thông thường, vì người dùng gồm cả học sinh nhỏ tuổi và phụ huynh lớn tuổi.
- Bố cục chính: sidebar cố định bên trái (desktop) hoặc thanh tab dưới cùng (mobile), nội dung chính căn giữa với max-width hợp lý, không kéo dài hết màn hình rộng.

## 7. Iconography

Icon dạng outline (nét mảnh, không tô đặc), một màu, đồng bộ kích thước 20-24px. Icon dùng để hỗ trợ nhận diện nhanh (lớp học, bài tập, điểm số, thông báo), không dùng icon minh họa 3D hoặc nhiều màu vì dễ tạo cảm giác "trẻ con" hoặc "AI tạo sẵn".

## 8. Accessibility & Interaction Rules

- Tỷ lệ tương phản chữ/nền tối thiểu 4.5:1, đặc biệt quan trọng vì người dùng có phụ huynh lớn tuổi.
- Vùng chạm tối thiểu 44x44px cho mọi nút bấm trên mobile.
- Trạng thái focus rõ ràng (viền xanh dương 2px) cho điều hướng bằng bàn phím.
- Thông báo lỗi/cảnh báo luôn có màu + icon + chữ mô tả đi kèm, không chỉ dựa vào màu sắc để truyền đạt ý nghĩa.
