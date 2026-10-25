import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export const senderScreenStyles = StyleSheet.create({
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
  sharerId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  sharerName: {
    fontSize: 14,
    color: Colors.accent,
    marginBottom: 12,
    textDecorationLine: 'underline',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    color: Colors.text,
    marginLeft: 8,
    fontSize: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  startButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  stopButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
  },
  qrHint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  deviceName: {
    flex: 1,
    color: Colors.text,
    marginLeft: 10,
    fontSize: 14,
  },
  deviceOs: {
    color: Colors.accent,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  emptyStateSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  disabledText: {
    opacity: 0.5,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    color: Colors.text,
    fontSize: 14,
  },
  fileSize: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});