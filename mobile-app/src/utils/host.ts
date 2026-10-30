import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';
import { DEFAULT_PORTS, DEFAULT_IP } from '../constants/endpoints';

export const DEFAULT_DISCOVERY_URL = 'https://speeddrop.onrender.com';

export const FALLBACK_IP = 'https://speeddrop.onrender.com';

/**
 * Universal headers required when communicating over public tunnels
 * (such as localtunnel, ngrok) to bypass intermediate splash/reminder screens.
 */
export const TUNNEL_HEADERS: Record<string, string> = {
  'bypass-tunnel-reminder': 'true',
  'ngrok-skip-browser-warning': 'true',
  'User-Agent': 'SpeedDrop-Mobile-App',
};

/**
 * Helper to identify if a saved or entered host is an old private local IP
 * (e.g. 10.x.x.x, 192.168.x.x, 172.16-31.x.x, 127.0.0.1, localhost).
 */
export function isLocalPrivateAddress(urlOrIp?: string | null): boolean {
  if (!urlOrIp || !urlOrIp.trim()) return false;
  const clean = urlOrIp.trim().replace(/^https?:\/\//i, '').replace(/:\d+$/, '');
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)
  );
}

/**
 * Extracts the host IP from NativeModules.SourceCode.scriptURL (Metro bundler URL).
 */
