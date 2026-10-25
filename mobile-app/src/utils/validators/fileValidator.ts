import { Config } from '@constants/config';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const validateFileSize = (size: number): FileValidationResult => {
  if (size === 0) {
    return { valid: false, error: 'File is empty' };
  }
  if (size > Config.maxFileSize) {
    return { valid: false, error: `File size exceeds limit (${Config.maxFileSize / (1024 * 1024 * 1024)}GB)` };
  }
  return { valid: true };
};

export const validateFileName = (name: string): FileValidationResult => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'File name is empty' };
  }
  
  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(name)) {
    return { valid: false, error: 'File name contains invalid characters' };
  }
  
  if (name.length > 255) {
    return { valid: false, error: 'File name is too long' };
  }
  
  return { valid: true };
};

export const validateFileType = (mimeType: string): FileValidationResult => {
  // Allow all file types
  return { valid: true };
};

export const validateFile = (name: string, size: number, mimeType: string): FileValidationResult => {
  const nameValidation = validateFileName(name);
  if (!nameValidation.valid) return nameValidation;
  
  const sizeValidation = validateFileSize(size);
  if (!sizeValidation.valid) return sizeValidation;
  
  const typeValidation = validateFileType(mimeType);
  if (!typeValidation.valid) return typeValidation;
  
  return { valid: true };
};

export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot + 1).toLowerCase();
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const isAudioFile = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

export const isDocumentFile = (mimeType: string): boolean => {
  const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument', 'text/plain'];
  return documentTypes.some(type => mimeType.includes(type));
};