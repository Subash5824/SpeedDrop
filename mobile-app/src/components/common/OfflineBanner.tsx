import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNetworkStatus } from '../../context/NetworkContext';
import { Colors } from '../../constants/colors';

export default function OfflineBanner() {
  const { isOffline, isConnected, isChecking, recheckConnection } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!isOffline || dismissed) {
    return null;
  }

  const message = !isConnected
    ? '📡 Offline Hotspot mode active. Local zero-data transfers ready.'
    : '☁️ Cloud server unreachable. Offline Hotspot mode ready.';

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.contentRow}>
        <Icon
          name={!isConnected ? 'cloud-offline-outline' : 'cloudy-outline'}
          size={18}
          color="#FFA726"
          style={styles.icon}
        />
        <Text style={styles.bannerText} numberOfLines={2}>
          {message}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => recheckConnection()}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#FFA726" />
          ) : (
            <>
              <Icon name="refresh" size={14} color="#FFA726" />
              <Text style={styles.retryText}>Retry</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="close" size={16} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#2A1B0A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 167, 38, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  bannerText: {
    color: '#FFE0B2',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.35)',
  },
  retryText: {
    color: '#FFA726',
    fontSize: 11,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});
