import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@constants/config';
import { generateSharerId } from '@utils/generators/sharerId';

export const useSharerId = () => {
  const [sharerId, setSharerId] = useState('');
  const [sharerName, setSharerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharerInfo();
  }, []);

  const loadSharerInfo = async () => {
    try {
      const savedId = await AsyncStorage.getItem(Config.storageKeys.sharerId);
      const savedName = await AsyncStorage.getItem(Config.storageKeys.sharerName);
      
      if (savedId) {
        setSharerId(savedId);
      } else {
        const newId = generateSharerId();
        setSharerId(newId);
        await AsyncStorage.setItem(Config.storageKeys.sharerId, newId);
      }
      
      if (savedName) {
        setSharerName(savedName);
      }
    } catch (error) {
      console.error('Failed to load sharer info:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSharerName = async (name: string) => {
    try {
      setSharerName(name);
      await AsyncStorage.setItem(Config.storageKeys.sharerName, name);
      return true;
    } catch (error) {
      console.error('Failed to update sharer name:', error);
      return false;
    }
  };

  const regenerateSharerId = async () => {
    try {
      const newId = generateSharerId();
      setSharerId(newId);
      await AsyncStorage.setItem(Config.storageKeys.sharerId, newId);
      return newId;
    } catch (error) {
      console.error('Failed to regenerate sharer ID:', error);
      return null;
    }
  };

  return {
    sharerId,
    sharerName,
    loading,
    updateSharerName,
    regenerateSharerId,
  };
};