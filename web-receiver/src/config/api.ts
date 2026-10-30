/**
 * Dynamic API and Socket configuration for SpeedDrop Web Client.
 * Automatically adapts between public cloud production (https://speeddrop.onrender.com)
 * and local development/hotspot networks without breaking ports.
 */

export const getHostIp = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.hostname || '127.0.0.1';
  }
  return 'speeddrop.onrender.com';
};

export const BACKEND_PORT = '3000';

export const getBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If running over HTTPS (such as on Render) or on standard web ports, use origin directly (NO :3000)
    if (
      window.location.protocol === 'https:' ||
      window.location.port === '' ||
      window.location.port === '443' ||
      window.location.port === '80' ||
      window.location.hostname.includes('onrender.com') ||
      window.location.hostname.includes('speeddrop')
    ) {
      return window.location.origin;
    }
    // If Vite development server on port 3001 or 5173, point to backend on 3000
    if (window.location.port === '3001' || window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
    }
    // Standard origin (preserves whatever port the page was loaded with, e.g. :3000 on LAN)
    return window.location.origin;
  }
  return 'https://speeddrop.onrender.com';
};

export const getWebAppUrl = (params?: { sid?: string; session?: string }): string => {
  const base = getBackendUrl();
  let url = `${base}/web/`;
  if (params?.sid && params?.session) {
    url += `?sid=${encodeURIComponent(params.sid)}&session=${encodeURIComponent(params.session)}`;
  }
  return url;
};

export const getApiUrl = (endpoint: string = ''): string => {
  const base = getBackendUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};
