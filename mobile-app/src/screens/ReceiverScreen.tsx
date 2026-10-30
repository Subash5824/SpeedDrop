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
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import io from 'socket.io-client';

import { Colors } from '@/constants/colors';
import { formatFileSize } from '@/utils/formatters/fileSize';
import { receiverScreenStyles as styles } from '@/styles/screens/ReceiverScreen.styles';
import { modalStyles } from '@/styles/shared/modals.styles';
import {
  getServerIp,
  getServerIpAsync,
  getServerUrl,
  getServerUrlAsync,
  getSocketUrl,
  getSocketOptions,
  getApiUrl,
  normalizeServerUrl,
  fetchActiveServerFromDiscovery,
  TUNNEL_HEADERS,
} from '@/utils/host';

import { Ionicons as Icon } from '@expo/vector-icons';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface SharerInfo {
  sharerId: string;
  sharerName: string;
  files: FileInfo[];
}

export default function ReceiverScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sharer, setSharer] = useState<SharerInfo | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [serverIp, setServerIp] = useState(getServerIp());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());
  const [socket, setSocket] = useState<any>(null);
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [loading, setLoading] = useState(false);

  const requestPermission = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  useEffect(() => {
    requestPermission();
    getServerUrlAsync().then(url => setServerIp(url));
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanning(false);
    setLoading(true);
    try {
      let targetServer = '';
      let session = '';
      let sharerId = '';

      const trimmed = data.trim();

      // 1. Extract full URL if present (e.g. https://xxx.trycloudflare.com/d/SD-XXXXXX or http://IP:3000)
      const fullUrlMatch = trimmed.match(/^https?:\/\/[^\s/?#]+/i);
      if (fullUrlMatch) {
        targetServer = fullUrlMatch[0];
      }

      // 2. Check query parameters
      const sidMatch = trimmed.match(/[?&](?:sid|sharer)=([^&#]+)/i);
      if (sidMatch) sharerId = sidMatch[1];

      // 3. Check /d/:sharerId or /receive/:sharerId path
      const dMatch = trimmed.match(/\/(?:d|receive)\/([^/?&#]+)/i);
      if (dMatch) sharerId = dMatch[1];

      const sessMatch = trimmed.match(/[?&]session=([^&#]+)/i);
      if (sessMatch) session = sessMatch[1];

      // 4. If data is a raw host/IP
      if (!targetServer) {
        const hostMatch = trimmed.match(/^([a-zA-Z0-9.-]+(?::\d+)?)/);
        if (hostMatch && (hostMatch[1].includes('.') || hostMatch[1].includes(':'))) {
          targetServer = hostMatch[1];
        }
      }

      if (!targetServer) {
        targetServer = await getServerUrlAsync();
      }
      targetServer = normalizeServerUrl(targetServer);

      if (session) {
        await connectToSharer(targetServer, session);
        return;
      }

      if (sharerId) {
        let discFound = false;
        try {
          const res = await fetch(getApiUrl(`/api/sharer/discover?sid=${encodeURIComponent(sharerId)}`, targetServer), {
            headers: TUNNEL_HEADERS,
          });
          if (res.ok) {
            const disc = await res.json();
            if (disc.sessionId) {
              await connectToSharer(targetServer, disc.sessionId);
              return;
            }
          }
        } catch (_) {}

        // Fallback: Query Cloud Discovery for this sharerId
        const cloudDisc = await fetchActiveServerFromDiscovery(sharerId);
        if (cloudDisc && cloudDisc.activeUrl) {
          targetServer = cloudDisc.activeUrl;
          const retryRes = await fetch(getApiUrl(`/api/sharer/discover?sid=${encodeURIComponent(sharerId)}`, targetServer), {
            headers: TUNNEL_HEADERS,
          });
          if (retryRes.ok) {
            const disc = await retryRes.json();
            if (disc.sessionId) {
              await connectToSharer(targetServer, disc.sessionId);
              return;
            }
          }
        }
      }

      // If scanning root link (e.g. https://... or http://...), query /api/sharer/active
      let activeDataSession: string | null = null;
      try {
        const activeRes = await fetch(getApiUrl('/api/sharer/active', targetServer), {
          headers: TUNNEL_HEADERS,
        });
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          if (activeData.sessionId) {
            activeDataSession = activeData.sessionId;
          }
        }
      } catch (_) {}

      if (activeDataSession) {
        await connectToSharer(targetServer, activeDataSession);
        return;
      }

      // Check Cloud Discovery for latest active session
      const latestDisc = await fetchActiveServerFromDiscovery();
      if (latestDisc && latestDisc.activeUrl) {
        targetServer = latestDisc.activeUrl;
        const actRes = await fetch(getApiUrl('/api/sharer/active', targetServer), {
          headers: TUNNEL_HEADERS,
        });
        if (actRes.ok) {
          const actData = await actRes.json();
          if (actData.sessionId) {
            await connectToSharer(targetServer, actData.sessionId);
            return;
          }
        }
      }

      throw new Error(`No active sharer found at ${targetServer}`);
    } catch (error: any) {
      console.error('QR scan error:', error);
      Alert.alert('Scan Failed', error?.message || 'Could not connect to sharer from QR code.');
    } finally {
      setLoading(false);
    }
  };

  const connectToSharer = async (targetServerInput: string, session: string) => {
    setLoading(true);
    try {
      const targetBase = getServerUrl(targetServerInput);
      console.log(`Connecting to ${targetBase} session ${session}`);
      
      const response = await fetch(getApiUrl(`/api/sharer/${session}`, targetBase), {
        headers: {
          'Cache-Control': 'no-cache',
          ...TUNNEL_HEADERS,
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      setSharer(data);
      setSessionId(session);
      setServerIp(targetBase);
      setConnected(true);
      
      if (socket) {
        socket.disconnect();
      }

      // Setup WebSocket with tunnel-safe options
      const newSocket = io(getSocketUrl(targetBase), getSocketOptions(targetBase));
      newSocket.emit('register-receiver', {
        sessionId: session,
        deviceName: 'Mobile Device',
        os: 'android',
      });
      
      newSocket.on('file-available', (file: FileInfo) => {
        setSharer(prev => prev ? {
          ...prev,
          files: [...prev.files, file]
        } : null);
      });
      
      setSocket(newSocket);
      Alert.alert('Connected', `Connected to ${data.sharerName}`);
    } catch (error: any) {
      console.error('Connection error:', error);
      Alert.alert('Error', error.message || 'Failed to connect to sharer. Make sure the sender is online.');
    } finally {
      setLoading(false);
    }
  };

  const connectManual = async () => {
    const input = manualIp.trim();
    if (!input) {
      Alert.alert('Error', 'Please enter a Sharer ID, server URL, or link');
      return;
    }

    setLoading(true);
    try {
      let targetServer = await getServerUrlAsync();
      let targetSession = '';
      let targetSid = '';

      // 1. If input is a full URL
      const urlMatch = input.match(/https?:\/\/[^\s/?#]+/i);
      if (urlMatch) {
        targetServer = urlMatch[0];
      }

      const sessMatch = input.match(/[?&]session=([^&#]+)/i);
      if (sessMatch) targetSession = sessMatch[1];

      const sidMatch = input.match(/[?&](?:sid|sharer)=([^&#]+)/i);
      if (sidMatch) targetSid = sidMatch[1];

      const dMatch = input.match(/\/(?:d|receive)\/([^/?&#]+)/i);
      if (dMatch) targetSid = dMatch[1];

      // 2. Direct UUID
      if (input.length === 36 && input.includes('-') && !input.startsWith('SD-')) {
        targetSession = input;
      }

      // 3. Direct Sharer ID (SD-XXXXXX or XXXXXX)
      if (!targetSession && !urlMatch) {
        let clean = input.toUpperCase().replace(/\s+/g, '');
        if (!clean.startsWith('SD-') && !clean.startsWith('SD')) {
          clean = `SD-${clean}`;
        } else if (clean.startsWith('SD') && !clean.startsWith('SD-')) {
          clean = `SD-${clean.slice(2)}`;
        }
        targetSid = clean;
      }

      targetServer = normalizeServerUrl(targetServer);

      if (targetSession) {
        await connectToSharer(targetServer, targetSession);
        setShowManualConnect(false);
        return;
      }

      if (targetSid) {
        let discFound = false;
        try {
          const discRes = await fetch(getApiUrl(`/api/sharer/discover?sid=${encodeURIComponent(targetSid)}`, targetServer), {
            headers: TUNNEL_HEADERS,
          });
          if (discRes.ok) {
            const disc = await discRes.json();
            if (disc.sessionId) {
              await connectToSharer(targetServer, disc.sessionId);
              setShowManualConnect(false);
              return;
            }
          }
        } catch (_) {}

        // Fallback: Query Cloud Discovery service for targetSid
        console.log(`[Receiver] Querying Cloud Discovery for ${targetSid}...`);
        const cloudDisc = await fetchActiveServerFromDiscovery(targetSid);
        if (cloudDisc && cloudDisc.activeUrl) {
          targetServer = cloudDisc.activeUrl;
          try {
            const retryRes = await fetch(getApiUrl(`/api/sharer/discover?sid=${encodeURIComponent(targetSid)}`, targetServer), {
              headers: TUNNEL_HEADERS,
            });
            if (retryRes.ok) {
              const disc = await retryRes.json();
              if (disc.sessionId) {
                await connectToSharer(targetServer, disc.sessionId);
                setShowManualConnect(false);
                return;
              }
            }
          } catch (_) {}
        }
      }

      // Try active sharer on local server
      try {
        const actRes = await fetch(getApiUrl('/api/sharer/active', targetServer), {
          headers: TUNNEL_HEADERS,
        });
        if (actRes.ok) {
          const actData = await actRes.json();
          if (actData.sessionId) {
            await connectToSharer(targetServer, actData.sessionId);
            setShowManualConnect(false);
            return;
          }
        }
      } catch (_) {}

      // Fallback: Try latest active sharer on Cloud Discovery
      const latestDisc = await fetchActiveServerFromDiscovery();
      if (latestDisc && latestDisc.activeUrl) {
        targetServer = latestDisc.activeUrl;
        try {
          const actRes = await fetch(getApiUrl('/api/sharer/active', targetServer), {
            headers: TUNNEL_HEADERS,
          });
          if (actRes.ok) {
            const actData = await actRes.json();
            if (actData.sessionId) {
              await connectToSharer(targetServer, actData.sessionId);
              setShowManualConnect(false);
              return;
            }
          }
        } catch (_) {}
      }

      throw new Error(`Sharer "${targetSid || input}" not found. Please ensure the sender is running.`);
    } catch (error: any) {
      Alert.alert('Connection Failed', error?.message || 'Could not find sharer.');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (file: FileInfo) => {
    if (activeDownloads.has(file.id)) return;
    
    setActiveDownloads(prev => new Set(prev).add(file.id));
    
    try {
      const downloadUri = `${FileSystem.documentDirectory}${file.name}`;
      const fileUrl = getApiUrl(`/api/download/${sessionId}/${file.id}`, serverIp);
      
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        downloadUri,
        {
          headers: TUNNEL_HEADERS,
        },
        (progress) => {
          const percent = (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100;
          setDownloadProgress(prev => new Map(prev).set(file.id, percent));
        }
      );
      
      const result = await downloadResumable.downloadAsync();
      if (result && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      }
      Alert.alert('Success', `Downloaded ${file.name}`);
    } catch (error) {
      Alert.alert('Error', `Failed to download ${file.name}`);
    } finally {
      setActiveDownloads(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(file.id);
          return newMap;
        });
      }, 1000);
    }
  };

  if (scanning) {
    return (
      <View style={styles.container}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>Scan QR Code</Text>
          <TouchableOpacity onPress={() => setScanning(false)} style={styles.closeButton}>
            <Icon name={"close" as any} size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={[styles.scannerContainer, { height: Dimensions.get('window').height - 100 }]}>
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.overlay}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.middleContainer}>
              <View style={styles.unfocusedContainer}></View>
              <View style={styles.focusedContainer}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>
              <View style={styles.unfocusedContainer}></View>
            </View>
            <View style={styles.unfocusedContainer}></View>
          </View>
          <View style={styles.scannerInstructions}>
            <Text style={styles.instructionsText}>Align the QR code within the frame to connect</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {!connected ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connect to Sender</Text>
              <View style={styles.connectButtons}>
                <TouchableOpacity 
                  style={styles.connectButton}
                  onPress={() => setScanning(true)}>
                  <Icon name={"qr-code" as any} size={24} color={Colors.primary} />
                  <Text style={styles.connectButtonText}>Scan QR Code</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.connectButton}
                  onPress={() => setShowManualConnect(true)}>
                  <Icon name={"create-outline" as any} size={24} color={Colors.primary} />
                  <Text style={styles.connectButtonText}>Enter Sharer ID</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.connectedInfo}>
              <Icon name={"person" as any} size={24} color={Colors.accent} />
              <Text style={styles.connectedText}>
                Connected to: {sharer?.sharerName} ({sharer?.sharerId})
              </Text>
            </View>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Available Files ({sharer?.files.length || 0})
              </Text>
              
              {sharer?.files.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name={"folder-open" as any} size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyStateText}>No files shared yet</Text>
                </View>
              ) : (
                sharer?.files.map(file => {
                  const progress = downloadProgress.get(file.id);
                  const progressWidth = progress !== undefined ? progress : 0;
                  
                  return (
                    <View key={file.id} style={styles.fileItem}>
                      <Icon name={"document" as any} size={24} color={Colors.accent} />
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{file.name}</Text>
                        <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                        {progress !== undefined && (
                          <>
                            <View style={styles.progressBar}>
                              <View 
                                style={[
                                  styles.progressFill, 
                                  { width: `${progressWidth}%` as any }
                                ]}
                              />
                            </View>
                            <Text style={styles.progressText}>
                              {Math.round(progress)}%
                            </Text>
                          </>
                        )}
                      </View>
                      <TouchableOpacity 
                        style={[
                          styles.downloadButton,
                          activeDownloads.has(file.id) && styles.downloadButtonDisabled
                        ]}
                        onPress={() => downloadFile(file)}
                        disabled={activeDownloads.has(file.id)}>
                        <Text style={styles.downloadButtonText}>
                          {activeDownloads.has(file.id) ? 'Downloading...' : 'Download'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Manual Connect Modal */}
      <Modal visible={showManualConnect} transparent animationType="slide">
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Connect to Sharer</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter Sharer ID (e.g. SD-X8Y9Z0) or URL"
              placeholderTextColor={Colors.textMuted}
              value={manualIp}
              onChangeText={setManualIp}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity 
                style={modalStyles.modalButton} 
                onPress={() => setShowManualConnect(false)}>
                <Text style={modalStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[modalStyles.modalButton, modalStyles.modalButtonPrimary]} 
                onPress={connectManual}>
                <Text style={[modalStyles.modalButtonText, modalStyles.modalButtonTextPrimary]}>
                  Connect
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={modalStyles.modalContainer}>
          <View style={[modalStyles.modalContent, { alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { marginTop: 16 }]}>Connecting...</Text>
          </View>
        </View>
      )}
    </View>
  );
}
