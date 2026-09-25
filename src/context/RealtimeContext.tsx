// =============================================================================
// RealtimeContext — Real-Time SSE Notification Provider
// G38 Real-time SSE Notification Engine
// =============================================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read?: boolean;
  timestamp?: string;
}

interface RealtimeContextValue {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (notificationId: string) => void;
  
  // Event callbacks
  onNotification: ((notification: Notification) => void) | null;
  notificationHandlers: {
    set: (callback: ((notification: Notification) => void) | null) => void;
  };
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// SSE reconnection configuration
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { currentUser, isLoadingAuth } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onNotification, setOnNotification] = useState<((notification: Notification) => void) | null>(null);

  const notificationHandlers = {
    set: setOnNotification,
  };
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Don't connect if not authenticated or already connected
    if (!currentUser || eventSourceRef.current) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const url = `/api/notifications/stream`;
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      console.log('[Realtime] Connected to SSE stream');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = (error) => {
      console.error('[Realtime] SSE error:', error);
      setIsConnected(false);

      // Attempt reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;
        console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          disconnect();
          connect();
        }, delay);
      } else {
        setConnectionError('Mất kết nối. Vui lòng tải lại trang.');
      }
    };

    // Handle connected event
    eventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Realtime] Connection confirmed:', data);
      } catch (err) {
        console.error('[Realtime] Failed to parse connected event:', err);
      }
    });

    // Handle heartbeat
    eventSource.addEventListener('heartbeat', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Realtime] Heartbeat:', data.timestamp);
      } catch (err) {
        console.error('[Realtime] Failed to parse heartbeat:', err);
      }
    });

    // Handle new notifications
    eventSource.addEventListener('notification', (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        console.log('[Realtime] New notification:', notification);
        
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        // Call registered callback
        if (onNotification) {
          onNotification(notification);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse notification:', err);
      }
    });

    // Handle grade events
    eventSource.addEventListener('grade_published', (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: Notification = {
          id: `grade-${Date.now()}`,
          type: 'grade_published',
          title: data.title || 'Điểm mới được công bố',
          message: data.message || 'Bạn có điểm mới.',
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        if (onNotification) {
          onNotification(notification);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse grade event:', err);
      }
    });

    // Handle assignment events
    eventSource.addEventListener('assignment_published', (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: Notification = {
          id: `assignment-${Date.now()}`,
          type: 'assignment_published',
          title: data.title || 'Bài tập mới',
          message: data.message || 'Bạn có bài tập mới cần nộp.',
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        if (onNotification) {
          onNotification(notification);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse assignment event:', err);
      }
    });

    // G38: Handle NEW_MESSAGE event from parent/teacher real-time chat
    eventSource.addEventListener('NEW_MESSAGE', (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: Notification = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'new_message',
          title: `Tin nhắn mới từ ${data.senderName || 'Người dùng'}`,
          message: data.preview || data.content || 'Bạn có tin nhắn mới.',
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        if (onNotification) {
          onNotification(notification);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse NEW_MESSAGE event:', err);
      }
    });

    // G38: Handle ATTENDANCE_RECORDED event — parent gets instant attendance alert
    eventSource.addEventListener('ATTENDANCE_RECORDED', (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: Notification = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'attendance_recorded',
          title: `Điểm danh: ${data.studentName || 'Học sinh'}`,
          message: data.message || `Đã được điểm danh ${data.statusLabel || data.status} ngày ${data.date}`,
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        if (onNotification) {
          onNotification(notification);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse ATTENDANCE_RECORDED event:', err);
      }
    });

    // G38: Handle TUITION_PAID event — parent receives confirmation after payment
    eventSource.addEventListener('TUITION_PAID', (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: Notification = {
          id: `tuition-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'tuition_paid',
          title: 'Thanh toán học phí thành công',
          message: data.message || `Đã nhận thanh toán học phí cho ${data.studentName}`,
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        if (onNotification) {
          onNotification(notification);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse TUITION_PAID event:', err);
      }
    });

    // G39: Handle EMERGENCY_BROADCAST event — school-wide emergency alert
    eventSource.addEventListener('EMERGENCY_BROADCAST', (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: Notification = {
          id: `emergency-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'emergency_broadcast',
          title: `🚨 ${data.title || 'Thông báo khẩn'}`,
          message: data.message || 'Thông báo khẩn cấp từ Ban Giám Hiệu.',
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        if (onNotification) {
          onNotification(notification);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse EMERGENCY_BROADCAST event:', err);
      }
    });

    eventSourceRef.current = eventSource;
  }, [currentUser, onNotification]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[Realtime] Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[Realtime] Failed to mark all as read:', err);
    }
  }, []);

  // Clear a notification from the list
  const clearNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });
  }, []);

  // Connect when user authenticates
  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [currentUser, isLoadingAuth, connect, disconnect]);

  const value: RealtimeContextValue = {
    isConnected,
    connectionError,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    onNotification,
    notificationHandlers,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access realtime notification context
 */
export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
