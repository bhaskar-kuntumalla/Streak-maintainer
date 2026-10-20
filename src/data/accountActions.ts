import { supabase } from '@/auth/supabase';
import { clearLocalData } from './resetLocal';

/** Permanently deletes the account on the server (cascades to all synced rows), then clears this device. */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await clearLocalData();
  await supabase.auth.signOut();
}

export async function saveDisplayName(name: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
  if (error) throw new Error(error.message);
}
