export interface TransferSession {
  id: string;
  sharerId: string;
  receiverId: string;
  files: TransferFile[];
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  totalSize: number;
  transferredSize: number;
  speed: number;
}

export interface TransferFile {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: TransferStatus;
  progress: number;
  transferred: number;
  speed: number;
  eta: number;
  chunks: TransferChunk[];
  retryCount: number;
  error?: string;
}

export interface TransferChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  hash: string;
  status: ChunkStatus;
  retryCount: number;
  lastAttempt?: Date;
}

export type SessionStatus = 'initiating' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TransferStatus = 'pending' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ChunkStatus = 'pending' | 'transferring' | 'completed' | 'failed';

export interface TransferStats {
  totalTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  totalSize: number;
  averageSpeed: number;
  totalTime: number;
}

export interface TransferHistory {
  id: string;
  fileName: string;
  fileSize: number;
  sharerId: string;
  sharerName: string;
  timestamp: Date;
  status: TransferStatus;
  type: 'sent' | 'received';
  duration: number;
  averageSpeed: number;
}