import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 18,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  const primary = variant === 'primary';
  const textColor = primary ? '#0A0E2A' : variant === 'danger' ? '#E62EC5' : palette.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? palette.accent : 'transparent',
        borderWidth: primary ? 0 : 1,
        borderColor: palette.border,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: textColor, fontWeight: '600', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: palette.textSecondary, textAlign: 'center' }}>{body}</Text>
      {action}
    </View>
  );
}
