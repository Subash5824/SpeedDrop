import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl, getBackendUrl } from '../config/api';
import { BackArrowIcon, DownloadIcon, InboxIcon } from './Icons';
import './FileReceiver.css';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface SharerInfoType {
  sharerId: string;
  sharerName: string;
  files: FileInfo[];
}

interface FileReceiverProps {
  onBack: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const FileReceiver: React.FC<FileReceiverProps> = ({ onBack }) => {
  const [senderIdInput, setSenderIdInput] = useState<string>('');
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [sharer, setSharer] = useState<SharerInfoType | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());
  const [completedDownloads, setCompletedDownloads] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showHotspotInfo, setShowHotspotInfo] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const shouldAutoDownload = useRef<boolean>(false);
  const autoDownloadedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    const sid = params.get('sid');
    shouldAutoDownload.current = params.get('autodownload') === '1';

    if (session) {
      connectToSharer(session);
    } else if (sid) {
      handleConnectById(sid);
    } else {
      // Auto-detect active sender on hotspot silently
      fetch(getApiUrl('/api/sharer/active'))
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.sessionId) {
            connectToSharer(data.sessionId);
          }
        })
        .catch(() => {});
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const triggerDirectDownload = (currentSession: string, file: FileInfo) => {
    try {
      const downloadUrl = getApiUrl(`/api/download/${currentSession}/${file.id}`);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadProgress(prev => new Map(prev).set(file.id, 100));
      setCompletedDownloads(prev => new Set(prev).add(file.id));
    } catch (err) {
      console.error('Download initiation failed:', err);
    }
  };

  const connectToSharer = async (session: string) => {
    setConnecting(true);
    setError(null);
    try {
      setSessionId(session);
      const response = await fetch(getApiUrl(`/api/sharer/${session}`));
      if (!response.ok) throw new Error('Session not found or expired');

      const data = await response.json();
      setSharer(data);
      setConnected(true);

      // Trigger auto-download if requested
      if (shouldAutoDownload.current && data.files && data.files.length > 0) {
        data.files.forEach((file: FileInfo, index: number) => {
          if (!autoDownloadedIds.current.has(file.id)) {
            autoDownloadedIds.current.add(file.id);
            setTimeout(() => {
              triggerDirectDownload(session, file);
            }, index * 400);
          }
        });
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const newSocket = io(getBackendUrl(), {
        transports: ['websocket', 'polling'],
      });
      socketRef.current = newSocket;

      const registerReceiver = () => {
        newSocket.emit('register-receiver', {
          sessionId: session,
          deviceName: 'Web Browser',
          os: 'web',
        });
      };

      if (newSocket.connected) {
        registerReceiver();
      }
      newSocket.on('connect', registerReceiver);

      newSocket.on('file-available', (file: FileInfo) => {
        setSharer(prev => {
          if (!prev) return null;
          if (prev.files.some(f => f.id === file.id)) return prev;
          return {
            ...prev,
            files: [...prev.files, file],
          };
        });

        if (shouldAutoDownload.current && !autoDownloadedIds.current.has(file.id)) {
          autoDownloadedIds.current.add(file.id);
          setTimeout(() => {
            triggerDirectDownload(session, file);
          }, 300);
        }
      });
    } catch (err) {
      console.error('Connection error:', err);
      setError('Could not connect to sender. Check ID or Hotspot.');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectHotspot = async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/sharer/active'));
      if (!response.ok) {
        throw new Error('No active sender found on this hotspot. Ensure the sender device is online.');
      }
      const data = await response.json();
      if (data.sessionId) {
        await connectToSharer(data.sessionId);
      } else {
        throw new Error('Could not resolve active session from hotspot');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not connect via Hotspot';
      setError(msg);
      setShowHotspotInfo(true);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectById = async (rawInput?: string) => {
    const input = (rawInput ?? senderIdInput).trim();
    if (!input) {
      setError('Please enter a Sender ID');
      return;
    }

    setError(null);
    setConnecting(true);

    try {
      // If it looks like a full URL with session parameter
      if (input.includes('session=')) {
        const urlMatch = input.match(/session=([a-zA-Z0-9-]+)/);
        if (urlMatch && urlMatch[1]) {
          await connectToSharer(urlMatch[1]);
          return;
        }
      }

      // If it's a 36-char UUID directly
      if (input.length === 36 && input.includes('-')) {
        await connectToSharer(input);
        return;
      }

      // Format clean sharer ID: e.g. "SD-XXXXXX"
      let cleanSid = input.toUpperCase().replace(/\s+/g, '');
      if (!cleanSid.startsWith('SD-') && !cleanSid.startsWith('SD')) {
        cleanSid = `SD-${cleanSid}`;
      } else if (cleanSid.startsWith('SD') && !cleanSid.startsWith('SD-')) {
        cleanSid = `SD-${cleanSid.slice(2)}`;
      }

      let res = await fetch(getApiUrl(`/api/sharer/discover?sid=${encodeURIComponent(cleanSid)}`));
      if (!res.ok) {
        // Fallback to active sharer on the local network/hotspot
        res = await fetch(getApiUrl('/api/sharer/active'));
      }

      if (!res.ok) {
        throw new Error('Sender ID not found on active network. Ensure sender is online.');
      }

      const data = await res.json();
      if (data.sessionId) {
        await connectToSharer(data.sessionId);
      } else {
        throw new Error('No active session for this ID');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      setError(msg);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleDownloadClick = (file: FileInfo) => {
    if (activeDownloads.has(file.id)) return;
    setActiveDownloads(prev => new Set(prev).add(file.id));
    triggerDirectDownload(sessionId, file);

    setTimeout(() => {
      setActiveDownloads(prev => {
        const s = new Set(prev);
        s.delete(file.id);
        return s;
      });
    }, 1200);
  };

  return (
    <div className="receive-page-container">
      {/* Top Header Card */}
      <div className="cyber-capsule-header">
        <button className="capsule-back-btn" onClick={onBack} aria-label="Go back to Home">
          <BackArrowIcon size={22} color="#00f5d4" />
        </button>
        <h1 className="capsule-title">Receive File</h1>
        <div className="capsule-header-placeholder" />
      </div>

      {/* Middle Pairing Card */}
      <div className="cyber-card pairing-card">
        <div className="pairing-card-header">
          <div className="pairing-icon-badge">
            <DownloadIcon size={20} color="#00f5d4" />
          </div>
          <div className="pairing-text-group">
            <h2 className="pairing-title">Enter Sender ID</h2>
            <p className="pairing-subtitle">Type the ID shown on the sender's phone.</p>
          </div>
        </div>

        <div className="pairing-input-row">
          <input
            type="text"
            className="sender-id-input"
            placeholder="SD - X X X X X X"
            value={senderIdInput}
            onChange={(e) => setSenderIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConnectById();
            }}
            spellCheck={false}
            autoCapitalize="characters"
          />
          <button
            className="cyber-glow-btn connect-btn"
            onClick={() => handleConnectById()}
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        {error && <div className="cyber-error-banner">{error}</div>}

        {connected && sharer && (
          <div className="cyber-success-banner">
            <span className="live-dot" /> Connected to <strong>{sharer.sharerName}</strong> ({sharer.sharerId})
          </div>
        )}
      </div>

      {/* Incoming Files Dropzone Card */}
      <div className="cyber-card incoming-files-card">
        <div className="incoming-card-label">Incoming Files</div>

        <div className="incoming-files-dropzone">
          {(!sharer || !sharer.files || sharer.files.length === 0) ? (
            <div className="incoming-empty-state">
              <div className="inbox-icon-container">
                <InboxIcon size={46} color="#00f5d4" />
              </div>
              <p className="incoming-empty-text">
                {connected ? 'Connected! Waiting for files...' : 'Files sent to you will appear here.'}
              </p>
            </div>
          ) : (
            <div className="incoming-files-list">
              {sharer.files.map((file) => {
                const isDownloading = activeDownloads.has(file.id);
                const isDownloaded = completedDownloads.has(file.id);

                return (
                  <div key={file.id} className="incoming-file-row">
                    <div className="incoming-file-meta">
                      <span className="incoming-file-icon">📁</span>
                      <div className="incoming-file-details">
                        <span className="incoming-file-name" title={file.name}>{file.name}</span>
                        <span className="incoming-file-size">{formatFileSize(file.size)}</span>
                        {isDownloading && (
                          <div className="incoming-file-progress-track">
                            <div 
                              className="incoming-file-progress-bar"
                              style={{ width: `${downloadProgress.get(file.id) ?? 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className={`incoming-download-btn ${isDownloaded ? 'downloaded' : ''}`}
                      onClick={() => handleDownloadClick(file)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? 'Saving...' : isDownloaded ? 'Saved ✓' : 'Download'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Info Card: Connect with Sender Hotspot */}
      <div 
        className="cyber-capsule-footer"
        onClick={handleConnectHotspot}
        role="button"
        tabIndex={0}
      >
        <span className="footer-capsule-text">
          {connecting ? 'SEARCHING HOTSPOT SENDER...' : 'CONNECT WITH SENDER HOTSPOT'}
        </span>
        {showHotspotInfo && (
          <div className="hotspot-expanded-instructions">
            <p>1. Open your device Wi-Fi settings and join the sender's hotspot.</p>
            <p>2. Tap this card to connect directly, or enter the Sender ID above.</p>
            <p>3. No internet connection is needed for file transfers.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileReceiver;
