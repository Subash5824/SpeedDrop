import { useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { Config } from '@/constants/config';
import { getApiUrl, TUNNEL_HEADERS } from '@/utils/host';

interface TransferProgress {
  fileId: string;
  progress: number;
  speed: number;
  eta: number;
}

export const useFileTransfer = () => {
  const [transfers, setTransfers] = useState<Map<string, TransferProgress>>(new Map());

  const uploadFile = async (
    serverIp: string,
    sessionId: string,
    fileId: string,
    fileUri: string,
    fileSize: number,
    onProgress?: (progress: number) => void
  ) => {
    const chunkSize = Config.chunkSize;
    const chunks = Math.ceil(fileSize / chunkSize);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: start,
        length: end - start,
      });
      
      const formData = new FormData();
      formData.append('chunk', chunk);
      
      await fetch(getApiUrl(`/api/upload/${sessionId}/${fileId}?chunk=${i}`, serverIp), {
        method: 'POST',
        headers: TUNNEL_HEADERS,
        body: formData,
      });
      
      const progress = ((i + 1) / chunks) * 100;
      onProgress?.(progress);
      
      setTransfers(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          fileId,
          progress,
          speed: 0,
          eta: 0,
        });
        return newMap;
      });
    }
  };

  const downloadFile = async (
    serverIp: string,
    sessionId: string,
    fileId: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ) => {
    const downloadUri = `${FileSystem.documentDirectory}${fileName}`;
    const fileUrl = getApiUrl(`/api/download/${sessionId}/${fileId}`, serverIp);
    
    const downloadResumable = FileSystem.createDownloadResumable(
      fileUrl,
      downloadUri,
      {
        headers: TUNNEL_HEADERS,
      },
      (progress) => {
        const percent = (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100;
        onProgress?.(percent);
        
        setTransfers(prev => {
          const newMap = new Map(prev);
          newMap.set(fileId, {
            fileId,
            progress: percent,
            speed: 0,
            eta: 0,
          });
          return newMap;
        });
      }
    );
    
    const result = await downloadResumable.downloadAsync();
    return result?.uri;
  };

  return {
    transfers,
    uploadFile,
    downloadFile,
  };
};