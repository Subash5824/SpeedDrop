/**
 * SpeedDrop Public Discovery Service
 * 
 * Lightweight matchmaking microservice designed for deployment on free cloud tiers
 * (Render, Railway, Fly.io, Glitch, etc.).
 * 
 * Functions:
 * 1. Backends ping /api/register with their local IP, port, tunnel URL, and Sharer ID.
 * 2. Mobile clients and web receivers query /api/resolve/:sharerId or /api/active
 *    to discover the active server address without manual configuration.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_MS || '3600000', 10); // 1 hour TTL default

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// In-memory Sharer Registry: Map<normalizedSharerId, SharerEntry>
const registry = new Map();
let latestActiveEntry = null;

/**
 * Normalizes Sharer ID for fuzzy lookup
 * (SD-ABC123 -> ABC123, 0 -> O, 1 -> I)
 */
function normalizeSharerId(id) {
  if (!id) return '';
  return id
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^SD-?/, '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I');
}

/**
 * Cleanup expired registrations
 */
function purgeExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of registry.entries()) {
    if (now - entry.updatedAt > SESSION_TTL_MS) {
      registry.delete(key);
      console.log(`[Discovery] Expired stale session: ${entry.sharerId} (${entry.activeUrl})`);
    }
  }
  if (latestActiveEntry && now - latestActiveEntry.updatedAt > SESSION_TTL_MS) {
    latestActiveEntry = null;
  }
}
setInterval(purgeExpiredEntries, 60000);

// Root Status Page & Overview
app.get('/', (req, res) => {
  res.json({
    service: 'SpeedDrop Public Discovery Service',
    status: 'online',
    version: '1.0.0',
    activeSessions: registry.size,
    latestSharerId: latestActiveEntry?.sharerId || null,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint for Cloud monitors (Render/Railway/Fly.io)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: registry.size, uptime: process.uptime() });
});

/**
 * POST /api/register
 * Register or refresh a backend's active address and Sharer ID.
 * 
 * Body: {
 *   sharerId: string,
 *   localIp: string,
 *   port: number,
 *   serverUrl?: string,
 *   tunnelUrl?: string,
 *   deviceName?: string
 * }
 */
app.post('/api/register', (req, res) => {
  try {
    const {
      sharerId,
      localIp,
      port = 3000,
      serverUrl,
      tunnelUrl,
      deviceName = 'SpeedDrop PC'
    } = req.body || {};

    const cleanSharerId = (sharerId && sharerId.trim()) ? sharerId.trim().toUpperCase() : 'DEFAULT';
    const normKey = normalizeSharerId(cleanSharerId) || 'DEFAULT';

    // Best public address: prioritize HTTPS tunnel URL if available, else LAN server URL or IP:port
    const lanUrl = serverUrl || (localIp ? `http://${localIp}:${port}` : null);
    const activeUrl = tunnelUrl || lanUrl;

    if (!activeUrl) {
      return res.status(400).json({ error: 'Either localIp, serverUrl, or tunnelUrl must be provided' });
    }

    const entry = {
      sharerId: cleanSharerId,
      normalizedId: normKey,
      localIp: localIp || '127.0.0.1',
      port: Number(port),
      serverUrl: lanUrl,
      tunnelUrl: tunnelUrl || null,
      activeUrl: activeUrl,
      deviceName,
      registeredAt: registry.has(normKey) ? registry.get(normKey).registeredAt : new Date().toISOString(),
      updatedAt: Date.now(),
    };

    registry.set(normKey, entry);
    latestActiveEntry = entry;

    console.log(`[Discovery] Registered ${cleanSharerId} (${deviceName}) -> Active URL: ${activeUrl}`);

    res.json({
      success: true,
      sharerId: cleanSharerId,
      activeUrl,
      tunnelUrl: entry.tunnelUrl,
      serverUrl: entry.serverUrl,
      updatedAt: new Date(entry.updatedAt).toISOString(),
    });
  } catch (err) {
    console.error('[Discovery] Registration error:', err);
    res.status(500).json({ error: 'Failed to register session' });
  }
});

/**
 * GET /api/resolve/:sharerId
 * Look up the active network address associated with a given Sharer ID.
 */
