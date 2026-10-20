import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { deleteAccount, saveDisplayName } from '@/data/accountActions';
import { exportAndShare } from '@/data/exportFile';
import { countPending } from '@/sync/outbox';
import { getDb } from '@/db/client';
import { saveSettings, useSettings } from '@/settings/store';
import { formatDate, type Settings } from '@/domain/settings';
import { localIsoDate } from '@/lib/date';
import { ACCENTS } from '@/theme/tokens';
import { Button, Card } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>{title.toUpperCase()}</Text>
      <Card style={{ gap: 14 }}>{children}</Card>
    </View>
  );
}

function Options<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: palette.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? palette.accent : palette.border,
                backgroundColor: active ? palette.accent : 'transparent',
              }}
            >
              <Text style={{ color: active ? '#0A0E2A' : palette.text, fontWeight: '600' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { palette } = useTheme();
  const s = useSettings();
  const { session, signOut } = useAuth();
  const [name, setName] = useState(s.displayName || (session?.user.user_metadata?.display_name as string) || '');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (patch: Partial<Settings>) => {
    void saveSettings({ ...s, ...patch });
  };

  const saveName = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await saveDisplayName(name.trim());
      update({ displayName: name.trim() });
      setMessage('Name saved');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save name');
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    setMessage(null);
    try {
      await exportAndShare();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your StreakOS account and all synced data on every device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setMessage(null);
            try {
              const db = await getDb();
              if ((await countPending(db)) > 0) {
                throw new Error('Some changes have not synced yet. Connect to the internet and try again.');
              }
              await deleteAccount();
              router.replace('/auth/sign-in');
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'Could not delete account');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Settings', headerTintColor: palette.text, headerStyle: { backgroundColor: palette.background } }} />
      <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Section title="Profile">
          <Text style={{ color: palette.textSecondary }}>Display name</Text>
          <TextInput
            accessibilityLabel="Display name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={palette.textSecondary}
            style={{ color: palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
          />
          <Button label="Save name" variant="secondary" disabled={busy} onPress={saveName} />
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Signed in as {session?.user.email ?? 'unknown'}</Text>
        </Section>

        <Section title="Calendar and display">
          <Options
            label="Week starts on"
            value={s.weekStartDay}
            options={[{ value: 1, label: 'Monday' }, { value: 0, label: 'Sunday' }]}
            onChange={(v) => update({ weekStartDay: v as 0 | 1 })}
          />
          <Options
            label="Date format"
            value={s.dateFormat}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
            onChange={(v) => update({ dateFormat: v })}
          />
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Preview: {formatDate(localIsoDate(), s.dateFormat)}</Text>
          <Options
            label="Clock"
            value={s.timeFormat}
            options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]}
            onChange={(v) => update({ timeFormat: v })}
          />
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Timezone: {s.timezone}. Dates follow the device clock for now.</Text>
        </Section>

        <Section title="Appearance">
          <Options
            label="Theme"
            value={s.theme}
            options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            onChange={(v) => update({ theme: v })}
          />
          <Text style={{ color: palette.textSecondary }}>Accent</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityLabel={`${k} accent`}
                accessibilityState={{ selected: s.accent === k }}
                onPress={() => update({ accent: k })}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: ACCENTS[k].dark,
                  borderWidth: s.accent === k ? 3 : 0,
                  borderColor: palette.text,
                }}
              />
            ))}
          </View>
        </Section>

        <Section title="Reminders and scoring">
          <Pressable accessibilityRole="button" onPress={() => router.push('/notifications')}>
            <Text style={{ color: palette.accent, fontWeight: '700' }}>Notification schedule ›</Text>
          </Pressable>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            XP rules and the 80% consistency threshold are fixed. They must match the StreakOS website, so they are not configurable per device.
          </Text>
        </Section>

        <Section title="Your data">
          <Button label="Export my data (JSON)" variant="secondary" onPress={doExport} />
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Exports habits, completions, tasks, check-ins, plans, rewards, and settings.</Text>
        </Section>

        <Section title="Danger zone">
          <Button label="Delete account" variant="danger" disabled={busy} onPress={confirmDelete} />
          <Button label="Sign out" variant="secondary" disabled={busy} onPress={() => signOut().catch((e: unknown) => setMessage(e instanceof Error ? e.message : 'Sign out failed'))} />
        </Section>

        {message ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{message}</Text> : null}
      </ScrollView>
    </>
  );
}
