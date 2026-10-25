export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  hash?: string;
  chunks: number;
  uploaded: boolean;
  createdAt: Date;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  description?: string;
  tags?: string[];
}

export interface FileChunk {
  index: number;
  data: Buffer | string;
  size: number;
  hash: string;
  start: number;
  end: number;
}

export interface FileTransfer {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  direction: 'send' | 'receive';
  status: TransferStatus;
  progress: number;
  speed: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  retryCount: number;
}

export type TransferStatus = 'pending' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface TransferProgress {
  fileId: string;
  transferred: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
  chunksCompleted: number;
  chunksTotal: number;
}