import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';
import { DEFAULT_PORTS, DEFAULT_IP, DEFAULT_DISCOVERY_URL } from '../constants/endpoints';

export const FALLBACK_IP = '10.182.74.170';

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
 * Extracts the host IP from NativeModules.SourceCode.scriptURL (Metro bundler URL).
 * In Expo Go, this points to e.g. http://10.182.74.170:8081/index.bundle?...
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
 * Normalizes any server input (HTTPS tunnel URL, IP, hostname, IP:port)
 * into a fully-qualified, reachable base URL without trailing slash.
 *
 * Examples:
 * - "https://pretty-berries-happen.loca.lt" -> "https://pretty-berries-happen.loca.lt"
 * - "https://speeddrop.trycloudflare.com/"  -> "https://speeddrop.trycloudflare.com"
 * - "speeddrop.trycloudflare.com"          -> "https://speeddrop.trycloudflare.com"
 * - "xyz.ngrok-free.app"                   -> "https://xyz.ngrok-free.app"
 * - "http://10.182.74.170:3000"            -> "http://10.182.74.170:3000"
 * - "10.182.74.170:3000"                   -> "http://10.182.74.170:3000"
 * - "10.182.74.170"                        -> "http://10.182.74.170:3000"
 * - "localhost"                            -> "http://localhost:3000"
 */
export function normalizeServerUrl(rawInput?: string | null): string {
  if (!rawInput || !rawInput.trim()) {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (envUrl && envUrl.trim()) {
      return normalizeServerUrl(envUrl.trim());
    }
    const metroHost = detectMetroHost();
    const fallbackHost = metroHost || DEFAULT_IP || FALLBACK_IP;
    return normalizeServerUrl(fallbackHost);
  }

  let inp = rawInput.trim().replace(/\/+$/, '');

  // 1. Full protocol already provided
  if (/^https?:\/\//i.test(inp)) {
    return inp;
  }

  // 2. Localhost special handling
  if (inp === 'localhost' || inp.startsWith('localhost:')) {
    return inp.includes(':') ? `http://${inp}` : `http://${inp}:${DEFAULT_PORTS.BACKEND}`;
  }

  // 3. Known tunnel domains or domain names without port -> default to HTTPS
  const tunnelPattern = /\.(trycloudflare\.com|loca\.lt|ngrok(-free)?\.(app|io)|run\.app|fly\.dev|herokuapp\.com)/i;
  if (
    tunnelPattern.test(inp) ||
    (!inp.includes(':') && /[a-zA-Z]/.test(inp) && !inp.startsWith('192.') && !inp.startsWith('10.'))
  ) {
    return `https://${inp}`;
  }

  // 4. IP or host with port already specified (e.g. 10.182.74.170:3000)
  if (/:\d+$/.test(inp)) {
    return `http://${inp}`;
  }

  // 5. Plain IP without port
  return `http://${inp}:${DEFAULT_PORTS.BACKEND}`;
}

// In-memory cache of the active normalized server base URL
let cachedServerUrl: string = normalizeServerUrl(
  process.env.EXPO_PUBLIC_BACKEND_URL || detectMetroHost() || DEFAULT_IP || FALLBACK_IP
);

// Self-initialize from AsyncStorage in background
AsyncStorage.getItem(Config.storageKeys.targetServerIp || '@speeddrop/target_server_ip')
  .then((saved) => {
    if (saved && saved.trim()) {
      cachedServerUrl = normalizeServerUrl(saved.trim());
    }
  })
  .catch(() => {});

/**
 * Returns the active normalized backend base URL (e.g. "https://xxx.trycloudflare.com" or "http://10.182.74.170:3000").
 */
export function getServerUrl(override?: string | null): string {
  if (override && override.trim()) {
    return normalizeServerUrl(override);
  }
  return cachedServerUrl;
}

/**
 * Get the resolved server URL asynchronously, checking AsyncStorage first,
 * then environment variable, Metro scriptURL, and fallback.
 */
export async function getServerUrlAsync(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(
      Config.storageKeys.targetServerIp || '@speeddrop/target_server_ip'
    );
    if (saved && saved.trim()) {
      cachedServerUrl = normalizeServerUrl(saved.trim());
      return cachedServerUrl;
    }
  } catch (e) {
    // ignore
  }

  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    cachedServerUrl = normalizeServerUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
    return cachedServerUrl;
  }

  const detected = detectMetroHost();
  if (detected) {
    cachedServerUrl = normalizeServerUrl(detected);
    return cachedServerUrl;
  }

  cachedServerUrl = normalizeServerUrl(DEFAULT_IP || FALLBACK_IP);
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
 * Automatically queries the Cloud Discovery Server to fetch the freshest active backend address.
 * If sharerId is passed, queries /api/resolve/:sharerId.
 * If omitted, queries /api/active to get the most recent active backend.
 *
 * Automatically updates and persists the active server URL into cache and AsyncStorage.
 */
export async function fetchActiveServerFromDiscovery(
  sharerId?: string
): Promise<DiscoveredServerInfo | null> {
  const discoveryBase = getDiscoveryServerUrl();
  const endpoint = sharerId && sharerId.trim()
    ? `${discoveryBase}/api/resolve/${encodeURIComponent(sharerId.trim())}`
    : `${discoveryBase}/api/active`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
        ...TUNNEL_HEADERS,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || (!data.activeUrl && !data.serverUrl && !data.tunnelUrl)) {
      return null;
    }

    // Determine the best candidate URL: prioritize HTTPS tunnel or activeUrl
    const candidateUrl = data.tunnelUrl || data.activeUrl || data.serverUrl;
    if (candidateUrl) {
      const normalized = normalizeServerUrl(candidateUrl);
      await setServerUrl(normalized);
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
    console.warn(`[Auto-Discovery] Query failed:`, err.message || err);
  }

  return null;
}

