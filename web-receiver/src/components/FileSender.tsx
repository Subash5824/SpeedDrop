import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { getApiUrl, getBackendUrl } from '../config/api';
import { generateUUID } from '../utils/uuid';
import { BackArrowIcon, FolderIcon, CopyIcon, CheckIcon } from './Icons';
import './FileSender.css';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  progress: number;
}

interface FileSenderProps {
  onBack: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const FileSender: React.FC<FileSenderProps> = ({ onBack }) => {
  const [sharerName] = useState('Web User');
  const [sessionId, setSessionId] = useState('');
  const [sharerId, setSharerId] = useState('SD-......');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Direct server URL & active share link state
  const [serverBaseUrl, setServerBaseUrl] = useState<string>(getBackendUrl());

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active direct host and URLs
  const isCloud = typeof window !== 'undefined' && (
    window.location.protocol === 'https:' ||
    window.location.hostname.includes('onrender.com') ||
    window.location.hostname.includes('speeddrop') ||
    serverBaseUrl.startsWith('https://')
  );
  const directServerUrl = serverBaseUrl || getBackendUrl();
  const activeShareUrl = `${directServerUrl}/d/${sharerId}`;

  const initializeSharer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/sharer/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sharerName }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setSharerId(data.sharerId);
      if (data.serverUrl) {
        setServerBaseUrl(data.serverUrl);
      } else if (data.url && data.url.includes('/d/')) {
        setServerBaseUrl(data.url.split('/d/')[0]);
      }

      const newSocket = io(getBackendUrl(), {
        transports: ['websocket', 'polling'],
      });

      const register = () => {
        newSocket.emit('register-sharer', {
          sessionId: data.sessionId,
          sharerId: data.sharerId,
          sharerName: sharerName,
        });
      };

      if (newSocket.connected) {
        register();
      }
      newSocket.on('connect', register);

