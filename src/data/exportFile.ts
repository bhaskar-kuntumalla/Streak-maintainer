import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { collectExport } from './exportRepository';

/** Writes the export to the cache directory and opens the share sheet. */
export async function exportAndShare(): Promise<void> {
  const payload = await collectExport();
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}streakos-export-${stamp}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export StreakOS data' });
}
