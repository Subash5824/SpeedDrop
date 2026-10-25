import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const saveFileToDevice = async (uri: string, fileName: string): Promise<string> => {
  try {
    const downloadDir = FileSystem.documentDirectory;
    const destinationUri = `${downloadDir}${fileName}`;
    
    await FileSystem.copyAsync({
      from: uri,
      to: destinationUri,
    });
    
    return destinationUri;
  } catch (error) {
    console.error('Failed to save file:', error);
    throw error;
  }
};

export const shareFile = async (uri: string): Promise<void> => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      throw new Error('Sharing not available on this device');
    }
  } catch (error) {
    console.error('Failed to share file:', error);
    throw error;
  }
};

export const deleteFile = async (uri: string): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri);
    }
  } catch (error) {
    console.error('Failed to delete file:', error);
  }
};

export const fileExists = async (uri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists;
  } catch (error) {
    console.error('Failed to check file existence:', error);
    return false;
  }
};

export const getFileInfo = async (uri: string): Promise<FileSystem.FileInfo> => {
  return await FileSystem.getInfoAsync(uri);
};

export const getDocumentDirectory = (): string => {
  return FileSystem.documentDirectory || '';
};

export const getCacheDirectory = (): string => {
  return FileSystem.cacheDirectory || '';
};