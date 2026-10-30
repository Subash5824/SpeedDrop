import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { checkServerHealth, getServerUrlAsync } from '../utils/host';

export interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isServerOnline: boolean;
  isOffline: boolean;
  connectionType: string;
  serverUrl: string;
  isChecking: boolean;
  recheckConnection: () => Promise<boolean>;
}

const defaultContext: NetworkContextValue = {
  isConnected: true,
  isInternetReachable: true,
  isServerOnline: true,
  isOffline: false,
  connectionType: 'unknown',
  serverUrl: 'https://speeddrop.onrender.com',
  isChecking: false,
  recheckConnection: async () => true,
};

const NetworkContext = createContext<NetworkContextValue>(defaultContext);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [serverUrl, setServerUrl] = useState<string>('https://speeddrop.onrender.com');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const verifyServer = useCallback(async (currentUrl?: string): Promise<boolean> => {
    try {
      const url = currentUrl || (await getServerUrlAsync());
      setServerUrl(url);
      const online = await checkServerHealth(url, 3000);
      setIsServerOnline(online);
      return online;
    } catch (_) {
      setIsServerOnline(false);
      return false;
    }
  }, []);

  const recheckConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      const connected = Boolean(state.isConnected);
      setIsConnected(connected);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type || 'unknown');

      if (!connected) {
        setIsServerOnline(false);
        return false;
      }

      return await verifyServer();
    } catch (err) {
      console.warn('[NetworkContext] recheckConnection error:', err);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [verifyServer]);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial background network check
    recheckConnection();

    // 2. Subscribe to device network changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!isMounted) return;
      const connected = Boolean(state.isConnected);
      setIsConnected(connected);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type || 'unknown');

      if (!connected) {
        setIsServerOnline(false);
      } else {
        verifyServer();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [recheckConnection, verifyServer]);

  // Derived app-wide offline state: true if device has no connection OR cloud server is unreachable
  const isOffline = !isConnected || !isServerOnline;

  const value: NetworkContextValue = {
    isConnected,
    isInternetReachable,
    isServerOnline,
    isOffline,
    connectionType,
    serverUrl,
    isChecking,
    recheckConnection,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus(): NetworkContextValue {
  return useContext(NetworkContext);
}
