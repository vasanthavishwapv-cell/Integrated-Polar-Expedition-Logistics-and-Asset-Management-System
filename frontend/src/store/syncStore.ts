import { create } from 'zustand';

interface SyncQueueItem {
  id: string;
  action: string;
  data: unknown;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  idempotencyKey: string;
  timestamp: string;
  retryCount: number;
}

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  queue: SyncQueueItem[];
  setOnline: (online: boolean) => void;
  addToQueue: (item: Omit<SyncQueueItem, 'retryCount'>) => void;
  updateQueueItem: (id: string, updates: Partial<SyncQueueItem>) => void;
  removeFromQueue: (id: string) => void;
  setLastSyncAt: (date: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  lastSyncAt: null,
  queue: [],
  setOnline: (isOnline) => set({ isOnline }),
  addToQueue: (item) =>
    set((state) => ({
      queue: [...state.queue, { ...item, retryCount: 0 }],
      pendingCount: state.pendingCount + 1,
    })),
  updateQueueItem: (id, updates) =>
    set((state) => ({
      queue: state.queue.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    })),
  removeFromQueue: (id) =>
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
      pendingCount: Math.max(0, state.pendingCount - 1),
    })),
  setLastSyncAt: (date) => set({ lastSyncAt: date }),
}));
