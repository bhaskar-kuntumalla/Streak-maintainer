import { useSyncExternalStore } from 'react';

export type SyncState = 'idle' | 'signed_out' | 'offline' | 'syncing' | 'synced' | 'error';
export type SyncStatus = {
  state: SyncState;
  pending: number;
  lastSyncedAt?: string;
  message?: string;
};

let current: SyncStatus = { state: 'idle', pending: 0 };
const listeners = new Set<() => void>();

export function setStatus(next: SyncStatus): void {
  current = next;
  listeners.forEach((l) => l());
}

export function getStatus(): SyncStatus {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getStatus, getStatus);
}
