import axios, { AxiosInstance } from 'axios';
import { getBaseUrl, TUNNEL_HEADERS } from '../../utils/host';

interface ApiConfig {
  baseURL?: string;
  timeout?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(config?: ApiConfig) {
    this.client = axios.create({
      baseURL: config?.baseURL || getBaseUrl(),
      timeout: config?.timeout || 15000,
      headers: {
        'Content-Type': 'application/json',
        ...TUNNEL_HEADERS,
      },
    });

    // Dynamically ensure request always targets active server URL if not already set
    this.client.interceptors.request.use((reqConfig) => {
      if (!reqConfig.baseURL) {
        reqConfig.baseURL = getBaseUrl();
      }
      if (reqConfig.headers) {
        for (const [key, value] of Object.entries(TUNNEL_HEADERS)) {
          if (typeof (reqConfig.headers as any).set === 'function') {
            (reqConfig.headers as any).set(key, value);
          } else {
            (reqConfig.headers as any)[key] = value;
          }
        }
      }
      return reqConfig;
    });
  }

  async get(url: string, params?: any) {
    try {
      const response = await this.client.get(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post(url: string, data?: any, config?: any) {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put(url: string, data?: any, config?: any) {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(url: string) {
    try {
      const response = await this.client.delete(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any) {
    if (error.response) {
      return new Error(error.response.data.message || 'Server error');
    } else if (error.request) {
      return new Error('No response from server');
    } else {
      return new Error(error.message || 'Request failed');
    }
  }
}

export default ApiClient;