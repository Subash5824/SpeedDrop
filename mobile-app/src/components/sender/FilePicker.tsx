import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { formatFileSize } from '@utils/formatters/fileSize';

interface FileItem {
  id: string;
  name: string;
  size: number;
  uri: string;
  mimeType: string;
}

interface FilePickerProps {
  files: FileItem[];
  onFileSelect: (files: DocumentPicker.DocumentPickerResult) => void;
  onFileRemove: (fileId: string) => void;
  disabled?: boolean;
}

export const FilePicker: React.FC<FilePickerProps> = ({
  files,
  onFileSelect,
  onFileRemove,
  disabled,
}) => {
  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
      });
      
      // Check if result has assets property (new API)
      if (result.assets && result.assets.length > 0) {
        onFileSelect(result);
      }
      // Handle cancel case
      else if (result.canceled) {
        console.log('File pick cancelled');
      }
    } catch (error) {
      console.error('File pick error:', error);
    }
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('video/')) return 'videocam';
    if (mimeType?.startsWith('audio/')) return 'musical-notes';
    if (mimeType?.includes('pdf')) return 'document-text';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'archive';
    return 'document';
  };

  const renderFile = ({ item }: { item: FileItem }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}>
      <Icon name={getFileIcon(item.mimeType) as any} size={20} color={Colors.accent} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: Colors.text, fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
          {formatFileSize(item.size)}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onFileRemove(item.id)}>
        <Icon name={"close-circle" as any} size={20} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (files.length === 0) {
    return (
      <Card>
        <TouchableOpacity
          onPress={pickFiles}
          disabled={disabled}
          style={{
            alignItems: 'center',
            padding: 32,
            opacity: disabled ? 0.5 : 1,
          }}>
          <Icon name="add-circle-outline" size={48} color={Colors.primary} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12, fontSize: 16 }}>
            {disabled ? 'Start sharing to add files' : 'Tap to select files'}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>
            Any file type, any size
          </Text>
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <Card
      title={`Files to Share (${files.length})`}
      rightAction={
        !disabled && (
          <TouchableOpacity onPress={pickFiles}>
            <Icon name="add-circle" size={28} color={Colors.primary} />
          </TouchableOpacity>
        )
      }>
      <FlatList
        data={files}
        renderItem={renderFile}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />
    </Card>
  );
};