import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { aiTutorApi } from '../../services/api';
import {
  Sparkles,
  History,
  RotateCcw,
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
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';

// ── Default topic list for unauthenticated/demo mode ───────────────────────────
const DEFAULT_TOPICS = [
  'Toán 10 - Phương trình bậc 2 & Định lý Vi-ét',
  'Toán 10 - Bất phương trình bậc hai một ẩn',
  'Toán 10 - Dấu của tam thức bậc hai',
  'Vật lý 11 - Định luật Ôm cho toàn mạch',
  'Hóa học 11 - Cân bằng phản ứng Oxi hóa - Khử',
];

const DEFAULT_QUICK_CHIPS = [
  '💡 Gợi ý tiếp',
  '⚡ Giải thích lại dễ hiểu hơn',
  '✍️ Cho ví dụ tương tự tự luyện',
  '🔍 Kiểm tra đáp án câu 1.1b',
  '📋 Tóm tắt sơ đồ tư duy Định lý Vi-ét',
];

// ── Normalize a backend message to the shape the UI expects ───────────────────
function normalizeMessage(msg, fallbackName = 'Học sinh') {
  if (!msg) return null;
  return {
    id: msg.id || `msg_${Date.now()}`,
    sender: msg.sender || 'user',
    text: msg.text || msg.content?.intro || '',
    time: msg.time || formatTime(msg.createdAt || new Date().toISOString()),
    studentName: msg.studentName || fallbackName,
    topic: msg.topic || '',
    hasImage: Boolean(msg.hasImage || msg.has_image),
    imageCaption: msg.imageCaption || msg.image_caption || '',
    imageNote: msg.imageNote || '',
    badge: msg.badge || undefined,
    ocrStatus: msg.ocrStatus || msg.ocr_status || undefined,
    content: msg.content || (msg.aiContent ? { intro: msg.text } : { intro: msg.text }),
  };
}

function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Vừa xong';
  }
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-ocean" />
      <span>AI đang suy nghĩ…</span>
    </div>
  );
}

