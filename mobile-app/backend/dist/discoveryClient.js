"use strict";
/**
 * SpeedDrop PC Backend - Cloud Discovery Client
 *
 * Automatically announces the backend's active address (LAN IP and Cloudflare Tunnel)
 * and Sharer ID to the Public Discovery Server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoveryClient = exports.DiscoveryClient = void 0;
class DiscoveryClient {
    constructor() {
        this.heartbeatTimer = null;
        this.lastRegisteredSharerId = null;
        this.isEnabled = true;
        this.discoveryUrl = (process.env.DISCOVERY_SERVER_URL || 'https://speeddrop.onrender.com').replace(/\/+$/, '');
        if (process.env.DISABLE_DISCOVERY === 'true' ||
            process.env.RENDER === 'true' ||
            process.env.NODE_ENV === 'production') {
            this.isEnabled = false;
        }
    }
    /**
     * Returns active discovery service URL.
     */
    getDiscoveryUrl() {
        return this.discoveryUrl;
    }
    /**
     * Sets or overrides the discovery server URL dynamically.
     */
    setDiscoveryUrl(url) {
        this.discoveryUrl = url.replace(/\/+$/, '');
    }
    /**
     * Register or update the backend's active address with the cloud discovery service.
     */
    async register(info) {
        if (!this.isEnabled)
            return false;
        const sharerId = (info.sharerId && info.sharerId.trim()) ? info.sharerId.trim().toUpperCase() : 'DEFAULT';
        this.lastRegisteredSharerId = sharerId;
        const effectiveTunnel = (info.tunnelUrl && info.tunnelUrl.trim())
            ? info.tunnelUrl.trim().replace(/\/+$/, '')
            : (process.env.PUBLIC_URL ? process.env.PUBLIC_URL.trim().replace(/\/+$/, '') : null);
        const payload = {
            sharerId,
            localIp: info.localIp,
            port: info.port,
            serverUrl: info.serverUrl || `http://${info.localIp}:${info.port}`,
            tunnelUrl: effectiveTunnel || null,
            deviceName: info.deviceName || `SpeedDrop PC (${process.platform})`,
        };
        const targetUrl = `${this.discoveryUrl}/api/register`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SpeedDrop-Backend-Discovery-Client/1.0',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                console.warn(`[Discovery] Warning: Registration returned HTTP ${response.status}`);
                return false;
            }
            const data = await response.json();
            const activeEndpoint = data?.activeUrl || payload.tunnelUrl || payload.serverUrl;
            console.log(`📡 [Discovery] Auto-registered [${sharerId}] -> ${activeEndpoint} (Cloud: ${this.discoveryUrl})`);
            return true;
        }
        catch (err) {
            if (err.name === 'AbortError') {
                console.warn(`[Discovery] Registration timed out at ${this.discoveryUrl}`);
            }
            else {
                // Log friendly note; don't break the local backend
                console.warn(`[Discovery] Note: Could not reach discovery server at ${this.discoveryUrl} (${err.message || err})`);
            }
            return false;
        }
    }
    /**
     * Starts periodic registration heartbeat so cloud registry stays fresh.
     */
    startHeartbeat(getInfoFn, intervalMs = 30000) {
        if (!this.isEnabled)
            return;
        this.stopHeartbeat();
        // Register immediately
        this.register(getInfoFn()).catch(() => { });
        // Schedule periodic heartbeat
        this.heartbeatTimer = setInterval(() => {
            this.register(getInfoFn()).catch(() => { });
        }, intervalMs);
    }
    /**
     * Stops periodic heartbeat.
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    /**
     * De-registers from the discovery service on graceful shutdown.
     */
    async unregister(sharerId) {
        if (!this.isEnabled)
            return;
        this.stopHeartbeat();
        const targetId = sharerId || this.lastRegisteredSharerId || 'DEFAULT';
        const targetUrl = `${this.discoveryUrl}/api/unregister`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sharerId: targetId }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
        }
        catch (_) {
            // Ignore errors on shutdown
        }
    }
}
exports.DiscoveryClient = DiscoveryClient;
// Export singleton instance
exports.discoveryClient = new DiscoveryClient();
