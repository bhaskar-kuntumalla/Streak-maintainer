const BASE_MS = 2_000;
const CAP_MS = 300_000;

/** Exponential backoff from 2 s, capped at 5 minutes. */
export function nextDelayMs(attempts: number): number {
  const n = Math.min(Math.max(attempts, 0), 10);
  return Math.min(CAP_MS, BASE_MS * 2 ** n);
}
