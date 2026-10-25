import CryptoJS from 'crypto-js';

export class EncryptionService {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.secretKey).toString();
  }

  decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  encryptObject<T>(obj: T): string {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  decryptObject<T>(encryptedData: string): T | null {
    try {
      const decrypted = this.decrypt(encryptedData);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Failed to decrypt object:', error);
      return null;
    }
  }

  generateHash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  generateFileHash(buffer: Buffer): string {
    const wordArray = CryptoJS.lib.WordArray.create(buffer);
    return CryptoJS.SHA256(wordArray).toString();
  }

  generateRandomKey(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  verifyHash(data: string, hash: string): boolean {
    return this.generateHash(data) === hash;
  }
}

export const createEncryptionService = (secretKey?: string): EncryptionService => {
  const key = secretKey || process.env.ENCRYPTION_KEY || 'default-secret-key';
  return new EncryptionService(key);
};