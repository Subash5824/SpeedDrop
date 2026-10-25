import React from 'react';
import { View, Text, TouchableOpacity, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons as Icon } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';

interface QRCodeDisplayProps {
  data: string;
  sharerId: string;
  sharerName: string;
  onShare?: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  data,
  sharerId,
  sharerName,
}) => {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Connect to ${sharerName} (${sharerId}) via SpeedDrop:\n${data}`,
        title: 'SpeedDrop Connection',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const validData = typeof data === 'string' && data.trim().length > 0 ? data.trim() : null;

  if (!validData) {
    return null;
  }

  return (
    <Card title="Share QR Code">
      <View style={{ alignItems: 'center', padding: 20 }}>
        <View
          style={{
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 16,
          }}>
          <QRCode
            value={validData}
            size={200}
            backgroundColor="white"
            color={Colors.primary}
          />
        </View>
        <Text
          style={{
            color: Colors.text,
            marginTop: 16,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 'bold',
          }}>
          {sharerName}
        </Text>
        <Text
          style={{
            color: Colors.accent,
            fontFamily: 'monospace',
            marginTop: 4,
            fontSize: 14,
          }}>
          {sharerId}
        </Text>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 12,
            marginTop: 8,
            textAlign: 'center',
          }}>
          Scan with SpeedDrop app to receive files
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: Colors.primary,
            borderRadius: 8,
            gap: 8,
          }}>
          <Icon name="share-social" size={20} color={Colors.text} />
          <Text style={{ color: Colors.text, fontWeight: 'bold' }}>
            Share QR Code
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};