# BỘ PROMPT THỰC THI SPRINT ĐÊM: EDUPORTAL OVERNIGHT DEVELOPMENT

**Tài liệu:** `docs/plan/OVERNIGHT_SPRINT_PROMPTS.md`  
**Ngày lập:** 25/09/2026  
**Mục tiêu:** Cung cấp bộ 2 prompt chuẩn mực cho Cursor / AI Agent code thâu đêm đến sáng, bao gồm đầy đủ schema, backend modules, frontend components, quality gates và git push tự động.

---

## TASK 1: PHÂN HỆ SỔ ĐẦU BÀI ĐIỆN TỬ, COMMAND CENTER GVCN & GIAO DIỆN LỚP TRƯỞNG

### Prompt sao chép đưa vào Cursor:

```markdown
Bạn là chuyên gia Senior Fullstack Architect. Hãy triển khai Task 1: "Phân hệ Sổ Đầu Bài Điện Tử, Command Center Giáo Viên Chủ Nhiệm (Homeroom Hub) & Giao Diện Lớp Trưởng".

### 1. MỤC TIÊU NGHIỆP VỤ:
1. Sổ Đầu Bài Điện Tử (Digital Class Logbook):
   - Mỗi tiết dạy, giáo viên ghi nhận: Thứ/Ngày, Tiết dạy (1-10), Môn học, Tên bài học theo PPCT, Sĩ số (Có mặt/Vắng), Nhận xét tiết học, Xếp loại tiết (Tốt - 10đ, Khá - 8đ, TB - 6đ, Kém - 4đ), Ký nhận điện tử.
   - Ban Giám Hiệu và GVCN có thể theo dõi tiến độ sổ đầu bài của từng lớp theo tuần.
2. Command Center Giáo Viên Chủ Nhiệm (Homeroom Hub):
   - Tab "Sơ đồ chỗ ngồi": Bố trí dạng lưới 4 dãy bàn kéo-thả hoặc phân vị trí học sinh, gắn cờ cán sự lớp, bạn cần kèm cặp.
   - Tab "Đánh giá Hạnh kiểm / Rèn luyện TT22": Bảng đánh giá 4 mức (Tốt, Khá, Đạt, Chưa đạt) cho học kỳ.
   - Tính năng "AI Gợi ý Lời phê Học bạ": Nút bấm phân tích tự động điểm TB môn + chuyên cần + hạnh kiểm của học sinh để sinh 3 mẫu lời phê sư phạm mẫu mực (chuẩn phong cách giáo dục Việt Nam: trang trọng, khích lệ, nêu rõ ưu điểm và hướng rèn luyện), GVCN có thể duyệt áp dụng nhanh cho cả 45 học sinh.
3. Giao diện Lớp Trưởng / Ban Cán Sự (dựa trên migration 0035):
   - Tab "Nề nếp & Thi đua 15 phút": Điểm danh nhanh, ghi nhận vi phạm nề nếp (đồng phục, đi muộn, chưa học bài cũ, mất trật tự) theo 4 tổ trong lớp.

### 2. YÊU CẦU KỸ THUẬT:
1. Database Migration:
   - Tạo file migration server/shared/database/migrations/0036_digital_logbook_and_conduct.sql:
     - Bảng digital_class_logbooks (id, school_id, class_id, academic_year, semester, date, period_number, subject_id, teacher_id, lesson_title, present_count, absent_count, absent_student_ids, score, rating ['tot','kha','trung_binh','kem'], notes, teacher_signature, created_at, updated_at).
     - Bảng student_conduct_evaluations (id, school_id, student_id, class_id, academic_year, semester, conduct_grade ['tot','kha','dat','chua_dat'], teacher_comment, ai_suggested_comment, updated_by, created_at, updated_at).
     - Bảng class_discipline_records (id, school_id, class_id, group_id, student_id, date, violation_type, points_deducted, reported_by, notes, created_at).
2. Backend (server/modules/):
   - Tạo module server/modules/logbook/ theo cấu trúc Controller -> Service -> Repository -> Routes -> Schema (Zod validation).
   - Mở rộng server/modules/gradebook/ thêm endpoint sinh lời phê học bạ AI: POST /api/v1/gradebook/classes/:classId/ai-report-comments.
   - Mở rộng server/modules/leadership/ cho phép lớp trưởng ghi nhận nề nếp thi đua tổ.
   - Đăng ký routes vào server/index.js.
3. Frontend:
   - Thêm phương thức API vào src/services/api.ts (typed đầy đủ).
   - Trong src/pages/teacher/TeacherClassesPage.tsx, bổ sung thêm 2 Tab chính:
     - Tab Sổ Đầu Bài (ghi bài học, sĩ số, xếp loại tiết học).
     - Tab Công Tác Chủ Nhiệm (Sơ đồ lớp, Đánh giá hạnh kiểm TT22, Trợ lý AI viết lời phê học bạ).
   - Trong src/pages/student/StudentDashboard.tsx hoặc màn hình riêng: Nếu học sinh có vai trò class_monitor trong bảng student_class_positions, hiển thị thêm Widget "Theo dõi Nề nếp Thi đua Lớp".
   - Tuân thủ nghiêm ngặt DESIGN.md (Slate #0F172A, Ocean Blue #0284C7, font Inter, Lucide icons, 5 trạng thái Loading/Empty/Success/Validation/Error).

### 3. KIỂM ĐỊNH QUALITY GATES (BẮT BUỘC):
Chạy kiểm tra lần lượt:
1. npx tsc --noEmit (đảm bảo 0 lỗi TypeScript).
2. npm test (đảm bảo 100% tests PASS).
3. npm run build (đảm bảo build thành công, không lỗi syntax/import).

### 4. ĐỒNG BỘ GIT (BẮT BUỘC THỰC THI Ở CUỐI):
Sau khi toàn bộ kiểm định pass, tự động chạy lệnh:
git add .
git commit -m "feat(homeroom): implement digital class logbook, homeroom hub, AI report card comments and class monitor conduct tracking"
git push origin main
```

