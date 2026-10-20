/** SecureStore caps each value near 2 KB, so long session tokens are split. */
export const SECURE_CHUNK_SIZE = 1800;

export function splitChunks(value: string, size: number = SECURE_CHUNK_SIZE): string[] {
  const out: string[] = [];
  for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size));
  return out.length > 0 ? out : [''];
}
