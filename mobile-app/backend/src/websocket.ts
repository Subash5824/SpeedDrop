import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface WebSocketServerConfig {
  io: Server;
  onConnection?: (socket: Socket) => void;
  onDisconnect?: (socket: Socket) => void;
}

interface ConnectedDevice {
  id: string;
  name: string;
  os: string;
  sessionId: string;
  socketId: string;
  connectedAt: Date;
}

export class WebSocketServer {
  private io: Server;
  private devices: Map<string, ConnectedDevice> = new Map();
  private sharerSessions: Map<string, string[]> = new Map(); // sessionId -> deviceIds

  constructor(config: WebSocketServerConfig) {
    this.io = config.io;
    this.setupListeners(config);
  }

  private setupListeners(config: WebSocketServerConfig) {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      config.onConnection?.(socket);

      socket.on('register-sharer', (data: { sessionId: string; sharerId: string; sharerName: string }) => {
        this.handleSharerRegistration(socket, data);
      });

      socket.on('register-receiver', (data: { sessionId: string; deviceName: string; os: string }) => {
        this.handleReceiverRegistration(socket, data);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        this.handleDisconnect(socket);
        config.onDisconnect?.(socket);
      });
    });
  }

  private handleSharerRegistration(socket: Socket, data: { sessionId: string; sharerId: string; sharerName: string }) {
    const { sessionId, sharerId, sharerName } = data;
    
    socket.join(sessionId);
    socket.data = { type: 'sharer', sessionId, sharerId, sharerName };
    
    console.log(`📱 Sharer registered: ${sharerName} (${sharerId}) in session ${sessionId}`);
    socket.emit('registered', { success: true, type: 'sharer' });
  }

  private handleReceiverRegistration(socket: Socket, data: { sessionId: string; deviceName: string; os: string }) {
    const { sessionId, deviceName, os } = data;
    const deviceId = uuidv4();
    
    socket.join(sessionId);
    socket.data = { type: 'receiver', sessionId, deviceId, deviceName, os };
    
    const device: ConnectedDevice = {
      id: deviceId,
      name: deviceName,
      os,
      sessionId,
      socketId: socket.id,
      connectedAt: new Date(),
    };
    
    this.devices.set(deviceId, device);
    
    if (!this.sharerSessions.has(sessionId)) {
      this.sharerSessions.set(sessionId, []);
    }
    this.sharerSessions.get(sessionId)?.push(deviceId);
    
    console.log(`📱 Receiver registered: ${deviceName} (${os}) in session ${sessionId}`);
    socket.emit('registered', { success: true, type: 'receiver', deviceId });
    
    // Notify sharer about new device
    this.io.to(sessionId).emit('device-connected', {
      id: deviceId,
      name: deviceName,
      os,
      connectedAt: new Date(),
    });
  }

  private handleDisconnect(socket: Socket) {
    const deviceId = socket.data?.deviceId;
    if (deviceId && this.devices.has(deviceId)) {
      const device = this.devices.get(deviceId)!;
      const { sessionId } = device;
      
      this.devices.delete(deviceId);
      
      if (this.sharerSessions.has(sessionId)) {
        const devices = this.sharerSessions.get(sessionId)!;
        const index = devices.indexOf(deviceId);
        if (index !== -1) devices.splice(index, 1);
        if (devices.length === 0) this.sharerSessions.delete(sessionId);
      }
      
      // Notify sharer about disconnected device
      this.io.to(sessionId).emit('device-disconnected', deviceId);
      console.log(`📱 Device disconnected: ${device.name} from session ${sessionId}`);
    }
  }

  notifyFileAvailable(sessionId: string, file: any) {
    this.io.to(sessionId).emit('file-available', file);
    console.log(`📁 File available notification sent to session ${sessionId}: ${file.name}`);
  }

  notifyTransferProgress(sessionId: string, progress: any) {
    this.io.to(sessionId).emit('transfer-progress', progress);
  }

  notifyTransferComplete(sessionId: string, fileId: string) {
    this.io.to(sessionId).emit('transfer-complete', fileId);
  }

  notifyTransferFailed(sessionId: string, fileId: string, error: string) {
    this.io.to(sessionId).emit('transfer-failed', { fileId, error });
  }

  getConnectedDevices(sessionId: string): ConnectedDevice[] {
    const deviceIds = this.sharerSessions.get(sessionId) || [];
    return deviceIds.map(id => this.devices.get(id)).filter(Boolean) as ConnectedDevice[];
  }

  getDeviceCount(sessionId: string): number {
    return this.sharerSessions.get(sessionId)?.length || 0;
  }

  broadcastToSession(sessionId: string, event: string, data: any) {
    this.io.to(sessionId).emit(event, data);
  }
}