import * as FileSystem from 'expo-file-system';

export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  uploaded: boolean;
  data?: string;
}

export class ChunkManager {
  private chunks: Map<string, ChunkInfo[]> = new Map();
  private chunkSize: number;

  constructor(chunkSize: number = 1024 * 1024) { // 1MB default
    this.chunkSize = chunkSize;
  }

  createChunks(fileId: string, fileSize: number): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const totalChunks = Math.ceil(fileSize / this.chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      chunks.push({
        index: i,
        start: i * this.chunkSize,
        end: Math.min((i + 1) * this.chunkSize, fileSize),
        size: Math.min(this.chunkSize, fileSize - (i * this.chunkSize)),
        uploaded: false,
      });
    }
    
    this.chunks.set(fileId, chunks);
    return chunks;
  }

  async readChunk(fileUri: string, chunk: ChunkInfo): Promise<string> {
    return await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: chunk.start,
      length: chunk.size,
    });
  }

  markChunkUploaded(fileId: string, chunkIndex: number): void {
    const chunks = this.chunks.get(fileId);
    if (chunks && chunks[chunkIndex]) {
      chunks[chunkIndex].uploaded = true;
    }
  }

  getProgress(fileId: string): number {
    const chunks = this.chunks.get(fileId);
    if (!chunks || chunks.length === 0) return 0;
    
    const uploaded = chunks.filter(c => c.uploaded).length;
    return (uploaded / chunks.length) * 100;
  }

  getPendingChunks(fileId: string): ChunkInfo[] {
    const chunks = this.chunks.get(fileId);
    return chunks ? chunks.filter(c => !c.uploaded) : [];
  }

  clearChunks(fileId: string): void {
    this.chunks.delete(fileId);
  }

  saveState(fileId: string): string {
    const chunks = this.chunks.get(fileId);
    if (!chunks) return '';
    return JSON.stringify({ chunks, chunkSize: this.chunkSize });
  }

  loadState(fileId: string, state: string): void {
    try {
      const data = JSON.parse(state);
      this.chunkSize = data.chunkSize;
      this.chunks.set(fileId, data.chunks);
    } catch (error) {
      console.error('Failed to load chunk state:', error);
    }
  }
}