      socketRef.current = newSocket;
    } catch (err) {
      console.error('Failed to initialize sharer:', err);
      setError('Could not connect to SpeedDrop backend. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  }, [sharerName]);

  useEffect(() => {
    initializeSharer();

    // Query active LAN / Hotspot IP
    fetch(getApiUrl('/api/network-info'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ip) {
          setServerIp(data.ip);
        }
      })
      .catch(() => {});

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initializeSharer]);

  const uploadFile = useCallback(async (file: File) => {
    if (!sessionId) return;

    const fileId = generateUUID();
    const newFile: FileInfo = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      status: 'pending',
      progress: 0,
    };

    setFiles(prev => [...prev, newFile]);

    try {
      // 1. Initialize upload session
      const initRes = await fetch(getApiUrl(`/api/upload/${sessionId}/init`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }),
      });

      if (!initRes.ok) {
        throw new Error(`Init upload failed: ${initRes.status}`);
      }

      // 2. Stream chunks sequentially (2MB per chunk)
      const chunkSize = 2 * 1024 * 1024;
      const chunks = Math.max(1, Math.ceil(file.size / chunkSize));

      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);

        const chunkRes = await fetch(getApiUrl(`/api/upload/${sessionId}/${fileId}?chunk=${i}&totalChunks=${chunks}`), {
          method: 'POST',
          body: formData,
        });

        if (!chunkRes.ok) {
          throw new Error(`Chunk ${i} upload failed`);
        }

        const progress = Math.round(((i + 1) / chunks) * 100);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress, status: 'transferring' } : f));
      }

      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f));
    } catch (err) {
      console.error(`Upload error for ${file.name}:`, err);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f));
    }
  }, [sessionId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    for (const file of selectedFiles) {
      await uploadFile(file);
    }
    e.target.value = '';
  }, [uploadFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await uploadFile(file);
    }
  }, [uploadFile]);

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <div className="send-page-container">
      {/* Top Capsule Header */}
      <div className="cyber-capsule-header">
        <button className="capsule-back-btn" onClick={onBack} aria-label="Go back to Home">
          <BackArrowIcon size={22} color="#00f5d4" />
        </button>
        <h1 className="capsule-title">Send File</h1>
        <div className="capsule-header-placeholder" />
      </div>

      {/* Sharing Info Card */}
      <div className="cyber-card sharing-card">
        <div className="sharing-card-left">
          <div className="sharing-title-row">
            <h2 className="sharing-user-title">Sharing as {sharerName}</h2>
            <span className="sharer-id-badge">{loading ? 'ID: Connecting...' : `ID: ${sharerId}`}</span>
          </div>

          {/* Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 12px 0' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '11px', 
              fontWeight: 700, 
              background: isCloud ? 'rgba(0, 245, 212, 0.15)' : 'rgba(0, 245, 212, 0.1)', 
              color: '#00f5d4', 
              border: '1px solid rgba(0, 245, 212, 0.3)' 
            }}>
              {isCloud ? '🌐 24/7 CLOUD SERVER MODE' : '⚡ DIRECT LAN / HOTSPOT MODE'}
            </span>
          </div>

          {/* Share Link Row (points to direct /d/:sharerId) */}
          <div className="share-link-row">
            <input 
              readOnly 
              value={activeShareUrl} 
              className="share-url-input" 
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button 
              className="cyber-glow-btn copy-link-btn" 
              onClick={() => copyToClipboard(activeShareUrl)}
              aria-label="Copy sharing link"
            >
              {copied ? (
                <>
                  <CheckIcon size={16} color="#041510" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={16} color="#041510" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Direct Server URL Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '12px', color: '#a0a0c0' }}>{isCloud ? 'Server URL:' : 'Direct IP:'}</span>
            <code style={{ fontSize: '13px', color: '#00f5d4', background: 'rgba(0, 245, 212, 0.08)', padding: '5px 8px', borderRadius: '4px', flex: 1 }}>
              {directServerUrl}
            </code>
            <button
              type="button"
              className="cyber-glow-btn"
              style={{ padding: '5px 12px', fontSize: '12px', height: 'auto' }}
              onClick={() => {
                copyToClipboard(directServerUrl);
                setCopiedIp(true);
                setTimeout(() => setCopiedIp(false), 2000);
              }}
            >
              {copiedIp ? 'Copied!' : (isCloud ? 'Copy URL' : 'Copy IP')}
            </button>
          </div>

          {/* Mode Guidance Alert */}
          <p className="mode-guidance-text">
            {isCloud ? (
              <span>
                🌍 <strong>24/7 Global Access:</strong> Receiver can be anywhere on 4G, 5G, or Wi-Fi. Scan the QR code or open the link in any browser to download instantly.
              </span>
            ) : (
              <span>
                ⚡ <strong>Direct Local Transfer:</strong> Receiver must be connected to the same Wi-Fi or this PC's Mobile Hotspot. Scan the QR code or type the direct IP into Chrome.
              </span>
            )}
          </p>
        </div>

        {/* High-contrast Glowing QR Frame (points strictly to /d/:sharerId) */}
        <div className="sharing-card-right">
          <div className="cyber-qr-frame">
            {sessionId ? (
              <QRCode
                value={activeShareUrl}
                size={110}
                level="M"
                bgColor="#040d0a"
                fgColor="#00f5d4"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <div className="qr-skeleton-loader" />
            )}
          </div>
          <span className="qr-sub-label">Scan to Download</span>
        </div>
      </div>

      {error && <div className="cyber-error-banner">{error}</div>}

      {/* File Dropzone Card */}
      <div className="cyber-card dropzone-card">
        <input
          type="file"
          id="sender-file-input"
          ref={fileInputRef}
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div
          className={`cyber-dashed-dropzone ${dragActive ? 'drag-active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
        >
          <div className="folder-icon-wrap">
            <FolderIcon size={46} />
          </div>
          <span className="dropzone-main-text">ADD FILES</span>
          <span className="dropzone-sub-text">
            {dragActive ? 'Release to upload immediately' : 'Click or drag files here'}
          </span>
        </div>

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="uploaded-files-list">
            {files.map(file => (
              <div key={file.id} className="uploaded-file-row">
                <div className="uploaded-file-info">
                  <div className="uploaded-file-header">
                    <span className="uploaded-file-name" title={file.name}>{file.name}</span>
                    <span className="uploaded-file-size">{formatFileSize(file.size)}</span>
                  </div>

                  <div className="file-progress-track">
                    <div 
                      className={`file-progress-bar ${file.status === 'completed' ? 'completed' : file.status === 'failed' ? 'failed' : ''}`}
                      style={{ width: `${file.progress}%` }} 
                    />
                  </div>

                  <div className="uploaded-file-status-row">
                    <span className="status-label">
                      {file.status === 'completed' && 'Ready to download ✓'}
                      {file.status === 'transferring' && `Uploading: ${file.progress}%`}
                      {file.status === 'pending' && 'Queued...'}
                      {file.status === 'failed' && 'Upload failed'}
                    </span>
                  </div>
                </div>

                <button
                  className="file-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  title="Remove file"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Info Card: Connect with Hotspot */}
      <div className="cyber-card hotspot-instructions-card">
        <h3 className="hotspot-card-title">CONNECT WITH HOTSPOT</h3>
        <p className="hotspot-card-subtitle">No internet needed — one phone's Hotspot is enough.</p>

        <div className="hotspot-steps">
          <div className="hotspot-step">
            <span className="step-badge">1</span>
            <span className="step-text">Sender: turn on Hotspot.</span>
          </div>

          <div className="hotspot-step">
            <span className="step-badge">2</span>
            <span className="step-text">Receiver: join that Hotspot.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSender;
