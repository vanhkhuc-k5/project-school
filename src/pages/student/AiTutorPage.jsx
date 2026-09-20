import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { AI_TUTOR_INITIAL_DATA } from '../../mock/aiTutorData';
import { aiTutorApi } from '../../services/api';
import {
  Sparkles,
  History,
  RotateCcw,
  BookOpen,
  Send,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Copy,
  Volume2,
  ThumbsUp,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

export function AiTutorPage() {
  const [data, setData] = useState(AI_TUTOR_INITIAL_DATA);
  const [selectedTopic, setSelectedTopic] = useState(data.currentTopic);
  const [inputText, setInputText] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

  useEffect(() => {
    let mounted = true;
    aiTutorApi.getMessages().then((msgs) => {
      if (mounted && msgs && msgs.length > 0) {
        setData((prev) => ({ ...prev, messages: msgs }));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    const newMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      time: 'Vừa xong',
      studentName: 'Khoa Lê',
      text: text,
    };
    setData((prev) => ({
      ...prev,
      messages: [...prev.messages, newMsg],
    }));
    setInputText('');
    setIsAiTyping(true);

    try {
      const reply = await aiTutorApi.sendMessage(text, selectedTopic);
      if (reply) {
        setData((prev) => ({
          ...prev,
          messages: [...prev.messages, reply],
        }));
      }
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleOptionClick = (opt) => {
    setSelectedOption(opt.id);
    setQuizFeedback(opt.feedback);
  };

  const handleGeneratePracticeQuiz = () => {
    setIsAiTyping(true);
    setTimeout(() => {
      const quizMsg = {
        id: `ai_quiz_${Date.now()}`,
        sender: 'ai',
        time: 'Vừa xong',
        badge: 'Bộ đề luyện tập thông minh',
        content: {
          intro: `Gia sư AI đã tổng hợp bộ 3 câu hỏi trắc nghiệm trọng tâm về chuyên đề "${selectedTopic}". Hãy chọn câu trả lời đúng bên dưới để hệ thống đánh giá mức độ hiểu bài nhé:`,
          interactiveTask: {
            title: `Câu hỏi củng cố: ${selectedTopic}`,
            prompt: 'Điều kiện cần và đủ để tam thức bậc hai f(x) = ax² + bx + c luôn dương với mọi x thuộc R là:',
            options: [
              { id: 'A', text: 'a > 0 và Δ < 0', isCorrect: true, feedback: 'Chính xác! Khi a > 0 và Δ < 0 thì đồ thị parabol nằm hoàn toàn phía trên trục hoành.' },
              { id: 'B', text: 'a > 0 và Δ > 0', isCorrect: false, feedback: 'Chưa đúng. Khi Δ > 0 thì tam thức có 2 nghiệm phân biệt và đổi dấu qua 2 nghiệm đó.' },
              { id: 'C', text: 'a < 0 và Δ < 0', isCorrect: false, feedback: 'Chưa đúng. Khi a < 0 và Δ < 0 thì f(x) luôn âm với mọi x.' },
              { id: 'D', text: 'a > 0 và Δ = 0', isCorrect: false, feedback: 'Chưa đủ. Khi Δ = 0 thì f(x) ≥ 0, có 1 điểm tại x = -b/2a bằng 0 chứ không dương hẳn.' },
            ],
          },
        },
      };
      setData((prev) => ({
        ...prev,
        messages: [...prev.messages, quizMsg],
      }));
      setIsAiTyping(false);
    }, 600);
  };

  const handleCopyFormula = () => {
    navigator.clipboard?.writeText?.('x = (-b ± √Δ) / 2a');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    setIsSpeaking(!isSpeaking);
    setTimeout(() => setIsSpeaking(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <Card padding="p-5" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-primary text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-sky" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-medium text-text-primary">Gia sư AI EduNordic</h1>
                <Badge variant="success" size="sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Sẵn sàng 24/7</span>
                </Badge>
              </div>
              <p className="text-xs text-text-secondary">
                Trợ lý sư phạm cá nhân hóa phương pháp Socratic (dẫn dắt tư duy tự học)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={handleGeneratePracticeQuiz}
            >
              Luyện tập nhanh
            </Button>
            <Button variant="secondary" size="sm" icon={History}>
              Lịch sử
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={RotateCcw}
              onClick={() => setData(AI_TUTOR_INITIAL_DATA)}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Topic dropdown selector */}
        <div className="flex items-center gap-3 pt-3 hairline-t">
          <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
            Chủ đề hiện tại:
          </span>
          <div className="relative flex-1 max-w-md">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full h-9 pl-3 pr-8 bg-surface-neutral border border-hairline rounded text-xs text-text-primary font-medium focus:border-ocean outline-none appearance-none"
            >
              {data.topics.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Chat Messages Stream */}
      <div className="space-y-6">
        {data.messages.map((msg) => {
          if (msg.sender === 'ai') {
            return (
              <div key={msg.id} className="flex gap-3 max-w-4xl">
                {/* AI Avatar */}
                <div className="w-8 h-8 rounded-full bg-sky text-primary flex items-center justify-center shrink-0 border border-ocean/30">
                  <Sparkles className="w-4 h-4 text-ocean" />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">Gia sư AI</span>
                    <span className="text-[11px] text-text-secondary">{msg.time}</span>
                    {msg.badge && <Badge variant="info" size="sm">{msg.badge}</Badge>}
                  </div>

                  <div className="bg-white rounded-card border border-hairline p-5 shadow-whisper space-y-4">
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                      {msg.content.intro}
                    </p>

                    {/* Formula standard box if present */}
                    {msg.content.formula && (
                      <div className="p-4 bg-surface-neutral rounded border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block">
                            {msg.content.formulaTitle}
                          </span>
                          <span className="text-base font-semibold text-primary tracking-wide">
                            {msg.content.formula}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-ocean bg-sky px-3 py-1 rounded">
                          {msg.content.sampleEq}
                        </span>
                      </div>
                    )}

                    {/* Step 1 */}
                    {msg.content.step1Title && (
                      <div className="space-y-1 text-xs">
                        <div className="font-medium text-text-primary flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">1</span>
                          <span>{msg.content.step1Title}</span>
                        </div>
                        <p className="text-text-secondary pl-5 whitespace-pre-line leading-relaxed">
                          {msg.content.step1Text}
                        </p>
                      </div>
                    )}

                    {/* Step 2 */}
                    {msg.content.step2Title && (
                      <div className="space-y-2 text-xs">
                        <div className="font-medium text-text-primary flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">2</span>
                          <span>{msg.content.step2Title}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                          <div className="p-2.5 bg-sky/40 border border-ocean/20 rounded font-medium text-primary">
                            {msg.content.root1}
                          </div>
                          <div className="p-2.5 bg-sky/40 border border-ocean/20 rounded font-medium text-primary">
                            {msg.content.root2}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tip box */}
                    {msg.content.tipTitle && (
                      <div className="p-3.5 bg-sky/50 border border-ocean/20 rounded text-xs space-y-1">
                        <div className="font-medium text-primary flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-ocean" />
                          <span>{msg.content.tipTitle}</span>
                        </div>
                        <p className="text-text-secondary whitespace-pre-line leading-relaxed">
                          {msg.content.tipText}
                        </p>
                      </div>
                    )}

                    {/* Fast box & Timewaste box in OCR response */}
                    {msg.content.fastBox && (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded space-y-1.5">
                        <div className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span>{msg.content.fastBox.title}</span>
                        </div>
                        <p className="text-xs text-text-primary whitespace-pre-line leading-relaxed">
                          {msg.content.fastBox.content}
                        </p>
                      </div>
                    )}

                    {msg.content.timeWasteBox && (
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded space-y-1.5">
                        <div className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-warning-dark" />
                          <span>{msg.content.timeWasteBox.title}</span>
                        </div>
                        <p className="text-xs text-text-primary whitespace-pre-line leading-relaxed">
                          {msg.content.timeWasteBox.content}
                        </p>
                      </div>
                    )}

                    {/* Interactive Quiz Task */}
                    {msg.content.interactiveTask && (
                      <div className="p-4 bg-white border-2 border-dashed border-ocean/40 rounded-card space-y-3">
                        <div className="text-xs font-medium text-primary flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-ocean" />
                          <span>{msg.content.interactiveTask.title}</span>
                        </div>
                        <p className="text-xs font-medium text-text-primary leading-relaxed">
                          {msg.content.interactiveTask.prompt}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.content.interactiveTask.options.map((opt) => {
                            const isChosen = selectedOption === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => handleOptionClick(opt)}
                                className={`p-2.5 rounded text-xs text-left border transition-all ${
                                  isChosen
                                    ? opt.isCorrect
                                      ? 'bg-emerald-50 border-success text-success font-medium'
                                      : 'bg-red-50 border-danger text-danger font-medium'
                                    : 'bg-surface-neutral border-hairline hover:border-ocean text-text-primary'
                                }`}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                        {quizFeedback && (
                          <div className="p-3 bg-sky/50 rounded border border-ocean/20 text-xs text-text-primary flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-ocean shrink-0 mt-0.5" />
                            <span>{quizFeedback}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Message Action Buttons */}
                  <div className="flex items-center gap-3 text-xs text-text-secondary pl-1">
                    <button
                      onClick={handleCopyFormula}
                      className="hover:text-primary flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Đã sao chép!' : 'Tóm chép'}</span>
                    </button>
                    <span>•</span>
                    <button
                      onClick={handleSpeak}
                      className="hover:text-primary flex items-center gap-1"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-ocean animate-bounce' : ''}`} />
                      <span>{isSpeaking ? 'Đang đọc...' : 'Nghe giảng'}</span>
                    </button>
                    <span>•</span>
                    <button className="hover:text-primary flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Hài lòng?</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // Student Message
            return (
              <div key={msg.id} className="flex justify-end gap-3">
                <div className="max-w-2xl space-y-2 text-right">
                  <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">{msg.studentName || 'Khoa Lê'}</span>
                    <span>{msg.time}</span>
                  </div>

                  <div className="bg-[#0F3D5C] text-white rounded-card p-5 shadow-whisper text-left space-y-3">
                    <p className="text-sm leading-relaxed">{msg.text}</p>

                    {/* Handwriting Notebook Simulation Photo */}
                    {msg.hasImage && (
                      <div className="rounded border border-white/20 overflow-hidden bg-amber-50/95 text-slate-800 p-3 shadow-inner">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 hairline-b pb-1.5 mb-2 font-mono">
                          <span>📝 {msg.imageCaption}</span>
                          <span className="text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded">
                            {msg.imageNote}
                          </span>
                        </div>
                        <div className="font-serif italic text-xs leading-relaxed space-y-1 bg-white/70 p-2.5 rounded border border-amber-200/60">
                          <div>2. Bài tập:</div>
                          <div>Cho pt: x² - 2(m-1)x + 2m - 5 = 0</div>
                          <div>Tìm m để pt có 2 nghiệm x₁, x₂ trái dấu...</div>
                          <div className="text-ocean font-mono not-italic text-[11px]">
                            👉 Xét: P = c/a &lt; 0 &hArr; (2m - 5) / 1 &lt; 0 ???
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.ocrStatus && (
                      <div className="flex items-center gap-1.5 text-[11px] text-sky">
                        <FileCheck className="w-3.5 h-3.5 text-sky" />
                        <span>{msg.ocrStatus}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 border border-hairline overflow-hidden">
                  <img src="/assets/student_avatar.png" alt="Student" className="w-full h-full object-cover" />
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* Input Box with quick suggestion chips */}
      <Card padding="p-4" className="sticky bottom-4 z-20 shadow-popover">
        {/* Quick Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 hairline-b">
          {data.quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(chip.replace(/^[^\w\s]+\s*/, ''))}
              className="whitespace-nowrap px-3 py-1.5 rounded-pill bg-surface-neutral hover:bg-sky text-xs text-text-secondary hover:text-primary transition-colors border border-hairline"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Đặt câu hỏi cho Gia sư AI hoặc dán nội dung bài tập vào đây (Shift + Enter để xuống dòng)..."
            rows={3}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none resize-none"
          />
        </div>

        {/* Toolbar & Send button */}
        <div className="flex items-center justify-between pt-2 hairline-t">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-neutral rounded transition-colors"
              title="Tải ảnh bài tập lên"
            >
              <ImageIcon className="w-4 h-4 stroke-[1.75]" />
            </button>
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-neutral rounded transition-colors"
              title="Đính kèm tài liệu"
            >
              <Paperclip className="w-4 h-4 stroke-[1.75]" />
            </button>
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-neutral rounded transition-colors"
              title="Nhập bằng giọng nói"
            >
              <Mic className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-secondary hidden sm:inline">
              Nhấn Enter để gửi
            </span>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              iconPosition="right"
              onClick={handleSend}
            >
              Gửi câu hỏi
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
