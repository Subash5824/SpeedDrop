import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { formatFileSize } from '@/utils/formatters/fileSize';
import { TransferHistory } from '@/types/sharer';
import { historyScreenStyles as styles } from '@/styles/screens/HistoryScreen.styles';

export default function HistoryScreen() {
  const [history, setHistory] = useState<TransferHistory[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(Config.storageKeys.transferHistory);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all transfer history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(Config.storageKeys.transferHistory);
            setHistory([]);
            Alert.alert('Success', 'History cleared');
          }
        }
      ]
    );
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Transfer History</Text>
          {history.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="time-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyStateText}>No transfers yet</Text>
          </View>
        ) : (
          history.map(item => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.iconContainer}>
                <Icon 
                  name={item.type === 'sent' ? 'arrow-up' : 'arrow-down'} 
                  size={20} 
                  color={item.status === 'completed' ? Colors.success : Colors.error}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.fileName}>{item.fileName}</Text>
                <View style={styles.details}>
                  <Text style={styles.detailText}>{formatFileSize(item.fileSize)}</Text>
                  <Text style={styles.detailText}>•</Text>
                  <Text style={styles.detailText}>
                    {item.type === 'sent' ? 'To: ' : 'From: '}{item.sharerName}
                  </Text>
                </View>
                <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
              </View>
              <View style={[styles.statusBadge, item.status === 'completed' ? styles.statusCompleted : styles.statusFailed]}>
                <Text style={[styles.statusText, item.status === 'completed' ? styles.statusCompletedText : styles.statusFailedText]}>
                  {item.status === 'completed' ? '✓ Completed' : '✗ Failed'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}