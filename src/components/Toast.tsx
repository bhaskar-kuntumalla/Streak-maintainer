import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export type ToastTone = 'xp' | 'level' | 'boss';
type ToastItem = { id: number; message: string; tone: ToastTone };
type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast>(() => {});
const TONE_COLOR: Record<ToastTone, string> = {
  xp: brand.mint,
  level: brand.yellow,
  boss: brand.violet,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message, tone = 'xp') => {
    const id = ++nextId.current;
    setItems((prev) => [...prev, { id, message, tone }].slice(-3));
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center', gap: 8 }}>
        {items.map((t) => (
          <ToastBubble key={t.id} item={t} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastBubble({ item }: { item: ToastItem }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={{
        opacity,
        backgroundColor: TONE_COLOR[item.tone],
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: '#0A0E2A', fontWeight: '700' }}>{item.message}</Text>
    </Animated.View>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
