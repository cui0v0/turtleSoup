/**
 * Socket.IO 连接管理
 */
export let socket = null;
export let pendingJoinPayload = null;

export function initSocket() {
  if (socket) {
    console.log('[Socket] Socket already initialized');
    return socket;
  }
  
  console.log('[Socket] Initializing new socket connection to http://localhost:5000');
  
  // 使用全局 io 对象（从 CDN 加载）
  // 连接到后端服务器（Vite 会代理到 localhost:5000）
  if (!window.io) {
    console.error('[Socket] window.io is not defined! Socket.IO CDN may not be loaded.');
    return null;
  }
  
  socket = window.io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });
  
  socket.on('connect', () => {
    console.log('[Socket] Connected successfully, socket.id:', socket.id);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected, reason:', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
  });
  
  console.log('[Socket] Socket instance created:', socket);
  return socket;
}

export function setPendingJoinPayload(payload) {
  pendingJoinPayload = payload;
}

export function clearPendingJoinPayload() {
  const payload = pendingJoinPayload;
  pendingJoinPayload = null;
  return payload;
}
