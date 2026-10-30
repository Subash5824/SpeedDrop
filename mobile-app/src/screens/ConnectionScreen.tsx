import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons as Icon } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { validateSharerId } from '@/utils/generators/sharerId';
import { getApiUrl, TUNNEL_HEADERS, safeFetch } from '@/utils/host';
import { connectionScreenStyles as styles } from '@/styles/screens/ConnectionScreen.styles';

interface ConnectionScreenProps {
  navigation: any;
  route: any;
}

export default function ConnectionScreen({ navigation, route }: ConnectionScreenProps) {
  const [sharerId, setSharerId] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('3000');
  const [loading, setLoading] = useState(false);

  const connectViaSharerId = async () => {
    if (!validateSharerId(sharerId)) {
      Alert.alert('Invalid ID', 'Please enter a valid Sharer ID (e.g., SD-8F3K92)');
      return;
    }

    setLoading(true);
    try {
      // Attempt to discover sharer via mDNS
      // For now, use manual IP
      Alert.alert('Info', 'Please enter IP address to connect');
    } catch (error) {
      Alert.alert('Error', 'Could not find sharer');
    } finally {
      setLoading(false);
    }
  };

  const connectViaIP = async () => {
    if (!ipAddress) {
      Alert.alert('Error', 'Please enter IP address or tunnel URL');
      return;
    }

    setLoading(true);
    try {
      const targetServer = ipAddress.includes(':') || ipAddress.startsWith('http') ? ipAddress : `${ipAddress}:${port}`;
      const url = getApiUrl('/api/sharer/discover', targetServer);
      const response = await safeFetch(
        url,
        { headers: TUNNEL_HEADERS },
        4000
      );
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();
      
      navigation.navigate('Receive', {
        sharerId: data.sharerId,
        sessionId: data.sessionId,
        ip: targetServer,
        port: port
      });
    } catch (error) {
      Alert.alert('Error', 'Could not connect to sharer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Manual Connection</Text>
          <Text style={styles.subtitle}>Connect using Sharer ID or IP address</Text>
        </View>

        {/* Connect via Sharer ID */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connect via Sharer ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Sharer ID (e.g., SD-8F3K92)"
            placeholderTextColor={Colors.textMuted}
            value={sharerId}
            onChangeText={setSharerId}
            autoCapitalize="characters"
          />
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={connectViaSharerId}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <>
                <Icon name="search" size={20} color={Colors.text} />
                <Text style={styles.connectButtonText}>Find Sharer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Connect via IP */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connect via IP Address</Text>
          <TextInput
            style={styles.input}
            placeholder="IP Address (e.g., 192.168.1.5)"
            placeholderTextColor={Colors.textMuted}
            value={ipAddress}
            onChangeText={setIpAddress}
          />
          <TextInput
            style={styles.input}
            placeholder="Port (default: 3000)"
            placeholderTextColor={Colors.textMuted}
            value={port}
            onChangeText={setPort}
            keyboardType="numeric"
          />
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={connectViaIP}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <>
                <Icon name="globe" size={20} color={Colors.text} />
                <Text style={styles.connectButtonText}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipCard}>
          <Icon name="bulb" size={20} color={Colors.accent} />
          <Text style={styles.tipText}>
            Make sure both devices are on the same Wi-Fi network
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}