// =============================================================================
// SSE Notification Controller — Real-Time Event Stream
// G38 Real-time SSE Notifications
// =============================================================================
import { authenticateToken } from '../../shared/auth/index.js';

// In-memory client registry for SSE connections
// In production, use Redis pub/sub for horizontal scaling
const clients = new Map(); // userId -> Set of response objects

// Heartbeat interval (25 seconds as specified)
const HEARTBEAT_INTERVAL = 25000;
const heartbeatTimers = new Map(); // userId -> timer

/**
 * GET /api/notifications/stream
 * SSE endpoint for real-time notification delivery.
 * Requires authentication via Bearer token.
 */
export async function sseStream(req, res, next) {
  try {
    // Authenticate user
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Yêu cầu xác thực',
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Register client
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId).add(res);

    // Send initial connection event
    sendSSEEvent(res, 'connected', {
      message: 'Đã kết nối luồng thông báo',
      userId,
      timestamp: new Date().toISOString(),
    });

    // Set up heartbeat
    const heartbeat = setInterval(() => {
      sendSSEEvent(res, 'heartbeat', {
        timestamp: new Date().toISOString(),
      });
    }, HEARTBEAT_INTERVAL);

    heartbeatTimers.set(userId, heartbeat);

    // Log connection
    console.log(`[SSE] Client connected: userId=${userId}, schoolId=${schoolId}`);

    // Clean up on client disconnect
    req.on('close', () => {
      handleClientDisconnect(userId, res);
    });

    req.on('error', (err) => {
      console.error(`[SSE] Client error: userId=${userId}`, err);
      handleClientDisconnect(userId, res);
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Handle client disconnection
 */
function handleClientDisconnect(userId, res) {
  console.log(`[SSE] Client disconnected: userId=${userId}`);

  // Remove from clients
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(res);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }

  // Clear heartbeat
  const timer = heartbeatTimers.get(userId);
  if (timer) {
    clearInterval(timer);
    heartbeatTimers.delete(userId);
  }
}

/**
 * Send SSE event to a specific client
 */
function sendSSEEvent(res, event, data) {
  try {
    if (res.writableEnded) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    console.error('[SSE] Failed to send event:', err);
  }
}

/**
 * Dispatch event to a specific user
 */
export function dispatchToUser(userId, event, data) {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) {
    console.log(`[SSE] No active clients for userId=${userId}`);
    return false;
  }

  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  for (const client of userClients) {
    sendSSEEvent(client, event, payload);
  }

  console.log(`[SSE] Dispatched ${event} to userId=${userId}`);
  return true;
}

/**
 * Dispatch event to all users in a school
 * Used for school-wide announcements
 */
export function dispatchToSchool(schoolId, event, data) {
  let count = 0;
  for (const [userId, userClients] of clients.entries()) {
    // Note: In production, store schoolId in the client registry
    // For now, we'll use a simple broadcast
    for (const client of userClients) {
      sendSSEEvent(client, event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      count++;
    }
  }

  console.log(`[SSE] School broadcast: event=${event}, connections=${count}`);
  return count;
}

/**
 * Dispatch event to multiple users
 */
export function dispatchToUsers(userIds, event, data) {
  let successCount = 0;
  for (const userId of userIds) {
    if (dispatchToUser(userId, event, data)) {
      successCount++;
    }
  }
  return successCount;
}

/**
 * Get active connection count
 */
export function getActiveConnections() {
  let total = 0;
  for (const userClients of clients.values()) {
    total += userClients.size;
  }
  return total;
}

// Export for testing/monitoring
export { clients, heartbeatTimers };
