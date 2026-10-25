export interface TransferProgress {
  fileId: string;
  fileName: string;
  transferred: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed';
  chunksCompleted?: number;
  chunksTotal?: number;
}

export interface TransferQueue {
  id: string;
  files: TransferProgress[];
  currentIndex: number;
  status: 'idle' | 'processing' | 'completed' | 'paused';
  startTime?: Date;
  endTime?: Date;
}

export interface TransferSettings {
  maxConcurrent: number;
  chunkSize: number;
  allowResume: boolean;
  compressionEnabled: boolean;
  maxRetries: number;
  timeout: number;
}