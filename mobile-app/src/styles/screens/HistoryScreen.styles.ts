import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export const historyScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  clearButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: Colors.text,
    fontSize: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  fileName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  detailText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  timestamp: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusFailed: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusCompletedText: {
    color: Colors.success,
  },
  statusFailedText: {
    color: Colors.error,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
});