"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const uuid_1 = require("uuid");
class WebSocketServer {
    constructor(config) {
        this.devices = new Map();
        this.sharerSessions = new Map(); // sessionId -> deviceIds
        this.io = config.io;
        this.setupListeners(config);
    }
    setupListeners(config) {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);
            config.onConnection?.(socket);
            socket.on('register-sharer', (data) => {
                this.handleSharerRegistration(socket, data);
            });
            socket.on('register-receiver', (data) => {
                this.handleReceiverRegistration(socket, data);
            });
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                this.handleDisconnect(socket);
                config.onDisconnect?.(socket);
            });
        });
    }
    handleSharerRegistration(socket, data) {
        const { sessionId, sharerId, sharerName } = data;
        socket.join(sessionId);
        socket.data = { type: 'sharer', sessionId, sharerId, sharerName };
        console.log(`📱 Sharer registered: ${sharerName} (${sharerId}) in session ${sessionId}`);
        socket.emit('registered', { success: true, type: 'sharer' });
    }
    handleReceiverRegistration(socket, data) {
        const { sessionId, deviceName, os } = data;
        const deviceId = (0, uuid_1.v4)();
        socket.join(sessionId);
        socket.data = { type: 'receiver', sessionId, deviceId, deviceName, os };
        const device = {
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
    handleDisconnect(socket) {
        const deviceId = socket.data?.deviceId;
        if (deviceId && this.devices.has(deviceId)) {
            const device = this.devices.get(deviceId);
            const { sessionId } = device;
            this.devices.delete(deviceId);
            if (this.sharerSessions.has(sessionId)) {
                const devices = this.sharerSessions.get(sessionId);
                const index = devices.indexOf(deviceId);
                if (index !== -1)
                    devices.splice(index, 1);
                if (devices.length === 0)
                    this.sharerSessions.delete(sessionId);
            }
            // Notify sharer about disconnected device
            this.io.to(sessionId).emit('device-disconnected', deviceId);
            console.log(`📱 Device disconnected: ${device.name} from session ${sessionId}`);
        }
    }
    notifyFileAvailable(sessionId, file) {
        this.io.to(sessionId).emit('file-available', file);
        console.log(`📁 File available notification sent to session ${sessionId}: ${file.name}`);
    }
    notifyTransferProgress(sessionId, progress) {
        this.io.to(sessionId).emit('transfer-progress', progress);
    }
    notifyTransferComplete(sessionId, fileId) {
        this.io.to(sessionId).emit('transfer-complete', fileId);
    }
    notifyTransferFailed(sessionId, fileId, error) {
        this.io.to(sessionId).emit('transfer-failed', { fileId, error });
    }
    getConnectedDevices(sessionId) {
        const deviceIds = this.sharerSessions.get(sessionId) || [];
        return deviceIds.map(id => this.devices.get(id)).filter(Boolean);
    }
    getDeviceCount(sessionId) {
        return this.sharerSessions.get(sessionId)?.length || 0;
    }
    broadcastToSession(sessionId, event, data) {
        this.io.to(sessionId).emit(event, data);
    }
}
exports.WebSocketServer = WebSocketServer;
