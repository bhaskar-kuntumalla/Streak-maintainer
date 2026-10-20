let handler: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function registerSyncHandler(fn: () => void): void {
  handler = fn;
}

/** Debounced request to sync after local changes. */
export function requestSync(delayMs = 1500): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    handler?.();
  }, delayMs);
}
