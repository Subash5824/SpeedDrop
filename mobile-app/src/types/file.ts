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
  chunks?: number;
  uploadedChunks?: number;
}

export interface FileChunk {
  index: number;
  data: string;
  size: number;
  start: number;
  end: number;
}

export interface FileTransfer {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  direction: 'send' | 'receive';
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
}