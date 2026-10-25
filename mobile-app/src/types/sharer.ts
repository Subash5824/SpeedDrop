export interface Sharer {
  id: string;
  name: string;
  sharerId: string;
  sessionId: string;
  ip: string;
  port: number;
  createdAt: Date;
}

export interface Device {
  id: string;
  name: string;
  os: 'ios' | 'android' | 'web' | 'desktop';
  model?: string;
  connectedAt: Date;
  lastSeen: Date;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  uri?: string;
  progress?: number;
  status?: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed';
  transferred?: number;
  speed?: number;
  eta?: number;
}

export interface TransferHistory {
  id: string;
  fileName: string;
  fileSize: number;
  sharerId: string;
  sharerName: string;
  timestamp: Date;
  status: 'completed' | 'failed' | 'cancelled';
  type: 'sent' | 'received';
}