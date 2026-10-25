// shared/types/sharer.ts

// Define FileInfo type first
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  path?: string;
  chunks?: number;
  uploaded?: boolean;
  createdAt?: Date;
  uri?: string;
  progress?: number;
  status?: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed';
}

export interface Device {
  id: string;
  name: string;
  os: 'ios' | 'android' | 'web' | 'desktop';
  osVersion?: string;
  model?: string;
  ipAddress?: string;
  port?: number;
  connectedAt: Date;
  lastSeen: Date;
  isActive: boolean;
  signalStrength?: number;
}

export interface Sharer {
  id: string;
  name: string;
  sharerId: string;
  sessionId: string;
  ip: string;
  port: number;
  status: 'active' | 'inactive' | 'expired';
  createdAt: Date;
  lastSeen: Date;
  files: Map<string, FileInfo>;
  devices: Map<string, Device>;
}

export interface DiscoveredSharer {
  sharerId: string;
  sharerName: string;
  ip: string;
  port: number;
  signalStrength: number;
  lastSeen: Date;
}

export interface SharerSession {
  sessionId: string;
  sharerId: string;
  sharerName: string;
  ip: string;
  port: number;
  expiresAt: Date;
}

export interface DeviceCapabilities {
  supportsChunkedTransfer: boolean;
  supportsCompression: boolean;
  maxChunkSize: number;
  maxConcurrentTransfers: number;
}