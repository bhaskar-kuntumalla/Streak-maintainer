// Streakboard-inspired design tokens.
export const brand = {
  mint: '#2EE6C5',
  violet: '#8B6CFF',
  cyan: '#2EC5E6',
  blue: '#2E86E6',
  pink: '#E62EC5',
  yellow: '#E6C52E',
} as const;

export type Palette = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  tabBar: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  dark: {
    background: '#0A0E2A',
    surface: 'rgba(255,255,255,0.06)',
    text: '#FFFFFF',
    textSecondary: '#8C96D7',
    border: 'rgba(255,255,255,0.12)',
    accent: brand.mint,
    tabBar: '#0A0E2A',
  },
  light: {
    background: '#F5F6FF',
    surface: '#FFFFFF',
    text: '#0A0E2A',
    textSecondary: '#5A6396',
    border: 'rgba(10,14,42,0.12)',
    accent: '#1BB89C',
    tabBar: '#FFFFFF',
  },
};

export type ThemeMode = 'light' | 'dark' | 'system';

export const ACCENTS = {
  mint: { dark: '#2EE6C5', light: '#1BB89C' },
  violet: { dark: '#8B6CFF', light: '#6A4BE0' },
  cyan: { dark: '#2EC5E6', light: '#1A9FC0' },
  pink: { dark: '#E62EC5', light: '#B81C9C' },
} as const;
