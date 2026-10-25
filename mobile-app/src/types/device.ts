export interface Device {
  id: string;
  name: string;
  os: 'ios' | 'android' | 'web' | 'desktop';
  osVersion?: string;
  model?: string;
  ipAddress?: string;
  port?: number;
  connectedAt: Date;
  lastSeen: Date;
  isActive: boolean;
  signalStrength?: number;
}

export interface DiscoveredDevice extends Device {
  sharerId: string;
  serviceType: string;
  serviceName: string;
}

export interface DeviceInfo {
  deviceName: string;
  os: string;
  osVersion: string;
  model: string;
  brand: string;
  isEmulator: boolean;
}