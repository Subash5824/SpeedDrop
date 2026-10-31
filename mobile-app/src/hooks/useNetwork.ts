import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Network from 'expo-network';

interface NetworkInfo {
  isConnected: boolean;
  isWifi: boolean;
  ipAddress: string;
  networkType: string;
}

export const useNetwork = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isConnected: false,
    isWifi: false,
    ipAddress: '192.168.43.1',
    networkType: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkInfo((prev) => ({
        ...prev,
        isConnected: state.isConnected ?? false,
        isWifi: state.type === 'wifi',
        networkType: state.type ?? 'unknown',
      }));
    });

    getIpAddress();

    return () => {
      unsubscribe();
    };
  }, []);

  const getIpAddress = async () => {
    try {
      const ip = await Network.getIpAddressAsync();
      const cleanIp = (ip && ip.trim() && ip !== '0.0.0.0' && ip !== '127.0.0.1')
        ? ip.trim()
        : '192.168.43.1';
      setNetworkInfo((prev) => ({ ...prev, ipAddress: cleanIp }));
    } catch (error) {
      console.warn('Failed to get IP:', error);
      setNetworkInfo((prev) => ({ ...prev, ipAddress: '192.168.43.1' }));
    }
  };

  const refreshIp = async () => {
    await getIpAddress();
  };

  return { networkInfo, refreshIp };
};
