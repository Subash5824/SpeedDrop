import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export const progressBarStyles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  bar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  percentage: {
    fontSize: 10,
    color: Colors.accent,
  },
  speed: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});