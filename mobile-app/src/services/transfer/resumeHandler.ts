import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TransferState {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  transferred: number;
  chunksUploaded: number[];
  lastModified: number;
  sessionId: string;
  type: 'upload' | 'download';
}

export class ResumeHandler {
  private static STORAGE_KEY = '@speeddrop/transfer_states';

  async saveState(state: TransferState): Promise<void> {
    try {
      const states = await this.getAllStates();
      const index = states.findIndex(s => s.fileId === state.fileId);
      
      if (index !== -1) {
        states[index] = state;
      } else {
        states.push(state);
      }
      
      await AsyncStorage.setItem(ResumeHandler.STORAGE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('Failed to save transfer state:', error);
    }
  }

  async getState(fileId: string): Promise<TransferState | null> {
    try {
      const states = await this.getAllStates();
      return states.find(s => s.fileId === fileId) || null;
    } catch (error) {
      console.error('Failed to get transfer state:', error);
      return null;
    }
  }

  async getAllStates(): Promise<TransferState[]> {
    try {
      const data = await AsyncStorage.getItem(ResumeHandler.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get all states:', error);
      return [];
    }
  }

  async removeState(fileId: string): Promise<void> {
    try {
      const states = await this.getAllStates();
      const filtered = states.filter(s => s.fileId !== fileId);
      await AsyncStorage.setItem(ResumeHandler.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove transfer state:', error);
    }
  }

  async clearAllStates(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ResumeHandler.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear all states:', error);
    }
  }

  async cleanupExpiredStates(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const states = await this.getAllStates();
      const now = Date.now();
      const validStates = states.filter(s => now - s.lastModified < maxAge);
      
      if (validStates.length !== states.length) {
        await AsyncStorage.setItem(ResumeHandler.STORAGE_KEY, JSON.stringify(validStates));
      }
    } catch (error) {
      console.error('Failed to cleanup expired states:', error);
    }
  }
}