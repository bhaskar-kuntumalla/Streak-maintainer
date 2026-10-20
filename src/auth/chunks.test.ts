import { splitChunks } from './chunks';

describe('splitChunks', () => {
  it('keeps short values whole', () => {
    expect(splitChunks('abc', 10)).toEqual(['abc']);
  });
  it('splits long values and reassembles them exactly', () => {
    const value = 'x'.repeat(4000);
    const parts = splitChunks(value, 1800);
    expect(parts).toHaveLength(3);
    expect(parts.join('')).toBe(value);
  });
  it('returns one empty chunk for an empty string', () => {
    expect(splitChunks('')).toEqual(['']);
  });
});
