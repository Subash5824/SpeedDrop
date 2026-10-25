import { TransferHistory } from '@/types/sharer';
import { addToHistory, getTransferHistory, clearHistory, saveTransferHistory } from './asyncStorage';

class HistoryStore {
  private static instance: HistoryStore;
  private history: TransferHistory[] = [];

  private constructor() {
    this.loadHistory();
  }

  static getInstance(): HistoryStore {
    if (!HistoryStore.instance) {
      HistoryStore.instance = new HistoryStore();
    }
    return HistoryStore.instance;
  }

  async loadHistory(): Promise<void> {
    this.history = await getTransferHistory();
  }

  async addTransfer(transfer: Omit<TransferHistory, 'id' | 'timestamp'>): Promise<void> {
    const newTransfer: TransferHistory = {
      ...transfer,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    this.history.unshift(newTransfer);
    await addToHistory(newTransfer);
  }

  async getHistory(): Promise<TransferHistory[]> {
    return this.history;
  }

  async clearAll(): Promise<void> {
    this.history = [];
    await clearHistory();
  }

  async getSentHistory(): Promise<TransferHistory[]> {
    return this.history.filter(item => item.type === 'sent');
  }

  async getReceivedHistory(): Promise<TransferHistory[]> {
    return this.history.filter(item => item.type === 'received');
  }

  async getHistoryBySharer(sharerId: string): Promise<TransferHistory[]> {
    return this.history.filter(item => item.sharerId === sharerId);
  }
}

export default HistoryStore.getInstance();