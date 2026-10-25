import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { validateSharerId } from '@/utils/generators/sharerId';
import { Ionicons as Icon } from '@expo/vector-icons';
interface SharerIDInputProps {
  onConnect: (sharerId: string, ip: string) => void;
}

export const SharerIDInput: React.FC<SharerIDInputProps> = ({ onConnect }) => {
  const [sharerId, setSharerId] = useState('');
  const [ip, setIp] = useState('');

  const handleConnect = () => {
    if (!validateSharerId(sharerId)) {
      Alert.alert('Invalid ID', 'Please enter a valid Sharer ID (e.g., SD-8F3K92)');
      return;
    }
    
    if (!ip.trim()) {
      Alert.alert('Invalid IP', 'Please enter an IP address');
      return;
    }
    
    onConnect(sharerId, ip);
  };

  return (
    <Card title="Connect via Sharer ID">
      <TextInput
        style={{
          backgroundColor: Colors.cardBg,
          borderRadius: 8,
          padding: 12,
          color: Colors.text,
          borderWidth: 1,
          borderColor: Colors.border,
          marginBottom: 12,
          fontFamily: 'monospace',
        }}
        placeholder="Sharer ID (e.g., SD-8F3K92)"
        placeholderTextColor={Colors.textMuted}
        value={sharerId}
        onChangeText={setSharerId}
        autoCapitalize="characters"
      />
      <TextInput
        style={{
          backgroundColor: Colors.cardBg,
          borderRadius: 8,
          padding: 12,
          color: Colors.text,
          borderWidth: 1,
          borderColor: Colors.border,
          marginBottom: 16,
        }}
        placeholder="IP Address (e.g., 192.168.1.5:3000)"
        placeholderTextColor={Colors.textMuted}
        value={ip}
        onChangeText={setIp}
      />
      <TouchableOpacity
        onPress={handleConnect}
        style={{
          backgroundColor: Colors.primary,
          padding: 14,
          borderRadius: 8,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}>
        <Icon name="search" size={20} color={Colors.text} />
        <Text style={{ color: Colors.text, fontWeight: 'bold' }}>Find Sharer</Text>
      </TouchableOpacity>
    </Card>
  );
};