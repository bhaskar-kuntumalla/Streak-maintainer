import { defaultSettings, formatDate, formatTime, settingsSchema } from './settings';

describe('settings defaults', () => {
  it('fills every field from an empty object', () => {
    const s = settingsSchema.parse({});
    expect(s.weekStartDay).toBe(1);
    expect(s.notifications.checkIn.time).toBe('08:00');
    expect(s.notifications.quietHours).toBeNull();
  });
  it('uses the given timezone', () => {
    expect(defaultSettings('Asia/Kolkata').timezone).toBe('Asia/Kolkata');
  });
  it('rejects malformed times', () => {
    expect(settingsSchema.safeParse({ notifications: { checkIn: { time: '25:00' } } }).success).toBe(false);
  });
});

describe('formatTime', () => {
  it('formats 12 and 24 hour clocks', () => {
    expect(formatTime('08:05', '24h')).toBe('08:05');
    expect(formatTime('08:05', '12h')).toBe('8:05 AM');
    expect(formatTime('00:30', '12h')).toBe('12:30 AM');
    expect(formatTime('12:00', '12h')).toBe('12:00 PM');
    expect(formatTime('21:00', '12h')).toBe('9:00 PM');
  });
});

describe('formatDate', () => {
  it('applies the chosen date order', () => {
    expect(formatDate('2026-10-05', 'DD/MM/YYYY')).toBe('05/10/2026');
    expect(formatDate('2026-10-05', 'MM/DD/YYYY')).toBe('10/05/2026');
    expect(formatDate('2026-10-05', 'YYYY-MM-DD')).toBe('2026-10-05');
  });
});
