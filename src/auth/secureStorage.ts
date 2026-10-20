import * as SecureStore from 'expo-secure-store';
import { splitChunks } from './chunks';

const countKey = (key: string) => `${key}__count`;
const partKey = (key: string, i: number) => `${key}__${i}`;

/** Supabase storage adapter backed by SecureStore, chunked to respect its size limit. */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(countKey(key));
    if (count === null) return null;
    let out = '';
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(partKey(key, i));
      if (part === null) return null;
      out += part;
    }
    return out;
  },
  async setItem(key: string, value: string): Promise<void> {
    const parts = splitChunks(value);
    for (let i = 0; i < parts.length; i++) {
      await SecureStore.setItemAsync(partKey(key, i), parts[i]);
    }
    await SecureStore.setItemAsync(countKey(key), String(parts.length));
  },
  async removeItem(key: string): Promise<void> {
    const count = await SecureStore.getItemAsync(countKey(key));
    if (count !== null) {
      for (let i = 0; i < Number(count); i++) await SecureStore.deleteItemAsync(partKey(key, i));
    }
    await SecureStore.deleteItemAsync(countKey(key));
  },
};
