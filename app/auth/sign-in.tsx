import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card } from '@/components/ui';
import { Field, TextLink, errorMessage } from '@/components/Field';
import { useTheme } from '@/theme/ThemeProvider';

export default function SignInScreen() {
  const { palette } = useTheme();
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 16 }}>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: '700' }}>Sign in</Text>
      {!configured ? (
        <Text accessibilityRole="alert" style={{ color: palette.textSecondary }}>
          Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY and restart.
        </Text>
      ) : null}
      <Card style={{ gap: 12 }}>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
        {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
        <Button label={busy ? 'Signing in…' : 'Sign in'} disabled={busy || !configured} onPress={submit} />
      </Card>
      <TextLink label="Create an account" onPress={() => router.push('/auth/register')} />
      <TextLink label="Forgot password?" onPress={() => router.push('/auth/recover')} />
    </ScrollView>
  );
}
