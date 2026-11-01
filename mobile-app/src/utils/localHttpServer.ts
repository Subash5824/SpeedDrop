/**
 * SpeedDrop In-App HTTP Server (Hotspot Offline Mode)
 *
 * Runs a real HTTP/1.1 server directly inside the React Native app using
 * react-native-tcp-socket. When the Android device acts as a Wi-Fi Hotspot,
 * this server listens on 0.0.0.0:3000 so that receivers connecting to the
 * hotspot can open http://192.168.43.1:3000 in Chrome and download files.
 *
 * Architecture:
 *   - Serves the bundled web-receiver HTML page for all non-API routes
 *   - Serves file downloads from expo-file-system URIs
 *   - Provides GET /api/sharer/:id and GET /api/files/:session/:id endpoints
 *   - Does NOT require a PC or internet connection
 */

import TcpSocket from 'react-native-tcp-socket';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServerFileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  uri: string; // expo-file-system URI
}

export interface SharerSession {
  sharerId: string;
  sessionId: string;
  sharerName: string;
  files: ServerFileEntry[];
}

type RequestHandler = (req: ParsedRequest, res: ServerResponse) => Promise<void> | void;

interface ParsedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
}

interface ServerResponse {
  status: (code: number) => ServerResponse;
  header: (key: string, value: string) => ServerResponse;
  send: (body: string | Buffer) => void;
  json: (obj: unknown) => void;
  redirect: (url: string) => void;
}

// ─── In-memory sharer state ───────────────────────────────────────────────────

let activeSession: SharerSession | null = null;
let serverInstance: ReturnType<typeof TcpSocket.createServer> | null = null;
let isRunning = false;

/** Call this when the user starts sharing in Hotspot mode */
export function setServerSession(session: SharerSession) {
  activeSession = session;
}

/** Update the file list (called after user picks files) */
export function addFileToServer(file: ServerFileEntry) {
  if (activeSession) {
    const existing = activeSession.files.findIndex(f => f.id === file.id);
    if (existing >= 0) {
      activeSession.files[existing] = file;
    } else {
      activeSession.files.push(file);
    }
  }
}

export function removeFileFromServer(fileId: string) {
  if (activeSession) {
    activeSession.files = activeSession.files.filter(f => f.id !== fileId);
  }
}

export function clearServerSession() {
  activeSession = null;
}

export function isServerRunning() {
  return isRunning;
}

// ─── Minimal HTML for receivers ───────────────────────────────────────────────

