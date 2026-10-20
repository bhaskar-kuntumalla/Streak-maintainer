import { nextDelayMs } from './backoff';

describe('nextDelayMs', () => {
  it('starts at 2 seconds and doubles', () => {
    expect(nextDelayMs(0)).toBe(2_000);
    expect(nextDelayMs(1)).toBe(4_000);
    expect(nextDelayMs(3)).toBe(16_000);
  });
  it('caps at 5 minutes', () => {
    expect(nextDelayMs(20)).toBe(300_000);
    expect(nextDelayMs(-5)).toBe(2_000);
  });
});
