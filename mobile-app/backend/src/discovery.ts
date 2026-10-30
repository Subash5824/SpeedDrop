import bonjour from 'bonjour';

interface ServiceInfo {
  name: string;
  type: string;
  host: string;
  port: number;
  txt: Record<string, string>;
}

export class DiscoveryService {
  private bonjourInstance: any;
  private services: Map<string, ServiceInfo> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.bonjourInstance = bonjour();
  }

  start(port: number, name: string = 'SpeedDrop'): void {
    if (this.isRunning) return;
    
    this.bonjourInstance.publish({
      name: name,
      type: 'speeddrop',
      port: port,
      txt: {
        service: 'speeddrop',
        version: '1.0',
        protocol: 'http',
      },
    });
    
    this.isRunning = true;
    console.log(`🔍 mDNS service published: ${name} on port ${port}`);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.bonjourInstance.unpublishAll();
    this.bonjourInstance.destroy();
    this.isRunning = false;
    console.log('🔍 mDNS service stopped');
  }

  discover(timeout: number = 5000): Promise<ServiceInfo[]> {
    return new Promise((resolve) => {
      const discovered: ServiceInfo[] = [];
      
      const browser = this.bonjourInstance.find({ type: 'speeddrop' });
      
      browser.on('up', (service: any) => {
        const info: ServiceInfo = {
          name: service.name,
          type: service.type,
          host: service.host,
          port: service.port,
          txt: service.txt || {},
        };
        
        if (!this.services.has(service.name)) {
          this.services.set(service.name, info);
          discovered.push(info);
          console.log(`🔍 Discovered service: ${service.name} at ${service.host}:${service.port}`);
        }
      });
      
      setTimeout(() => {
        browser.stop();
        resolve(discovered);
      }, timeout);
    });
  }

  getServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  clearServices(): void {
    this.services.clear();
  }
}