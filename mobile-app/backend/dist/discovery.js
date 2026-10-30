"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryService = void 0;
const bonjour_1 = __importDefault(require("bonjour"));
class DiscoveryService {
    constructor() {
        this.services = new Map();
        this.isRunning = false;
        this.bonjourInstance = (0, bonjour_1.default)();
    }
    start(port, name = 'SpeedDrop') {
        if (this.isRunning)
            return;
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
    stop() {
        if (!this.isRunning)
            return;
        this.bonjourInstance.unpublishAll();
        this.bonjourInstance.destroy();
        this.isRunning = false;
        console.log('🔍 mDNS service stopped');
    }
    discover(timeout = 5000) {
        return new Promise((resolve) => {
            const discovered = [];
            const browser = this.bonjourInstance.find({ type: 'speeddrop' });
            browser.on('up', (service) => {
                const info = {
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
    getServices() {
        return Array.from(this.services.values());
    }
    clearServices() {
        this.services.clear();
    }
}
exports.DiscoveryService = DiscoveryService;
