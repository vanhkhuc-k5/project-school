// =============================================================================
// GlobalBroadcastBanner — TypeScript
// =============================================================================

import React from 'react';
import { Megaphone, X, ChevronRight } from 'lucide-react';
import { useSync } from '../context/SyncContext';

interface GlobalBroadcastBannerProps {
  onOpenNotifications?: () => void;
}

export function GlobalBroadcastBanner({
  onOpenNotifications,
}: GlobalBroadcastBannerProps): React.JSX.Element | null {
  const { broadcastAlert, dismissBroadcast } = useSync();

  if (!broadcastAlert) return null;

  return (
    <div className="bg-primary text-white hairline-b px-4 py-2.5 flex items-center justify-between text-xs shadow-whisper relative z-40 transition-all animate-fadeIn">
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>

        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-semibold text-sky shrink-0 flex items-center gap-1">
            <Megaphone className="w-3.5 h-3.5" />
            <span>[BGH Toàn trường]:</span>
          </span>
          <span className="font-medium truncate">{broadcastAlert.title}</span>
          <span className="text-white/70 truncate hidden md:inline">— {broadcastAlert.content}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pl-3">
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="text-[11px] font-semibold text-sky hover:underline flex items-center gap-0.5"
          >
            <span>Chi tiết</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={dismissBroadcast}
          className="p-1 text-white/70 hover:text-white rounded hover:bg-white/10 transition-colors"
          title="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
