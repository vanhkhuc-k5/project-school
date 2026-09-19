export const AI_TUTOR_INITIAL_DATA = {
  subject: 'Toán học 10',
  currentTopic: 'Toán 10 - Phương trình bậc 2 & Định lý Vi-ét',
  topics: [
    'Toán 10 - Phương trình bậc 2 & Định lý Vi-ét',
    'Toán 10 - Bất phương trình bậc hai một ẩn',
    'Toán 10 - Dấu của tam thức bậc hai',
    'Vật lý 11 - Định luật Ôm cho toàn mạch',
    'Hóa học 11 - Cân bằng phản ứng Oxi hóa - Khử',
  ],
  quickChips: [
    '💡 Gợi ý tiếp',
    '⚡ Giải thích lại dễ hiểu hơn',
    '✍️ Cho ví dụ tương tự tự luyện',
    '🔍 Kiểm tra đáp án câu 1.1b',
    '📋 Tóm tắt sơ đồ tư duy Định lý Vi-ét',
  ],
  messages: [
    {
      id: 'm1',
      sender: 'ai',
      time: '09:12 Hôm nay',
      badge: 'Phương pháp Socratic',
      content: {
        intro: 'Chào Khoa! Thầy sẽ hướng dẫn em giải bài toán phương trình bậc hai 2x² - 5x + 2 = 0 bằng cả hai cách: dùng công thức nghiệm chuẩn xác và phân tích đa thức thành nhân tử để rèn luyện tư duy nhé.',
        formulaTitle: 'CÔNG THỨC TỔNG QUÁT',
        formula: 'ax² + bx + c = 0  (a ≠ 0)',
        sampleEq: 'Hệ số: a = 2, b = -5, c = 2',
        step1Title: '1. Tính biệt thức Delta (Δ)',
        step1Text: 'Ta áp dụng công thức: Δ = b² - 4ac\nThay số: Δ = (-5)² - 4 · 2 · 2 = 25 - 16 = 9\nVì Δ = 9 > 0, do đó phương trình có hai nghiệm phân biệt thực: √Δ = 3.',
        step2Title: '2. Xác định hai giá trị nghiệm x₁, x₂',
        root1: 'x₁ = (-b + √Δ) / 2a = (5 + 3) / 4 = 2',
        root2: 'x₂ = (-b - √Δ) / 2a = (5 - 3) / 4 = 1/2',
        tipTitle: 'Mẹo kiểm tra nhanh với Định lý Vi-ét:',
        tipText: 'Tổng 2 nghiệm: S = x₁ + x₂ = 2 + 1/2 = 5/2 (đúng bằng -b/a).\nTích 2 nghiệm: P = x₁ · x₂ = 2 · 1/2 = 1 (đúng bằng c/a = 2/2 = 1). Kết quả hoàn toàn chính xác!',
      },
    },
    {
      id: 'm2',
      sender: 'user',
      time: '09:15',
      studentName: 'Khoa Lê',
      hasImage: true,
      imageCaption: 'Ảnh bài giải: Đề số 10 - Bài 3 (môn Toán 10)',
      imageNote: 'vbt_toan_bkt_viet.jpg',
      text: 'Đoạn này đổi biến trên này! Thầy giúp em xem tiếp bài số 3 này với ạ. Em tự giải toán và nhưng bị bối rối: Tìm điều kiện để phương trình có 2 nghiệm trái dấu, không biết là xét tích a.c < 0 hay phải tính cả biệt thức Delta trước ạ?',
      ocrStatus: 'Đã gửi và phân tích OCR',
    },
    {
      id: 'm3',
      sender: 'ai',
      time: '09:16',
      badge: 'Đã đọc ảnh OCR vở ghi',
      content: {
        intro: 'Thầy đã đọc từ bản giải trong ảnh của em rồi! Đề bài yêu cầu: "Tìm tham số m để phương trình x² - 2(m-1)x + 2m - 5 = 0 có hai nghiệm trái dấu".\n\nBăn khoăn của em là một trong những lỗi nhận thức kinh điển nhất ở nhóm chương này. Hãy cùng làm sáng tỏ bài toán qua bản đối chiếu sau:',
        fastBox: {
          title: 'Cách nhanh gọn [Tối ưu]',
          content: 'Phương trình có 2 nghiệm trái dấu khi và chỉ khi P = x₁ · x₂ < 0 (tức là: a · c < 0).\nVì a · c < 0 thì chắc chắn Δ = b² - 4ac > 0 luôn đúng (do b² ≥ 0 và -4ac > 0). Do đó KHÔNG CẦN phải kiểm tra điều kiện Δ!',
        },
        timeWasteBox: {
          title: 'Lỗi tốn thời gian phổ biến',
          content: 'Học sinh thường đặt đồng thời cả 2 điều kiện:\n{ Δ > 0 và P = c/a < 0 }\nGiải cách này kết quả vẫn đúng, nhưng em mất thêm 2-3 phút giải bất phương trình bậc hai chứa tham số m mà thực chất là thừa thãi!',
        },
        interactiveTask: {
          title: 'Thử sức ngay bước kết luận:',
          prompt: 'Với phương trình trên, a = 1; c = 2m - 5. Em hãy nhẩm nhanh điều kiện: 1 · (2m - 5) < 0 => Giá trị của m nằm trong khoảng nào sau đây?',
          options: [
            { id: 'opt_a', text: 'A. m < 5/2', isCorrect: true, feedback: 'Chính xác 100%! 1 · (2m - 5) < 0 <=> 2m < 5 <=> m < 5/2. Em nắm bài rất nhanh!' },
            { id: 'opt_b', text: 'B. m > 5/2', isCorrect: false, feedback: 'Chưa đúng, chuyển vế đổi dấu: 2m < 5 => m < 5/2 chứ không phải lớn hơn nhé.' },
            { id: 'opt_c', text: 'C. m < -5/2', isCorrect: false, feedback: 'Chú ý dấu của -5 khi chuyển qua vế phải thành +5, nên m < 5/2.' },
            { id: 'opt_d', text: 'D. m > 0', isCorrect: false, feedback: 'Chưa đủ điều kiện, c = 2m - 5 cần nhỏ hơn 0.' },
          ]
        }
      }
    }
  ]
};
