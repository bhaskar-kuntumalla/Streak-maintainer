import { Pressable, Text, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { palette } = useTheme();
  return (
    <>
      <Text style={{ color: palette.textSecondary }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ color: palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
        {...props}
      />
    </>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={{ color: palette.accent, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}
