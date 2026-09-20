import express from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get chat messages
router.get('/messages', optionalAuth, (req, res) => {
  const studentId = 'std_khang';
  const savedMessages = db.prepare(`
    SELECT * FROM ai_tutor_messages
    WHERE student_id = ?
    ORDER BY created_at ASC
  `).all(studentId);

  res.json({
    success: true,
    messages: savedMessages.map((m) => ({
      id: m.id,
      sender: m.sender,
      time: '09:15',
      studentName: 'Khoa Lê',
      text: m.text,
      hasImage: m.has_image === 1,
      imageCaption: m.image_caption,
      imageNote: 'vbt_toan_bkt_viet.jpg',
      ocrStatus: m.ocr_status,
      badge: m.sender === 'ai' ? 'Phản hồi Socratic' : undefined,
      content: m.ai_content ? JSON.parse(m.ai_content) : { intro: m.text },
    })),
  });
});

// Chat endpoint
router.post('/chat', optionalAuth, (req, res) => {
  const { text, topic } = req.body;
  const studentId = 'std_khang';

  if (!text) return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });

  // 1. Save user message
  const userMsgId = `msg_u_${Date.now()}`;
  db.prepare(`
    INSERT INTO ai_tutor_messages (id, student_id, topic, sender, text)
    VALUES (?, ?, ?, 'user', ?)
  `).run(userMsgId, studentId, topic || 'Toán 10', text);

  // 2. Generate Socratic AI response
  let aiReplyText = '';
  let aiContent = null;

  const lower = text.toLowerCase();
  if (lower.includes('tam thức') || lower.includes('nghiệm') || lower.includes('vi-ét') || lower.includes('delta')) {
    aiReplyText = 'Thầy hiểu em đang băn khoăn về nghiệm phương trình. Theo phương pháp Socratic: Em hãy cho thầy biết dấu của hệ số a và biệt thức Δ liên hệ như thế nào với đồ thị parabol nhé?';
    aiContent = {
      intro: aiReplyText,
      fastBox: {
        title: 'Gợi ý tư duy nhanh [Phương pháp Socratic]',
        content: 'Để xét dấu tam thức bậc hai f(x) = ax² + bx + c:\n- Nếu Δ < 0 thì f(x) luôn cùng dấu với hệ số a với mọi x ∈ ℝ.\n- Nếu Δ = 0 thì f(x) cùng dấu với a với mọi x ≠ -b/2a.\n- Nếu Δ > 0 thì "Trong trái - Ngoài cùng"!',
      }
    };
  } else {
    aiReplyText = `Cảm ơn em đã gửi câu hỏi về "${text}". Thầy Gia sư AI đã ghi nhận bài tập. Trước khi giải chi tiết, em hãy xác định các giả thiết đã cho và điều kiện cần tìm để mình cùng phân tích từng bước nhé!`;
    aiContent = { intro: aiReplyText };
  }

  // 3. Save AI message
  const aiMsgId = `msg_ai_${Date.now()}`;
  db.prepare(`
    INSERT INTO ai_tutor_messages (id, student_id, topic, sender, text, ai_content)
    VALUES (?, ?, ?, 'ai', ?, ?)
  `).run(aiMsgId, studentId, topic || 'Toán 10', aiReplyText, JSON.stringify(aiContent));

  const responsePayload = {
    id: aiMsgId,
    sender: 'ai',
    text: aiReplyText,
    time: 'Vừa xong',
    badge: 'Phản hồi Socratic thời gian thực',
    content: aiContent,
  };

  res.json({
    success: true,
    reply: responsePayload,
    aiReply: responsePayload,
  });
});

export default router;
