export const WebSocketEvents = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Registration events
  REGISTER_SHARER: 'register-sharer',
  REGISTER_RECEIVER: 'register-receiver',
  REGISTERED: 'registered',
  
  // Device events
  DEVICE_CONNECTED: 'device-connected',
  DEVICE_DISCONNECTED: 'device-disconnected',
  
  // File events
  FILE_AVAILABLE: 'file-available',
  FILE_UPLOAD_INIT: 'file-upload-init',
  FILE_UPLOAD_CHUNK: 'file-upload-chunk',
  FILE_UPLOAD_COMPLETE: 'file-upload-complete',
  
  // Transfer events
  TRANSFER_START: 'transfer-start',
  TRANSFER_PROGRESS: 'transfer-progress',
  TRANSFER_COMPLETE: 'transfer-complete',
  TRANSFER_FAILED: 'transfer-failed',
  TRANSFER_PAUSED: 'transfer-paused',
  TRANSFER_RESUMED: 'transfer-resumed',
  
  // Error events
  ERROR_FILE_NOT_FOUND: 'error-file-not-found',
  ERROR_SESSION_EXPIRED: 'error-session-expired',
  ERROR_PERMISSION_DENIED: 'error-permission-denied',
};

export type WebSocketEventMap = {
  [WebSocketEvents.CONNECT]: void;
  [WebSocketEvents.DISCONNECT]: void;
  [WebSocketEvents.ERROR]: Error;
  [WebSocketEvents.DEVICE_CONNECTED]: any;
  [WebSocketEvents.DEVICE_DISCONNECTED]: string;
  [WebSocketEvents.FILE_AVAILABLE]: any;
  [WebSocketEvents.TRANSFER_PROGRESS]: { fileId: string; progress: number; speed: number };
  [WebSocketEvents.TRANSFER_COMPLETE]: string;
  [WebSocketEvents.TRANSFER_FAILED]: { fileId: string; error: string };
};