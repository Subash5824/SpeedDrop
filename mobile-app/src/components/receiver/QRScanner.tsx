import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons as Icon } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Colors.text }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Colors.text }}>No access to camera</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: Colors.primary, marginTop: 12 }}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 20,
          backgroundColor: Colors.backgroundSecondary,
        }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.text }}>
          Scan QR Code
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <BarCodeScanner
        onBarCodeScanned={({ data }) => onScan(data)}
        style={{ flex: 1 }}
      />
    </View>
  );
};