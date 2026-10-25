import { Alert, Platform } from 'react-native';
import * as Network from 'expo-network';

export const requestNetworkPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected) {
        Alert.alert(
          'Network Required',
          'Please connect to a Wi-Fi network to use SpeedDrop'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Network permission error:', error);
      return false;
    }
  }
  return true;
};

export const getLocalIp = async (): Promise<string> => {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip;
  } catch (error) {
    console.error('Failed to get IP:', error);
    return '127.0.0.1';
  }
};

export const isConnectedToWifi = async (): Promise<boolean> => {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected && state.type === 'WIFI';
};