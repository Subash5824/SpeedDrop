export const Config = {
  appName: 'SpeedDrop',
  version: '1.0.0',
  
  // Transfer settings
  chunkSize: 1024 * 1024, // 1MB
  maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
  maxConcurrentTransfers: 5,
  
  // Network settings
  defaultPort: 3000,
  discoveryTimeout: 5000,
  connectionTimeout: 10000,
  
  // Public Cloud Discovery Microservice
  discoveryServerUrl: process.env.EXPO_PUBLIC_DISCOVERY_URL || 'https://speeddrop.onrender.com',
  
  // Sharer ID settings
  sharerIdPrefix: 'SD',
  sharerIdLength: 6,
  
  // QR Code settings
  qrCodeSize: 200,
  
  // Storage keys
  storageKeys: {
    sharerName: '@speeddrop/sharer_name',
    sharerId: '@speeddrop/sharer_id',
    targetServerIp: '@speeddrop/target_server_ip',
    targetServerUrl: '@speeddrop/target_server_url',
    transferHistory: '@speeddrop/transfer_history',
    settings: '@speeddrop/settings',
  },
  defaultServerUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://speeddrop.onrender.com',
  defaultServerIp: 'https://speeddrop.onrender.com',
};
