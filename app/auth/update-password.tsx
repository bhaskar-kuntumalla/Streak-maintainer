import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card } from '@/components/ui';
import { Field, errorMessage } from '@/components/Field';
import { useTheme } from '@/theme/ThemeProvider';

/** Opened from the reset email link. The PKCE code is exchanged for a session in AuthProvider. */
export default function UpdatePasswordScreen() {
  const { palette } = useTheme();
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 16 }}>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: '700' }}>New password</Text>
      <Card style={{ gap: 12 }}>
        {!session ? (
          <Text style={{ color: palette.textSecondary }}>Open the reset link from your email on this device to continue.</Text>
        ) : (
          <>
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
            {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
            <Button label={busy ? 'Saving…' : 'Save password'} disabled={busy} onPress={submit} />
          </>
        )}
      </Card>
    </ScrollView>
  );
}
