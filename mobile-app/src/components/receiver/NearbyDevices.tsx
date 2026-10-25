import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { Ionicons as Icon } from '@expo/vector-icons';
interface NearbyDevice {
  id: string;
  name: string;
  sharerId: string;
  ip: string;
  port: number;
  signalStrength: number;
}

interface NearbyDevicesProps {
  onConnect: (device: NearbyDevice) => void;
  onRefresh?: () => void;
}

export const NearbyDevices: React.FC<NearbyDevicesProps> = ({ onConnect, onRefresh }) => {
  const [devices, setDevices] = useState<NearbyDevice[]>([]);
  const [scanning, setScanning] = useState(false);

  const scanForDevices = async () => {
    setScanning(true);
    try {
      // mDNS discovery simulation
      // In production, use bonjour or multicast-dns
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock devices - replace with actual discovery
      const mockDevices: NearbyDevice[] = [
        {
          id: '1',
          name: 'Subash\'s Phone',
          sharerId: 'SD-8F3K92',
          ip: '192.168.1.100',
          port: 3000,
          signalStrength: 85,
        },
        {
          id: '2',
          name: 'Office Laptop',
          sharerId: 'SD-7H2J41',
          ip: '192.168.1.101',
          port: 3000,
          signalStrength: 70,
        },
      ];
      setDevices(mockDevices);
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    scanForDevices();
  }, []);

  const getSignalIcon = (strength: number): string => {
    if (strength >= 80) return 'wifi';
    if (strength >= 50) return 'wifi-outline';
    return 'wifi-outline';
  };

  const renderDevice = ({ item }: { item: NearbyDevice }) => (
    <TouchableOpacity
      onPress={() => onConnect(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: Colors.cardBg,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
      }}>
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: 'rgba(108, 99, 255, 0.2)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={"phone-portrait" as any} size={24} color={Colors.accent} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: Colors.text, fontWeight: 'bold', fontSize: 16 }}>
          {item.name}
        </Text>
        <Text style={{ color: Colors.accent, fontSize: 12, fontFamily: 'monospace' }}>
          {item.sharerId}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
          {item.ip}:{item.port}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Icon name={getSignalIcon(item.signalStrength) as any} size={20} color={Colors.accent} />
        <Text style={{ color: Colors.textMuted, fontSize: 10, marginTop: 2 }}>
          {item.signalStrength}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Card
      title="Nearby Devices"
      rightAction={
        <TouchableOpacity onPress={scanForDevices} disabled={scanning}>
          <Icon
            name="refresh"
            size={20}
            color={scanning ? Colors.textMuted : Colors.accent}
          />
        </TouchableOpacity>
      }>
      {scanning ? (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>
            Scanning for nearby senders...
          </Text>
        </View>
      ) : devices.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Icon name="wifi-outline" size={48} color={Colors.textMuted} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>
            No devices found
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>
            Make sure senders are sharing files
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </Card>
  );
};