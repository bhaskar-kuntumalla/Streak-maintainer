/**
 * Last-writer-wins by client updated_at, used only when applying server rows locally.
 * Ties go to the server row so devices converge. Unparseable timestamps never win.
 */
export function isRemoteNewer(remote: string, local: string | null): boolean {
  if (local === null) return true;
  const r = Date.parse(remote);
  const l = Date.parse(local);
  if (Number.isNaN(r)) return false;
  if (Number.isNaN(l)) return true;
  return r >= l;
}
