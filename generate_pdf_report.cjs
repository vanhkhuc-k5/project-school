const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const reportAssetsDir = path.join(__dirname, 'report_assets');
const imageKeys = ['login', 'student', 'aiTutor', 'teacherAnalytics', 'teacherModal', 'teacherCreate', 'parent', 'admin'];
const base64Images = {};

for (const key of imageKeys) {
  const filePath = path.join(reportAssetsDir, `${key}.png`);
  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath);
    base64Images[key] = `data:image/png;base64,${buf.toString('base64')}`;
  }
}

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Dự Án Hệ Thống Quản Lý Trường Học - EduPortal</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
    
    @page {
      size: A4;
      margin: 14mm 15mm 14mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Be Vietnam Pro', sans-serif;
      color: #1B2B3A;
      background: #FFFFFF;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }

    .page {
      page-break-after: always;
      height: 100%;
      position: relative;
    }
    .page:last-child {
      page-break-after: avoid;
    }

    /* Cover Page */
    .cover-container {
      min-height: 980px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 2px solid #0F3D5C;
      border-radius: 8px;
      padding: 44px;
      background: linear-gradient(180deg, #F8F9FB 0%, #FFFFFF 100%);
    }

    .cover-header {
      border-bottom: 2px solid #0F3D5C;
      padding-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cover-brand {
      font-size: 24px;
      font-weight: 700;
      color: #0F3D5C;
      letter-spacing: -0.5px;
    }

    .cover-badge {
      background: #E8F2FA;
      color: #0F3D5C;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 600;
      border: 1px solid #1C6FA8;
    }

    .cover-body {
      margin-top: 40px;
      margin-bottom: 40px;
    }

    .cover-title {
      font-size: 30px;
      font-weight: 700;
      color: #0F3D5C;
      line-height: 1.3;
      margin: 0 0 16px 0;
    }

    .cover-subtitle {
      font-size: 15px;
      color: #5B6B7A;
      margin: 0 0 28px 0;
      line-height: 1.5;
    }

    .meta-box {
      background: #FFFFFF;
      border: 1px solid #E1E6EB;
      border-radius: 8px;
      padding: 20px 24px;
      margin-top: 28px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #F4F6F8;
      font-size: 12.5px;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .meta-label {
      color: #5B6B7A;
    }
    .meta-value {
      font-weight: 600;
      color: #1B2B3A;
    }

    /* Content Styling */
    h1.section-title {
      font-size: 19px;
      font-weight: 700;
      color: #0F3D5C;
      border-bottom: 2px solid #E1E6EB;
      padding-bottom: 8px;
      margin-top: 10px;
      margin-bottom: 14px;
    }

    h2.subsection-title {
      font-size: 14.5px;
      font-weight: 600;
      color: #1C6FA8;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }

    .callout {
      background: #F4F6F8;
      border-left: 4px solid #0F3D5C;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin: 12px 0;
      font-size: 12.5px;
    }

    .callout-success {
      background: #EAF5EF;
      border-left: 4px solid #2E8B57;
      color: #1B2B3A;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 12px;
    }

    table.data-table th {
      background: #0F3D5C;
      color: #FFFFFF;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
    }

    table.data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #E1E6EB;
    }

    table.data-table tr:nth-child(even) {
      background: #F8F9FB;
    }

    /* Screen Showcases */
    .screen-card {
      background: #FFFFFF;
      border: 1px solid #E1E6EB;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }

    .screen-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .screen-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #0F3D5C;
    }

    .screen-tag {
      background: #E8F2FA;
      color: #0F3D5C;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10.5px;
      font-weight: 600;
    }

    .screen-img {
      width: 100%;
      max-height: 340px;
      object-fit: cover;
      object-position: top;
      border-radius: 6px;
      border: 1px solid #E1E6EB;
      display: block;
      margin-bottom: 6px;
    }

    .screen-desc {
      font-size: 11.5px;
      color: #5B6B7A;
      line-height: 1.45;
    }

    /* Evaluation Grid */
    .eval-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
    }

    .eval-card {
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11.8px;
      border: 1px solid #E1E6EB;
      background: #F8FAFC;
    }

    .eval-card.strength {
      border-top: 3px solid #2E8B57;
    }

    .eval-card.weakness {
      border-top: 3px solid #D64545;
    }

    .eval-title {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #0F3D5C;
    }

    /* Sign-off section */
    .sign-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 10px;
      page-break-inside: avoid;
    }

    .sign-box {
      text-align: center;
      width: 45%;
    }

    .sign-title {
      font-weight: 600;
      color: #0F3D5C;
      font-size: 12.5px;
      margin-bottom: 60px;
    }

    .sign-name {
      font-weight: 600;
      border-top: 1px solid #1B2B3A;
      display: inline-block;
      padding-top: 5px;
      min-width: 170px;
      font-size: 12px;
    }
  </style>
</head>
<body>

  <!-- TRANG 1: TRANG BÌA (COVER PAGE) -->
  <div class="page">
    <div class="cover-container">
      <div class="cover-header">
        <div class="cover-brand">EduPortal • EduNordic</div>
        <div class="cover-badge">HỒ SƠ BÁO CÁO NGHIỆM THU DỰ ÁN</div>
      </div>

      <div class="cover-body">
        <div style="color: #1C6FA8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          TÀI LIỆU CHUYÊN BIỆT DÀNH CHO BÊN ĐẶT HÀNG & HỘI ĐỒNG QUẢN TRỊ TRƯỜNG HỌC
        </div>
        <h1 class="cover-title">BÁO CÁO TỔNG KẾT VÀ ĐÁNH GIÁ DỰ ÁN CỔNG THÔNG TIN QUẢN LÝ TRƯỜNG HỌC SỐ</h1>
        <div class="cover-subtitle">
          Phân tích toàn diện kiến trúc 4 vai trò, minh chứng các màn hình nghiệm thu, ưu điểm đột phá, các điểm còn hạn chế và lộ trình mở rộng hệ thống.
        </div>

        <div class="meta-box">
          <div class="meta-row">
            <span class="meta-label">Đơn vị đặt hàng / Thụ hưởng:</span>
            <span class="meta-value">Ban Giám Hiệu & Hội Đồng Quản Trị Trường THPT Chuyên</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Mã thiết kế Stitch MCP:</span>
            <span class="meta-value">Project ID: 13610147855023474405 (EduConnect AI)</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Phong cách thiết kế (Design Theme):</span>
            <span class="meta-value">Scandinavian Academic Clarity (Tối giản Bắc Âu)</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Phạm vi công việc đã hoàn thành:</span>
            <span class="meta-value">Dựng toàn bộ Frontend (8 màn hình), Dữ liệu Mock chuẩn hóa, Role Switcher Demo</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Thời điểm nghiệm thu:</span>
            <span class="meta-value">Tháng 09/2026 (Phiên bản v1.0 Production Frontend)</span>
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid #E1E6EB; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #5B6B7A;">
        <span>EduNordic Education Portal System • Bản quyền giải pháp số học đường</span>
        <span>Bảo mật chuẩn Quốc tế • EduShield 2.4</span>
      </div>
    </div>
  </div>

  <!-- TRANG 2: TỔNG QUAN VÀ MỤC TIÊU DỰ ÁN -->
  <div class="page">
    <h1 class="section-title">1. Tổng Quan & Mục Tiêu Dự Án</h1>
    
    <p>
      Dự án <strong>EduPortal (EduNordic)</strong> được xây dựng với mục tiêu chuyển đổi số toàn diện hoạt động dạy, học và điều hành trong môi trường giáo dục liên cấp và THPT. Hệ thống được định vị là <strong>Cổng thông tin quản lý trường học chuyên biệt (Dedicated Portal)</strong> chạy trên subdomain độc lập (ví dụ: <code>portal.truonghoc.edu.vn</code>), phục vụ trực tiếp 4 nhóm người dùng chính: Ban Giám Hiệu, Giáo viên, Học sinh và Phụ huynh học sinh.
    </p>

    <div class="callout">
      <strong>Định vị thẩm mỹ:</strong> Khác với các hệ thống quản lý cồng kềnh truyền thống vốn tạo cảm giác quá tải thông tin, EduPortal lấy cảm hứng từ ứng dụng ngân hàng Bắc Âu (Scandinavian banking app): tối giản, phẳng, khoảng trắng thoáng đãng, phân tách khu vực bằng viền mảnh 1px thay cho đổ bóng nặng, tạo cảm giác tin cậy, bình tĩnh và tập trung cho học đường.
    </div>

    <h2 class="subsection-title">Ma trận Phân quyền & Chức năng 4 Vai trò</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 16%;">Vai trò</th>
          <th style="width: 34%;">Menu & Phân hệ chính</th>
          <th style="width: 50%;">Giá trị cốt lõi mang lại</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Học sinh</strong></td>
          <td>Kế hoạch ngày, Bài tập sắp đến hạn, Bảng điểm, Năng lực chuyên đề, Gia sư AI 24/7</td>
          <td>Tự chủ tiến độ học tập, hỗ trợ gỡ rối bài tập bằng phương pháp Socratic, giảm áp lực ôn thi.</td>
        </tr>
        <tr>
          <td><strong>Giáo viên</strong></td>
          <td>Lịch giảng dạy, Hàng đợi chấm bài, Phân tích năng lực (Radar chart), Soạn đề kiểm tra</td>
          <td>Nhận diện sớm học sinh hổng kiến thức, tạo bài tập trắc nghiệm có Live Preview, kết nối phụ huynh 1-click.</td>
        </tr>
        <tr>
          <td><strong>Phụ huynh</strong></td>
          <td>Chuyển đổi hồ sơ con cái, Điểm số & Xếp hạng, Lịch thi, Học phí VietQR Napas</td>
          <td>Đồng hành sát sao cùng con mà không gây căng thẳng, đóng học phí chỉ mất 10 giây qua ứng dụng ngân hàng.</td>
        </tr>
        <tr>
          <td><strong>Ban Giám Hiệu</strong></td>
          <td>Báo cáo toàn trường (2,450 HS), So sánh khối lớp 10-12, Cảnh báo học lực, Đồng bộ Sở GD&ĐT</td>
          <td>Ra quyết định điều hành dựa trên dữ liệu số (Data-driven), giám sát chỉ tiêu chất lượng đào tạo theo thời gian thực.</td>
        </tr>
      </tbody>
    </table>

    <h2 class="subsection-title">Tiêu chuẩn Kỹ thuật & Design Tokens Áp dụng</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 25%;">Thành tố</th>
          <th style="width: 25%;">Quy định DESIGN.md</th>
          <th style="width: 50%;">Mục đích áp dụng</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Màu chính (Primary Navy)</strong></td>
          <td><code>#0F3D5C</code></td>
          <td>Nút chính, tiêu đề cấp cao, thanh điều hướng active. Thể hiện sự tôn nghiêm, uy tín học thuật.</td>
        </tr>
        <tr>
          <td><strong>Màu tương tác (Ocean Blue)</strong></td>
          <td><code>#1C6FA8</code></td>
          <td>Đường link, focus ring bàn phím, biểu đồ. Dẫn hướng sự chú ý tự nhiên.</td>
        </tr>
        <tr>
          <td><strong>Màu phụ trợ (Sky Tint)</strong></td>
          <td><code>#E8F2FA</code></td>
          <td>Nền card được làm nổi bật, badge thông tin, tạo khoảng đệm thị giác êm dịu.</td>
        </tr>
        <tr>
          <td><strong>Font chữ</strong></td>
          <td>Be Vietnam Pro</td>
          <td>Tối ưu hiển thị tiếng Việt có dấu, độ đậm vừa phải (400, 500, 600), cỡ chữ từ 14px trở lên cho người lớn tuổi.</td>
        </tr>
        <tr>
          <td><strong>Cấu trúc Dữ liệu Mock</strong></td>
          <td><code>src/mock/*.js</code></td>
          <td>Tách rời 100% khỏi component UI, sẵn sàng gắn REST API / GraphQL ở giai đoạn Backend.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TRANG 3: HÌNH ẢNH MINH CHỨNG NGHIỆM THU (SCREEN 1 & 2) -->
  <div class="page">
    <h1 class="section-title">2. Minh Chứng Nghiệm Thu Giao Diện Thực Tế</h1>
    
    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">1. Màn hình Đăng Nhập & Chọn Vai Trò (Login Portal)</span>
        <span class="screen-tag">Phân hệ: Xác thực hệ thống</span>
      </div>
      <img src="${base64Images.login}" class="screen-img" alt="Trang Đăng Nhập">
      <div class="screen-desc">
        <strong>Mô tả:</strong> Hỗ trợ tab chuyển đổi 4 vai trò với gợi ý tài khoản demo tức thời; split-screen với phối cảnh trường học phong cách Bắc Âu; tích hợp đăng nhập Google Workspace for Education và chứng nhận bảo mật EduShield 2.4.
      </div>
    </div>

    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">2. Dashboard Học Sinh (Student Dashboard)</span>
        <span class="screen-tag">Phân hệ: Học sinh</span>
      </div>
      <img src="${base64Images.student}" class="screen-img" alt="Dashboard Học Sinh">
      <div class="screen-desc">
        <strong>Mô tả:</strong> 4 thẻ KPI chỉ số tiến độ hàng ngày; danh sách bài tập sắp đến hạn phân tầng độ gấp; bảng điểm kèm lời phê giáo viên; widget phân tích năng lực chuyên đề với nút "Luyện tập ngay" dẫn thẳng vào AI gia sư.
      </div>
    </div>
  </div>

  <!-- TRANG 4: HÌNH ẢNH MINH CHỨNG NGHIỆM THU (SCREEN 3 & 4) -->
  <div class="page">
    <h1 class="section-title">2. Minh Chứng Nghiệm Thu Giao Diện Thực Tế (tiếp theo)</h1>

    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">3. Gia Sư AI Socratic & Phân Tích OCR Ảnh Vở Ghi</span>
        <span class="screen-tag">Phân hệ: Học sinh • Trợ lý AI</span>
      </div>
      <img src="${base64Images.aiTutor}" class="screen-img" alt="Gia Sư AI">
      <div class="screen-desc">
        <strong>Mô tả:</strong> Hội thoại sư phạm chuẩn Socratic; hệ thống bóc tách chữ viết tay từ ảnh chụp bài giải môn Toán của học sinh; hộp đối chiếu "Cách nhanh gọn [Tối ưu]" vs "Lỗi tốn thời gian phổ biến"; bài tập trắc nghiệm củng cố tương tác tức thời.
      </div>
    </div>

    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">4. Phân Tích Năng Lực Học Sinh & Can Thiệp Sư Phạm</span>
        <span class="screen-tag">Phân hệ: Giáo viên</span>
      </div>
      <img src="${base64Images.teacherAnalytics}" class="screen-img" alt="Phân Tích Năng Lực">
      <div class="screen-desc">
        <strong>Mô tả:</strong> Biểu đồ Radar 5 trục so sánh năng lực thực tế lớp 10A1 với Chuẩn kỳ vọng Bộ GD&ĐT; danh sách theo dõi học sinh nguy cơ tụt hạng; gợi ý chuyên môn sư phạm tuần và tính năng gửi thông báo 1-click đến phụ huynh.
      </div>
    </div>
  </div>

  <!-- TRANG 5: HÌNH ẢNH MINH CHỨNG NGHIỆM THU (SCREEN 5 & 6) -->
  <div class="page">
    <h1 class="section-title">2. Minh Chứng Nghiệm Thu Giao Diện Thực Tế (tiếp theo)</h1>

    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">5. Giáo Viên Tạo Bài Tập & Live Preview Giả Lập Học Sinh</span>
        <span class="screen-tag">Phân hệ: Giáo viên</span>
      </div>
      <img src="${base64Images.teacherCreate}" class="screen-img" alt="Tạo Bài Tập">
      <div class="screen-desc">
        <strong>Mô tả:</strong> Quy trình tạo bài 3 bước khoa học (Thông tin chung, Lớp giao bài, Ngân hàng câu hỏi); hỗ trợ vẽ đồ thị hàm số Parabol; cột bên phải hiển thị Live Preview giả lập chính xác bài thi học sinh (đồng hồ đếm ngược 44:59, bảng câu hỏi 1-10).
      </div>
    </div>

    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">6. Cổng Phụ Huynh & Thanh Toán Học Phí VietQR Napas</span>
        <span class="screen-tag">Phân hệ: Phụ huynh</span>
      </div>
      <img src="${base64Images.parent}" class="screen-img" alt="Cổng Phụ Huynh">
      <div class="screen-desc">
        <strong>Mô tả:</strong> Chuyển đổi nhanh giữa các con học cùng trường (Minh Khôi 10A1 vs Minh Châu 7B); biểu đồ sparkline xu hướng điểm số; thanh toán học phí 1 chạm qua mã VietQR Napas tự động điền STK và nội dung; xác nhận họp phụ huynh tức thời.
      </div>
    </div>
  </div>

  <!-- TRANG 6: HÌNH ẢNH MINH CHỨNG NGHIỆM THU (SCREEN 7 & 8) -->
  <div class="page">
    <h1 class="section-title">2. Minh Chứng Nghiệm Thu Giao Diện Thực Tế (tiếp theo)</h1>

    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">7. Dashboard Ban Giám Hiệu Toàn Trường (Executive View)</span>
        <span class="screen-tag">Phân hệ: Quản trị & Ban Giám Hiệu</span>
      </div>
      <img src="${base64Images.admin}" class="screen-img" alt="Dashboard Ban Giám Hiệu">
      <div class="screen-desc">
        <strong>Mô tả:</strong> Chỉ số vĩ mô 2,450 học sinh, 128 giáo viên (tỷ lệ 19:1), 64 lớp học, GPA 7.68; biểu đồ cột nhóm so sánh điểm qua 3 khối 10-11-12 với chuẩn 7.5; phân bổ học lực; cảnh báo chuyên môn sụt giảm điểm và đồng bộ dữ liệu Bộ GD&ĐT ISO/IEC 27001.
      </div>
    </div>

    <div class="screen-card">
      <div class="screen-header">
        <span class="screen-title">8. Modal Can Thiệp Sư Phạm Phụ Huynh 1-Click</span>
        <span class="screen-tag">Tính năng tương tác nâng cao</span>
      </div>
      <img src="${base64Images.teacherModal}" class="screen-img" alt="Modal Gửi Thông Báo Phụ Huynh">
      <div class="screen-desc">
        <strong>Mô tả:</strong> Cửa sổ nổi với đổ bóng whisper-soft chuẩn Bắc Âu, cho phép giáo viên xác nhận gửi phiếu khảo sát tiến độ và thông báo phụ đạo đến phụ huynh 3 học sinh có nguy cơ tụt hạng chỉ với một cú nhấp chuột.
      </div>
    </div>
  </div>

  <!-- TRANG 7: PHÂN TÍCH ƯU ĐIỂM DỰ ÁN DÀNH CHO BÊN ĐẶT HÀNG -->
  <div class="page">
    <h1 class="section-title">3. Phân Tích Chuyên Sâu Ưu Điểm Của Dự Án</h1>

    <p>
      Dưới góc độ đánh giá từ đơn vị đặt hàng, hệ thống EduPortal đạt được các giá trị vượt trội so với các sản phẩm quản lý trường học hiện hành trên thị trường:
    </p>

    <div class="eval-grid">
      <div class="eval-card strength">
        <div class="eval-title">
          <span>🌟</span> 1. Thẩm mỹ Bắc Âu (Scandinavian UX)
        </div>
        <p>
          Loại bỏ hoàn toàn các hiệu ứng 3D lòe loẹt, gradient sặc sỡ hay bóng mờ nặng. Sử dụng tỷ lệ tương phản chữ/nền cao (>= 4.5:1), viền mảnh 1px và nhiều khoảng trắng. Giao diện đem lại sự dễ chịu cho mắt phụ huynh lớn tuổi khi đọc báo cáo, đồng thời giữ được tính chuyên nghiệp, nghiêm túc cho ban giám hiệu.
        </p>
      </div>

      <div class="eval-card strength">
        <div class="eval-title">
          <span>🤖</span> 2. Gia sư AI Socratic Đột phá
        </div>
        <p>
          Không biến AI thành công cụ "cho chép bài", AI được cấu hình theo phương pháp Socratic: chỉ ra lỗi sai phổ biến, gợi ý công thức tối ưu, phân tích chữ viết tay trong ảnh bài giải của học sinh và bắt buộc học sinh tự suy luận bước kết luận thông qua câu hỏi kiểm tra tương tác.
        </p>
      </div>

      <div class="eval-card strength">
        <div class="eval-title">
          <span>📊</span> 3. Cảnh báo Sớm & Can thiệp Sư phạm
        </div>
        <p>
          Giáo viên không phải chờ đến hết kỳ thi mới biết học sinh yếu kém. Biểu đồ Radar và danh sách watchlist phân loại tự động 3 nhóm (Nguy cơ cao, Cần chú ý, Xuất sắc) cùng nút gửi thông báo phụ huynh 1-click giúp nhà trường can thiệp phụ đạo ngay trong tuần thứ 14 của học phần.
        </p>
      </div>

      <div class="eval-card strength">
        <div class="eval-title">
          <span>💳</span> 4. Thanh toán VietQR Napas 1 Chạm
        </div>
        <p>
          Tích hợp mã VietQR chuẩn ngân hàng quốc gia kèm thông tin mã học sinh và số tiền tự động. Phụ huynh thanh toán chỉ trong 10 giây qua bất kỳ ứng dụng ngân hàng nào (Vietcombank, Techcombank, BIDV, MB...), xóa bỏ hoàn toàn cảnh xếp hàng nộp học phí tại trường.
        </p>
      </div>

      <div class="eval-card strength">
        <div class="eval-title">
          <span>👨‍👩‍👧‍👦</span> 5. Hỗ trợ Gia đình Có Nhiều Con
        </div>
        <p>
          Phụ huynh có 2 con trở lên học ở các khối khác nhau (THCS và THPT) có thể chuyển đổi tab tức thời trên cùng một tài khoản mà không cần đăng nhập lại, xem trọn vẹn điểm số, lịch thi và học phí của từng con.
        </p>
      </div>

      <div class="eval-card strength">
        <div class="eval-title">
          <span>🏗️</span> 6. Cấu trúc Code Sạch (Clean Code)
        </div>
        <p>
          Tuân thủ nguyên tắc Clean Architecture: toàn bộ dữ liệu mock nằm độc lập trong <code>src/mock/</code> với cấu trúc JSON chuẩn hóa. Khi đội ngũ backend xây dựng xong API, chỉ cần thay đổi tầng gọi hàm (API service) mà không cần phải can thiệp sửa đổi component giao diện.
        </p>
      </div>
    </div>

    <div class="callout callout-success" style="margin-top: 10px;">
      <strong>Đánh giá chung:</strong> EduPortal đạt điểm xuất sắc về mặt trải nghiệm người dùng (UX), bám sát 100% tài liệu thiết kế Stitch MCP và định vị sản phẩm hiện đại, thân thiện, bảo vệ thương hiệu nhà trường trước phụ huynh và cơ quan quản lý.
    </div>
  </div>

  <!-- TRANG 8: PHÂN TÍCH NHƯỢC ĐIỂM & ĐỀ XUẤT LỘ TRÌNH -->
  <div class="page">
    <h1 class="section-title">4. Phân Tích Khách Quan Nhược Điểm & Thách Thức</h1>

    <p>
      Để bên đặt hàng có cái nhìn trung thực, khách quan và chuẩn bị nguồn lực cho các giai đoạn tiếp theo, đơn vị phát triển xin chỉ rõ các điểm còn hạn chế ở giai đoạn hiện tại:
    </p>

    <div class="eval-grid">
      <div class="eval-card weakness">
        <div class="eval-title">
          <span>⚠️</span> 1. Hệ thống Đang ở Mức Frontend & Mock Data
        </div>
        <p>
          <strong>Hạn chế:</strong> Toàn bộ dữ liệu hiển thị (học sinh, điểm số, bài tập, lớp học) đang chạy bằng mock state trên trình duyệt. Dữ liệu chưa được lưu trữ vào hệ quản trị cơ sở dữ liệu thật (PostgreSQL/MySQL), nên khi làm mới trang dữ liệu sẽ trở về trạng thái ban đầu.<br>
          <strong>Giải pháp:</strong> Cần triển khai Giai đoạn 2 để xây dựng cơ sở dữ liệu và RESTful API / GraphQL hoàn chỉnh.
        </p>
      </div>

      <div class="eval-card weakness">
        <div class="eval-title">
          <span>⚠️</span> 2. Module AI & OCR Đang Chạy Kịch bản Mẫu
        </div>
        <p>
          <strong>Hạn chế:</strong> Phân tích chữ viết tay từ ảnh vở học sinh hiện đang dùng kịch bản giải toán định sẵn để mô phỏng năng lực tương tác.<br>
          <strong>Giải pháp:</strong> Cần tích hợp mô hình đa phương thức (Multimodal Vision API như Gemini 1.5 Pro / Google Cloud Vision) trên server để nhận dạng chữ viết tay tiếng Việt thực tế của học sinh theo thời gian thực.
        </p>
      </div>

      <div class="eval-card weakness">
        <div class="eval-title">
          <span>⚠️</span> 3. Cổng VietQR Chưa Có Webhook Tự Động Gạch Nợ
        </div>
        <p>
          <strong>Hạn chế:</strong> Mã QR hiển thị đầy đủ thông tin nhưng chưa nối cổng Payment Gateway (như VietQR Napas Open API, PayOS hoặc ngân hàng đối tác), do đó sau khi chuyển khoản, trạng thái hóa đơn chưa tự động đổi sang "Đã gạch nợ" mà phải qua kiểm tra thủ công.<br>
          <strong>Giải pháp:</strong> Ký kết thỏa thuận cổng thanh toán ngân hàng và xây dựng Webhook IPN xử lý giao dịch.
        </p>
      </div>

      <div class="eval-card weakness">
        <div class="eval-title">
          <span>⚠️</span> 4. Chưa Có Phiên Bản Mobile App Native
        </div>
        <p>
          <strong>Hạn chế:</strong> Web app đã tương thích màn hình điện thoại (responsive), nhưng web di động bị hạn chế khả năng đẩy thông báo khẩn (Push Notification) khi màn hình tắt so với ứng dụng native.<br>
          <strong>Giải pháp:</strong> Cấu hình PWA (Progressive Web App) hoặc đóng gói sang React Native để phụ huynh nhận thông báo điểm danh và cảnh báo khẩn cấp tức thời.
        </p>
      </div>
    </div>

    <h2 class="subsection-title" style="margin-top: 14px;">5. Đề Xuất Lộ Trình Triển Khai Giai Đoạn 2 (Next Steps)</h2>
    
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 15%;">Giai đoạn</th>
          <th style="width: 35%;">Hạng mục công việc kỹ thuật</th>
          <th style="width: 32%;">Đầu ra dự kiến (Deliverables)</th>
          <th style="width: 18%;">Thời gian</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Giai đoạn 2.1</strong></td>
          <td>Xây dựng Database & Backend Core API (Node.js/Go + PostgreSQL, JWT/RBAC, Docker)</td>
          <td>Hệ thống cơ sở dữ liệu thật, API xác thực và lưu trữ điểm số, bài tập vĩnh viễn</td>
          <td>4 - 6 tuần</td>
        </tr>
        <tr>
          <td><strong>Giai đoạn 2.2</strong></td>
          <td>Tích hợp Engine AI Socratic & OCR Chữ viết tay thực tế (Gemini 1.5 Flash/Pro Vision API)</td>
          <td>AI gia sư có thể đọc bất kỳ ảnh chụp bài làm tự luận nào của học sinh và giải thích theo ngữ cảnh</td>
          <td>3 - 4 tuần</td>
        </tr>
        <tr>
          <td><strong>Giai đoạn 2.3</strong></td>
          <td>Tích hợp Cổng VietQR Napas Webhook & Quản lý Thu - Chi</td>
          <td>Tự động gạch nợ học phí trong 3 giây sau khi phụ huynh quét mã, xuất biên lai điện tử VAT</td>
          <td>2 - 3 tuần</td>
        </tr>
        <tr>
          <td><strong>Giai đoạn 2.4</strong></td>
          <td>Đóng gói Mobile App (iOS / Android) & Đồng bộ dữ liệu Sở GD&ĐT (EMIS)</td>
          <td>Ứng dụng phụ huynh trên App Store/Google Play với Push Notification điểm danh và báo bài</td>
          <td>4 - 5 tuần</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TRANG 9: KẾT LUẬN & BIÊN BẢN NGHIỆM THU -->
  <div class="page">
    <h1 class="section-title">6. Kết Luận & Biên Bản Bàn Giao</h1>

    <p>
      Giai đoạn 1 của dự án <strong>EduPortal (Cổng Thông Tin Quản Lý Trường Học Số)</strong> đã hoàn thành xuất sắc toàn bộ các mục tiêu đề ra ban đầu theo hợp đồng kỹ thuật và quy định tại <code>AGENTS.md</code>:
    </p>

    <ul>
      <li>Dựng đầy đủ 100% số màn hình (8/8 màn hình) theo đúng thiết kế Stitch MCP (Project ID: <code>13610147855023474405</code>).</li>
      <li>Thực thi nghiêm ngặt bộ nhận diện và nguyên tắc thiết kế tối giản Bắc Âu tại <code>DESIGN.md</code>.</li>
      <li>Toàn bộ mã nguồn được tổ chức sạch sẽ, không có lỗi biên dịch (<code>npm run build</code> hoàn tất 100%), đã được kiểm thử trực tiếp trên trình duyệt bằng hệ thống browser subagent tự động.</li>
      <li>Tích hợp widget chuyển đổi vai trò (Role Switcher) giúp hội đồng nghiệm thu có thể trực tiếp trải nghiệm mọi phân hệ bất kỳ lúc nào.</li>
    </ul>

    <p style="margin-top: 20px;">
      Tài liệu này được lập thành 02 bản, có giá trị pháp lý và kỹ thuật như nhau, làm căn cứ chuyển giao sang Giai đoạn 2 (Backend & Production Deployment).
    </p>

    <div class="sign-section">
      <div class="sign-box">
        <div class="sign-title">ĐẠI DIỆN ĐƠN VỊ PHÁT TRIỂN / THI CÔNG</div>
        <div class="sign-name">Trưởng Nhóm Kỹ Thuật Dự Án<br><span style="font-weight: normal; color: #5B6B7A;">(Ký và ghi rõ họ tên)</span></div>
      </div>

      <div class="sign-box">
        <div class="sign-title">ĐẠI DIỆN ĐƠN VỊ ĐẶT HÀNG / THỤ HƯỞNG</div>
        <div class="sign-name">Ban Giám Hiệu / Hội Đồng Quản Trị<br><span style="font-weight: normal; color: #5B6B7A;">(Ký và đóng dấu)</span></div>
      </div>
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = path.join(__dirname, 'bao_cao_du_an_edunordic.html');
fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');

const pdfFilePath = path.join(__dirname, 'BAO_CAO_DU_AN_EDUPORTAL.pdf');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const cmd = `"${edgePath}" --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "${htmlFilePath}"`;
execSync(cmd, { stdio: 'inherit' });
const stats = fs.statSync(pdfFilePath);
console.log(`Regenerated perfect PDF: ${pdfFilePath} (${stats.size} bytes)`);
