import { useState } from 'react';
import { getApiUrl } from '../config/api';

interface DownloadProgress {
  progress: number;
  speed: number;
  eta: number;
}

export const useFileDownload = () => {
  const [progress, setProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());

  const downloadFile = async (
    sessionId: string,
    fileId: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> => {
    setActiveDownloads(prev => new Set(prev).add(fileId));
    
    try {
      // Direct disk streaming download via native browser manager
      const downloadUrl = getApiUrl(`/api/download/${sessionId}/${fileId}`);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onProgress?.(100);
      setProgress(prev => new Map(prev).set(fileId, { progress: 100, speed: 0, eta: 0 }));
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    } finally {
      setTimeout(() => {
        setActiveDownloads(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }, 1500);
    }
  };

  const getProgress = (fileId: string): DownloadProgress | undefined => {
    return progress.get(fileId);
  };

  return { downloadFile, getProgress, activeDownloads };
};