import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatFileSize } from '@/utils/formatters/fileSize';



import { Ionicons as Icon } from '@expo/vector-icons';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface AvailableFilesProps {
  files: FileInfo[];
  downloads: Map<string, number>;
  onDownload: (file: FileInfo) => void;
}

export const AvailableFiles: React.FC<AvailableFilesProps> = ({
  files,
  downloads,
  onDownload,
}) => {
  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type.startsWith('audio/')) return 'musical-notes';
    if (type.includes('pdf')) return 'document-text';
    if (type.includes('zip')) return 'archive';
    return 'document';
  };

  const renderFile = ({ item }: { item: FileInfo }) => {
    const progress = downloads.get(item.id);
    const isDownloading = progress !== undefined;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          backgroundColor: Colors.cardBg,
          borderRadius: 10,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: Colors.border,
        }}>
        <Icon name={getFileIcon(item.type) as any} size={24} color={Colors.accent} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: Colors.text, fontWeight: 'bold' }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
            {formatFileSize(item.size)}
          </Text>
          {isDownloading && (
            <ProgressBar progress={progress} showPercentage={false} />
          )}
        </View>
        <TouchableOpacity
          onPress={() => onDownload(item)}
          disabled={isDownloading}
          style={{
            backgroundColor: isDownloading ? Colors.textMuted : Colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
            opacity: isDownloading ? 0.5 : 1,
          }}>
          <Text style={{ color: Colors.text, fontWeight: 'bold' }}>
            {isDownloading ? `${Math.round(progress)}%` : 'Download'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Card title={`Available Files (${files.length})`}>
      {files.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Icon name="folder-open" size={48} color={Colors.textMuted} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>
            No files shared yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFile}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </Card>
  );
};