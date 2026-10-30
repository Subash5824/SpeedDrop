import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import dotenv from 'dotenv';
import { discoveryClient, RegistrationInfo } from './discoveryClient';

// Load environment variables
dotenv.config();

// Type Definitions
interface Sharer {
  id: string;
  name: string;
  sharerId: string;
  sessionId: string;
  devices: Map<string, Device>;
  files: Map<string, FileInfo>;
  createdAt: Date;
}

interface Device {
  id: string;
  name: string;
  os: string;
  connectedAt: Date;
  lastSeen: Date;
}

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  chunks: number;
  uploaded: boolean;
  createdAt: Date;
}

interface SharerCreateBody {
  name?: string;
}

interface SharerUpdateBody {
  name?: string;
}

interface FileInitBody {
  fileId: string;
  name: string;
  size: number;
  type: string;
}

// Configuration
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10737418240');
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1048576');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

// Ensure upload directory exists
fs.ensureDirSync(UPLOAD_DIR);

// Create Fastify app
const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  bodyLimit: MAX_FILE_SIZE,
});

// Register plugins
app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

app.register(fastifyMultipart, {
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
});

app.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/web/',
});

app.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
  decorateReply: false,
});

// Explicit SPA route for /web (without trailing slash)
app.get('/web', async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.sendFile('index.html');
});

// Custom setNotFoundHandler for complete SPA fallback
app.setNotFoundHandler((req: FastifyRequest, reply: FastifyReply) => {
  const url = req.raw.url || '';
  if (url.startsWith('/api') || url.startsWith('/d/')) {
    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${req.method}:${req.url} not found`
    });
  }
  return reply.sendFile('index.html');
});

// Create Socket.IO
const io = new Server(app.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Store active sharers
const sharers = new Map<string, Sharer>();

// Canonical Sharer ID normalizer: strips spaces, dashes, SD prefix, maps 0->O and 1->I
function normalizeSharerId(id: string): string {
  if (!id) return '';
  return id
    .toUpperCase()
    .replace(/\s+/g, '')        // remove all whitespace
    .replace(/^SD-?/, '')       // strip leading SD or SD-
    .replace(/0/g, 'O')         // normalize 0 to letter O
    .replace(/1/g, 'I');        // normalize 1 to letter I
}

// Retrieve active sharer session (sorted by newest created first)
function getActiveSharer(): { sessionId: string; sharer: Sharer } | null {
  if (sharers.size === 0) return null;
  const entries = Array.from(sharers.entries());
  entries.sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime());
  return { sessionId: entries[0][0], sharer: entries[0][1] };
}

// Robust Sharer lookup with exact, normalized, and smart active session fallback
function findSharerSession(inputSid?: string): { sessionId: string; sharer: Sharer } | null {
  if (sharers.size === 0) return null;

  const cleanedInput = (inputSid || '').trim();
  const normInput = normalizeSharerId(cleanedInput);

  // 1. Exact match on raw sharerId or sessionId
  if (cleanedInput) {
    for (const [sessionId, sharer] of sharers.entries()) {
      if (sharer.sharerId.toUpperCase() === cleanedInput.toUpperCase() || sessionId === cleanedInput) {
        return { sessionId, sharer };
      }
    }
  }

  // 2. Normalized match (ignoring SD-, spaces, 0/O, 1/I)
  if (normInput) {
    for (const [sessionId, sharer] of sharers.entries()) {
      if (normalizeSharerId(sharer.sharerId) === normInput) {
        return { sessionId, sharer };
      }
    }
  }

  // 3. Smart fallback: resolve to active session with uploaded files or most recent session
  const allSessions = Array.from(sharers.entries());
  allSessions.sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime());

  // Prioritize session that has at least 1 uploaded file
  const sessionWithFiles = allSessions.find(([_, s]) =>
    Array.from(s.files.values()).some(f => f.uploaded)
  );
  if (sessionWithFiles) {
    app.log.warn(`Sharer ID "${inputSid}" not found, falling back to active session ${sessionWithFiles[1].sharerId} with files`);
    return { sessionId: sessionWithFiles[0], sharer: sessionWithFiles[1] };
  }

  // Fallback to latest session
  const latestSession = allSessions[0];
  if (latestSession) {
    app.log.warn(`Sharer ID "${inputSid}" not found, falling back to latest session ${latestSession[1].sharerId}`);
    return { sessionId: latestSession[0], sharer: latestSession[1] };
  }

  return null;
}

// Helper functions
function generateSharerId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = 'SD-';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

interface NetworkInterfaceDetail {
  name: string;
  ip: string;
  type: 'wifi' | 'hotspot' | 'ethernet' | 'other';
  isHotspot: boolean;
  url: string;
}

function getAllNetworkInterfaces(): NetworkInterfaceDetail[] {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  const list: NetworkInterfaceDetail[] = [];

  for (const [name, configs] of Object.entries(ifaces)) {
    if (!configs) continue;
    for (const config of (configs as any[])) {
      if (config.family === 'IPv4' && !config.internal) {
        const lower = name.toLowerCase();
        let type: 'wifi' | 'hotspot' | 'ethernet' | 'other' = 'other';
        const isHotspot = /hotspot|hosted|softap|ap\d|wlan\d.*direct|wi-?fi\s*direct/i.test(lower) || 
                          config.address.startsWith('192.168.137.') || config.address.startsWith('192.168.43.');
        
        if (isHotspot) {
          type = 'hotspot';
        } else if (/wi-?fi|wireless|wlan/i.test(lower)) {
          type = 'wifi';
        } else if (/ethernet|eth\d|lan/i.test(lower)) {
          type = 'ethernet';
        }

        list.push({
          name,
          ip: config.address,
          type,
          isHotspot,
          url: `http://${config.address}:${PORT}`,
        });
      }
    }
  }

  // Prioritize active Mobile Hotspot adapters, then Wi-Fi, then Ethernet
  list.sort((a, b) => {
    const order = { hotspot: 0, wifi: 1, ethernet: 2, other: 3 };
    return order[a.type] - order[b.type];
  });

  return list;
}

