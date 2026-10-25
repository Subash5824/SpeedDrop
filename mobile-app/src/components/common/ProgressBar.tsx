import React from 'react';
import { View, Text } from 'react-native';
import { progressBarStyles } from '@/styles/components/common/ProgressBar.styles';
import { formatSpeed, formatTimeRemaining } from '@utils/formatters/fileSize';

interface ProgressBarProps {
  progress: number;
  label?: string;
  speed?: number;
  eta?: number;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  speed,
  eta,
  showPercentage = true,
}) => {
  return (
    <View style={progressBarStyles.container}>
      {label && <Text style={progressBarStyles.label}>{label}</Text>}
      <View style={progressBarStyles.bar}>
        <View style={[progressBarStyles.fill, { width: `${progress}%` }]} />
      </View>
      <View style={progressBarStyles.info}>
        {showPercentage && (
          <Text style={progressBarStyles.percentage}>{Math.round(progress)}%</Text>
        )}
        {speed !== undefined && (
          <Text style={progressBarStyles.speed}>{formatSpeed(speed)}</Text>
        )}
        {eta !== undefined && eta > 0 && (
          <Text style={progressBarStyles.speed}>ETA: {formatTimeRemaining(eta)}</Text>
        )}
      </View>
    </View>
  );
};