function buildReceiverHtml(sharerId: string, sharerName: string, files: ServerFileEntry[], hostIp: string): string {
  const port = 3000;
  const baseUrl = `http://${hostIp}:${port}`;

  const fileRows = files.map(f => {
    const sizeStr = formatBytes(f.size);
    return `
      <div class="file-card">
        <div class="file-icon">${getFileIcon(f.type)}</div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(f.name)}</div>
          <div class="file-size">${sizeStr}</div>
        </div>
        <a class="download-btn" href="${baseUrl}/api/download/${encodeURIComponent(sharerId)}/${encodeURIComponent(f.id)}" download="${escapeHtml(f.name)}">
          ⬇ Download
        </a>
      </div>`;
  }).join('');

  const noFiles = files.length === 0
    ? '<div class="empty">⏳ Waiting for sender to add files...</div>'
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>SpeedDrop — Receive from ${escapeHtml(sharerName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a1a;color:#fff;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;padding:16px}
.header{text-align:center;padding:24px 0 16px}
.logo{font-size:28px;font-weight:800;background:linear-gradient(135deg,#9b5de5,#00f5d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.badge{display:inline-block;margin:8px 0;padding:6px 14px;background:rgba(78,205,196,.15);border-radius:20px;font-size:13px;color:#00f5d4;border:1px solid rgba(78,205,196,.3)}
.section-title{font-size:14px;color:#a0a0c0;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px}
.file-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.05);border-radius:14px;padding:14px;margin-bottom:10px;border:1px solid rgba(255,255,255,.08)}
.file-icon{font-size:28px;flex-shrink:0}
.file-info{flex:1;min-width:0}
.file-name{font-weight:600;font-size:14px;word-break:break-all;color:#fff}
.file-size{font-size:12px;color:#a0a0c0;margin-top:4px}
.download-btn{flex-shrink:0;padding:10px 16px;background:linear-gradient(135deg,#9b5de5,#00f5d4);color:#000;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;white-space:nowrap}
.empty{text-align:center;color:#a0a0c0;padding:40px 0;font-size:15px}
.info-card{background:rgba(78,205,196,.08);border:1px solid rgba(78,205,196,.2);border-radius:12px;padding:14px;margin-top:16px;font-size:12px;color:#a0a0c0;line-height:1.6}
.sharer-id{color:#9b5de5;font-weight:700;font-size:20px;margin:4px 0}
.sharer-name{color:#fff;font-size:15px}
</style>
</head>
<body>
<div class="header">
  <div class="logo">⚡ SpeedDrop</div>
  <div class="badge">📡 Offline Hotspot Transfer</div>
  <div class="sharer-id">${escapeHtml(sharerId)}</div>
  <div class="sharer-name">Shared by: ${escapeHtml(sharerName)}</div>
</div>
<div class="section-title">Files to Download (${files.length})</div>
${fileRows}
${noFiles}
<div class="info-card">
  ✅ You are connected to <strong>${escapeHtml(sharerName)}'s</strong> hotspot.<br/>
  Zero mobile data used. Tap Download to save files to your device.
</div>
</body>
</html>`;
}

function buildHomePage(hostIp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>SpeedDrop</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a1a;color:#fff;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{text-align:center;max-width:360px;width:100%}
.logo{font-size:32px;font-weight:800;background:linear-gradient(135deg,#9b5de5,#00f5d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.sub{color:#a0a0c0;font-size:15px;margin-bottom:32px}
.badge{display:inline-block;padding:8px 20px;background:rgba(78,205,196,.15);border-radius:20px;font-size:13px;color:#00f5d4;border:1px solid rgba(78,205,196,.3);margin-bottom:24px}
p{color:#a0a0c0;font-size:14px;line-height:1.6}
</style>
</head>
<body>
<div class="card">
  <div class="logo">⚡ SpeedDrop</div>
  <div class="sub">Fast. Secure. Offline.</div>
  <div class="badge">📡 Hotspot Server Active</div>
  <p>Scan the QR code on the sender's phone to download files, or open the direct link shared by the sender.</p>
  <br/>
  <p style="color:#666;font-size:12px">Server: ${escapeHtml(hostIp)}:3000</p>
</div>
</body>
</html>`;
}

// ─── HTTP Parsing & Response helpers ──────────────────────────────────────────

function parseRequest(rawData: string): ParsedRequest | null {
  try {
    const lines = rawData.split('\r\n');
    const [method, rawPath] = (lines[0] || '').split(' ');
    if (!method || !rawPath) return null;

    const [pathPart, queryPart] = rawPath.split('?');
    const query: Record<string, string> = {};
    if (queryPart) {
      queryPart.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    const headers: Record<string, string> = {};
    let bodyStartIndex = 1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '') { bodyStartIndex = i + 1; break; }
      const colon = lines[i].indexOf(':');
      if (colon > 0) {
        headers[lines[i].substring(0, colon).toLowerCase().trim()] =
          lines[i].substring(colon + 1).trim();
      }
    }

    const body = lines.slice(bodyStartIndex).join('\r\n');

    return {
      method: method.toUpperCase(),
      path: decodeURIComponent(pathPart),
      query,
      headers,
      body,
    };
  } catch {
    return null;
  }
}

function buildResponse(
  statusCode: number,
  statusText: string,
  headers: Record<string, string>,
  body: string | Buffer
): Buffer {
  const bodyBuf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  const headerLines = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    `Content-Length: ${bodyBuf.length}`,
    'Connection: close',
    'Access-Control-Allow-Origin: *',
    'Cache-Control: no-cache',
    ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
    '',
    '',
  ];
  return Buffer.concat([Buffer.from(headerLines.join('\r\n'), 'utf8'), bodyBuf]);
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleRequest(socket: any, req: ParsedRequest, hostIp: string) {
  const send = (code: number, contentType: string, body: string | Buffer) => {
    try {
      const res = buildResponse(code, code === 200 ? 'OK' : 'Error', { 'Content-Type': contentType }, body);
      socket.write(res);
      socket.destroy();
    } catch (_) {}
  };

  const sendJson = (code: number, obj: unknown) =>
    send(code, 'application/json', JSON.stringify(obj));

  const sendHtml = (code: number, html: string) =>
    send(code, 'text/html; charset=utf-8', html);

  const redirect = (url: string) => {
    try {
      const res = Buffer.from(
        `HTTP/1.1 302 Found\r\nLocation: ${url}\r\nConnection: close\r\n\r\n`,
        'utf8'
      );
      socket.write(res);
      socket.destroy();
    } catch (_) {}
  };

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    send(204, 'text/plain', '');
    return;
  }

  // Health check
  if (req.path === '/health' || req.path === '/api/health') {
    sendJson(200, { status: 'ok', mode: 'hotspot-offline', server: 'speeddrop-in-app' });
    return;
  }

  // Root or home
  if (req.path === '/' || req.path === '/web' || req.path === '') {
    if (activeSession) {
      sendHtml(200, buildReceiverHtml(
        activeSession.sharerId,
        activeSession.sharerName,
        activeSession.files,
        hostIp
      ));
    } else {
      sendHtml(200, buildHomePage(hostIp));
    }
    return;
  }

  // /d/:sharerId — direct download link (redirect to receiver page)
  const dMatch = req.path.match(/^\/d\/([^/]+)$/);
  if (dMatch) {
    const sid = dMatch[1];
    if (activeSession) {
      sendHtml(200, buildReceiverHtml(
        activeSession.sharerId,
        activeSession.sharerName,
        activeSession.files,
        hostIp
      ));
    } else {
      sendHtml(200, buildHomePage(hostIp));
    }
    return;
  }

  // /api/sharer/active or /api/sharer/:id
  const sharerApiMatch = req.path.match(/^\/api\/sharer\/(active|[^/]+)$/);
  if (sharerApiMatch) {
    if (!activeSession) {
      sendJson(404, { error: 'No active sharer' });
      return;
    }
    sendJson(200, {
      sharerId: activeSession.sharerId,
      sessionId: activeSession.sessionId,
      name: activeSession.sharerName,
      files: activeSession.files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    });
    return;
  }

  // /api/files/:sessionId or /api/sharer/discover
  if (req.path.includes('/api/sharer/discover') || req.path.match(/^\/api\/files\//)) {
    if (!activeSession) {
      sendJson(404, { error: 'No active sharer' });
      return;
    }
    sendJson(200, {
      sharerId: activeSession.sharerId,
      sessionId: activeSession.sessionId,
      name: activeSession.sharerName,
      files: activeSession.files.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type })),
    });
    return;
  }

  // /api/download/:sharerId/:fileId — actual file download
  const downloadMatch = req.path.match(/^\/api\/download\/([^/]+)\/([^/]+)$/);
  if (downloadMatch) {
    const [, , fileId] = downloadMatch;
    if (!activeSession) {
      sendJson(404, { error: 'No active session' });
      return;
    }

    const fileEntry = activeSession.files.find(f => f.id === fileId);
    if (!fileEntry) {
      sendJson(404, { error: 'File not found' });
      return;
    }

    try {
      // Read file as base64 from expo-file-system
      const base64Data = await FileSystem.readAsStringAsync(fileEntry.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileBuffer = Buffer.from(base64Data, 'base64');

      const mimeType = fileEntry.type || 'application/octet-stream';
      const safeName = encodeURIComponent(fileEntry.name).replace(/%20/g, '+');

      try {
        const headerStr = [
          'HTTP/1.1 200 OK',
          `Content-Type: ${mimeType}`,
          `Content-Length: ${fileBuffer.length}`,
          `Content-Disposition: attachment; filename="${safeName}"`,
          'Access-Control-Allow-Origin: *',
          'Cache-Control: no-cache',
          'Connection: close',
          '',
          '',
        ].join('\r\n');

        socket.write(Buffer.from(headerStr, 'utf8'));
        socket.write(fileBuffer);
        socket.destroy();
      } catch (_) {}
    } catch (err: any) {
      console.warn('[LocalServer] Failed to read file:', err?.message);
      sendJson(500, { error: 'Failed to read file' });
    }
    return;
  }

  // Fallback — serve the receiver page
  if (activeSession) {
    sendHtml(200, buildReceiverHtml(
      activeSession.sharerId,
      activeSession.sharerName,
      activeSession.files,
      hostIp
    ));
  } else {
    sendHtml(200, buildHomePage(hostIp));
  }
}

// ─── Server lifecycle ─────────────────────────────────────────────────────────

export function startLocalServer(
  hostIp: string,
  port: number = 3000,
  onReady?: () => void,
  onError?: (err: Error) => void
): void {
  if (isRunning) {
    console.log('[LocalServer] Already running');
    onReady?.();
    return;
  }

  try {
    const server = TcpSocket.createServer((socket: any) => {
      let rawData = '';

      socket.on('data', (data: Buffer | string) => {
        rawData += Buffer.isBuffer(data) ? data.toString('utf8') : data;

        // Check if we have a full HTTP request (ends with \r\n\r\n or has Content-Length)
        if (rawData.includes('\r\n\r\n')) {
          const req = parseRequest(rawData);
          rawData = '';
          if (req) {
            handleRequest(socket, req, hostIp).catch(err => {
              console.warn('[LocalServer] Handler error:', err?.message);
              try { socket.destroy(); } catch (_) {}
            });
          } else {
            try { socket.destroy(); } catch (_) {}
          }
        }
      });

      socket.on('error', () => {
        try { socket.destroy(); } catch (_) {}
      });

      socket.on('close', () => {
        // Socket closed normally
      });
    });

    server.on('error', (err: Error) => {
      console.error('[LocalServer] Server error:', err?.message);
      isRunning = false;
      serverInstance = null;
      onError?.(err);
    });

    server.listen({ port, host: '0.0.0.0', reuseAddress: true }, () => {
      isRunning = true;
      serverInstance = server;
      console.log(`[LocalServer] ✅ In-app HTTP server listening on 0.0.0.0:${port}`);
      onReady?.();
    });

  } catch (err: any) {
    console.error('[LocalServer] Failed to start:', err?.message);
    isRunning = false;
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

export function stopLocalServer(): void {
  if (serverInstance) {
    try {
      serverInstance.close(() => {
        isRunning = false;
        serverInstance = null;
        console.log('[LocalServer] Server stopped');
      });
    } catch (_) {
      isRunning = false;
      serverInstance = null;
    }
  }
  activeSession = null;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string): string {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '🗜️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('text/')) return '📃';
  return '📄';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