function getPrimaryLocalIp(): string {
  const list = getAllNetworkInterfaces();
  if (list.length > 0) {
    return list[0].ip;
  }
  return '127.0.0.1';
}

function getLocalIp(): string {
  return getPrimaryLocalIp();
}

/**
 * Returns the effective base URL for public links and QR codes.
 * In cloud production (Render, custom domain, HTTPS), uses https://speeddrop.onrender.com.
 * In local LAN dev, falls back to http://<LOCAL_IP>:PORT.
 */
function getPublicServerUrl(request?: FastifyRequest): string {
  // 1. Explicit PUBLIC_URL env var
  if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) {
    return process.env.PUBLIC_URL.trim().replace(/\/+$/, '');
  }
  // 2. Render external URL provided automatically by Render runtime
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim()) {
    return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/+$/, '');
  }
  // 3. Inspect incoming request headers (x-forwarded-host, host)
  if (request) {
    const rawHost = (request.headers['x-forwarded-host'] as string) || (request.headers.host as string);
    if (rawHost) {
      const cleanHost = rawHost.split(',')[0].trim();
      if (cleanHost.includes('onrender.com') || cleanHost.includes('speeddrop')) {
        return `https://${cleanHost}`;
      }
      const proto = (request.headers['x-forwarded-proto'] as string) || (request.protocol ? request.protocol : 'http');
      return `${proto}://${cleanHost}`;
    }
  }
  // 4. In production or on Render, default to https://speeddrop.onrender.com
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
    return 'https://speeddrop.onrender.com';
  }
  // 5. Fallback for local development
  const primaryIp = getPrimaryLocalIp();
  return `http://${primaryIp}:${PORT}`;
}

async function cleanupPartFiles(filePath: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (f.startsWith(base + '.part')) {
        await fs.remove(path.join(dir, f)).catch(() => {});
      }
    }
  } catch (err) {
    // Ignore cleanup error
  }
}

// Routes

