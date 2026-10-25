import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Config } from '@/constants/config';
import { getApiUrl, TUNNEL_HEADERS } from '@/utils/host';

export interface DownloadProgress {
  fileId: string;
  progress: number;
  downloaded: number;
  total: number;
  speed: number;
  eta: number;
}

export class FileDownloader {
  private activeDownloads: Map<string, { cancel: boolean; paused: boolean; resumable: any }> = new Map();

  async downloadFile(
    serverIp: string,
    sessionId: string,
    fileId: string,
    fileName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string | null> {
    const downloadUri = `${FileSystem.documentDirectory}${fileName}`;
    const fileUrl = getApiUrl(`/api/download/${sessionId}/${fileId}`, serverIp);
    
    const downloadState = { cancel: false, paused: false, resumable: null };
    this.activeDownloads.set(fileId, downloadState);

    try {
      let startTime = Date.now();
      let lastDownloaded = 0;

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        downloadUri,
        {
          headers: TUNNEL_HEADERS,
        },
        (progress) => {
          if (downloadState.paused || downloadState.cancel) return;
          
          const downloaded = progress.totalBytesWritten;
          const total = progress.totalBytesExpectedToWrite;
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? (downloaded - lastDownloaded) / elapsed : 0;
          const remainingBytes = total - downloaded;
          const eta = speed > 0 ? remainingBytes / speed : 0;
          
          lastDownloaded = downloaded;
          
          onProgress?.({
            fileId,
            progress: (downloaded / total) * 100,
            downloaded,
            total,
            speed,
            eta,
          });
        }
      );
      
      downloadState.resumable = downloadResumable;
      
      while (downloadState.paused) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (downloadState.cancel) return null;
      }
      
      const result = await downloadResumable.downloadAsync();
      
      if (result && !downloadState.cancel) {
        await Sharing.shareAsync(result.uri);
        return result.uri;
      }
      
      return null;
    } catch (error) {
      console.error('Download failed:', error);
      return null;
    } finally {
      this.activeDownloads.delete(fileId);
    }
  }

  cancelDownload(fileId: string) {
    const download = this.activeDownloads.get(fileId);
    if (download) {
      download.cancel = true;
    }
  }

  pauseDownload(fileId: string) {
    const download = this.activeDownloads.get(fileId);
    if (download) {
      download.paused = true;
    }
  }

  resumeDownload(fileId: string) {
    const download = this.activeDownloads.get(fileId);
    if (download) {
      download.paused = false;
    }
  }
}