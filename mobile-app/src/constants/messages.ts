export const Messages = {
  // Success messages
  SUCCESS: {
    SHARING_STARTED: 'Sharing started successfully!',
    SHARING_STOPPED: 'Sharing stopped',
    FILE_UPLOADED: 'File uploaded successfully',
    FILE_DOWNLOADED: 'File downloaded successfully',
    CONNECTION_ESTABLISHED: 'Connected to sender',
    SETTINGS_SAVED: 'Settings saved',
    HISTORY_CLEARED: 'History cleared',
    NAME_UPDATED: 'Name updated',
    SHARER_ID_REGENERATED: 'Sharer ID regenerated',
  },
  
  // Error messages
  ERROR: {
    NETWORK_ERROR: 'Network error. Please check your connection',
    CONNECTION_FAILED: 'Failed to connect to sender',
    FILE_UPLOAD_FAILED: 'Failed to upload file',
    FILE_DOWNLOAD_FAILED: 'Failed to download file',
    PERMISSION_DENIED: 'Permission denied',
    INVALID_QR_CODE: 'Invalid QR code',
    SESSION_EXPIRED: 'Session expired',
    FILE_NOT_FOUND: 'File not found',
    STORAGE_FULL: 'Storage is full',
    UNKNOWN_ERROR: 'An unknown error occurred',
    BACKEND_NOT_RUNNING: 'Backend server is not running',
    INVALID_SHARER_ID: 'Invalid Sharer ID format',
    INVALID_IP_ADDRESS: 'Invalid IP address',
  },
  
  // Info messages
  INFO: {
    WAITING_FOR_CONNECTION: 'Waiting for connection...',
    SCAN_QR_CODE: 'Scan QR code to connect',
    SELECT_FILES: 'Select files to share',
    NO_FILES_SHARED: 'No files shared yet',
    NO_DEVICES_CONNECTED: 'No devices connected',
    TRANSFER_COMPLETED: 'Transfer completed',
    TRANSFER_PAUSED: 'Transfer paused',
    TRANSFER_RESUMED: 'Transfer resumed',
    CLEAR_HISTORY_CONFIRM: 'Are you sure you want to clear all transfer history?',
    REGENERATE_ID_CONFIRM: 'This will generate a new unique ID. Your current connections will be affected. Continue?',
  },
};