export function AiTutorPage() {
  const [messages, setMessages] = useState([]);
  const [topics, setTopics] = useState(DEFAULT_TOPICS);
  const [selectedTopic, setSelectedTopic] = useState(DEFAULT_TOPICS[0]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load initial conversation history ─────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadError(null);
    try {
      const history = await aiTutorApi.getMessages({ topic: selectedTopic });
      if (history && history.length > 0) {
        setMessages(history.map(m => normalizeMessage(m)));
      }
    } catch (err) {
      console.warn('[AiTutor] Could not load history:', err.message);
      setIsOnline(false);
    }
  }, [selectedTopic]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Auto-scroll to bottom when new messages arrive ───────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  // ── Send message to AI Tutor backend ────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      time: 'Vừa xong',
      studentName: 'Học sinh',
      topic: selectedTopic,
      content: { intro: text },
    };

    // Optimistically append user message
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsAiTyping(true);
    setLoadError(null);

    try {
      const reply = await aiTutorApi.sendMessage(text, selectedTopic);

      if (reply) {
        const normalizedReply = normalizeMessage(reply);
        setMessages(prev => [...prev, normalizedReply]);
      } else {
        // Backend returned failure — show error banner
        setLoadError('Gia sư AI không phản hồi. Vui lòng thử lại.');
        setMessages(prev => prev.slice(0, -1)); // rollback optimistic user msg
      }
    } catch (err) {
      console.error('[AiTutor] Chat error:', err);
      setLoadError(`Lỗi: ${err.message || 'Không thể kết nối Gia sư AI.'}`);
      setMessages(prev => prev.slice(0, -1)); // rollback optimistic user msg
    } finally {
      setIsAiTyping(false);
      inputRef.current?.focus();
    }
  };

  // ── Clear conversation ────────────────────────────────────────────────────
  const handleClear = async () => {
    try {
      await aiTutorApi.clearMessages(selectedTopic);
      setMessages([]);
    } catch (err) {
      console.warn('[AiTutor] Clear failed:', err.message);
    }
  };

  // ── Quick suggestion chip click ─────────────────────────────────────────
  const handleQuickChip = (chip) => {
    // Strip emoji prefix to get the actual prompt text
    const text = chip.replace(/^[^\w\s]+\s*/, '').trim();
    setInputText(text);
    inputRef.current?.focus();
  };

  // ── Quiz option click ───────────────────────────────────────────────────
  const handleOptionClick = (opt) => {
    setSelectedOption(opt.id);
    setQuizFeedback(opt.feedback);
  };

  // ── Copy / speak actions ────────────────────────────────────────────────
  const handleCopy = () => {
    const lastAiMsg = [...messages].reverse().find(m => m.sender === 'ai');
    const text = lastAiMsg?.content?.intro || lastAiMsg?.text || '';
    navigator.clipboard?.writeText?.(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    const lastAiMsg = [...messages].reverse().find(m => m.sender === 'ai');
    const text = lastAiMsg?.content?.intro || lastAiMsg?.text || '';
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Banner ──────────────────────────────────────────────── */}
      <Card padding="p-5" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-primary text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-sky" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-medium text-text-primary">Gia sư AI EduPortal</h1>
                <Badge variant={isOnline ? 'success' : 'warning'} size="sm">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                  <span>{isOnline ? 'Trực tuyến' : 'Chế độ offline'}</span>
                </Badge>
              </div>
              <p className="text-xs text-text-secondary">
                Trợ lý sư phạm cá nhân hóa — phương pháp Socratic (dẫn dắt tư duy tự học)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={isOnline ? Wifi : WifiOff}
              onClick={() => setIsOnline(prev => !prev)}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Button>
            <Button variant="secondary" size="sm" icon={History} onClick={loadHistory}>
              Lịch sử
            </Button>
            <Button variant="primary" size="sm" icon={RotateCcw} onClick={handleClear}>
              Xóa đoạn chat
            </Button>
          </div>
        </div>

        {/* Topic selector */}
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
              {topics.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {loadError && (
        <ErrorBanner message={loadError} onRetry={handleSend} />
      )}

      {/* ── Message Stream ──────────────────────────────────────────── */}
      <div className="space-y-6 min-h-[300px]">
        {messages.length === 0 && !isAiTyping && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-sky/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-ocean" />
            </div>
            <p className="text-sm text-text-secondary max-w-sm">
              Chào em! Em có thể đặt câu hỏi về bài tập, giải thích khái niệm,
              hoặc nhờ thầy hướng dẫn từng bước giải bài toán nhé.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {DEFAULT_QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickChip(chip)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-pill bg-surface-neutral hover:bg-sky text-xs text-text-secondary hover:text-primary transition-colors border border-hairline"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
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
                    {/* Main text content */}
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                      {msg.content?.intro || msg.text}
                    </p>

                    {/* Formula box */}
                    {msg.content?.formula && (
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
                    {msg.content?.step1Title && (
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
                    {msg.content?.step2Title && (
                      <div className="space-y-2 text-xs">
                        <div className="font-medium text-text-primary flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">2</span>
                          <span>{msg.content.step2Title}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                          {msg.content.root1 && (
                            <div className="p-2.5 bg-sky/40 border border-ocean/20 rounded font-medium text-primary">
                              {msg.content.root1}
                            </div>
                          )}
                          {msg.content.root2 && (
                            <div className="p-2.5 bg-sky/40 border border-ocean/20 rounded font-medium text-primary">
                              {msg.content.root2}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tip box */}
                    {msg.content?.tipTitle && (
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

                    {/* Fast box */}
                    {msg.content?.fastBox && (
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

                    {/* Timewaste box */}
                    {msg.content?.timeWasteBox && (
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
                    {msg.content?.interactiveTask && (
                      <div className="p-4 bg-white border-2 border-dashed border-ocean/40 rounded-card space-y-3">
                        <div className="text-xs font-medium text-primary flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-ocean" />
                          <span>{msg.content.interactiveTask.title}</span>
                        </div>
                        <p className="text-xs font-medium text-text-primary leading-relaxed">
                          {msg.content.interactiveTask.prompt}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(msg.content.interactiveTask.options || []).map((opt) => {
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

                  {/* AI message actions */}
                  <div className="flex items-center gap-3 text-xs text-text-secondary pl-1">
                    <button onClick={handleCopy} className="hover:text-primary flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Đã sao chép!' : 'Tóm chép'}</span>
                    </button>
                    <span>•</span>
                    <button onClick={handleSpeak} className="hover:text-primary flex items-center gap-1">
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-ocean animate-bounce' : ''}`} />
                      <span>{isSpeaking ? 'Đang đọc…' : 'Nghe giảng'}</span>
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
            // Student message
            return (
              <div key={msg.id} className="flex justify-end gap-3">
                <div className="max-w-2xl space-y-2 text-right">
                  <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">{msg.studentName}</span>
                    <span>{msg.time}</span>
                  </div>
                  <div className="bg-[#0F3D5C] text-white rounded-card p-5 shadow-whisper text-left space-y-3">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>

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
                          <div>Tìm m để pt có 2 nghiệm x₁, x₂ trái dấu…</div>
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

        {/* ── AI Typing Indicator ────────────────────────────────────── */}
        {isAiTyping && (
          <div className="flex gap-3 max-w-4xl">
            <div className="w-8 h-8 rounded-full bg-sky text-primary flex items-center justify-center shrink-0 border border-ocean/30">
              <Sparkles className="w-4 h-4 text-ocean" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">Gia sư AI</span>
                <LoadingIndicator />
              </div>
              <div className="bg-white rounded-card border border-hairline p-5 shadow-whisper">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-ocean animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-ocean animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-ocean animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>AI đang soạn câu trả lời…</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Box ────────────────────────────────────────────────── */}
      <Card padding="p-4" className="sticky bottom-4 z-20 shadow-popover">
        {/* Quick suggestion chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 hairline-b">
          {DEFAULT_QUICK_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickChip(chip)}
              className="whitespace-nowrap px-3 py-1.5 rounded-pill bg-surface-neutral hover:bg-sky text-xs text-text-secondary hover:text-primary transition-colors border border-hairline"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Text area */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Đặt câu hỏi cho Gia sư AI hoặc dán nội dung bài tập vào đây (Shift + Enter để xuống dòng)…"
            rows={3}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none resize-none"
            disabled={isAiTyping}
          />
        </div>

        {/* Toolbar & send */}
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
              disabled={isAiTyping || !inputText.trim()}
            >
              Gửi câu hỏi
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
