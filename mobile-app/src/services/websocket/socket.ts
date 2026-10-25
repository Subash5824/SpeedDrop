import io, { Socket } from 'socket.io-client';
import { getWsUrl, getSocketOptions } from '../../utils/host';

interface WebSocketConfig {
  url?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;

  constructor(config: WebSocketConfig = {}) {
    this.config = config;
  }

  connect() {
    let targetUrl = this.config.url || getWsUrl();
    if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
      targetUrl = getWsUrl();
    }

    this.socket = io(targetUrl, getSocketOptions(targetUrl));

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.config.onConnect?.();
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.config.onDisconnect?.();
    });

    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.config.onError?.(error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default WebSocketService;
