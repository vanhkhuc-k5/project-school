// =============================================================================
// EmergencyModal — G39 School-Wide Emergency Broadcast Display
// Mounted at AppRouter root, listens for EMERGENCY_BROADCAST SSE events.
// Blocks user interaction until acknowledgment is confirmed.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, AlertOctagon, AlertCircle, CheckCircle2, Bell } from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';

interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  severity: 'EMERGENCY' | 'CRITICAL' | 'WARNING';
  requiresAcknowledgment: boolean;
  issuedBy: string;
  issuedAt: string;
}

const SEVERITY_CONFIG = {
  EMERGENCY: {
    label: 'Khẩn cấp',
    color: 'red',
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    icon: AlertOctagon,
    pulse: 'animate-pulse',
  },
  CRITICAL: {
    label: 'Nguy hiểm',
    color: 'orange',
    bg: 'bg-orange-100',
    border: 'border-orange-500',
    text: 'text-orange-800',
    icon: AlertTriangle,
    pulse: 'animate-pulse',
  },
  WARNING: {
    label: 'Cảnh báo',
    color: 'yellow',
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-800',
    icon: AlertCircle,
    pulse: '',
  },
};

export function EmergencyModal() {
  const { notifications, notificationHandlers } = useRealtime();
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Listen for EMERGENCY_BROADCAST SSE events
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (notification: any) => {
      if (notification?.type === 'emergency_broadcast' || notification?.type === 'EMERGENCY_BROADCAST') {
        const alertData = notification?.data as EmergencyAlert | undefined;
        if (alertData && alertData.id) {
          setActiveAlert(alertData);
          setHasAcknowledged(false);
          setIsClosing(false);
        }
      }
    };
    // Cast through unknown to satisfy the Notification type — the handler ignores unknown fields
    notificationHandlers.set(handler as unknown as Parameters<typeof notificationHandlers.set>[0]);
    return () => notificationHandlers.set(null);
  }, [notificationHandlers]);

  const handleAcknowledge = useCallback(() => {
    setHasAcknowledged(true);
    setIsClosing(true);
    setTimeout(() => {
      setActiveAlert(null);
      setHasAcknowledged(false);
      setIsClosing(false);
    }, 400);
  }, []);

  if (!activeAlert) return null;

  const config = SEVERITY_CONFIG[activeAlert.severity] || SEVERITY_CONFIG.WARNING;
  const Icon = config.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[10000] flex items-center justify-center p-4
          bg-black/60 backdrop-blur-sm transition-opacity duration-300
          ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        aria-modal="true"
        role="alertdialog"
      >
        {/* Modal Card */}
        <div
          className={`relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl
            border-4 ${config.border}
            ${config.bg}
            ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
            transition-all duration-300`}
        >
          {/* Animated border top stripe */}
          <div className={`h-1.5 ${config.border} ${config.pulse} bg-current`} />

          {/* Header */}
          <div className={`px-6 py-4 flex items-center gap-3 border-b ${config.border}/30`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
              ${config.color === 'red' ? 'bg-red-200' : config.color === 'orange' ? 'bg-orange-200' : 'bg-yellow-200'}`}>
              <Icon className={`w-7 h-7 ${config.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold uppercase tracking-wider ${config.text} opacity-80`}>
                {config.label}
              </div>
              <div className="text-base font-bold text-gray-900 leading-tight">
                {activeAlert.title}
              </div>
            </div>
            {/* Animated siren indicator */}
            <div className="flex gap-1 shrink-0">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${config.pulse} ${config.text} opacity-60`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Message content */}
            <div className={`p-4 rounded-lg border ${config.border}/30 bg-white/80`}>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {activeAlert.message}
              </p>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                <span>Phát bởi: <strong>{activeAlert.issuedBy}</strong></span>
              </div>
              <div>
                {new Date(activeAlert.issuedAt).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {/* Safety notice */}
            <div className="text-xs text-gray-600 bg-white/50 rounded p-2.5 border border-gray-200/50">
              <strong>Vui lòng:</strong> Làm theo hướng dẫn của giáo viên và nhân viên trường.
              Giữ bình tĩnh và di chuyển an toàn theo sơ đồ sơ tán.
            </div>
          </div>

          {/* Footer — Acknowledge button */}
          <div className={`px-6 py-4 border-t ${config.border}/30
            ${hasAcknowledged ? 'bg-green-50' : config.bg}`}>
            <button
              onClick={handleAcknowledge}
              disabled={hasAcknowledged}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm
                flex items-center justify-center gap-2
                transition-all duration-200
                ${hasAcknowledged
                  ? 'bg-green-500 text-white cursor-default'
                  : `${config.color === 'red' ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 hover:shadow-red-300' : config.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 hover:shadow-orange-300' : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-200 hover:shadow-yellow-300'}`
                }`}
            >
              {hasAcknowledged ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Đã xác nhận — Cảm ơn Quý phụ huynh!
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  TÔI ĐÃ ĐỌC VÀ XÁC NHẬN
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes siren {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
