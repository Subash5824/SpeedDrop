import React from 'react';
import './FileCard.css';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface FileCardProps {
  file: FileInfo;
  onDownload: () => void;
  progress?: number;
  isDownloading: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string): string => {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('zip') || type.includes('rar')) return '🗜️';
  return '📁';
};

const FileCard: React.FC<FileCardProps> = ({ file, onDownload, progress, isDownloading }) => {
  return (
    <div className="file-card">
      <div className="file-icon">{getFileIcon(file.type)}</div>
      <div className="file-info">
        <div className="file-name">{file.name}</div>
        <div className="file-size">{formatFileSize(file.size)}</div>
        {isDownloading && progress !== undefined && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
      <button 
        className="download-button"
        onClick={onDownload}
        disabled={isDownloading}
      >
        {isDownloading ? 'Downloading...' : 'Download'}
      </button>
    </div>
  );
};

export default FileCard;