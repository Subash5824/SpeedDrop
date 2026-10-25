import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatFileSize, formatSpeed } from '@/utils/formatters/fileSize';

interface TransferStatsProps {
  totalFiles: number;
  completedFiles: number;
  totalSize: number;
  transferredSize: number;
  speed: number;
}

export const TransferStats: React.FC<TransferStatsProps> = ({
  totalFiles,
  completedFiles,
  totalSize,
  transferredSize,
  speed,
}) => {
  const progress = totalSize > 0 ? (transferredSize / totalSize) * 100 : 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (speed > 0) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [speed]);

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }}>
            Files
          </Text>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: 'bold' }}>
            {completedFiles}/{totalFiles}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }}>
            Size
          </Text>
          <Text style={{ color: Colors.text, fontSize: 14, fontWeight: 'bold' }}>
            {formatFileSize(transferredSize)}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10 }}>
            / {formatFileSize(totalSize)}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }}>
            Speed
          </Text>
          <Animated.Text
            style={{
              color: Colors.accent,
              fontSize: 16,
              fontWeight: 'bold',
              transform: [{ scale: scaleAnim }],
            }}>
            {formatSpeed(speed)}
          </Animated.Text>
        </View>
      </View>
      <ProgressBar
        progress={progress}
        label="Overall Progress"
        showPercentage
      />
      {completedFiles === totalFiles && totalFiles > 0 && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            padding: 8,
            borderRadius: 8,
            alignItems: 'center',
          }}>
          <Text style={{ color: Colors.success, fontSize: 12 }}>
            ✓ All files transferred successfully!
          </Text>
        </View>
      )}
    </Card>
  );
};