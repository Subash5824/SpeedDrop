import * as FileSystem from 'expo-file-system';
import { Config } from '@/constants/config';
import { FileApi } from '@/services/api/fileApi';

export interface UploadProgress {
  fileId: string;
  progress: number;
  uploaded: number;
  total: number;
  speed: number;
  eta: number;
}

export class FileUploader {
  private fileApi: FileApi;
  private activeUploads: Map<string, { cancelled: boolean; paused: boolean }> = new Map();

  constructor(baseURL: string) {
    this.fileApi = new FileApi(baseURL);
  }

  async uploadFile(
    sessionId: string,
    fileId: string,
    fileUri: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<boolean> {
    const uploadState = { cancelled: false, paused: false };
    this.activeUploads.set(fileId, uploadState);

    try {
      // Initialize upload
      await this.fileApi.initUpload(sessionId, fileId, fileName, fileSize, fileType);

      const chunkSize = Config.chunkSize;
      const chunks = Math.ceil(fileSize / chunkSize);
      let uploadedBytes = 0;
      let startTime = Date.now();

      for (let i = 0; i < chunks; i++) {
        if (uploadState.cancelled) {
          return false;
        }

        while (uploadState.paused) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (uploadState.cancelled) return false;
        }

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        
        const chunk = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
          position: start,
          length: end - start,
        });

        await this.fileApi.uploadChunk(sessionId, fileId, i, chunk, chunks);

        uploadedBytes += end - start;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
        const remainingBytes = fileSize - uploadedBytes;
        const eta = speed > 0 ? remainingBytes / speed : 0;

        onProgress?.({
          fileId,
          progress: (uploadedBytes / fileSize) * 100,
          uploaded: uploadedBytes,
          total: fileSize,
          speed,
          eta,
        });
      }

      this.activeUploads.delete(fileId);
      return true;
    } catch (error) {
      console.error('Upload failed:', error);
      this.activeUploads.delete(fileId);
      return false;
    }
  }

  cancelUpload(fileId: string) {
    const upload = this.activeUploads.get(fileId);
    if (upload) {
      upload.cancelled = true;
    }
  }

  pauseUpload(fileId: string) {
    const upload = this.activeUploads.get(fileId);
    if (upload) {
      upload.paused = true;
    }
  }

  resumeUpload(fileId: string) {
    const upload = this.activeUploads.get(fileId);
    if (upload) {
      upload.paused = false;
    }
  }
}