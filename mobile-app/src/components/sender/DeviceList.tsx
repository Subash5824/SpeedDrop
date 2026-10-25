import React from 'react';
import { View, Text, FlatList } from 'react-native';

import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { Device } from '@/types/sharer';
import { Ionicons as Icon } from '@expo/vector-icons';
interface DeviceListProps {
  devices: Device[];
}

export const DeviceList: React.FC<DeviceListProps> = ({ devices }) => {
  const renderDevice = ({ item }: { item: Device }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}>
      <Icon name="phone-portrait" size={20} color={Colors.accent} />
      <Text style={{ flex: 1, color: Colors.text, marginLeft: 12 }}>{item.name}</Text>
      <Text style={{ color: Colors.accent, fontSize: 12 }}>{item.os}</Text>
    </View>
  );

  return (
    <Card title={`Connected Devices (${devices.length})`}>
      {devices.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 32 }}>
          <Icon name="wifi-outline" size={48} color={Colors.textMuted} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>
            No devices connected
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>
            Share QR code to connect
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