export function detectMetroHost(): string | null {
  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
    if (typeof scriptURL === 'string') {
      const match = scriptURL.match(/https?:\/\/([^/:]+)/);
      if (match && match[1]) {
        const host = match[1].trim();
        if (host !== 'localhost' && host !== '127.0.0.1' && host !== '') {
          return host;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Normalizes any server input (HTTPS cloud URL, IP, hostname, IP:port)
 * into a fully-qualified, reachable base URL without trailing slash.
 *
 * Examples:
 * - "https://speeddrop.onrender.com/"    -> "https://speeddrop.onrender.com"
 * - "speeddrop.onrender.com"            -> "https://speeddrop.onrender.com"
 * - "https://speeddrop.onrender.com:3000"-> "https://speeddrop.onrender.com"
 * - "http://192.168.1.5:3000"           -> "http://192.168.1.5:3000"
 */
export function normalizeServerUrl(rawInput?: string | null): string {
  if (!rawInput || !rawInput.trim()) {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (envUrl && envUrl.trim()) {
      return normalizeServerUrl(envUrl.trim());
    }
    return 'https://speeddrop.onrender.com';
  }

  let inp = rawInput.trim().replace(/\/+$/, '');

  // 1. Identify if this is a public cloud hostname (Render, Cloudflare, Ngrok, Fly, etc.)
  const tunnelPattern = /\.(trycloudflare\.com|loca\.lt|ngrok(-free)?\.(app|io)|run\.app|fly\.dev|herokuapp\.com|onrender\.com)/i;
  const isTunnelDomain = tunnelPattern.test(inp) || (!/^(\d{1,3}\.){3}\d{1,3}/.test(inp.replace(/^https?:\/\//i, '')) && !inp.includes('localhost'));

  if (isTunnelDomain) {
    // Strip protocol first
    let cleanDomain = inp.replace(/^https?:\/\//i, '');
    // CRITICAL: Strip any custom port (:3000, :8080) from public cloud domains! Tunnels only listen on standard HTTPS (port 443).
    cleanDomain = cleanDomain.replace(/:\d+$/, '');
    // Always enforce HTTPS for public domains
    return `https://${cleanDomain}`;
  }

  // 2. Full protocol already provided for LAN / local IPs
  if (/^https?:\/\//i.test(inp)) {
    const withoutProto = inp.replace(/^https?:\/\//i, '');
    // If it's an IP or localhost without a port, append DEFAULT_PORTS.BACKEND
    if ((/^(\d{1,3}\.){3}\d{1,3}/.test(withoutProto) || withoutProto.startsWith('localhost')) && !/:\d+$/.test(withoutProto)) {
      return `${inp}:${DEFAULT_PORTS.BACKEND}`;
    }
    return inp;
  }

  // 3. Localhost special handling
  if (inp === 'localhost' || inp.startsWith('localhost:')) {
    return inp.includes(':') ? `http://${inp}` : `http://${inp}:${DEFAULT_PORTS.BACKEND}`;
  }

  // 4. IP or host with port already specified (e.g. 192.168.1.5:3000)
  if (/:\d+$/.test(inp)) {
    return `http://${inp}`;
  }

  // 5. Plain IP without port
  return `http://${inp}:${DEFAULT_PORTS.BACKEND}`;
}

// In-memory cache of the active normalized server base URL (defaulting strictly to 24/7 cloud server)
let cachedServerUrl: string = normalizeServerUrl(
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://speeddrop.onrender.com'
);

const TARGET_SERVER_KEY = Config.storageKeys.targetServerIp || '@speeddrop/target_server_ip';

// Self-initialize from AsyncStorage in background & clean up any legacy stale local IPs
AsyncStorage.getItem(TARGET_SERVER_KEY)
  .then((saved) => {
    if (saved && saved.trim()) {
      const trimmed = saved.trim();
      // If user had a stale local private IP saved (like 10.x.x.x:3000), migrate them permanently to cloud
      if (isLocalPrivateAddress(trimmed)) {
        cachedServerUrl = 'https://speeddrop.onrender.com';
        AsyncStorage.setItem(TARGET_SERVER_KEY, cachedServerUrl).catch(() => {});
        console.log('[host] Migrated stale local IP from AsyncStorage to https://speeddrop.onrender.com');
      } else {
        const normalized = normalizeServerUrl(trimmed);
        cachedServerUrl = normalized;
        if (normalized !== trimmed) {
          AsyncStorage.setItem(TARGET_SERVER_KEY, normalized).catch(() => {});
        }
      }
    } else {
      cachedServerUrl = 'https://speeddrop.onrender.com';
      AsyncStorage.setItem(TARGET_SERVER_KEY, cachedServerUrl).catch(() => {});
    }
  })
  .catch(() => {});

/**
 * Returns the active normalized backend base URL (e.g. "https://speeddrop.onrender.com").
 */
export function getServerUrl(override?: string | null): string {
  if (override && override.trim()) {
    return normalizeServerUrl(override);
  }
  return cachedServerUrl;
}

/**
 * Get the resolved server URL asynchronously, checking AsyncStorage first,
 * automatically migrating any stale local IPs to the 24/7 cloud URL.
 */
export async function getServerUrlAsync(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(TARGET_SERVER_KEY);
    if (saved && saved.trim()) {
      const trimmed = saved.trim();
      if (isLocalPrivateAddress(trimmed)) {
        cachedServerUrl = 'https://speeddrop.onrender.com';
        await AsyncStorage.setItem(TARGET_SERVER_KEY, cachedServerUrl);
        return cachedServerUrl;
      }
      const normalized = normalizeServerUrl(trimmed);
      cachedServerUrl = normalized;
      if (normalized !== trimmed) {
        await AsyncStorage.setItem(TARGET_SERVER_KEY, normalized);
      }
      return cachedServerUrl;
    }
  } catch (e) {
    // ignore
  }

  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    cachedServerUrl = normalizeServerUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
    return cachedServerUrl;
  }

  cachedServerUrl = 'https://speeddrop.onrender.com';
  return cachedServerUrl;
}

/**
 * Persist user manual server URL or IP override (e.g. from the in-app modal).
 * Accepts tunnel URLs ("https://xxx.trycloudflare.com") or local IPs ("192.168.1.5:3000").
 */
export async function setServerUrl(serverInput: string): Promise<void> {
  const normalized = normalizeServerUrl(serverInput);
  cachedServerUrl = normalized;
  await AsyncStorage.setItem(
    Config.storageKeys.targetServerIp || '@speeddrop/target_server_ip',
    normalized
  );
}

/**
 * Backward compatibility: returns current host or base URL
 */
export function getServerIp(): string {
  return getServerUrl();
}

/**
 * Backward compatibility
 */
export async function getServerIpAsync(): Promise<string> {
  return getServerUrlAsync();
}

/**
 * Backward compatibility
 */
export async function setServerIp(ip: string): Promise<void> {
  return setServerUrl(ip);
}

/**
 * Convenience helper to build a full base URL.
 */
export function getBaseUrl(override?: string | null): string {
  return getServerUrl(override);
}

/**
 * Returns the full WebSocket / Socket.IO connection URL.
 */
export function getSocketUrl(override?: string | null): string {
  return getServerUrl(override);
}

/**
 * Alias for getSocketUrl (backward compatibility).
 */
export function getWsUrl(override?: string | null): string {
  return getServerUrl(override);
}

/**
 * Returns optimized Socket.IO connection options for HTTPS tunnels and LAN connections.
 */
export function getSocketOptions(override?: string | null) {
  const url = getServerUrl(override);
  const isHttps = url.startsWith('https://');

  return {
    transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
    secure: isHttps,
    rejectUnauthorized: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
    extraHeaders: TUNNEL_HEADERS,
  };
}

/**
 * Constructs a full API endpoint URL using the active server base URL.
 */
export function getApiUrl(path: string, override?: string | null): string {
  const base = getServerUrl(override);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Returns a clean, human-readable display string for UI cards.
 */
export function getDisplayServer(override?: string | null): string {
  const url = getServerUrl(override);
  if (url.startsWith('https://')) {
    return url;
  }
  return url.replace(/^http:\/\//i, '');
}

export interface DiscoveredServerInfo {
  activeUrl: string;
  sharerId?: string;
  tunnelUrl?: string | null;
  serverUrl?: string | null;
  localIp?: string;
  port?: number;
  deviceName?: string;
}

/**
 * Returns the configured Public Cloud Discovery service URL.
 */
export function getDiscoveryServerUrl(): string {
  const custom = Config.discoveryServerUrl || DEFAULT_DISCOVERY_URL;
  return custom.trim().replace(/\/+$/, '');
}

/**
 * Universal safe fetch wrapper that enforces strict timeout aborts,
 * guarantees clearTimeout in a finally block (preventing orphan timer leaks),
 * and catches network errors cleanly without throwing unhandled exceptions.
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 3500
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort();
    } catch (_) {}
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (timedOut || err?.name === 'AbortError') {
      const tErr = new Error(`Network request to ${url} timed out after ${timeoutMs}ms`);
      (tErr as any).isTimeout = true;
      throw tErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks server health with a tight timeout, returning a boolean.
 * Never throws an error.
 */
export async function checkServerHealth(
  host?: string,
  timeoutMs: number = 3000
): Promise<boolean> {
  try {
    const base = getServerUrl(host);
    const res = await safeFetch(`${base}/health`, { headers: TUNNEL_HEADERS }, timeoutMs);
    return res.ok;
  } catch (_) {
    return false;
  }
}

/**
 * Automatically queries the Cloud Discovery Server to fetch the freshest active backend address.
 * If sharerId is passed, queries /api/resolve/:sharerId.
 * If omitted, queries /api/active to get the most recent active backend.
 *
 * Automatically updates and persists the active server URL into cache and AsyncStorage.
 * Guaranteed safe: never throws unhandled errors.
 */
export async function fetchActiveServerFromDiscovery(
  sharerId?: string
): Promise<DiscoveredServerInfo | null> {
  try {
    const discoveryBase = getDiscoveryServerUrl();
    const endpoint = sharerId && sharerId.trim()
      ? `${discoveryBase}/api/resolve/${encodeURIComponent(sharerId.trim())}`
      : `${discoveryBase}/api/active`;

    const res = await safeFetch(
      endpoint,
      {
        headers: {
          Accept: 'application/json',
          ...TUNNEL_HEADERS,
        },
      },
      3000
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || (!data.activeUrl && !data.serverUrl && !data.tunnelUrl)) {
      return null;
    }

    const candidateUrl =
      data.activeUrl ||
      data.serverUrl ||
      data.tunnelUrl ||
      (data.localIp ? `http://${data.localIp}:${data.port || DEFAULT_PORTS.BACKEND}` : null);

    if (candidateUrl) {
      const normalized = normalizeServerUrl(candidateUrl);
      await setServerUrl(normalized).catch(() => {});
      console.log(`[Auto-Discovery] Resolved active server: ${normalized}`);
      return {
        activeUrl: normalized,
        sharerId: data.sharerId,
        tunnelUrl: data.tunnelUrl,
        serverUrl: data.serverUrl,
        localIp: data.localIp,
        port: data.port,
        deviceName: data.deviceName,
      };
    }
  } catch (err: any) {
    console.warn(`[Auto-Discovery] Query failed safely:`, err?.message || err);
  }

  return null;
}

/**
 * Directly queries the PC backend's /api/network-info endpoint to obtain
 * active network interface details.
 * Guaranteed safe: never throws unhandled errors.
 */
export async function fetchNetworkInfo(host?: string): Promise<{
  ip: string;
  port: number;
  url: string;
  allIps: { name: string; ip: string; type: string; isHotspot: boolean; url: string }[];
  isCloud?: boolean;
} | null> {
  try {
    const base = getServerUrl(host);
    const res = await safeFetch(`${base}/api/network-info`, {}, 3000);
    if (res.ok) {
      return await res.json();
    }
  } catch (_) {}
  return null;
}

/**
 * Wakes up the Render / cloud backend by polling /health.
 * Optimized for fast responsiveness: uses a tight 3.5s timeout per attempt,
 * limiting attempts to 2 (max ~7-8 seconds total wait), and falls back gracefully.
 * Never throws unhandled promise errors.
 */
export async function wakeUpServer(
  serverUrl?: string,
  onStatusUpdate?: (statusMessage: string) => void,
  maxAttempts: number = 2
): Promise<boolean> {
  try {
    const base = getServerUrl(serverUrl);
    const healthUrl = `${base}/health`;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (onStatusUpdate) {
          if (attempt === 1) {
            onStatusUpdate('Connecting to cloud server...');
          } else {
            onStatusUpdate(`Waking up cloud server (attempt ${attempt}/${maxAttempts})...`);
          }
        }

        const res = await safeFetch(
          healthUrl,
          { headers: TUNNEL_HEADERS },
          3500
        );

        if (res.ok) {
          return true;
        }
      } catch (err: any) {
        console.warn(`[wakeUpServer] Attempt ${attempt} did not succeed:`, err?.message || err);
      }

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  } catch (outerErr: any) {
    console.warn('[wakeUpServer] Handled cleanly:', outerErr?.message || outerErr);
  }

  return false;
}

