import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  NativeModules,
  Share,
  Clipboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import QRCode from 'react-native-qrcode-svg';
import io from 'socket.io-client';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { v4 as uuidv4 } from 'uuid';

import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { generateSharerId } from '@/utils/generators/sharerId';
import { formatFileSize } from '@/utils/formatters/fileSize';
import {
  getServerIp,
  getServerIpAsync,
  getServerUrlAsync,
  setServerIp as persistServerIp,
  getServerUrl,
  getSocketUrl,
  getSocketOptions,
  getApiUrl,
  getDisplayServer,
  normalizeServerUrl,
  fetchActiveServerFromDiscovery,
  wakeUpServer,
  safeFetch,
  checkServerHealth,
  TUNNEL_HEADERS,
} from '@/utils/host';
import { useNetworkStatus } from '@/context/NetworkContext';
import { FileInfo, Device } from '@/types/sharer';
import { senderScreenStyles as styles } from '@/styles/screens/SenderScreen.styles';
import { modalStyles } from '@/styles/shared/modals.styles';

import { Ionicons as Icon } from '@expo/vector-icons';

export default function SenderScreen() {
  const { isOffline, isConnected, recheckConnection } = useNetworkStatus();
  const [sharerId, setSharerId] = useState('');
  const [sharerName, setSharerName] = useState('Mobile User');
  const [isActive, setIsActive] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [targetServerIp, setTargetServerIp] = useState(getServerIp());
  const [showIpEdit, setShowIpEdit] = useState(false);

  useEffect(() => {
    loadSharerInfo();
  }, []);

  const loadSharerInfo = async () => {
    try {
      const savedName = await AsyncStorage.getItem(Config.storageKeys.sharerName);
      const savedId = await AsyncStorage.getItem(Config.storageKeys.sharerId);
      const activeHost = await getServerUrlAsync();
      setTargetServerIp(activeHost);

      try {
        const ip = await Network.getIpAddressAsync();
        setLocalIp(ip);
      } catch (e) {
        setLocalIp('127.0.0.1');
      }

      if (savedName && savedName.trim()) {
        setSharerName(savedName);
      } else {
        setSharerName('Mobile User');
        await AsyncStorage.setItem(Config.storageKeys.sharerName, 'Mobile User');
      }

      if (savedId) {
        setSharerId(savedId);
      } else {
        const newId = generateSharerId();
        setSharerId(newId);
        await AsyncStorage.setItem(Config.storageKeys.sharerId, newId);
      }

      // Proactively ping health endpoint with safe 2.5s timeout (never throws)
      checkServerHealth(activeHost, 2500).catch(() => {});
    } catch (error) {
      console.warn('Failed to load sharer info:', error);
    }
  };

  const startSharing = async (): Promise<string | null> => {
    const effectiveName = sharerName.trim() || 'Mobile User';
    if (!sharerName.trim()) {
      setSharerName('Mobile User');
      await AsyncStorage.setItem(Config.storageKeys.sharerName, 'Mobile User');
    }

    // Fast check: if device has no connection at all
    if (!isConnected) {
      Alert.alert(
        'Offline Mode',
        'Your device has no active network connection. Please connect to Wi-Fi or Mobile Data to share files via the cloud server, or set up a Mobile Hotspot for direct local sharing.'
      );
      return null;
    }

    setLoading(true);
    let rawHost = (targetServerIp && targetServerIp.trim()) || (await getServerUrlAsync());
    let host = normalizeServerUrl(rawHost);
    if (host !== rawHost) {
      setTargetServerIp(host);
      persistServerIp(host).catch(() => {});
    }

    try {
      let response: Response | null = null;
      try {
        response = await safeFetch(
          getApiUrl('/api/sharer/create', host),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...TUNNEL_HEADERS,
            },
            body: JSON.stringify({ name: effectiveName }),
          },
          3500
        );
      } catch (directErr) {
        // First try failed (likely Render free tier waking up from cold sleep)
        console.log('[Sender] Direct request failed, attempting quick server wake-up...');
        const awake = await wakeUpServer(host, undefined, 2);
        if (awake) {
          try {
            response = await safeFetch(
              getApiUrl('/api/sharer/create', host),
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...TUNNEL_HEADERS,
                },
                body: JSON.stringify({ name: effectiveName }),
              },
              3500
            );
          } catch (_) {}
        }

        // If still no response, check cloud discovery
        if (!response || !response.ok) {
          const discovered = await fetchActiveServerFromDiscovery();
          if (discovered && discovered.activeUrl && discovered.activeUrl !== host) {
            host = normalizeServerUrl(discovered.activeUrl);
            setTargetServerIp(host);
            persistServerIp(host).catch(() => {});
            try {
              response = await safeFetch(
                getApiUrl('/api/sharer/create', host),
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...TUNNEL_HEADERS,
                  },
                  body: JSON.stringify({ name: effectiveName }),
                },
                3500
              );
            } catch (_) {}
          }
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(response ? `Server returned status ${response.status}` : 'Could not connect to server');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      if (host.startsWith('https://')) {
        setServerIp(host);
        setTargetServerIp(host);
        persistServerIp(host).catch(() => {});
      } else {
        setServerIp(data.ip || host);
      }
      
      const newSocket = io(getSocketUrl(host), getSocketOptions(host));
      newSocket.on('connect_error', (err: any) => {
        console.warn('[Sender] Socket connection error:', err?.message || err);
      });
      newSocket.on('error', (err: any) => {
        console.warn('[Sender] Socket general error:', err);
      });

      newSocket.emit('register-sharer', {
        sessionId: data.sessionId,
        sharerId: data.sharerId,
        sharerName: effectiveName,
      });
      
      newSocket.on('device-connected', (device: Device) => {
        setConnectedDevices(prev => [...prev, device]);
      });
      
      newSocket.on('device-disconnected', (deviceId: string) => {
        setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
      });
      
      setSocket(newSocket);
      setIsActive(true);
      return data.sessionId;
    } catch (error: any) {
      console.warn('[Sender] startSharing failed safely:', error?.message || error);
      const isCloudServer = host.startsWith('https://') || host.includes('onrender.com');
      const displayHost = getDisplayServer(host);
      Alert.alert(
        'Connection Failed',
        isCloudServer
          ? `Could not reach SpeedDrop cloud server at ${displayHost}.\n\nIf the server was sleeping (Render free tier), please wait a moment and tap "Start Sharing" again, or check your internet connection.`
          : `Could not reach backend at ${displayHost}.\n\nPlease ensure the server is online or reset to https://speeddrop.onrender.com.`
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const stopSharing = () => {
    if (socket) {
      socket.disconnect();
    }
    setIsActive(false);
    setConnectedDevices([]);
    setSessionId('');
    Alert.alert('Sharing Stopped', 'You are no longer sharing files');
  };

  const pickFiles = async () => {
    try {
      let result: DocumentPicker.DocumentPickerResult;
      try {
        result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: true,
          type: '*/*',
        });
      } catch (pickerErr) {
        console.warn('Multi-pick failed, falling back to single:', pickerErr);
        result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: false,
          type: '*/*',
        });
      }
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      let currentSessionId = sessionId;
      if (!isActive) {
        const newSessionId = await startSharing();
        if (!newSessionId) return;
        currentSessionId = newSessionId;
      }

      for (const file of result.assets) {
        try {
          await uploadFile(file, currentSessionId);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
        }
      }
    } catch (error) {
      console.error('Failed to pick files:', error);
      Alert.alert(
        'File Selection Error',
        error instanceof Error ? error.message : 'Failed to pick files'
      );
    }
  };

  // Upload file with active session
  const uploadFile = async (file: DocumentPicker.DocumentPickerAsset, activeSession?: string) => {
    const currentSession = activeSession || sessionId;
    if (!currentSession) {
      Alert.alert('Error', 'Please start sharing before uploading files.');
      return;
    }

    const fileId = uuidv4();
    const fileSize = file.size || 0;
    const fileMimeType = file.mimeType || 'application/octet-stream';
    
    const fileInfo: FileInfo = {
      id: fileId,
      name: file.name,
      size: fileSize,
      type: fileMimeType,
      uri: file.uri,
      status: 'pending',
      progress: 0,
    };
    
    setFiles(prev => [...prev, fileInfo]);
    
    try {
      const host = (targetServerIp && targetServerIp.trim()) || getServerIp();

      // Initialize upload record on backend
      const initRes = await safeFetch(
        getApiUrl(`/api/upload/${currentSession}/init`, host),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...TUNNEL_HEADERS,
          },
          body: JSON.stringify({
            fileId,
            name: file.name,
            size: fileSize,
            type: fileMimeType,
          }),
        },
        6000
      );

      if (!initRes.ok) {
        throw new Error(`Init failed with status ${initRes.status}`);
      }
      
      setFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, progress: 5, status: 'transferring' } : f)
      );

      // Files <= 50MB use single native multipart upload.
      // Files > 50MB (up to 10GB) use 5MB sequential chunk slices directly from disk to keep RAM bounded.
      const CHUNK_THRESHOLD = 50 * 1024 * 1024; // 50MB
      const CHUNK_SIZE = 5 * 1024 * 1024;       // 5MB per chunk

      if (fileSize <= CHUNK_THRESHOLD) {
        const uploadResult = await FileSystem.uploadAsync(
          getApiUrl(`/api/upload/${currentSession}/${fileId}?chunk=0`, host),
          file.uri,
          {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            headers: {
              'x-single-upload': 'true',
              ...TUNNEL_HEADERS,
            },
          }
        );

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`Upload failed with status ${uploadResult.status}`);
        }
      } else {
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunkLength = end - start;

          // Read only 5MB slice from disk into base64 - bounded memory footprint
          const chunkBase64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
            position: start,
            length: chunkLength,
          });

          // Upload chunk with retry logic
          let chunkSent = false;
          let retryCount = 0;
          while (!chunkSent && retryCount < 3) {
            try {
              retryCount++;
              const chunkRes = await safeFetch(
                getApiUrl(`/api/upload/${currentSession}/${fileId}?chunk=${i}&totalChunks=${totalChunks}`, host),
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-append-mode': 'true',
                    ...TUNNEL_HEADERS,
                  },
                  body: JSON.stringify({ chunk: chunkBase64 }),
                },
                8000
              );

              if (!chunkRes.ok) {
                throw new Error(`Chunk ${i} failed with status ${chunkRes.status}`);
              }
              chunkSent = true;
            } catch (chunkErr) {
              if (retryCount >= 3) throw chunkErr;
              await new Promise(r => setTimeout(r, 1000));
            }
          }

          // Update progress smoothly
          const currentProgress = Math.min(99, Math.round(((i + 1) / totalChunks) * 100));
          setFiles(prev =>
            prev.map(f => f.id === fileId ? { ...f, progress: currentProgress, status: 'transferring' } : f)
          );
        }
      }

      setFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f)
      );
    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error);
      setFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f)
      );
      Alert.alert(
        'Upload Failed',
        `Failed to upload ${file.name}. ${error instanceof Error ? error.message : ''}`
      );
    }
  };

  const updateSharerName = async () => {
    if (editName.trim()) {
      setSharerName(editName);
      await AsyncStorage.setItem(Config.storageKeys.sharerName, editName);
      setShowNameEdit(false);
    }
  };

  const activeHost = serverIp || (targetServerIp && targetServerIp.trim()) || getServerIp();
  const directServerUrl = getServerUrl(activeHost);
  const activeShareUrl = `${directServerUrl}/d/${sharerId}`;
  const isCloud = directServerUrl.startsWith('https://') || directServerUrl.includes('onrender.com');

  const getQRData = () => {
    if (!sessionId || !sharerId || !activeHost) return '';
    return activeShareUrl;
  };

  const copyToClipboard = (text: string) => {
    try {
      Clipboard.setString(text);
      Alert.alert('Link Copied', 'Download link copied to clipboard!');
    } catch (err) {
      Share.share({ message: text, url: text }).catch(() => {});
    }
  };

  const shareLink = async (text: string) => {
    try {
      await Share.share({
        title: 'SpeedDrop Download',
        message: `Download files from SpeedDrop: ${text}`,
        url: text,
      });
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Sharer Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Sharer ID</Text>
          <Text style={styles.sharerId}>{sharerId || 'Not set'}</Text>
          <TouchableOpacity onPress={() => {
            setEditName(sharerName);
            setShowNameEdit(true);
          }}>
            <Text style={styles.sharerName}>{sharerName || 'Tap to set name'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowIpEdit(true)} style={{ marginTop: 10 }}>
            <Text style={[styles.sharerId, { fontSize: 12, opacity: 0.7 }]}>
              Server: {getDisplayServer(targetServerIp || getServerIp())} (Tap to change)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Icon 
              name={isActive ? 'radio-button-on' : 'radio-button-off'} 
              size={24} 
              color={isActive ? Colors.success : Colors.textMuted} 
            />
            <Text style={styles.statusText}>
              {isActive ? 'Sharing Active' : 'Not Sharing'}
            </Text>
          </View>
          
          {!isActive ? (
            <TouchableOpacity 
              style={styles.startButton}
              onPress={startSharing}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <>
                  <Icon name="share-social" size={20} color={Colors.text} />
                  <Text style={styles.startButtonText}>Start Sharing</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={stopSharing}>
              <Icon name="stop" size={20} color={Colors.text} />
              <Text style={styles.stopButtonText}>Stop Sharing</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* QR Code */}
        {isActive && Boolean(getQRData()) ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Share Direct Download</Text>

            {/* Status Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isCloud ? 'rgba(0, 245, 212, 0.15)' : 'rgba(0, 245, 212, 0.1)',
              borderRadius: 8,
              paddingVertical: 6,
              paddingHorizontal: 12,
              marginBottom: 16,
              alignSelf: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0, 245, 212, 0.3)',
            }}>
              <Icon name={isCloud ? "cloud" : "wifi"} size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: Colors.primary,
              }}>
                {isCloud ? '🌐 24/7 Global Cloud Sharing (4G / 5G / Wi-Fi)' : '⚡ Fast Offline Direct Transfer (LAN / Hotspot)'}
              </Text>
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={getQRData()}
                size={200}
                backgroundColor="white"
                color={Colors.primary}
              />
            </View>
            <Text style={[styles.qrHint, { marginTop: 12, textAlign: 'center', fontWeight: '600' }]}>
              Scan with Camera or open in Chrome browser
            </Text>

            {/* Direct Download Card */}
            <View style={{
              marginTop: 16,
              padding: 14,
              backgroundColor: '#16162a',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(0, 245, 212, 0.3)',
            }}>
              <Text style={{ fontSize: 11, color: '#a0a0c0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Direct Share Link:
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 }} selectable numberOfLines={1}>
                {activeShareUrl}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.primary,
                    paddingVertical: 10,
                    borderRadius: 8,
                    gap: 6,
                  }}
                  onPress={() => copyToClipboard(activeShareUrl)}>
                  <Icon name="copy-outline" size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>Copy Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    paddingVertical: 10,
                    borderRadius: 8,
                    gap: 6,
                  }}
                  onPress={() => shareLink(activeShareUrl)}>
                  <Icon name="share-social-outline" size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* One-tap Copy Direct URL / IP Row */}
              <View style={{
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.08)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 11, color: '#a0a0c0', textTransform: 'uppercase' }}>{isCloud ? 'Public Server URL:' : 'Direct Local IP:'}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#00f5d4' }} selectable>{directServerUrl}</Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(0, 245, 212, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(0, 245, 212, 0.4)',
                  }}
                  onPress={() => copyToClipboard(directServerUrl)}>
                  <Text style={{ color: '#00f5d4', fontWeight: '700', fontSize: 12 }}>{isCloud ? 'Copy URL' : 'Copy IP'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Connection helper note */}
            <View style={{ marginTop: 12, padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: Colors.textMuted, lineHeight: 16 }}>
                {isCloud
                  ? '🌍 24/7 Global Access: Anyone anywhere can scan the QR code or open the link on 4G, 5G, or Wi-Fi to download files instantly.'
                  : "📱 Offline Transfer: Receiver must connect to this device's hotspot or same Wi-Fi. Zero mobile data used."}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Connected Devices */}
        {isActive && connectedDevices.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Connected Devices ({connectedDevices.length})
            </Text>
            {connectedDevices.map(device => (
              <View key={device.id} style={styles.deviceItem}>
                <Icon name="phone-portrait" size={20} color={Colors.accent} />
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceOs}>{device.os}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Files Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Files to Share ({files.length})</Text>
            <TouchableOpacity onPress={pickFiles} style={{ padding: 4 }}>
              <Icon name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {files.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} onPress={pickFiles}>
              <Icon name="document-outline" size={48} color={Colors.primary} />
              <Text style={styles.emptyStateText}>
                {isActive ? 'Tap to select files' : 'Tap to select files to share'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {isActive ? 'Any file type, any size' : 'Will automatically start sharing session'}
              </Text>
            </TouchableOpacity>
          ) : (
            files.map(file => (
              <View key={file.id} style={styles.fileItem}>
                <Icon name="document" size={20} color={
                  file.status === 'completed' ? Colors.success :
                  file.status === 'failed' ? Colors.error :
                  Colors.accent
                } />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                  {file.progress !== undefined && file.status !== 'completed' && (
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${file.progress}%` as any }]} />
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => removeFile(file.id)}>
                  <Icon name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Name Edit Modal */}
      <Modal visible={showNameEdit} transparent animationType="slide">
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Edit Your Name</Text>
            <TextInput
              style={modalStyles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity style={modalStyles.modalButton} onPress={() => setShowNameEdit(false)}>
                <Text style={modalStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.modalButton, modalStyles.modalButtonPrimary]} onPress={updateSharerName}>
                <Text style={[modalStyles.modalButtonText, modalStyles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Server URL / IP Edit Modal */}
      <Modal visible={showIpEdit} transparent animationType="slide">
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Set Backend Server URL</Text>
            <Text style={{ color: Colors.textMuted, marginBottom: 10, fontSize: 12 }}>
              Default: https://speeddrop.onrender.com (24/7 cloud server) or enter custom/local IP.
            </Text>
            <TextInput
              style={modalStyles.input}
              value={targetServerIp}
              onChangeText={setTargetServerIp}
              placeholder="https://speeddrop.onrender.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity style={modalStyles.modalButton} onPress={() => setShowIpEdit(false)}>
                <Text style={modalStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[modalStyles.modalButton, modalStyles.modalButtonPrimary]} 
                onPress={async () => {
                  const cleaned = targetServerIp.trim();
                  if (cleaned) {
                    const normalized = normalizeServerUrl(cleaned);
                    setTargetServerIp(normalized);
                    await persistServerIp(normalized);
                  }
                  setShowIpEdit(false);
                }}>
                <Text style={[modalStyles.modalButtonText, modalStyles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}