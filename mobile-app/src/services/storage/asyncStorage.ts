import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';
import { TransferHistory } from '@/types/sharer';

export const saveSharerName = async (name: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(Config.storageKeys.sharerName, name);
  } catch (error) {
    console.error('Failed to save sharer name:', error);
  }
};

export const getSharerName = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(Config.storageKeys.sharerName);
  } catch (error) {
    console.error('Failed to get sharer name:', error);
    return null;
  }
};

export const saveSharerId = async (id: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(Config.storageKeys.sharerId, id);
  } catch (error) {
    console.error('Failed to save sharer ID:', error);
  }
};

export const getSharerId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(Config.storageKeys.sharerId);
  } catch (error) {
    console.error('Failed to get sharer ID:', error);
    return null;
  }
};

export const saveTransferHistory = async (history: TransferHistory[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(Config.storageKeys.transferHistory, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save transfer history:', error);
  }
};

export const getTransferHistory = async (): Promise<TransferHistory[]> => {
  try {
    const history = await AsyncStorage.getItem(Config.storageKeys.transferHistory);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to get transfer history:', error);
    return [];
  }
};

export const addToHistory = async (item: TransferHistory): Promise<void> => {
  try {
    const history = await getTransferHistory();
    history.unshift(item);
    await saveTransferHistory(history.slice(0, 100)); // Keep last 100 items
  } catch (error) {
    console.error('Failed to add to history:', error);
  }
};

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(Config.storageKeys.transferHistory);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

export const saveSettings = async (key: string, value: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${Config.storageKeys.settings}_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const getSettings = async (key: string): Promise<any> => {
  try {
    const value = await AsyncStorage.getItem(`${Config.storageKeys.settings}_${key}`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Failed to get settings:', error);
    return null;
  }
};