// Query active network interfaces (Wi-Fi, Hotspot, Ethernet, Cloud)
app.get('/api/network-info', async (request: FastifyRequest, reply: FastifyReply) => {
  const serverBaseUrl = getPublicServerUrl(request);
  const primaryIp = getPrimaryLocalIp();
  const allIps = getAllNetworkInterfaces();
  reply.send({
    ip: serverBaseUrl.replace(/^https?:\/\//i, '').replace(/:\d+$/, ''),
    port: PORT,
    url: serverBaseUrl,
    allIps,
    isCloud: serverBaseUrl.startsWith('https://') || serverBaseUrl.includes('onrender.com'),
  });
});

// Create new sharer session
app.post<{
  Body: SharerCreateBody;
}>('/api/sharer/create', async (request: FastifyRequest<{ Body: SharerCreateBody }>, reply: FastifyReply) => {
  try {
    const sharerId = generateSharerId();
    const sessionId = uuidv4();
    const sharerName = request.body.name || `Device-${Math.floor(Math.random() * 1000)}`;
    
    const sharer: Sharer = {
      id: sharerId,
      name: sharerName,
      sharerId,
      sessionId,
      devices: new Map(),
      files: new Map(),
      createdAt: new Date(),
    };
    
    sharers.set(sessionId, sharer);
    
    app.log.info(`New sharer created: ${sharerName} (${sharerId})`);

    const serverBaseUrl = getPublicServerUrl(request);
    const primaryIp = getPrimaryLocalIp();
    const primaryUrl = `${serverBaseUrl}/d/${sharerId}`;

    // Announce new sharer to cloud discovery server (only in local dev mode)
    if (!process.env.RENDER && process.env.NODE_ENV !== 'production' && process.env.DISABLE_DISCOVERY !== 'true') {
      discoveryClient.register({
        sharerId,
        localIp: primaryIp,
        port: PORT,
        serverUrl: primaryUrl,
        tunnelUrl: null,
        deviceName: sharerName,
      }).catch(() => {});
    }
    
    reply.send({
      sharerId,
      sharerName,
      sessionId,
      port: PORT,
      ip: serverBaseUrl.replace(/^https?:\/\//i, '').replace(/:\d+$/, ''),
      url: primaryUrl,
      serverUrl: serverBaseUrl,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Error creating sharer:');
    reply.status(500).send({ error: 'Failed to create sharer session' });
  }
});

// Get active sharer session
app.get('/api/sharer/active', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const active = getActiveSharer();
    if (!active) {
      reply.status(404).send({ error: 'No active sender found on network' });
      return;
    }

    const { sessionId, sharer } = active;
    const files = Array.from(sharer.files.values())
      .filter((f: FileInfo) => f.uploaded)
      .map((f: FileInfo) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
      }));

    const serverBaseUrl = getPublicServerUrl(request);
    const primaryIp = getPrimaryLocalIp();
    reply.send({
      sessionId,
      sharerId: sharer.sharerId,
      sharerName: sharer.name,
      files,
      devices: Array.from(sharer.devices.values()),
      ip: serverBaseUrl.replace(/^https?:\/\//i, '').replace(/:\d+$/, ''),
      url: `${serverBaseUrl}/d/${sharer.sharerId}`,
      serverUrl: serverBaseUrl,
      port: PORT,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Error getting active sharer:');
    reply.status(500).send({ error: 'Failed to retrieve active sharer' });
  }
});

// Public Discovery Compatibility Endpoints
app.get('/api/active', async (request: FastifyRequest, reply: FastifyReply) => {
  const active = getActiveSharer();
  const serverBaseUrl = getPublicServerUrl(request);
  const primaryIp = getPrimaryLocalIp();
  return reply.send({
    success: true,
    sharerId: active ? active.sharer.sharerId : 'DEFAULT',
    activeUrl: serverBaseUrl,
    serverUrl: serverBaseUrl,
    tunnelUrl: null,
    localIp: primaryIp,
    port: PORT,
    deviceName: active ? active.sharer.name : 'SpeedDrop Cloud',
    updatedAt: new Date().toISOString(),
  });
});

app.get<{
  Params: { sharerId: string };
}>('/api/resolve/:sharerId', async (request: FastifyRequest<{ Params: { sharerId: string } }>, reply: FastifyReply) => {
  const { sharerId } = request.params;
  const found = findSharerSession(sharerId);
  const serverBaseUrl = getPublicServerUrl(request);
  const primaryIp = getPrimaryLocalIp();
  return reply.send({
    success: true,
    sharerId: found ? found.sharer.sharerId : sharerId,
    sessionId: found ? found.sessionId : null,
    activeUrl: serverBaseUrl,
    serverUrl: serverBaseUrl,
    localIp: primaryIp,
    port: PORT,
    deviceName: found ? found.sharer.name : 'SpeedDrop Cloud',
    updatedAt: new Date().toISOString(),
  });
});

app.post('/api/register', async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.send({ success: true, message: 'SpeedDrop backend active' });
});

// Discover sharer by sharerId (for manual connection with fuzzy & active session fallback)
app.get<{
  Querystring: { sid?: string };
}>('/api/sharer/discover', async (request: FastifyRequest<{ Querystring: { sid?: string } }>, reply: FastifyReply) => {
  try {
    const { sid } = request.query;
    const found = findSharerSession(sid);
    
    if (!found) {
      reply.status(404).send({ error: 'No active sender found on network' });
      return;
    }
    
    reply.send({ sessionId: found.sessionId, sharerId: found.sharer.sharerId });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Error discovering sharer:');
    reply.status(500).send({ error: 'Failed to discover sharer' });
  }
});

// Update sharer info
app.put<{
  Params: { sessionId: string };
  Body: SharerUpdateBody;
}>('/api/sharer/:sessionId', async (request: FastifyRequest<{ Params: { sessionId: string }; Body: SharerUpdateBody }>, reply: FastifyReply) => {
  try {
    const sharer = sharers.get(request.params.sessionId);
    if (!sharer) {
      reply.status(404).send({ error: 'Sharer not found' });
      return;
    }
    
    if (request.body.name) {
      sharer.name = request.body.name;
      app.log.info(`Sharer ${sharer.sharerId} renamed to ${sharer.name}`);
    }
    
    reply.send({ sharerId: sharer.sharerId, sharerName: sharer.name });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Error updating sharer:');
    reply.status(500).send({ error: 'Failed to update sharer' });
  }
});

// Get sharer info
app.get<{
  Params: { sessionId: string };
}>('/api/sharer/:sessionId', async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
  try {
    const sharer = sharers.get(request.params.sessionId);
    if (!sharer) {
      reply.status(404).send({ error: 'Sharer not found' });
      return;
    }
    
    const files = Array.from(sharer.files.values())
      .filter((f: FileInfo) => f.uploaded)
      .map((f: FileInfo) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
      }));
    
    reply.send({
      sharerId: sharer.sharerId,
      sharerName: sharer.name,
      files,
      devices: Array.from(sharer.devices.values()),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Error getting sharer info:');
    reply.status(500).send({ error: 'Failed to get sharer info' });
  }
});

// Initialize file upload
app.post<{
  Params: { sessionId: string };
  Body: FileInitBody;
}>('/api/upload/:sessionId/init', async (request: FastifyRequest<{ Params: { sessionId: string }; Body: FileInitBody }>, reply: FastifyReply) => {
  try {
    const sharer = sharers.get(request.params.sessionId);
    if (!sharer) {
      reply.status(404).send({ error: 'Sharer not found' });
      return;
    }
    
    const { fileId, name, size, type } = request.body;
    const filePath = path.join(UPLOAD_DIR, `${fileId}_${name}`);
    
    const file: FileInfo = {
      id: fileId,
      name,
      size,
      type,
      path: filePath,
      chunks: 0,
      uploaded: false,
      createdAt: new Date(),
    };
    
    sharer.files.set(fileId, file);
    
    reply.send({ success: true, fileId });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Error initializing file upload:');
    reply.status(500).send({ error: 'Failed to initialize file upload' });
  }
});

// File upload endpoint with chunk and streaming support
app.post<{
  Params: { sessionId: string; fileId: string };
  Querystring: { chunk?: string; totalChunks?: string; mode?: string };
}>('/api/upload/:sessionId/:fileId', async (request: FastifyRequest<{ Params: { sessionId: string; fileId: string }; Querystring: { chunk?: string; totalChunks?: string; mode?: string } }>, reply: FastifyReply) => {
  try {
    const sharer = sharers.get(request.params.sessionId);
    if (!sharer) {
      reply.status(404).send({ error: 'Sharer not found' });
      return;
    }
    
    const file = sharer.files.get(request.params.fileId);
    if (!file) {
      reply.status(404).send({ error: 'File not found' });
      return;
    }
    
    const chunkIndex = parseInt(request.query.chunk || '0');
    const totalChunksQuery = request.query.totalChunks ? parseInt(request.query.totalChunks) : null;
    const isSingleUpload = request.headers['x-single-upload'] === 'true';
    const isAppendMode = request.headers['x-append-mode'] === 'true' || request.query.mode === 'append';
    const expectedTotalChunks = totalChunksQuery || Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

    const isMultipart = request.isMultipart();
    if (isMultipart) {
      const data = await request.file();
      if (!data) {
        reply.status(400).send({ error: 'No file data received' });
        return;
      }

      if (isSingleUpload || (!isAppendMode && expectedTotalChunks <= 1)) {
        // Direct stream to file.path with pipeline (0 memory buffer)
        const writeStream = createWriteStream(file.path);
        await pipeline(data.file, writeStream);

        const stat = await fs.stat(file.path);
        file.uploaded = true;
        file.size = stat.size;

        io.to(request.params.sessionId).emit('file-available', {
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
        });

        app.log.info(`File uploaded directly via stream: ${file.name} (${file.size} bytes)`);
        reply.send({ success: true, chunk: 0, progress: 100 });
        return;
      }

      if (isAppendMode) {
        // Streaming append directly to disk
        const writeStream = createWriteStream(file.path, {
          flags: chunkIndex === 0 ? 'w' : 'a',
        });
        await pipeline(data.file, writeStream);
        file.chunks = Math.max(file.chunks, chunkIndex + 1);

        const isLastChunk = chunkIndex === expectedTotalChunks - 1 || file.chunks >= expectedTotalChunks;
        if (isLastChunk) {
          await cleanupPartFiles(file.path);
          const stat = await fs.stat(file.path);
          file.uploaded = true;
          file.size = stat.size;

          io.to(request.params.sessionId).emit('file-available', {
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
          });
          app.log.info(`File upload complete (multipart append): ${file.name} (${file.size} bytes)`);
        }

        reply.send({
          success: true,
          chunk: chunkIndex,
          progress: Math.min(100, (file.chunks / expectedTotalChunks) * 100),
        });
        return;
      }

      // Chunked multipart part file (.partN)
      const chunkPath = `${file.path}.part${chunkIndex}`;
      const chunkWriteStream = createWriteStream(chunkPath);
      await pipeline(data.file, chunkWriteStream);
      file.chunks++;

      if (file.chunks >= expectedTotalChunks) {
        const finalWriteStream = createWriteStream(file.path);
        for (let i = 0; i < expectedTotalChunks; i++) {
          const partPath = `${file.path}.part${i}`;
          if (await fs.pathExists(partPath)) {
            await pipeline(createReadStream(partPath), finalWriteStream, { end: false });
            await fs.remove(partPath).catch(() => {});
          }
        }
        finalWriteStream.end();
        await new Promise<void>((resolve, reject) => {
          finalWriteStream.on('finish', resolve);
          finalWriteStream.on('error', reject);
        });

        await cleanupPartFiles(file.path);

        const stat = await fs.stat(file.path);
        file.uploaded = true;
        file.size = stat.size;

        io.to(request.params.sessionId).emit('file-available', {
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
        });

        app.log.info(`File assembled from chunks: ${file.name} (${file.size} bytes)`);
      }

      reply.send({
        success: true,
        chunk: chunkIndex,
        progress: Math.min(100, (file.chunks / expectedTotalChunks) * 100),
      });
      return;
    }

    // JSON base64 chunk body
    const body = request.body as { chunk?: string; data?: string } | undefined;
    const base64Data = body?.chunk || body?.data;
    if (!base64Data) {
      reply.status(400).send({ error: 'No chunk data found in request body' });
      return;
    }

    const chunkBuffer = Buffer.from(base64Data, 'base64');
    const writeStream = createWriteStream(file.path, {
      flags: chunkIndex === 0 ? 'w' : 'a',
    });

    await new Promise<void>((resolve, reject) => {
      writeStream.write(chunkBuffer, (err) => {
        if (err) return reject(err);
        writeStream.end(resolve);
      });
    });

    file.chunks = Math.max(file.chunks, chunkIndex + 1);
    const isFinished = chunkIndex === expectedTotalChunks - 1 || file.chunks >= expectedTotalChunks;

    if (isFinished) {
      await cleanupPartFiles(file.path);
      const stat = await fs.stat(file.path);
      file.uploaded = true;
      file.size = stat.size;

      io.to(request.params.sessionId).emit('file-available', {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
      });

      app.log.info(`File uploaded via JSON base64 chunks: ${file.name} (${file.size} bytes)`);
    }

    reply.send({
      success: true,
      chunk: chunkIndex,
      progress: Math.min(100, (file.chunks / expectedTotalChunks) * 100),
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Upload error:');
    reply.status(500).send({ error: 'Upload failed' });
  }
});

// File download endpoint with range and streaming attachment support
app.get<{
  Params: { sessionId: string; fileId: string };
}>('/api/download/:sessionId/:fileId', async (request: FastifyRequest<{ Params: { sessionId: string; fileId: string } }>, reply: FastifyReply) => {
  try {
    const sharer = sharers.get(request.params.sessionId);
    if (!sharer) {
      reply.status(404).send({ error: 'Sharer not found' });
      return;
    }
    
    const file = sharer.files.get(request.params.fileId);
    if (!file || !file.uploaded) {
      reply.status(404).send({ error: 'File not found or not ready' });
      return;
    }
    
    if (!await fs.pathExists(file.path)) {
      reply.status(404).send({ error: 'File on disk not found or deleted' });
      return;
    }

    const stat = await fs.stat(file.path);
    const range = request.headers.range;
    const cleanFileName = file.name.replace(/["\r\n]/g, '');
    const encodedFileName = encodeURIComponent(file.name);
    
    if (range && range.startsWith('bytes=')) {
      const parts = range.replace(/bytes=/, "").split("-");
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      if (isNaN(start)) {
        const suffix = parseInt(parts[1], 10);
        if (!isNaN(suffix)) {
          start = Math.max(0, stat.size - suffix);
          end = stat.size - 1;
        } else {
          start = 0;
        }
      }

      if (isNaN(end) || end >= stat.size) {
        end = stat.size - 1;
      }

      if (start > end || start >= stat.size) {
        reply.header('Content-Range', `bytes */${stat.size}`);
        reply.status(416).send({ error: 'Requested range not satisfiable' });
        return;
      }
      
      const chunksize = (end - start) + 1;
      reply.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Length', chunksize);
      reply.header('Content-Type', file.type || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFileName}`);
      reply.status(206);
      
      const stream = createReadStream(file.path, { start, end });
      stream.on('error', (streamErr) => {
        app.log.warn({ err: streamErr }, 'Stream error during download:');
      });
      return reply.send(stream);
    } else {
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Length', stat.size);
      reply.header('Content-Type', file.type || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFileName}`);
      
      const stream = createReadStream(file.path);
      stream.on('error', (streamErr) => {
        app.log.warn({ err: streamErr }, 'Stream error during download:');
      });
      return reply.send(stream);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    app.log.error({ err }, 'Download error:');
    reply.status(500).send({ error: 'Download failed' });
  }
});

// WebSocket connection handling
io.on('connection', (socket: Socket) => {
  let currentSessionId: string | null = null;
  let currentDeviceId: string | null = null;
  
  app.log.info(`New client connected: ${socket.id}`);
  
  socket.on('register-sharer', ({ sessionId, sharerId, sharerName }: { sessionId: string; sharerId: string; sharerName: string }) => {
    const sharer = sharers.get(sessionId);
    if (sharer) {
      currentSessionId = sessionId;
      socket.join(sessionId);
      socket.emit('registered', { success: true });
      app.log.info(`Sharer ${sharerName} (${sharerId}) registered`);
    } else {
      socket.emit('error', { message: 'Session not found' });
    }
  });
  
  socket.on('register-receiver', ({ sessionId, deviceName, os }: { sessionId: string; deviceName: string; os: string }) => {
    const sharer = sharers.get(sessionId);
    if (sharer) {
      currentSessionId = sessionId;
      currentDeviceId = uuidv4();
      
      const device: Device = {
        id: currentDeviceId,
        name: deviceName,
        os,
        connectedAt: new Date(),
        lastSeen: new Date(),
      };
      
      sharer.devices.set(currentDeviceId, device);
      socket.join(sessionId);
      
      socket.emit('registered', { success: true, deviceId: currentDeviceId });
      io.to(sessionId).emit('device-connected', device);
      
      app.log.info(`Receiver ${deviceName} (${os}) connected to ${sharer.name}`);
    }
  });
  
  socket.on('disconnect', () => {
    if (currentSessionId && currentDeviceId) {
      const sharer = sharers.get(currentSessionId);
      if (sharer) {
        sharer.devices.delete(currentDeviceId);
        io.to(currentSessionId).emit('device-disconnected', currentDeviceId);
        app.log.info(`Device ${currentDeviceId} disconnected`);
      }
    }
  });
});


// Public Tunnel Endpoints (Disabled in favor of pure, fast direct LAN/Hotspot transfers)
app.post('/api/tunnel/start', async (request: FastifyRequest, reply: FastifyReply) => {
  const primaryIp = getPrimaryLocalIp();
  reply.send({
    success: false,
    message: 'Cloud tunnels disabled. SpeedDrop operates directly on local Wi-Fi / Hotspot for max speed without verification screens.',
    url: `http://${primaryIp}:${PORT}`,
  });
});

// Check public HTTPS tunnel status
app.get('/api/tunnel/status', async (request: FastifyRequest, reply: FastifyReply) => {
  const primaryIp = getPrimaryLocalIp();
  reply.send({
    running: false,
    publicUrl: null,
    mode: 'local_lan',
    localUrl: `http://${primaryIp}:${PORT}`,
  });
});

// Stop public HTTPS tunnel
app.post('/api/tunnel/stop', async (request: FastifyRequest, reply: FastifyReply) => {
  reply.send({ success: true });
});

// Health check
app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
  reply.send({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeSharers: sharers.size,
    uploadDir: UPLOAD_DIR
  });
});

// Helper to stream single file attachment directly or redirect strictly to /receive
const streamSingleFileOrRedirect = async (sharer: Sharer, sessionId: string, reply: FastifyReply) => {
  const uploadedFiles = Array.from(sharer.files.values()).filter(f => f.uploaded);

  if (uploadedFiles.length === 1) {
    const file = uploadedFiles[0];
    try {
      if (await fs.pathExists(file.path)) {
        const stat = await fs.stat(file.path);
        const cleanFileName = file.name.replace(/["\r\n]/g, '');
        const encodedFileName = encodeURIComponent(file.name);

        reply.header('Accept-Ranges', 'bytes');
        reply.header('Content-Length', stat.size);
        reply.header('Content-Type', file.type || 'application/octet-stream');
        reply.header('Content-Disposition', `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFileName}`);

        const stream = createReadStream(file.path);
        stream.on('error', (err) => {
          app.log.warn({ err }, 'Stream error:');
        });
        return reply.send(stream);
      }
    } catch (err) {
      app.log.error({ err }, 'Error streaming single file attachment:');
    }
  }

  // Multiple files or 0 files yet: strictly redirect to receive view with autodownload enabled (NEVER to /send)
  return reply.redirect(`/web/?page=receive&sid=${encodeURIComponent(sharer.sharerId)}&session=${encodeURIComponent(sessionId)}&autodownload=1`);
};

// Direct download by Sharer ID: GET /d/:sharerId (with bulletproof normalization & active session fallback)
app.get<{
  Params: { sharerId: string };
}>('/d/:sharerId', async (request: FastifyRequest<{ Params: { sharerId: string } }>, reply: FastifyReply) => {
  const { sharerId } = request.params;
  const found = findSharerSession(sharerId);

  if (found) {
    return streamSingleFileOrRedirect(found.sharer, found.sessionId, reply);
  }

  // If no sharer found at all, redirect to receive page
  return reply.redirect(`/web/?page=receive&sid=${encodeURIComponent(sharerId)}`);
});

// Root & short download endpoint: GET / or GET /d
const handleRootDownload = async (request: FastifyRequest<{ Querystring: { json?: string; sharer?: string } }>, reply: FastifyReply) => {
  if (request.query?.json === 'true') {
    return reply.send({ 
      name: 'SpeedDrop Backend',
      version: '1.0.0',
      status: 'running',
      activeSharers: sharers.size,
      lanUrl: `http://${getPrimaryLocalIp()}:${PORT}`,
      mode: 'local_lan',
    });
  }

  if (request.query?.sharer) {
    const sharerId = request.query.sharer;
    const found = findSharerSession(sharerId);
    if (found) {
      return streamSingleFileOrRedirect(found.sharer, found.sessionId, reply);
    }
    return reply.redirect(`/web/?page=receive&sid=${encodeURIComponent(sharerId)}`);
  }

  const active = getActiveSharer();
  if (!active) {
    return reply.sendFile('index.html');
  }

  return streamSingleFileOrRedirect(active.sharer, active.sessionId, reply);
};

app.get('/', handleRootDownload);
app.get('/d', handleRootDownload);

// SPA Convenience Redirects
app.get('/receive', async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.redirect('/web/?page=receive');
});
app.get<{
  Params: { sharerId: string };
}>('/receive/:sharerId', async (request: FastifyRequest<{ Params: { sharerId: string } }>, reply: FastifyReply) => {
  const { sharerId } = request.params;
  const found = findSharerSession(sharerId);
  if (found) {
    return streamSingleFileOrRedirect(found.sharer, found.sessionId, reply);
  }
  return reply.redirect(`/web/?page=receive&sid=${encodeURIComponent(sharerId)}`);
});
app.get('/send', async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.redirect('/web/?page=send');
});

// Helper to gather active backend registration details
function getBackendRegistrationInfo(): RegistrationInfo {
  const active = getActiveSharer();
  const primaryIp = getPrimaryLocalIp();
  return {
    sharerId: active ? active.sharer.sharerId : 'DEFAULT',
    localIp: primaryIp,
    port: PORT,
    serverUrl: `http://${primaryIp}:${PORT}`,
    tunnelUrl: null,
    deviceName: active ? active.sharer.name : `SpeedDrop PC (${process.platform})`,
  };
}

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    const primaryIp = getPrimaryLocalIp();
    const allInterfaces = getAllNetworkInterfaces();
    const serverBaseUrl = getPublicServerUrl();
    const isCloud = serverBaseUrl.startsWith('https://') || serverBaseUrl.includes('onrender.com') || process.env.NODE_ENV === 'production';

    console.log('\n======================================================');
    console.log(isCloud ? '🌐 SpeedDrop 24/7 Cloud Production Server Running' : '⚡ SpeedDrop LAN Server Running (Offline / Hotspot Mode)');
    console.log('======================================================');
    console.log(`🌍 Public Base URL:   ${serverBaseUrl}`);
    console.log(`📍 Port:              ${PORT}`);
    if (!isCloud) {
      console.log(`📍 Localhost:         http://localhost:${PORT}`);
      console.log(`🌐 Primary LAN IP:    http://${primaryIp}:${PORT}`);
      if (allInterfaces.length > 0) {
        console.log('📱 Active Network Interfaces:');
        for (const iface of allInterfaces) {
          const badge = iface.isHotspot ? '[Hotspot]' : `[${iface.type.toUpperCase()}]`;
          console.log(`   - ${badge.padEnd(11)} ${iface.name}: ${iface.url}`);
        }
      }
    }
    console.log(`📡 WebSocket:         ${serverBaseUrl.replace(/^http/i, 'ws')}`);
    console.log(`📁 Web UI:            ${serverBaseUrl}/web`);
    console.log(`📂 Direct Download:   ${serverBaseUrl}/d/<sharerId>`);
    console.log('======================================================\n');

    // Announce to discovery only if in local standalone mode and not already running on the cloud server
    if (!isCloud && !process.env.RENDER && process.env.DISABLE_DISCOVERY !== 'true') {
      discoveryClient.startHeartbeat(getBackendRegistrationInfo, 30000);
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await discoveryClient.unregister();
  } catch (_) {}
  process.exit(0);
});

start();