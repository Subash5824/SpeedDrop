import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gap8: {
    gap: 8,
  },
  gap12: {
    gap: 12,
  },
  gap16: {
    gap: 16,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },
  mt8: {
    marginTop: 8,
  },
  mt12: {
    marginTop: 12,
  },
  mt16: {
    marginTop: 16,
  },
  p8: {
    padding: 8,
  },
  p12: {
    padding: 12,
  },
  p16: {
    padding: 16,
  },
  textCenter: {
    textAlign: 'center',
  },
  textPrimary: {
    color: Colors.primary,
  },
  textSecondary: {
    color: Colors.textSecondary,
  },
  textMuted: {
    color: Colors.textMuted,
  },
  textAccent: {
    color: Colors.accent,
  },
  textSuccess: {
    color: Colors.success,
  },
  textError: {
    color: Colors.error,
  },
});