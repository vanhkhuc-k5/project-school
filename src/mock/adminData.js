export const ADMIN_DASHBOARD_DATA = {
  academicYear: 'Năm học 2024 - 2025',
  currentSemester: 'Học kỳ II (Hiện tại)',
  schoolName: 'Trường THPT Chuyên Bắc Âu',
  lastSync: 'Cập nhật tự động lúc 08:30 hôm nay',
  kpis: {
    students: {
      total: '2,450',
      diff: '+45',
      subStatus: 'Điểm danh trực tuyến 100% hoàn thành',
    },
    teachers: {
      total: 128,
      active: 124,
      ratio: '19 : 1 (Chuẩn quốc tế)',
    },
    classes: {
      total: 64,
      breakdown: 'Khối 10: 22 • K11: 21 • K12: 21',
      occupancy: '98.4% công suất',
    },
    averageGpa: {
      score: '7.68',
      scale: '/ 10',
      diff: '+0.15',
      note: 'Xếp loại Khá - 89.2% trên chuẩn',
    },
  },
  gradeSubjectComparison: [
    { subject: 'Toán', k10: 8.0, k11: 8.2, k12: 8.5, avg: 8.13 },
    { subject: 'Ngữ văn', k10: 7.4, k11: 7.5, k12: 7.8, avg: 7.53 },
    { subject: 'Tiếng Anh', k10: 8.2, k11: 8.4, k12: 8.9, avg: 8.50 },
    { subject: 'Vật lý', k10: 7.2, k11: 7.4, k12: 7.6, avg: 7.30 },
    { subject: 'Hóa học', k10: 7.1, k11: 7.2, k12: 7.4, avg: 7.10 },
  ],
  standardBenchmark: 7.5,
  distribution: {
    total: 2450,
    groups: [
      { name: 'Xuất sắc', percent: 24, count: 588, color: 'bg-primary' },
      { name: 'Giỏi', percent: 42, count: 1029, color: 'bg-ocean' },
      { name: 'Khá', percent: 26, count: 637, color: 'bg-sky-light border border-ocean/30 text-ocean' },
      { name: 'Cần cố gắng', percent: 8, count: 196, color: 'bg-amber-100 text-amber-800' },
    ]
  },
  academicAlerts: [
    {
      id: 'al-1',
      class: 'Lớp 10A5 - Môn Toán',
      drop: '-0.48 điểm',
      content: 'Điểm trung bình đợt 2 giảm dưới ngưỡng chỉ tiêu chuyên môn. Đã gửi đề xuất bồi dưỡng đến GV phụ trách.',
      teacher: 'GVBM: Thầy Trần Quang Vinh',
    },
    {
      id: 'al-2',
      class: 'Lớp 11B5 - Môn Vật lý',
      drop: '-0.32 điểm',
      content: 'Tỷ lệ học sinh dưới điểm trung bình ở bài kiểm tra 45 phút chiếm 14.2%.',
      teacher: 'GVBM: Cô Phạm Thị Tuyết',
    },
  ],
  recentActivities: [
    {
      id: 'act-1',
      text: 'Cô Nguyễn Mai Hương (Tổ Toán - K12) vừa hoàn tất cập nhật điểm kiểm tra 1 tiết lớp 12A1.',
      time: '18 phút trước',
      badge: 'Đã duyệt điểm',
      badgeType: 'success',
    },
    {
      id: 'act-2',
      text: 'Thầy Trần Hữu Bình (Tổ Vật lý) đã nộp đề thi giữa kỳ II lên ngân hàng đề.',
      time: '25 phút trước',
      badge: 'Chờ BGH duyệt',
      badgeType: 'warning',
    },
    {
      id: 'act-3',
      text: 'Quản trị viên hệ thống đã tạo 03 tài khoản Giáo viên hợp đồng mới.',
      time: '1 giờ trước',
      badge: 'Hệ thống',
      badgeType: 'neutral',
    },
    {
      id: 'act-4',
      text: 'Thầy Lê Hoàng Long vừa khóa bảng điểm chính thức lớp 10B3 theo quy chế.',
      time: '2 giờ trước',
      badge: 'Hoàn thành',
      badgeType: 'success',
    },
    {
      id: 'act-5',
      text: 'Phụ huynh em Trần Tuấn Kiệt (11D2) đã đóng học phí trực tuyến qua cổng ngân hàng.',
      time: '3 giờ trước',
      badge: 'Đã thanh toán',
      badgeType: 'success',
    },
  ],
  moetSync: {
    status: 'Đã kết nối',
    standard: 'ISO/IEC 27001',
    description: 'Dữ liệu học bạ số và chứng chỉ số toàn trường được mã hóa an toàn theo tiêu chuẩn Bộ GD&ĐT.',
  }
};
