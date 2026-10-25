import ApiClient from './client';
import { getApiUrl } from '../../utils/host';

export class SharerApi {
  private client: ApiClient;

  constructor(baseURL: string) {
    this.client = new ApiClient({
      baseURL,
      timeout: 10000,
    });
  }

  async createSharer(name: string) {
    return this.client.post('/api/sharer/create', { name });
  }

  async getSharerInfo(sessionId: string) {
    return this.client.get(`/api/sharer/${sessionId}`);
  }

  async updateSharerName(sessionId: string, name: string) {
    return this.client.put(`/api/sharer/${sessionId}`, { name });
  }

  async discoverSharers() {
    return this.client.get('/api/discover');
  }

  async getSharerByIP(ipOrUrl: string, port?: string) {
    const target = ipOrUrl.includes(':') || ipOrUrl.startsWith('http') ? ipOrUrl : `${ipOrUrl}:${port || 3000}`;
    return this.client.get(getApiUrl('/api/sharer/discover', target));
  }
}