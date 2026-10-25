import ApiClient from './client';

export class FileApi {
  private client: ApiClient;

  constructor(baseURL: string) {
    this.client = new ApiClient({
      baseURL,
      timeout: 30000,
    });
  }

  async initUpload(sessionId: string, fileId: string, name: string, size: number, type: string) {
    return this.client.post(`/api/upload/${sessionId}/init`, {
      fileId,
      name,
      size,
      type,
    });
  }

  async uploadChunk(sessionId: string, fileId: string, chunkIndex: number, chunkData: string, totalChunks?: number) {
    return this.client.post(
      `/api/upload/${sessionId}/${fileId}?chunk=${chunkIndex}${totalChunks !== undefined ? `&totalChunks=${totalChunks}` : ''}`,
      { chunk: chunkData },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-append-mode': 'true',
        },
      }
    );
  }

  async downloadFile(sessionId: string, fileId: string) {
    return this.client.get(`/api/download/${sessionId}/${fileId}`);
  }

  async getFileInfo(sessionId: string, fileId: string) {
    return this.client.get(`/api/file/${sessionId}/${fileId}`);
  }
}