---

## TASK 2: PHÂN HỆ SMART LEARNING HUB (FLASHCARD, LỚP HỌC ĐẢO NGƯỢC & BÓC TÁCH ĐỀ THI WORD)

### Prompt sao chép đưa vào Cursor:

```markdown
Bạn là chuyên gia Senior Fullstack Architect. Hãy triển khai Task 2: "Phân hệ Smart Learning Hub Cho Học Sinh & Công Cụ Bóc Tách Đề Thi File Word Cho Giáo Viên".

### 1. MỤC TIÊU NGHIỆP VỤ:
1. Bộ Flashcard Spaced Repetition (Thuật toán SM-2) Cho Học Sinh:
   - Hỗ trợ các bộ thẻ theo môn học:
     - Tiếng Anh: Từ vựng, phiên âm IPA, định nghĩa, câu ví dụ, nút bấm Audio phát âm (Web Speech API / TTS).
     - Toán - Lý - Hóa: Định lý, công thức toán học KaTeX, hình ảnh minh họa.
     - Lịch sử - Địa lý: Mốc sự kiện, ý nghĩa lịch sử.
   - Thuật toán lặp lại ngắt quãng (Spaced Repetition SM-2): Học sinh đánh giá độ nhớ (Quên - 1, Khó - 2, Nhớ tốt - 3, Quá dễ - 4), hệ thống tự động tính khoảng cách ngày ôn tập tiếp theo (interval, ease_factor, repetitions).
2. Chế Độ Lớp Học Đảo Ngược (Flipped Classroom Preview):
   - Trên trang Thời Khóa Biểu (StudentTimetablePage.tsx), thêm nút "Xem bài trước giờ học" cho từng tiết học:
     - Xem slide tóm tắt / sơ đồ tư duy (mindmap) bài học sắp tới.
     - Làm 3 câu hỏi Warm-up mini quiz kiểm tra mức độ sẵn sàng.
3. Sổ Tay Tra Cứu Số & Bảng Tuần Hoàn Hóa Học Tương Tác:
   - Tạo trang/modal Bảng tuần hoàn các nguyên tố hóa học tương tác (Interactive Periodic Table): Phân loại màu sắc theo Kim loại kiềm, Halogen, Khí hiếm... Bấm vào nguyên tố xem Số hiệu nguyên tử Z, Nguyên tử khối, Cấu hình electron, Hóa trị.
   - Sổ tay công thức Toán - Lý tra cứu nhanh theo chuyên đề.
4. Công Cụ Bóc Tách Đề Thi Từ File Word (.docx) Cho Giáo Viên:
   - Trên trang CreateAssignment.tsx, thêm nút "Nhập từ file Word (.docx)":
     - Giáo viên upload file đề thi .docx.
     - Bộ parser phía backend/frontend tự động phân tích cấu trúc: Nhận diện "Câu 1:", nội dung câu hỏi, 4 phương án A/B/C/D, và nhận diện đáp án đúng (dựa vào gạch chân, in đậm, hoặc đáp án đỏ/bảng đáp án cuối file).
     - Tự động điền 40 câu hỏi vào form bài tập trong 2 giây để giáo viên rà soát và lưu.

### 2. YÊU CẦU KỸ THUẬT:
1. Database Migration:
   - Tạo file migration server/shared/database/migrations/0037_smart_learning_and_flashcards.sql:
     - Bảng flashcard_decks (id, school_id, subject_id, grade_level, title, description, is_system, created_by, created_at).
     - Bảng flashcard_cards (id, deck_id, front_text, back_text, phonetic, audio_url, hint, formula_latex, created_at).
     - Bảng student_flashcard_progress (id, student_id, card_id, repetitions, ease_factor, interval_days, next_review_date, last_reviewed_at, UNIQUE(student_id, card_id)).
     - Bảng flipped_classroom_materials (id, school_id, class_id, subject_id, timetable_entry_id, title, slide_url, summary_text, warmup_questions_json, created_at).
2. Backend (server/modules/):
   - Tạo module server/modules/smart-learning/:
     - Endpoints Flashcards: GET /api/v1/smart-learning/flashcards/decks, GET /decks/:id/cards, POST /cards/:id/review (tính toán thuật toán SM-2).
     - Endpoints Lớp học đảo ngược: GET /api/v1/smart-learning/flipped-materials/:timetableId.
     - Endpoints Parser đề thi Word: POST /api/v1/smart-learning/parse-exam-docx (sử dụng mammoth hoặc regex parser bóc tách text sang cấu trúc câu hỏi trắc nghiệm).
3. Frontend:
   - Thêm phương thức API vào src/services/api.ts.
   - Tạo component src/components/learning/FlashcardStudyModal.tsx với hiệu ứng lật thẻ 3D mượt mà (Flip Card CSS), phát âm audio và 4 nút đánh giá SM-2.
   - Tạo component src/components/learning/PeriodicTableModal.tsx tương tác trực quan.
   - Thêm tab "Góc học tập thông minh" vào src/pages/student/StudentResourcesPage.tsx hoặc Dashboard.
   - Cập nhật src/pages/student/StudentTimetablePage.tsx thêm nút "Xem bài học trước".
   - Cập nhật src/pages/teacher/CreateAssignment.tsx thêm khu vực kéo thả Upload file .docx bóc tách câu hỏi.
   - Tuân thủ thiết kế DESIGN.md (Scandinavian Banking style, màu Slate #0F172A, Ocean Blue #0284C7, không dùng icon ngoài Lucide React).

### 3. KIỂM ĐỊNH QUALITY GATES (BẮT BUỘC):
Chạy kiểm tra lần lượt:
1. npx tsc --noEmit (đảm bảo 0 lỗi TypeScript).
2. npm test (đảm bảo 100% tests PASS).
3. npm run build (đảm bảo build thành công sạch sẽ).

### 4. ĐỒNG BỘ GIT (BẮT BUỘC THỰC THI Ở CUỐI):
Sau khi toàn bộ kiểm định pass, tự động chạy lệnh:
git add .
git commit -m "feat(learning): implement SM-2 flashcards, flipped classroom preview, periodic table and docx exam parser"
git push origin main
```
