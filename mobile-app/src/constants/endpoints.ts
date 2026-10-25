export const API_ENDPOINTS = {
  // Sharer endpoints
  CREATE_SHARER: '/api/sharer/create',
  GET_SHARER: (sessionId: string) => `/api/sharer/${sessionId}`,
  UPDATE_SHARER: (sessionId: string) => `/api/sharer/${sessionId}`,
  DISCOVER_SHARERS: '/api/discover',
  
  // File endpoints
  INIT_UPLOAD: (sessionId: string) => `/api/upload/${sessionId}/init`,
  UPLOAD_CHUNK: (sessionId: string, fileId: string) => `/api/upload/${sessionId}/${fileId}`,
  DOWNLOAD_FILE: (sessionId: string, fileId: string) => `/api/download/${sessionId}/${fileId}`,
  GET_FILE_INFO: (sessionId: string, fileId: string) => `/api/file/${sessionId}/${fileId}`,
  
  // System endpoints
  HEALTH: '/health',
  ROOT: '/',
  
  // WebSocket events
  WS: {
    REGISTER_SHARER: 'register-sharer',
    REGISTER_RECEIVER: 'register-receiver',
    DEVICE_CONNECTED: 'device-connected',
    DEVICE_DISCONNECTED: 'device-disconnected',
    FILE_AVAILABLE: 'file-available',
    TRANSFER_PROGRESS: 'transfer-progress',
    TRANSFER_COMPLETE: 'transfer-complete',
    TRANSFER_FAILED: 'transfer-failed',
  },
};

export const DEFAULT_PORTS = {
  BACKEND: 3000,
  WEBSOCKET: 3000,
};

export const DEFAULT_IP = process.env.EXPO_PUBLIC_BACKEND_URL || '10.182.74.170';

export const DEFAULT_DISCOVERY_URL = process.env.EXPO_PUBLIC_DISCOVERY_URL || 'https://speeddrop-discovery.onrender.com';
