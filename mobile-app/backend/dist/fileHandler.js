"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileHandler = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
class FileHandler {
    constructor(uploadDir, chunkSize = 1024 * 1024) {
        this.files = new Map();
        this.uploadDir = uploadDir;
        this.chunkSize = chunkSize;
        fs_extra_1.default.ensureDirSync(uploadDir);
    }
    async initializeUpload(fileId, name, size, type) {
        const filePath = path_1.default.join(this.uploadDir, `${fileId}_${name}`);
        const fileInfo = {
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
    async uploadChunk(fileId, chunkIndex, data) {
        const file = this.files.get(fileId);
        if (!file) {
            throw new Error('File not found');
        }
        const chunkPath = `${file.path}.part${chunkIndex}`;
        await fs_extra_1.default.writeFile(chunkPath, data);
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
    async combineChunks(file) {
        const totalChunks = Math.ceil(file.size / this.chunkSize);
        const writeStream = (0, fs_1.createWriteStream)(file.path);
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = `${file.path}.part${i}`;
            const readStream = (0, fs_1.createReadStream)(chunkPath);
            await (0, promises_1.pipeline)(readStream, writeStream, { end: false });
            await fs_extra_1.default.remove(chunkPath);
        }
        writeStream.end();
    }
    async getFile(fileId) {
        return this.files.get(fileId) || null;
    }
    async getFileStream(fileId, start, end) {
        const file = this.files.get(fileId);
        if (!file || !file.uploaded) {
            return null;
        }
        const stat = await fs_extra_1.default.stat(file.path);
        const streamOptions = {};
        if (start !== undefined)
            streamOptions.start = start;
        if (end !== undefined)
            streamOptions.end = end;
        const stream = (0, fs_1.createReadStream)(file.path, streamOptions);
        return { stream, size: stat.size };
    }
    async deleteFile(fileId) {
        const file = this.files.get(fileId);
        if (!file)
            return false;
        try {
            if (await fs_extra_1.default.pathExists(file.path)) {
                await fs_extra_1.default.remove(file.path);
            }
            this.files.delete(fileId);
            return true;
        }
        catch (error) {
            console.error('Failed to delete file:', error);
            return false;
        }
    }
    async cleanupOldFiles(maxAge = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        for (const [id, file] of this.files) {
            if (now - file.createdAt.getTime() > maxAge) {
                await this.deleteFile(id);
            }
        }
    }
    getFileInfo(fileId) {
        return this.files.get(fileId) || null;
    }
    getAllFiles() {
        return Array.from(this.files.values());
    }
    getUploadedFiles() {
        return Array.from(this.files.values()).filter(f => f.uploaded);
    }
}
exports.FileHandler = FileHandler;
