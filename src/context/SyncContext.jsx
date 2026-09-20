import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Fetch status and notifications
  const refreshSync = useCallback(async () => {
    try {
      const [status, notifs] = await Promise.all([
        syncApi.getStatus(currentRole),
        syncApi.getNotifications(),
      ]);

      if (status) {
        setSyncStatus(status);
        setUnreadCount(status.unreadCount || 0);

        if (status.latestBroadcast && !isDismissedBroadcast) {
          setBroadcastAlert(status.latestBroadcast);
        }
      }

      if (notifs) {
        setNotifications(notifs);
      }
    } catch (err) {
      console.warn('Sync refresh failed:', err);
    }
  }, [currentRole, isDismissedBroadcast]);

  // Initial and polling sync (every 4.5s)
  useEffect(() => {
    refreshSync();
    const interval = setInterval(refreshSync, 4500);
    return () => clearInterval(interval);
  }, [refreshSync]);

  // Force trigger sync
  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await refreshSync();
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const markAsRead = async (id) => {
    await syncApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await syncApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const dismissBroadcast = () => {
    setIsDismissedBroadcast(true);
    setBroadcastAlert(null);
  };

  return (
    <SyncContext.Provider
      value={{
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
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
