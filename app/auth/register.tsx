import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card } from '@/components/ui';
import { Field, TextLink, errorMessage } from '@/components/Field';
import { useTheme } from '@/theme/ThemeProvider';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function RegisterScreen() {
  const { palette } = useTheme();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await signUp(parsed.data.email, parsed.data.password);
      if (needsConfirmation) setNotice('Check your email to confirm your account, then sign in.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 16 }}>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: '700' }}>Create account</Text>
      <Card style={{ gap: 12 }}>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
        {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
        {notice ? <Text style={{ color: palette.text }}>{notice}</Text> : null}
        <Button label={busy ? 'Creating…' : 'Create account'} disabled={busy} onPress={submit} />
      </Card>
      <TextLink label="Back to sign in" onPress={() => router.back()} />
    </ScrollView>
  );
}
