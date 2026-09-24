// =============================================================================
// SyncContext — Notification polling + Cache invalidation broadcast
// Decoupled from ServerStateContext but bridges cache invalidation events.
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { syncApi } from '../services/api';
import { useAuth } from './AuthContext';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { currentRole, currentUser } = useAuth();
  const [syncStatus, setSyncStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [broadcastAlert, setBroadcastAlert] = useState(null);
  const [isDismissedBroadcast, setIsDismissedBroadcast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastRefreshRef = useRef(0);

  const refreshSync = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [status, notifs] = await Promise.all([
        syncApi.getStatus(currentRole),
        syncApi.getNotifications(),
      ]);

      if (status) {
        setSyncStatus(status);
        setUnreadCount(status.unreadCount ?? 0);
        if (status.latestBroadcast && !isDismissedBroadcast) {
          setBroadcastAlert(status.latestBroadcast);
        }
      }
      if (notifs) setNotifications(notifs);
    } catch (err) {
      console.warn('[SyncContext] refresh failed:', err);
    }
  }, [currentRole, currentUser, isDismissedBroadcast]);

  // Poll every 30 seconds (was 4.5s — too aggressive)
  useEffect(() => {
    if (!currentUser) return;
    refreshSync();
    const interval = setInterval(refreshSync, 30_000);
    return () => clearInterval(interval);
  }, [currentUser, refreshSync]);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refreshSync();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshSync]);

  const markAsRead = useCallback(async (id) => {
    await syncApi.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await syncApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const dismissBroadcast = useCallback(() => {
    setIsDismissedBroadcast(true);
    setBroadcastAlert(null);
  }, []);

  return (
    <SyncContext.Provider value={{
      syncStatus,
      notifications,
      unreadCount,
      broadcastAlert,
      isSyncing,
      triggerSync,
      markAsRead,
      markAllAsRead,
      dismissBroadcast,
      refreshSync,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
