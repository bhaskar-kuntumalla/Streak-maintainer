import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card } from '@/components/ui';
import { Field, TextLink, errorMessage } from '@/components/Field';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecoverScreen() {
  const { palette } = useTheme();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 16 }}>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: '700' }}>Reset password</Text>
      <Card style={{ gap: 12 }}>
        {sent ? (
          <Text style={{ color: palette.text }}>If an account exists for that email, a reset link is on its way.</Text>
        ) : (
          <>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" />
            {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
            <Button label={busy ? 'Sending…' : 'Send reset link'} disabled={busy || email.trim() === ''} onPress={submit} />
          </>
        )}
      </Card>
      <TextLink label="Back to sign in" onPress={() => router.back()} />
    </ScrollView>
  );
}