app.get('/api/resolve/:sharerId', (req, res) => {
  const { sharerId } = req.params;
  const normKey = normalizeSharerId(sharerId);

  // 1. Direct or normalized match
  let entry = registry.get(normKey);

  // 2. Fuzzy search across all entries
  if (!entry) {
    for (const [key, val] of registry.entries()) {
      if (
        key === normKey ||
        normalizeSharerId(val.sharerId) === normKey ||
        val.sharerId.toUpperCase() === sharerId.toUpperCase()
      ) {
        entry = val;
        break;
      }
    }
  }

  // 3. Fallback: if 'DEFAULT' or exactly 1 active session in registry, resolve to it
  if (!entry && (normKey === 'DEFAULT' || normKey === '' || registry.size === 1)) {
    entry = latestActiveEntry || Array.from(registry.values())[0];
  }

  if (!entry) {
    return res.status(404).json({
      success: false,
      error: `No active server found for Sharer ID "${sharerId}". Ensure backend is running.`,
    });
  }

  // Check TTL
  if (Date.now() - entry.updatedAt > SESSION_TTL_MS) {
    registry.delete(entry.normalizedId);
    return res.status(404).json({
      success: false,
      error: `Sharer session "${sharerId}" has expired. Please restart SpeedDrop backend.`,
    });
  }

  res.json({
    success: true,
    sharerId: entry.sharerId,
    activeUrl: entry.activeUrl,
    tunnelUrl: entry.tunnelUrl,
    serverUrl: entry.serverUrl,
    localIp: entry.localIp,
    port: entry.port,
    deviceName: entry.deviceName,
    updatedAt: new Date(entry.updatedAt).toISOString(),
  });
});

/**
 * GET /api/active
 * GET /api/latest
 * Fetch the most recently registered active backend instance.
 */
const handleActiveQuery = (req, res) => {
  purgeExpiredEntries();

  if (latestActiveEntry) {
    return res.json({
      success: true,
      sharerId: latestActiveEntry.sharerId,
      activeUrl: latestActiveEntry.activeUrl,
      tunnelUrl: latestActiveEntry.tunnelUrl,
      serverUrl: latestActiveEntry.serverUrl,
      localIp: latestActiveEntry.localIp,
      port: latestActiveEntry.port,
      deviceName: latestActiveEntry.deviceName,
      updatedAt: new Date(latestActiveEntry.updatedAt).toISOString(),
    });
  }

  if (registry.size > 0) {
    const all = Array.from(registry.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    const active = all[0];
    return res.json({
      success: true,
      sharerId: active.sharerId,
      activeUrl: active.activeUrl,
      tunnelUrl: active.tunnelUrl,
      serverUrl: active.serverUrl,
      localIp: active.localIp,
      port: active.port,
      deviceName: active.deviceName,
      updatedAt: new Date(active.updatedAt).toISOString(),
    });
  }

  res.status(404).json({
    success: false,
    error: 'No active SpeedDrop backend is currently registered.',
  });
};

app.get('/api/active', handleActiveQuery);
app.get('/api/latest', handleActiveQuery);

/**
 * GET /api/list
 * Returns all active registered SpeedDrop instances.
 */
app.get('/api/list', (req, res) => {
  purgeExpiredEntries();
  const list = Array.from(registry.values()).map(e => ({
    sharerId: e.sharerId,
    activeUrl: e.activeUrl,
    tunnelUrl: e.tunnelUrl,
    serverUrl: e.serverUrl,
    localIp: e.localIp,
    deviceName: e.deviceName,
    updatedAt: new Date(e.updatedAt).toISOString(),
  }));
  res.json({ count: list.length, sessions: list });
});

/**
 * POST /api/unregister
 * De-registers an instance on graceful shutdown.
 */
app.post('/api/unregister', (req, res) => {
  const { sharerId } = req.body || {};
  if (sharerId) {
    const normKey = normalizeSharerId(sharerId);
    registry.delete(normKey);
    if (latestActiveEntry && latestActiveEntry.normalizedId === normKey) {
      latestActiveEntry = null;
    }
    console.log(`[Discovery] Unregistered ${sharerId}`);
  }
  res.json({ success: true });
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log(`🚀 SpeedDrop Discovery Service running on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST /api/register`);
  console.log(`   - GET  /api/resolve/:sharerId`);
  console.log(`   - GET  /api/active`);
  console.log(`   - GET  /api/list`);
  console.log(`   - GET  /health`);
  console.log('==============================================');
});
