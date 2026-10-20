import { useEffect, useState } from 'react';
import { Switch, Text, TextInput, View, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ensurePermission, getLastScheduledCount } from '@/notifications/scheduler';
import { saveSettings, useSettings } from '@/settings/store';
import { formatTime, type NotificationSettings } from '@/domain/settings';
import { Card } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: palette.text, fontSize: 16 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: palette.accent, false: palette.border }}
      />
    </View>
  );
}

function TimeField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const { palette } = useTheme();
  const s = useSettings();
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setDraft(value), [value]);
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: palette.textSecondary }}>
        {label} · {formatTime(value, s.timeFormat)}
      </Text>
      <TextInput
        accessibilityLabel={`${label} time, 24 hour HH:MM`}
        value={draft}
        onChangeText={(t) => {
          setDraft(t);
          setInvalid(!TIME.test(t));
        }}
        onEndEditing={() => {
          if (TIME.test(draft)) onCommit(draft);
          else setDraft(value);
        }}
        keyboardType="numbers-and-punctuation"
        style={{ color: invalid ? palette.accent : palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 }}
      />
      {invalid ? <Text style={{ color: palette.accent, fontSize: 12 }}>Use HH:MM, for example 08:30</Text> : null}
    </View>
  );
}

export default function NotificationsScreen() {
  const { palette } = useTheme();
  const s = useSettings();
  const n = s.notifications;
  const [permission, setPermission] = useState<string>('undetermined');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void Notifications.getPermissionsAsync().then((p) => setPermission(p.status));
  }, []);

  const update = (patch: Partial<NotificationSettings>) => {
    void saveSettings({ ...s, notifications: { ...n, ...patch } });
  };

  const toggleEnabled = async (on: boolean) => {
    setMessage(null);
    if (on) {
      const granted = await ensurePermission();
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setMessage('Notifications are blocked. Allow them in system settings to turn reminders on.');
        return;
      }
    }
    update({ enabled: on });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Reminders', headerTintColor: palette.text, headerStyle: { backgroundColor: palette.background } }} />
      <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card style={{ gap: 14 }}>
          <Row label="Reminders on" value={n.enabled} onChange={toggleEnabled} />
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            Permission: {permission}. {getLastScheduledCount()} reminders scheduled for the next week. Reminders are local to this device and depend on the operating system allowing background notifications.
          </Text>
          {message ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{message}</Text> : null}
        </Card>

        <Card style={{ gap: 14 }}>
          <Row label="Habit reminders" value={n.habitReminders} onChange={(v) => update({ habitReminders: v })} />
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Set a time on each habit to enable its reminder.</Text>
        </Card>

        <Card style={{ gap: 14 }}>
          <Row label="Daily check-in" value={n.checkIn.enabled} onChange={(v) => update({ checkIn: { ...n.checkIn, enabled: v } })} />
          <TimeField label="Check-in" value={n.checkIn.time} onCommit={(t) => update({ checkIn: { ...n.checkIn, time: t } })} />
        </Card>

        <Card style={{ gap: 14 }}>
          <Row label="Evening review" value={n.eveningReview.enabled} onChange={(v) => update({ eveningReview: { ...n.eveningReview, enabled: v } })} />
          <TimeField label="Review" value={n.eveningReview.time} onCommit={(t) => update({ eveningReview: { ...n.eveningReview, time: t } })} />
        </Card>

        <Card style={{ gap: 14 }}>
          <Row label="Weekly planning" value={n.weeklyPlanning.enabled} onChange={(v) => update({ weeklyPlanning: { ...n.weeklyPlanning, enabled: v } })} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((label, d) => {
              const active = n.weeklyPlanning.weekday === d;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => update({ weeklyPlanning: { ...n.weeklyPlanning, weekday: d } })}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? palette.accent : palette.border, backgroundColor: active ? palette.accent : 'transparent' }}
                >
                  <Text style={{ color: active ? '#0A0E2A' : palette.text, fontWeight: '600' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TimeField label="Planning" value={n.weeklyPlanning.time} onCommit={(t) => update({ weeklyPlanning: { ...n.weeklyPlanning, time: t } })} />
        </Card>

        <Card style={{ gap: 14 }}>
          <Row
            label="Quiet hours"
            value={n.quietHours !== null}
            onChange={(v) => update({ quietHours: v ? { start: '22:00', end: '07:00' } : null })}
          />
          {n.quietHours ? (
            <>
              <TimeField label="Quiet from" value={n.quietHours.start} onCommit={(t) => update({ quietHours: { ...n.quietHours!, start: t } })} />
              <TimeField label="Quiet until" value={n.quietHours.end} onCommit={(t) => update({ quietHours: { ...n.quietHours!, end: t } })} />
            </>
          ) : null}
        </Card>
      </ScrollView>
    </>
  );
}
