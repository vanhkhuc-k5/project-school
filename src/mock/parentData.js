export const PARENT_DASHBOARD_DATA = {
  currentChildId: 'c1',
  children: [
    {
      id: 'c1',
      name: 'Nguyễn Minh Khôi',
      badge: 'Đang học kỳ 2 (2024-2025)',
      class: 'Lớp 10A1 • Chuyên Toán - Tin',
      code: 'HS10A1-042',
      gvcn: 'Cô Lê Hoàng Lan',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120&h=120',
      gpa: 8.8,
      gpaRank: 'Học lực Giỏi',
      classRank: '03',
      totalStudents: 38,
      attendanceRate: '98.5%',
      attendanceNote: 'Nghỉ có phép: 1',
      scoreTrend: [8.2, 8.4, 8.6, 8.5, 8.8, 9.5],
      recentSubjects: [
        { initial: 'T', name: 'Toán Chuyên', test: 'Kiểm tra 1 tiết • 23/10/2024', score: 9.5, rank: 'Đạt xuất sắc', rankType: 'success' },
        { initial: 'L', name: 'Vật Lý', test: 'Bài tập thực hành đo gia tốc • 22/10/2024', score: 8.5, rank: 'Giỏi', rankType: 'info' },
        { initial: 'H', name: 'Hóa Học', test: 'Kiểm tra 15 phút định kỳ • 20/10/2024', score: 8.0, rank: 'Khá', rankType: 'neutral' },
        { initial: 'A', name: 'Tiếng Anh', test: 'Thuyết trình nhóm dự án AI • 19/10/2024', score: 9.0, rank: 'Giỏi', rankType: 'info' },
      ],
      tuition: {
        period: 'Kỳ thu: Tháng 11/2024',
        total: '3.250.000',
        dueDate: 'Hạn: 10/11/2024',
        countdown: 'Còn 5 ngày',
        items: [
          { label: 'Học phí chính khóa', amount: '1.800.000 đ' },
          { label: 'Bán trú & Dinh dưỡng', amount: '1.150.000 đ' },
          { label: 'Quỹ hoạt động & Ngoại khóa', amount: '300.000 đ' },
        ],
        qrInfo: {
          bank: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
          accountNumber: '1029384756',
          accountName: 'TRUONG THPT CHUYEN BAC AU',
          amount: 3250000,
          description: 'HOCPHI KHOI HS10A1-042 T11',
        }
      },
      schedule: [
        { period: 'Tiết 1 - 2', time: '07:30 - 09:00', subject: 'Toán nâng cao', room: 'Phòng 302 • Thầy Tiến Minh Tuấn' },
        { period: 'Tiết 3 - 4', time: '09:15 - 10:45', subject: 'Ngữ văn', room: 'Phòng 302 • Cô Lê Hoàng Lan' },
        { period: 'Buổi chiều', time: '14:00 - 16:00', subject: 'Tin học Python', room: 'Phòng Lab 2 • Thực hành lập trình' },
      ],
      examAlert: {
        title: 'Thi Giữa Kỳ I • Môn Vật Lý',
        time: 'Thời gian: Thứ Ba, 05/11/2024 • 08:00 (Phòng thi 12)',
        duration: 'Thời lượng: 60 phút',
        linkText: 'Xem đề cương ôn tập →',
      }
    },
    {
      id: 'c2',
      name: 'Nguyễn Minh Châu',
      badge: 'Đang học kỳ 2 (2024-2025)',
      class: 'Lớp 7B • Khối THCS',
      code: 'HS07B-019',
      gvcn: 'Thầy Trần Đình Trọng',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120&h=120',
      gpa: 9.2,
      gpaRank: 'Học lực Xuất sắc',
      classRank: '01',
      totalStudents: 35,
      attendanceRate: '100%',
      attendanceNote: 'Đi học chuyên cần',
      scoreTrend: [8.8, 9.0, 9.1, 9.2, 9.4, 9.6],
      recentSubjects: [
        { initial: 'T', name: 'Toán học 7', test: 'Kiểm tra chương 1 • 24/10/2024', score: 9.5, rank: 'Đạt xuất sắc', rankType: 'success' },
        { initial: 'V', name: 'Ngữ văn 7', test: 'Viết bài tập làm văn • 21/10/2024', score: 8.8, rank: 'Giỏi', rankType: 'info' },
        { initial: 'A', name: 'Tiếng Anh 7', test: 'Kiểm tra kỹ năng nói • 18/10/2024', score: 9.5, rank: 'Đạt xuất sắc', rankType: 'success' },
      ],
      tuition: {
        period: 'Kỳ thu: Tháng 11/2024',
        total: '2.800.000',
        dueDate: 'Hạn: 10/11/2024',
        countdown: 'Còn 5 ngày',
        items: [
          { label: 'Học phí chính khóa THCS', amount: '1.500.000 đ' },
          { label: 'Bán trú & Ăn trưa học đường', amount: '1.050.000 đ' },
          { label: 'CLB Tiếng Anh cuối tuần', amount: '250.000 đ' },
        ],
        qrInfo: {
          bank: 'Vietcombank',
          accountNumber: '1029384756',
          accountName: 'TRUONG THPT CHUYEN BAC AU',
          amount: 2800000,
          description: 'HOCPHI CHAU HS07B-019 T11',
        }
      },
      schedule: [
        { period: 'Tiết 1 - 2', time: '07:30 - 09:00', subject: 'Khoa học tự nhiên', room: 'Phòng B201 • Cô Thủy' },
        { period: 'Tiết 3 - 4', time: '09:15 - 10:45', subject: 'Lịch sử & Địa lý', room: 'Phòng B201 • Thầy Nam' },
      ],
      examAlert: {
        title: 'Kiểm tra định kỳ môn Toán',
        time: 'Thời gian: Thứ Tư, 06/11/2024 • 08:30 (Phòng B201)',
        duration: 'Thời lượng: 45 phút',
        linkText: 'Xem tài liệu ôn tập →',
      }
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      category: 'teacher',
      tag: 'Cần phản hồi',
      tagType: 'warning',
      title: 'Nhắc nhở họp phụ huynh giữa học kỳ I',
      content: 'Thời gian: 08:30 sáng Chủ Nhật (27/10/2024) tại phòng 302. Kính mời phụ huynh tham dự trao đổi định hướng ôn thi và kế hoạch học tập của học sinh.',
      sender: 'GVCN: Cô Lê Hoàng Lan',
      time: 'Hôm qua, 15:30',
      canConfirm: true,
      confirmed: false,
    },
    {
      id: 'notif-2',
      category: 'school',
      tag: 'Chúc mừng',
      tagType: 'success',
      title: 'Khen thưởng: Em Minh Khôi đạt giải Nhất cuộc thi Sáng tạo Robot cấp trường',
      content: 'Nhà trường biểu dương thành tích xuất sắc của đội thi lớp 10A1 và tiếp tục cử đội diện tham gia vòng Chung kết Thành phố vào tháng 12 tới.',
      sender: 'Ban Giám Hiệu',
      time: '24/10/2024',
      linkText: 'Xem quyết định khen thưởng',
    },
    {
      id: 'notif-3',
      category: 'school',
      tag: 'Kế hoạch trường',
      tagType: 'info',
      title: 'Kế hoạch khám sức khỏe định kỳ học sinh khối 10',
      content: 'Phòng Y tế phối hợp cùng Bệnh viện Đa khoa tổ chức khám mắt, nha khoa và thể lực tổng quát vào ngày 29/10/2024. Phụ huynh vui lòng nhắc con ăn sáng đầy đủ.',
      sender: 'Phòng Y tế trường',
      time: '21/10/2024',
      linkText: 'Chi tiết nội dung',
    }
  ]
};
