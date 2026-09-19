export const MOCK_USERS = {
  student: {
    id: 'student_1',
    role: 'student',
    name: 'Nguyễn Minh Khang',
    code: 'HS-2024-889',
    email: 'minhkhang@school.edu.vn',
    class: 'Lớp 11A1 - K52',
    school: 'Trường THPT Chuyên Bắc Âu',
    avatar: '/assets/student_avatar.png',
  },
  teacher: {
    id: 'teacher_1',
    role: 'teacher',
    name: 'Cô Mai Lan',
    code: 'GV-TOAN-014',
    email: 'mailan@school.edu.vn',
    department: 'Tổ Toán học',
    school: 'Trường THPT Chuyên Bắc Âu',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120&h=120',
  },
  parent: {
    id: 'parent_1',
    role: 'parent',
    name: 'Nguyễn Văn Hồi',
    code: 'PH-10A1-042',
    email: 'vanhoi@parent.school.edu.vn',
    children: [
      { id: 'c1', name: 'Nguyễn Minh Khôi', class: 'Lớp 10A1 • Chuyên Toán - Tin', code: 'HS10A1-042', gvcn: 'Cô Lê Hoàng Lan' },
      { id: 'c2', name: 'Nguyễn Minh Châu', class: 'Lớp 7B • Khối THCS', code: 'HS07B-019', gvcn: 'Thầy Trần Đình Trọng' }
    ],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
  },
  admin: {
    id: 'admin_1',
    role: 'admin',
    name: 'GS.TS Vũ Hoài Nam',
    title: 'Hiệu trưởng - BGH',
    code: 'BGH-001',
    email: 'bgh.hoainam@school.edu.vn',
    school: 'Trường THPT Chuyên Bắc Âu',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120&h=120',
  }
};
