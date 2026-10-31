import { Alert, Platform } from 'react-native';
import * as Network from 'expo-network';

export const requestNetworkPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected) {
        Alert.alert(
          'Network Required',
          'Please connect to a Wi-Fi network or enable Hotspot to use SpeedDrop'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Network permission check:', error);
      return false;
    }
  }
  return true;
};

export const getLocalIp = async (): Promise<string> => {
  try {
    const ip = await Network.getIpAddressAsync();
    if (ip && ip.trim() && ip !== '0.0.0.0' && ip !== '127.0.0.1') {
      return ip.trim();
    }
  } catch (error) {
    console.warn('Failed to get IP:', error);
  }
  return '192.168.43.1';
};

export const isConnectedToWifi = async (): Promise<boolean> => {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.type === 'WIFI');
  } catch (_) {
    return false;
  }
};
