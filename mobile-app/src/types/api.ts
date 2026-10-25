export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface CreateSharerResponse {
  sharerId: string;
  sharerName: string;
  sessionId: string;
  port: number;
  ip: string;
}

export interface SharerInfoResponse {
  sharerId: string;
  sharerName: string;
  files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
  devices: Array<{
    id: string;
    name: string;
    os: string;
    connectedAt: string;
  }>;
}

export interface UploadInitResponse {
  success: boolean;
  fileId: string;
}

export interface UploadChunkResponse {
  success: boolean;
  chunk: number;
  progress: number;
}

export interface DownloadResponse {
  success: boolean;
  url: string;
  fileName: string;
  fileSize: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  activeSharers: number;
  uploadDir: string;
}