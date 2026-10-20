import { isRemoteNewer } from './conflict';

describe('isRemoteNewer', () => {
  it('applies when there is no local row', () => {
    expect(isRemoteNewer('2026-10-01T10:00:00Z', null)).toBe(true);
  });
  it('applies a newer remote row', () => {
    expect(isRemoteNewer('2026-10-01T11:00:00Z', '2026-10-01T10:00:00.000Z')).toBe(true);
  });
  it('keeps a newer local row', () => {
    expect(isRemoteNewer('2026-10-01T09:00:00Z', '2026-10-01T10:00:00.000Z')).toBe(false);
  });
  it('lets the server win ties so devices converge', () => {
    expect(isRemoteNewer('2026-10-01T10:00:00+00:00', '2026-10-01T10:00:00.000Z')).toBe(true);
  });
  it('compares across different timestamp formats', () => {
    expect(isRemoteNewer('2026-10-01T10:00:00.500+00:00', '2026-10-01T10:00:00.100Z')).toBe(true);
  });
});
