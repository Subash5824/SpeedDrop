import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@components/common/ProgressBar';
import { formatFileSize, formatSpeed } from '@/utils/formatters/fileSize';
import { Ionicons as Icon } from '@expo/vector-icons';

interface DownloadItem {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  speed: number;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';
  eta: number;
}

interface DownloadManagerProps {
  downloads: Map<string, DownloadItem>;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  downloads,
  onPause,
  onResume,
  onCancel,
  onRetry,
}) => {
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'downloading': return 'download-outline';
      case 'paused': return 'pause-circle';
      case 'completed': return 'checkmark-circle';
      case 'failed': return 'alert-circle';
      default: return 'time-outline';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'failed': return Colors.error;
      case 'downloading': return Colors.primary;
      case 'paused': return Colors.warning;
      default: return Colors.textMuted;
    }
  };

  const renderDownload = ({ item }: { item: DownloadItem }) => (
    <View
      style={{
        backgroundColor: Colors.cardBg,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon
          name={getStatusIcon(item.status) as any}
          size={24}
          color={getStatusColor(item.status)}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: Colors.text, fontWeight: 'bold' }} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
            {formatFileSize(item.fileSize)}
          </Text>
        </View>
        {item.status !== 'completed' && (
          <View style={{ flexDirection: 'row', gap: 12}}>
            {item.status === 'downloading' && (
              <TouchableOpacity onPress={() => onPause(item.id)}>
                <Icon name={"pause" as any} size={20} color={Colors.warning} />
              </TouchableOpacity>
            )}
            {item.status === 'paused' && (
              <TouchableOpacity onPress={() => onResume(item.id)}>
                <Icon name={"play" as any} size={20} color={Colors.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onCancel(item.id)}>
              <Icon name={"close" as any} size={20} color={Colors.error} />
            </TouchableOpacity>
            {item.status === 'failed' && (
              <TouchableOpacity onPress={() => onRetry(item.id)}>
                <Icon name={"refresh" as any} size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      {(item.status === 'downloading' || item.status === 'paused') && (
        <View style={{ marginTop: 8 }}>
          <ProgressBar
            progress={item.progress}
            speed={item.speed}
            eta={item.eta}
            showPercentage
          />
        </View>
      )}
      {item.status === 'completed' && (
        <Text style={{ color: Colors.success, fontSize: 11, marginTop: 8 }}>
          ✓ Completed
        </Text>
      )}
      {item.status === 'failed' && (
        <Text style={{ color: Colors.error, fontSize: 11, marginTop: 8 }}>
          ✗ Failed - Tap refresh to retry
        </Text>
      )}
    </View>
  );

  const downloadArray = Array.from(downloads.values());
  const activeDownloads = downloadArray.filter(d => d.status === 'downloading');
  const completedDownloads = downloadArray.filter(d => d.status === 'completed');
  const failedDownloads = downloadArray.filter(d => d.status === 'failed');

  if (downloadArray.length === 0) {
    return (
      <Card title="Downloads">
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Icon name="cloud-download-outline" size={48} color={Colors.textMuted} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>
            No active downloads
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card title={`Downloads (${activeDownloads.length} active)`}>
      {activeDownloads.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: Colors.accent, fontSize: 12, marginBottom: 8 }}>
            Active Downloads
          </Text>
          <FlatList
            data={activeDownloads}
            renderItem={renderDownload}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}
      {completedDownloads.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.accent, fontSize: 12, marginBottom: 8 }}>
            Completed ({completedDownloads.length})
          </Text>
          <FlatList
            data={completedDownloads}
            renderItem={renderDownload}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}
      {failedDownloads.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.error, fontSize: 12, marginBottom: 8 }}>
            Failed ({failedDownloads.length})
          </Text>
          <FlatList
            data={failedDownloads}
            renderItem={renderDownload}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}
    </Card>
  );
};