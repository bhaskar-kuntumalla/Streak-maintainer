import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ACCENTS, palettes, type Palette, type ThemeMode } from './tokens';
import { saveSettings, getSettings, useSettings } from '@/settings/store';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  palette: Palette;
  resolved: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const settings = useSettings();

  const value = useMemo<ThemeContextValue>(() => {
    const mode = settings.theme;
    const resolved: 'light' | 'dark' = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
    const base = palettes[resolved];
    const accent = ACCENTS[settings.accent][resolved];
    return {
      mode,
      setMode: (next) => {
        void saveSettings({ ...getSettings(), theme: next });
      },
      resolved,
      palette: { ...base, accent },
    };
  }, [settings.theme, settings.accent, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
