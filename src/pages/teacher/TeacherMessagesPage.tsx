// =============================================================================
// TeacherMessagesPage — G27/G38 Teacher-Parent Real-Time Messaging
// Features:
//   - Conversation list organized by student (homeroom class)
//   - Full 2-way chat with message history and timestamps
//   - SSE real-time updates via useRealtime() hook
//   - Sound/Toast notification on new incoming messages
//   - Read status tracking
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  teacherApi,
  type TeacherConversation,
  type TeacherMessage,
} from '../../services/api';
import { useRealtime } from '../../context/RealtimeContext';
import {
  Send,
  MessageSquare,
  AlertCircle,
  Loader2,
  Check,
  CheckCheck,
  Bell,
  X,
  ChevronLeft,
  Search,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

// ── Toast Component ────────────────────────────────────────────────────────────────

function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors = {
    info: 'bg-blue-50 border-blue-400 text-blue-800',
    success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
    warning: 'bg-amber-50 border-amber-400 text-amber-800',
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[toast.type]}`}
    >
      <Bell className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{toast.title}</div>
        <div className="text-xs mt-0.5 opacity-80">{toast.message}</div>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function TeacherMessagesPage() {
  const { setOnNotification } = useRealtime();

  const [conversations, setConversations] = useState<TeacherConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<TeacherConversation | null>(null);
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setError(null);
    try {
      const result = await teacherApi.getConversations(1, 50);
      if (result?.conversations) {
        setConversations(result.conversations);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải hội thoại.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Load messages for a conversation ──────────────────────────────────────
  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const result = await teacherApi.getConversationMessages(conversationId, 1, 100);
      if (result?.messages) {
        setMessages(result.messages);
        // Mark as read
        await teacherApi.markConversationRead(conversationId);
        // Refresh conversation list to update unread counts
        loadConversations();
      }
    } catch (e) {
      // Silent fail
    } finally {
      setIsLoadingMessages(false);
    }
  }, [loadConversations]);

  // ── Open conversation ─────────────────────────────────────────────────────
  const handleSelectConversation = async (conv: TeacherConversation) => {
    setSelectedConversation(conv);
    setMessages([]);
    await loadMessages(conv.id);
  };

  // ── Send reply ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || !selectedConversation) return;
    setIsSending(true);
    try {
      const res = await teacherApi.sendReply(selectedConversation.id, text);
      if (res?.success) {
        setChatInput('');
        await loadMessages(selectedConversation.id);
      }
    } catch {
      // Silent fail
    } finally {
      setIsSending(false);
    }
  };

  // ── SSE real-time: receive NEW_MESSAGE from parents ──────────────────────
  useEffect(() => {
    const handler = (notification: { type: string; data?: Record<string, unknown>; message?: string; title?: string }) => {
      if (notification.type !== 'new_message') return;

      const data = notification.data;
      if (!data) return;

      // Only handle messages from parents (senderRole === 'parent')
      if (data.senderRole !== 'parent') return;

      const conversationId = data.conversationId as string;

      // If this message belongs to an open conversation, append it
      if (selectedConversation?.id === conversationId) {
        const newMsg: TeacherMessage = {
          id: `tmp-${Date.now()}`,
          conversationId,
          senderId: data.senderId as string,
          senderName: data.senderName as string,
          senderRole: 'parent',
          content: data.content as string,
          createdAt: new Date().toISOString(),
          read: false,
        };
        setMessages(prev => [...prev, newMsg]);
        // Mark conversation as read immediately
        teacherApi.markConversationRead(conversationId);
      }

      // Show toast notification
      const toast: Toast = {
        id: `toast-${Date.now()}`,
        type: 'info',
        title: data.senderName as string || 'Phụ huynh',
        message: (data.preview as string) || (data.content as string) || 'Có tin nhắn mới',
      };
      setToasts(prev => [...prev, toast]);

      // Refresh conversation list
      loadConversations();
    };

    setOnNotification(handler);
    return () => setOnNotification(null);
  }, [selectedConversation, setOnNotification, loadConversations, loadMessages]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Toast dismiss ────────────────────────────────────────────────────────
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ── Filter conversations ─────────────────────────────────────────────────
  const filteredConversations = conversations.filter(conv => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      conv.studentName?.toLowerCase().includes(q) ||
      conv.parentName?.toLowerCase().includes(q) ||
      conv.className?.toLowerCase().includes(q) ||
      conv.lastMessage?.toLowerCase().includes(q)
    );
  });

  // ── Format timestamp ────────────────────────────────────────────────────
  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-text-secondary mb-0.5">Tin nhắn</div>
          <h1 className="text-xl font-medium text-text-primary">
            Hộp thư Phụ huynh
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {conversations.filter(c => c.unreadCount > 0).length > 0 && (
            <Badge variant="warning" size="sm">
              {conversations.filter(c => c.unreadCount > 0).length} chưa đọc
            </Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={Loader2}
            onClick={loadConversations}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* ── Toast Notifications ─────────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
          {toasts.map(toast => (
            <ToastNotification key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <Card padding="p-4" className="border border-danger/30 bg-danger/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0" />
            <span className="text-sm text-danger">{error}</span>
          </div>
        </Card>
      )}

      {/* ── Content Layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Conversation List ─────────────────────────────────────────── */}
        <Card
          padding="p-0"
          className={`flex flex-col overflow-hidden ${
            selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search */}
          <div className="p-3 hairline-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm học sinh, phụ huynh..."
                className="w-full h-9 pl-9 pr-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
              />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                <MessageSquare className="w-8 h-8 text-hairline" />
                <p className="text-xs text-text-secondary">
                  {searchQuery ? 'Không tìm thấy hội thoại nào.' : 'Chưa có hội thoại nào với phụ huynh.'}
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full text-left px-4 py-3 hairline-b hover:bg-surface-neutral transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-sky/20' : ''
                  } ${conv.unreadCount > 0 ? 'bg-ocean/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-ocean/10 flex items-center justify-center shrink-0 text-sm font-semibold text-ocean">
                      {conv.studentName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {conv.studentName || 'Học sinh'}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-ocean text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        PH: {conv.parentName || '—'} · {conv.className || ''}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-[11px] text-text-secondary mt-1 truncate">
                          {conv.lastMessage}
                        </div>
                      )}
                      {conv.lastMessageAt && (
                        <div className="text-[10px] text-text-secondary mt-0.5">
                          {formatTime(conv.lastMessageAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* ── Chat Panel ───────────────────────────────────────────────── */}
        <div className={`lg:col-span-2 ${!selectedConversation ? 'hidden lg:block' : ''}`}>
          {!selectedConversation ? (
            <Card padding="p-8" className="text-center">
              <MessageSquare className="w-12 h-12 text-hairline mx-auto mb-3" />
              <p className="text-sm text-text-secondary">
                Chọn một hội thoại để bắt đầu nhắn tin với phụ huynh.
              </p>
            </Card>
          ) : (
            <Card padding="p-0" className="flex flex-col h-[600px] overflow-hidden">
              {/* Chat header */}
              <div className="p-4 bg-surface-neutral hairline-b flex items-center gap-3">
                <button
                  type="button"
                  className="lg:hidden p-1 hover:bg-hairline rounded"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ChevronLeft className="w-5 h-5 text-text-secondary" />
                </button>
                <div className="w-9 h-9 rounded-full bg-ocean/10 flex items-center justify-center shrink-0 text-sm font-semibold text-ocean">
                  {selectedConversation.studentName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text-primary truncate">
                    {selectedConversation.studentName}
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    Lớp {selectedConversation.className} · PH: {selectedConversation.parentName}
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  {selectedConversation.unreadCount === 0 ? 'Đã đọc' : `${selectedConversation.unreadCount} mới`}
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9FAFC]">
                {isLoadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-text-secondary py-8">
                    Chưa có tin nhắn nào trong cuộc trò chuyện này.
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderRole === 'teacher';
                    const showAvatar = i === 0 || messages[i - 1]?.senderRole !== msg.senderRole;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {showAvatar && !isMe && (
                          <div className="text-[10px] text-text-secondary mb-1">
                            {msg.senderName}
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-white border border-hairline text-text-primary rounded-bl-sm shadow-whisper'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-text-secondary">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isMe && (
                            msg.read
                              ? <CheckCheck className="w-3 h-3 text-ocean" />
                              : <Check className="w-3 h-3 text-text-secondary" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-white hairline-t flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 h-10 px-3.5 text-xs bg-surface-neutral border border-hairline rounded-full focus:outline-none focus:border-ocean text-text-primary"
                  disabled={isSending}
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={Send}
                  disabled={isSending || !chatInput.trim()}
                  onClick={handleSend}
                >
                  Gửi
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherMessagesPage;
