import fs from 'fs-extra';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  chunks: number;
  uploaded: boolean;
  createdAt: Date;
}

interface UploadChunkOptions {
  chunkIndex: number;
  data: Buffer;
}

export class FileHandler {
  private uploadDir: string;
  private chunkSize: number;
  private files: Map<string, FileInfo> = new Map();

  constructor(uploadDir: string, chunkSize: number = 1024 * 1024) {
    this.uploadDir = uploadDir;
    this.chunkSize = chunkSize;
    fs.ensureDirSync(uploadDir);
  }

  async initializeUpload(fileId: string, name: string, size: number, type: string): Promise<FileInfo> {
    const filePath = path.join(this.uploadDir, `${fileId}_${name}`);
    
    const fileInfo: FileInfo = {
      id: fileId,
      name,
      size,
      type,
      path: filePath,
      chunks: 0,
      uploaded: false,
      createdAt: new Date(),
    };
    
    this.files.set(fileId, fileInfo);
    return fileInfo;
  }

  async uploadChunk(fileId: string, chunkIndex: number, data: Buffer): Promise<{ progress: number; completed: boolean }> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    
    const chunkPath = `${file.path}.part${chunkIndex}`;
    await fs.writeFile(chunkPath, data);
    
    file.chunks++;
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    const progress = (file.chunks / totalChunks) * 100;
    const completed = file.chunks === totalChunks;
    
    if (completed) {
      await this.combineChunks(file);
      file.uploaded = true;
    }
    
    return { progress, completed };
  }

  private async combineChunks(file: FileInfo): Promise<void> {
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    const writeStream = createWriteStream(file.path);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `${file.path}.part${i}`;
      const readStream = createReadStream(chunkPath);
      await pipeline(readStream, writeStream, { end: false });
      await fs.remove(chunkPath);
    }
    
    writeStream.end();
  }

  async getFile(fileId: string): Promise<FileInfo | null> {
    return this.files.get(fileId) || null;
  }

  async getFileStream(fileId: string, start?: number, end?: number): Promise<{ stream: fs.ReadStream; size: number } | null> {
    const file = this.files.get(fileId);
    if (!file || !file.uploaded) {
      return null;
    }
    
    const stat = await fs.stat(file.path);
    const streamOptions: { start?: number; end?: number } = {};
    
    if (start !== undefined) streamOptions.start = start;
    if (end !== undefined) streamOptions.end = end;
    
    const stream = createReadStream(file.path, streamOptions);
    return { stream, size: stat.size };
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const file = this.files.get(fileId);
    if (!file) return false;
    
    try {
      if (await fs.pathExists(file.path)) {
        await fs.remove(file.path);
      }
      this.files.delete(fileId);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    for (const [id, file] of this.files) {
      if (now - file.createdAt.getTime() > maxAge) {
        await this.deleteFile(id);
      }
    }
  }

  getFileInfo(fileId: string): FileInfo | null {
    return this.files.get(fileId) || null;
  }

  getAllFiles(): FileInfo[] {
    return Array.from(this.files.values());
  }

  getUploadedFiles(): FileInfo[] {
    return Array.from(this.files.values()).filter(f => f.uploaded);
  }
}