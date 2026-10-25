import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';

export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Storage permission is needed to save files'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Storage permission error:', error);
      return false;
    }
  }
  return true;
};

export const checkStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status === 'granted';
  }
  return true;
};

export const getDownloadDirectory = (): string => {
  return FileSystem.documentDirectory || '';
};

export const getCacheDirectory = (): string => {
  return FileSystem.cacheDirectory || '';
};