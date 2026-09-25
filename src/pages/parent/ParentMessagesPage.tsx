/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentMessagesPage — Parent-teacher messaging
// Phase 13: Extracted from ParentDashboard.jsx (Tab: messages)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { parentApi } from '../../services/api';
import { Send, AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_role: string;
  sender_name: string;
  created_at?: string;
}

export function ParentMessagesPage() {
  const { children, selectedChild, selectedChildId, isLoading: loadingChildren, error: errorChildren, selectChild } = useChildSwitcher();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadMessages = useCallback(async (childId: string) => {
    setIsLoadingData(true);
    setErrorData(null);
    try {
      const res = await parentApi.getTeacherMessages<Message[]>(childId);
      if (Array.isArray(res)) {
        setMessages(res);
      }
    } catch (_err) {
      setErrorData('Không thể tải tin nhắn.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadMessages(selectedChildId);
    }
  }, [selectedChildId, loadMessages]);

  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setIsSending(true);
    try {
      const res = await parentApi.sendTeacherMessage({
        studentId: selectedChildId,
        content: text,
        senderName: 'Phụ huynh',
      });
      if (res?.success) {
        setChatInput('');
        await loadMessages(selectedChildId!);
      }
    } catch (_err) {
      // Silent fail
    } finally {
      setIsSending(false);
    }
  };

  if (loadingChildren) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-text-secondary">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (errorChildren && children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-text-primary font-medium mb-1">{errorChildren}</p>
        </Card>
      </div>
    );
  }

  if (!selectedChild) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-text-secondary mb-1">Tin nhắn giáo viên</div>
        <ChildSwitcher
          children={children}
          selectedChild={selectedChild}
          onSelect={selectChild}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Tin nhắn giáo viên</h2>
          <p className="text-xs text-text-secondary mt-1">Kênh trao đổi với Giáo viên Chủ nhiệm</p>
        </div>
      </div>

      {errorData && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-danger">{errorData}</span>
        </div>
      )}

      <Card padding="p-0" className="flex flex-col h-[520px] overflow-hidden">
        {/* Chat header */}
        <div className="p-4 bg-surface-neutral hairline-b flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
            👩‍🏫
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary">Giáo viên Chủ nhiệm</div>
            <div className="text-[11px] text-text-secondary">{selectedChild.class}</div>
          </div>
          <Badge variant="success" size="sm" className="ml-auto">Trực tuyến</Badge>
        </div>

        {/* Messages area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F9FAFC]">
          {isLoadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-xs text-text-secondary py-8">
              Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_role === 'parent';
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="text-[10px] text-text-secondary mb-1">{msg.sender_name}</div>
                  <div
                    className={`p-3 rounded-card text-xs max-w-md leading-relaxed ${
                      isMe
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-white border border-hairline text-text-primary rounded-bl-none shadow-whisper'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.created_at && (
                    <div className="text-[10px] text-text-secondary mt-1">
                      {new Date(msg.created_at).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        <div className="p-2.5 bg-white hairline-t flex gap-3">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-surface-neutral border border-hairline rounded focus:outline-none focus:border-ocean text-text-primary"
            disabled={isSending}
          />
          <Button
            variant="primary"
            size="md"
            icon={Send}
            disabled={isSending || !chatInput.trim()}
            onClick={handleSend}
          >
            Gửi
          </Button>
        </div>
      </Card>
    </div>
  );
}
