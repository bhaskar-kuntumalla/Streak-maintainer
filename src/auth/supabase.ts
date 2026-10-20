import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { secureStorage } from './secureStorage';

export const supabase = createClient(env.supabaseUrl || 'https://placeholder.invalid', env.supabaseAnonKey || 'missing', {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
