import { useState, useEffect, useRef, useCallback } from 'react';
import { getDiscoveryServerUrl, TUNNEL_HEADERS } from '../utils/host';

export interface DiscoveredDevice {
  id: string;
  name: string;
  sharerId: string;
  ip: string;
  port: number;
  activeUrl: string;
  serviceType: string;
}

export const useDiscovery = (enabled: boolean = true) => {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scanInterval = useRef<NodeJS.Timeout>();

  const scanForDevices = useCallback(async () => {
    try {
      const discoveryUrl = getDiscoveryServerUrl();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${discoveryUrl}/api/list`, {
        headers: {
          Accept: 'application/json',
          ...TUNNEL_HEADERS,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.sessions)) {
          const mapped: DiscoveredDevice[] = data.sessions.map((s: any, idx: number) => ({
            id: s.sharerId || `node-${idx}`,
            name: s.deviceName || `SpeedDrop Node (${s.sharerId})`,
            sharerId: s.sharerId,
            ip: s.localIp || '127.0.0.1',
            port: s.port || 3000,
            activeUrl: s.activeUrl || s.serverUrl || `http://${s.localIp}:${s.port}`,
            serviceType: 'speeddrop',
          }));
          setDevices(mapped);
        }
      }
    } catch (_) {
      // Ignore background fetch errors
    }
  }, []);

  const startDiscovery = () => {
    setIsScanning(true);
    scanForDevices();
    if (scanInterval.current) clearInterval(scanInterval.current);
    scanInterval.current = setInterval(scanForDevices, 8000);
  };

  const stopDiscovery = () => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = undefined;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (enabled) {
      startDiscovery();
    } else {
      stopDiscovery();
    }
    return () => {
      stopDiscovery();
    };
  }, [enabled, scanForDevices]);

  return { devices, isScanning, startDiscovery, stopDiscovery, refresh: scanForDevices };
};
