import { Text } from 'react-native';
import { useSyncStatus, type SyncState } from '@/sync/status';
import { useTheme } from '@/theme/ThemeProvider';

const LABELS: Record<SyncState, string> = {
  idle: 'Ready',
  signed_out: 'Signed out',
  offline: 'Offline. Changes are saved on this device.',
  syncing: 'Syncing…',
  synced: 'All changes synced',
  error: 'Sync paused. Will retry.',
};

export function SyncBadge() {
  const { palette } = useTheme();
  const status = useSyncStatus();
  const suffix = status.pending > 0 ? ` · ${status.pending} pending` : '';
  return (
    <Text accessibilityLiveRegion="polite" style={{ color: palette.textSecondary, fontSize: 12 }}>
      {LABELS[status.state]}
      {suffix}
    </Text>
  );
}
