import { Socket } from 'socket.io-client';

export interface MessageHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onDeviceConnected?: (device: any) => void;
  onDeviceDisconnected?: (deviceId: string) => void;
  onFileAvailable?: (file: any) => void;
  onTransferProgress?: (progress: any) => void;
  onTransferComplete?: (fileId: string) => void;
  onTransferFailed?: (fileId: string, error: string) => void;
}

export class WebSocketHandlers {
  private socket: Socket;
  private handlers: MessageHandlers;

  constructor(socket: Socket, handlers: MessageHandlers) {
    this.socket = socket;
    this.handlers = handlers;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.socket.on('connect', () => {
      this.handlers.onConnect?.();
    });

    this.socket.on('disconnect', () => {
      this.handlers.onDisconnect?.();
    });

    this.socket.on('error', (error: Error) => {
      this.handlers.onError?.(error);
    });

    this.socket.on('device-connected', (device: any) => {
      this.handlers.onDeviceConnected?.(device);
    });

    this.socket.on('device-disconnected', (deviceId: string) => {
      this.handlers.onDeviceDisconnected?.(deviceId);
    });

    this.socket.on('file-available', (file: any) => {
      this.handlers.onFileAvailable?.(file);
    });

    this.socket.on('transfer-progress', (progress: any) => {
      this.handlers.onTransferProgress?.(progress);
    });

    this.socket.on('transfer-complete', (fileId: string) => {
      this.handlers.onTransferComplete?.(fileId);
    });

    this.socket.on('transfer-failed', ({ fileId, error }: { fileId: string; error: string }) => {
      this.handlers.onTransferFailed?.(fileId, error);
    });
  }

  registerSharer(sessionId: string, sharerId: string, sharerName: string) {
    this.socket.emit('register-sharer', { sessionId, sharerId, sharerName });
  }

  registerReceiver(sessionId: string, deviceName: string, os: string) {
    this.socket.emit('register-receiver', { sessionId, deviceName, os });
  }
}