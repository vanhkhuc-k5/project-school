// =============================================================================
// ExamDocxParser — Parse Word documents into quiz questions
// Features: Drag-drop upload, DOCX parsing, question review/editing
// =============================================================================
import React, { useState, useRef, useCallback } from 'react';
import { Card } from '../Card';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { Modal } from '../Modal';
import { smartLearningApi, type ParsedQuestion } from '../../services/api';
import {
  Upload,
  FileText,
  X,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Edit,
  Trash2,
  ArrowRight,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ExamDocxParserProps {
  isOpen?: boolean;
  onClose?: () => void;
  onQuestionsParsed?: (questions: ParsedQuestion[]) => void;
  subject?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty Colors
// ─────────────────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLES = {
  NB: { label: 'NB', color: 'text-blue-600 bg-blue-50', desc: 'Nhận biết' },
  TH: { label: 'TH', color: 'text-emerald-600 bg-emerald-50', desc: 'Thông hiểu' },
  VD: { label: 'VD', color: 'text-amber-600 bg-amber-50', desc: 'Vận dụng' },
  VDC: { label: 'VDC', color: 'text-purple-600 bg-purple-50', desc: 'VD cao' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExamDocxParser({
  isOpen = true,
  onClose,
  onQuestionsParsed,
  subject,
}: ExamDocxParserProps) {
  const [step, setStep] = useState<'upload' | 'parsing' | 'review' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<ParsedQuestion | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.docx') && !selectedFile.name.endsWith('.doc')) {
      setError('Vui lòng chọn file Word (.docx hoặc .doc)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setStep('parsing');
    setProgress(10);

    try {
      // Read file as base64
      setProgress(30);
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      setProgress(50);

      // Parse with backend
      setProgress(70);
      const result = await smartLearningApi.parseExamDocx(base64, selectedFile.name, subject);
      
      if (result?.questions) {
        setQuestions(result.questions);
        setProgress(100);
        setStep('review');
      } else {
        throw new Error('Không thể phân tích file. Vui lòng thử lại.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi phân tích file');
      setStep('upload');
      setFile(null);
    }
  }, [subject]);

  // Handle drag-drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Handle drag-over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Edit question
  const handleEditQuestion = (question: ParsedQuestion) => {
    setEditingQuestion({ ...question });
  };

  // Save edited question
  const handleSaveQuestion = () => {
    if (editingQuestion) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.number === editingQuestion.number ? editingQuestion : q
        )
      );
      setEditingQuestion(null);
    }
  };

  // Delete question
  const handleDeleteQuestion = (questionNumber: string) => {
    setQuestions((prev) => prev.filter((q) => q.number !== questionNumber));
  };

  // Change difficulty
  const handleDifficultyChange = (questionNumber: string, difficulty: 'NB' | 'TH' | 'VD' | 'VDC') => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.number === questionNumber ? { ...q, difficulty } : q
      )
    );
  };

  // Change correct answer
  const handleCorrectAnswerChange = (questionNumber: string, answerIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.number === questionNumber) {
          const newOptions = q.options.map((opt, idx) => ({
            ...opt,
            isCorrect: idx === answerIndex,
          }));
          return { ...q, options: newOptions, correct_answer: answerIndex };
        }
        return q;
      })
    );
  };

  // Confirm and return questions
  const handleConfirm = () => {
    onQuestionsParsed?.(questions);
    setStep('done');
    setTimeout(() => {
      setStep('upload');
      setFile(null);
      setQuestions([]);
      onClose?.();
    }, 500);
  };

  // Reset
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setQuestions([]);
    setError(null);
    setProgress(0);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-ocean/30 rounded-xl p-8 text-center hover:border-ocean/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc"
            className="hidden"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) handleFileSelect(selectedFile);
            }}
          />
          
          <Upload className="w-12 h-12 mx-auto text-ocean/60 mb-4" />
          
          <h3 className="text-base font-semibold text-text-primary mb-2">
            Tải lên đề thi Word
          </h3>
          
          <p className="text-sm text-text-secondary mb-4">
            Kéo thả file .docx hoặc click để chọn file
          </p>
          
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="info">.docx</Badge>
            <Badge variant="info">.doc</Badge>
            <Badge variant="neutral">Tự động nhận diện câu hỏi</Badge>
            <Badge variant="neutral">Hỗ trợ A/B/C/D</Badge>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Parsing */}
      {step === 'parsing' && (
        <div className="border border-ocean/20 rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <Loader2 className="w-16 h-16 animate-spin text-ocean" />
          </div>
          
          <h3 className="text-base font-semibold text-text-primary mb-2">
            Đang phân tích đề thi...
          </h3>
          
          <p className="text-sm text-text-secondary mb-4">
            {file?.name}
          </p>

          {/* Progress Bar */}
          <div className="w-full max-w-xs mx-auto">
            <div className="h-2 bg-surface-neutral rounded-full overflow-hidden">
              <div
                className="h-full bg-ocean transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary mt-2">{progress}%</p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review Questions */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-800">
                  Phân tích thành công!
                </h3>
                <p className="text-xs text-emerald-600">
                  {questions.length} câu hỏi trắc nghiệm đã được nhận diện
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Tải lại file khác
            </Button>
          </div>

          {/* Questions List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {questions.map((question, idx) => (
              <Card key={question.number || idx} padding="p-4" className="hover:border-ocean/30 transition-colors">
                <div className="space-y-3">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">Câu {idx + 1}</Badge>
                      
                      {/* Difficulty Selector */}
                      <select
                        value={question.difficulty}
                        onChange={(e) => handleDifficultyChange(question.number || String(idx + 1), e.target.value as 'NB' | 'TH' | 'VD' | 'VDC')}
                        className="h-6 px-2 text-[10px] border border-hairline rounded bg-white"
                      >
                        {Object.entries(DIFFICULTY_STYLES).map(([key, style]) => (
                          <option key={key} value={key}>{style.label} - {style.desc}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="p-1.5 rounded hover:bg-surface-neutral text-text-secondary hover:text-ocean"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.number || String(idx + 1))}
                        className="p-1.5 rounded hover:bg-red-50 text-text-secondary hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm text-text-primary font-medium">
                    {question.prompt}
                  </p>

                  {/* Options */}
                  <div className="space-y-1.5">
                    {question.options.map((option, optIdx) => (
                      <div
                        key={optIdx}
                        onClick={() => handleCorrectAnswerChange(question.number || String(idx + 1), optIdx)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          option.isCorrect
                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                            : 'bg-surface-neutral hover:bg-gray-100 text-text-secondary'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          option.isCorrect
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          {option.isCorrect && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-medium">{option.key}.</span>
                        <span className="text-xs flex-1">{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-hairline">
            <Button variant="secondary" onClick={handleReset}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleConfirm} icon={ArrowRight}>
              Xác nhận {questions.length} câu hỏi
            </Button>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <Modal
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          title="Chỉnh sửa câu hỏi"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Nội dung câu hỏi
              </label>
              <textarea
                value={editingQuestion.prompt}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, prompt: e.target.value })}
                rows={3}
                className="w-full p-3 border border-hairline rounded-lg text-sm"
              />
            </div>

            {editingQuestion.options.map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  onClick={() => {
                    const newOptions = editingQuestion.options.map((o, i) => ({
                      ...o,
                      isCorrect: i === idx,
                    }));
                    setEditingQuestion({ ...editingQuestion, options: newOptions });
                  }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                    option.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300'
                  }`}
                >
                  {option.isCorrect && <Check className="w-3 h-3" />}
                </div>
                <span className="text-xs font-medium w-4">{option.key}.</span>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...editingQuestion.options];
                    newOptions[idx] = { ...option, text: e.target.value };
                    setEditingQuestion({ ...editingQuestion, options: newOptions });
                  }}
                  className="flex-1 px-2 py-1 border border-hairline rounded text-sm"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setEditingQuestion(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSaveQuestion}>
                Lưu
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
