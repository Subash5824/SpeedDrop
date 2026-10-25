import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { getShadowStyle } from '@/constants/theme';

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    ...getShadowStyle('md'),
  },
  noPadding: {
    padding: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  titleWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});