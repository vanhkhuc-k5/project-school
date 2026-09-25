// =============================================================================
// FlashcardStudyModal — Interactive Flashcard with SM-2 Algorithm
// Features: 3D flip animation, audio pronunciation, 4 quality buttons
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { smartLearningApi, type FlashcardCard, type StudySession, type ReviewResult } from '../../services/api';
import {
  RotateCcw,
  Volume2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BookOpen,
  Award,
  Loader2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface FlashcardStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
  deckTitle: string;
  onComplete?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SM-2 Quality Options
// ─────────────────────────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
  { quality: 0, label: 'Quên hoàn toàn', color: 'bg-red-500 hover:bg-red-600', icon: '😵' },
  { quality: 1, label: 'Sai', color: 'bg-red-400 hover:bg-red-500', icon: '❌' },
  { quality: 2, label: 'Khó', color: 'bg-amber-500 hover:bg-amber-600', icon: '🤔' },
  { quality: 3, label: 'Nhớ tốt', color: 'bg-emerald-500 hover:bg-emerald-600', icon: '✓' },
  { quality: 4, label: 'Quá dễ', color: 'bg-blue-500 hover:bg-blue-600', icon: '🎉' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FlashcardStudyModal({
  isOpen,
  onClose,
  deckId,
  deckTitle,
  onComplete,
}: FlashcardStudyModalProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [speaking, setSpeaking] = useState(false);

  // Combine due and new cards for study
  const allCards = session
    ? [...(session.due_cards || []), ...(session.new_cards || [])]
    : [];

  const currentCard = allCards[currentIndex];
  const progress = allCards.length > 0 ? ((currentIndex) / allCards.length) * 100 : 0;
  const dueCount = session?.due_cards?.length || 0;
  const newCount = session?.new_cards?.length || 0;

  // Load study session
  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const result = await smartLearningApi.getStudySession(deckId, 20);
      setSession(result);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionComplete(false);
      setReviewResult(null);
    } catch (e) {
      console.error('Failed to load study session:', e);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    if (isOpen && deckId) {
      loadSession();
    }
  }, [isOpen, deckId, loadSession]);

  // Track card start time when card changes
  useEffect(() => {
    setCardStartTime(Date.now());
    setIsFlipped(false);
    setShowResult(false);
    setReviewResult(null);
  }, [currentIndex]);

  // Handle card flip
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Speak pronunciation using Web Speech API
  const handleSpeak = () => {
    if (!currentCard?.phonetic) return;
    
    setSpeaking(true);
    
    // Use Web Speech API for TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentCard.phonetic);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  };

  // Handle review with SM-2 quality
  const handleReview = async (quality: number) => {
    if (!currentCard) return;
    
    setIsReviewing(true);
    const responseTime = Date.now() - cardStartTime;
    
    try {
      const result = await smartLearningApi.reviewCard(currentCard.id, quality, responseTime);
      setReviewResult(result);
      setShowResult(true);
    } catch (e) {
      console.error('Failed to review card:', e);
    } finally {
      setIsReviewing(false);
    }
  };

  // Move to next card
  const handleNext = () => {
    if (currentIndex < allCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionComplete(true);
      onComplete?.();
    }
  };

  // Handle modal close
  const handleClose = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`📚 ${deckTitle}`}
      size="xl"
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-ocean" />
          <span className="text-sm">Đang tải thẻ học...</span>
        </div>
      ) : sessionComplete ? (
        // Session Complete Screen
        <div className="py-12 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <Award className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary">Hoàn thành buổi học!</h3>
          <p className="text-sm text-text-secondary">
            Bạn đã ôn tập {allCards.length} thẻ. Hẹn gặp lại vào lần sau!
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Button variant="secondary" onClick={loadSession}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Học lại
            </Button>
            <Button variant="primary" onClick={handleClose}>
              Đóng
            </Button>
          </div>
        </div>
      ) : allCards.length === 0 ? (
        // Empty Session
        <div className="py-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-text-secondary/40" />
          <h3 className="text-lg font-semibold text-text-primary">Không có thẻ để học</h3>
          <p className="text-sm text-text-secondary">
            Tất cả thẻ đã được ôn tập. Hẹn gặp lại vào ngày mai!
          </p>
          <Button variant="secondary" onClick={handleClose}>
            Đóng
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <Badge variant={dueCount > 0 ? 'warning' : 'success'}>
                {dueCount} cần ôn
              </Badge>
              <Badge variant="info">{newCount} mới</Badge>
            </div>
            <span>{currentIndex + 1} / {allCards.length}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden">
            <div
              className="h-full bg-ocean transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Flashcard */}
          <div
            onClick={handleFlip}
            className="relative w-full h-72 cursor-pointer perspective-1000"
          >
            <div
              className={`absolute inset-0 transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front Side */}
              <div
                className="absolute inset-0 bg-white border-2 border-ocean/30 rounded-xl shadow-lg flex flex-col items-center justify-center p-6 backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {currentCard?.front_type === 'formula' && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="info">📐 Công thức</Badge>
                  </div>
                )}
                
                <div className="text-center space-y-4">
                  <p className="text-xl font-semibold text-text-primary leading-relaxed">
                    {currentCard?.front_text}
                  </p>
                  
                  {currentCard?.phonetic && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-text-secondary italic">
                        {currentCard.phonetic}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeak();
                        }}
                        className={`p-1.5 rounded-full transition-colors ${
                          speaking
                            ? 'bg-ocean/20 text-ocean'
                            : 'hover:bg-surface-neutral text-text-secondary hover:text-ocean'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-4 text-xs text-text-secondary">
                  Nhấn để xem đáp án →
                </div>
              </div>

              {/* Back Side */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-ocean/5 to-primary/5 border-2 border-emerald-300 rounded-xl shadow-lg flex flex-col items-center justify-center p-6 backface-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="text-center space-y-4">
                  <p className="text-xl font-semibold text-emerald-700 leading-relaxed">
                    {currentCard?.back_text}
                  </p>
                  
                  {currentCard?.example_sentence && (
                    <div className="p-3 bg-white/50 rounded-lg">
                      <p className="text-xs text-text-secondary italic">
                        "{currentCard.example_sentence}"
                      </p>
                    </div>
                  )}
                </div>

                {currentCard?.hint && (
                  <div className="absolute bottom-12 text-xs text-amber-600">
                    💡 {currentCard.hint}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review Result */}
          {showResult && reviewResult && (
            <div className={`p-4 rounded-lg border ${
              reviewResult.quality_label.color.includes('emerald')
                ? 'bg-emerald-50 border-emerald-200'
                : reviewResult.quality_label.color.includes('red')
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-ocean" />
                <span className="text-sm font-medium">{reviewResult.quality_label.label}</span>
              </div>
              <p className="text-xs text-text-secondary">{reviewResult.message}</p>
              <p className="text-xs text-text-secondary mt-1">
                Lần ôn tiếp theo: {reviewResult.progress.interval_days} ngày
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isFlipped ? (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleFlip}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Lật thẻ
              </Button>
            ) : !showResult ? (
              <>
                <p className="text-xs text-text-secondary text-center">
                  Bạn nhớ như thế nào?
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.quality}
                      onClick={() => handleReview(opt.quality)}
                      disabled={isReviewing}
                      className={`${opt.color} text-white rounded-lg p-3 flex flex-col items-center gap-1 transition-all disabled:opacity-50`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-[10px] font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleNext}
                icon={ChevronRight}
              >
                {currentIndex < allCards.length - 1 ? 'Thẻ tiếp theo' : 'Hoàn thành'}
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-hairline">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 hover:text-ocean disabled:opacity-50 disabled:hover:text-text-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>
            <span>
              Độ khó: {currentCard?.difficulty}/5
            </span>
            <button
              onClick={() => setCurrentIndex(Math.min(allCards.length - 1, currentIndex + 1))}
              disabled={currentIndex === allCards.length - 1}
              className="flex items-center gap-1 hover:text-ocean disabled:opacity-50 disabled:hover:text-text-secondary"
            >
              Sau
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
