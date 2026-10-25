import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { generateSharerId } from '@utils/generators/sharerId';
import { settingsScreenStyles as styles } from '@/styles/screens/SettingsScreen.styles';
import { modalStyles } from '@/styles/shared/modals.styles';
import { Ionicons as Icon } from '@expo/vector-icons';
export default function SettingsScreen() {
  const [sharerName, setSharerName] = useState('');
  const [sharerId, setSharerId] = useState('');
  const [autoStart, setAutoStart] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState('5');
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const name = await AsyncStorage.getItem(Config.storageKeys.sharerName);
      const id = await AsyncStorage.getItem(Config.storageKeys.sharerId);
      const auto = await AsyncStorage.getItem('autoStart');
      const concurrent = await AsyncStorage.getItem('maxConcurrent');
      
      if (name) setSharerName(name);
      if (id) setSharerId(id);
      if (auto) setAutoStart(auto === 'true');
      if (concurrent) setMaxConcurrent(concurrent);
      
      setAppVersion(Device.osVersion || '1.0.0');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSharerName = async () => {
    if (editName.trim()) {
      setSharerName(editName);
      await AsyncStorage.setItem(Config.storageKeys.sharerName, editName);
      setShowNameEdit(false);
      Alert.alert('Success', 'Name updated successfully');
    }
  };

  const regenerateSharerId = async () => {
    Alert.alert(
      'Regenerate Sharer ID',
      'This will generate a new unique ID. Your current connections will be affected. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            const newId = generateSharerId();
            setSharerId(newId);
            await AsyncStorage.setItem(Config.storageKeys.sharerId, newId);
            Alert.alert('Success', `New Sharer ID: ${newId}`);
          }
        }
      ]
    );
  };

  const toggleAutoStart = async (value: boolean) => {
    setAutoStart(value);
    await AsyncStorage.setItem('autoStart', value.toString());
  };

  const updateMaxConcurrent = async (value: string) => {
    const num = parseInt(value);
    if (num >= 1 && num <= 10) {
      setMaxConcurrent(value);
      await AsyncStorage.setItem('maxConcurrent', value);
    } else {
      Alert.alert('Invalid', 'Please enter a number between 1 and 10');
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all settings and transfer history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert('Success', 'All data cleared');
            loadSettings();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => {
            setEditName(sharerName);
            setShowNameEdit(true);
          }}>
            <View style={styles.settingIcon}>
              <Icon name={"person" as any} size={24} color={Colors.accent} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Your Name</Text>
              <Text style={styles.settingDescription}>How others see you</Text>
            </View>
            <Text style={styles.settingValue}>{sharerName || 'Not set'}</Text>
            <Icon name={"chevron-forward" as any} size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={regenerateSharerId}>
            <View style={styles.settingIcon}>
              <Icon name={"card-outline" as any} size={24} color={Colors.accent} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sharer ID</Text>
              <Text style={styles.settingDescription}>Your unique identifier</Text>
            </View>
            <Text style={styles.settingValue}>{sharerId || 'Not set'}</Text>
            <Icon name={"refresh" as any} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Transfer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Icon name={"rocket" as any} size={24} color={Colors.accent} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto-start Sharing</Text>
              <Text style={styles.settingDescription}>Start sharing when app opens</Text>
            </View>
            <Switch
              value={autoStart}
              onValueChange={toggleAutoStart}
              trackColor={{ false: Colors.textMuted, true: Colors.primary }}
              thumbColor={Colors.text}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Icon name={"layers" as any} size={24} color={Colors.accent} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Max Concurrent Transfers</Text>
              <Text style={styles.settingDescription}>1-10 transfers at once</Text>
            </View>
            <TextInput
              style={[styles.settingValue, { textAlign: 'right', minWidth: 40 }]}
              value={maxConcurrent}
              onChangeText={updateMaxConcurrent}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>{Config.version}</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Device</Text>
            <Text style={styles.aboutValue}>{Device.modelName || 'Unknown'}</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>OS Version</Text>
            <Text style={styles.aboutValue}>{appVersion}</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerButton]} 
            onPress={clearAllData}>
            <View style={styles.settingIcon}>
              <Icon name={"trash" as any} size={24} color={Colors.error} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: Colors.error }]}>Clear All Data</Text>
              <Text style={styles.settingDescription}>Delete all settings and history</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={showNameEdit} transparent animationType="slide">
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Edit Your Name</Text>
            <TextInput
              style={modalStyles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity style={modalStyles.modalButton} onPress={() => setShowNameEdit(false)}>
                <Text style={modalStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.modalButton, modalStyles.modalButtonPrimary]} onPress={updateSharerName}>
                <Text style={[modalStyles.modalButtonText, modalStyles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}