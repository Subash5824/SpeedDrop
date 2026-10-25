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
    ipAddress: '',
    networkType: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkInfo(prev => ({
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
      setNetworkInfo(prev => ({ ...prev, ipAddress: ip }));
    } catch (error) {
      console.error('Failed to get IP:', error);
    }
  };

  const refreshIp = async () => {
    await getIpAddress();
  };

  return { networkInfo, refreshIp };
};