import { newRequestId } from './request-id';

describe('newRequestId', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('returns a v4 UUID', () => {
    expect(newRequestId()).toMatch(UUID);
  });

  it('is unique per call', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newRequestId()));
    expect(ids.size).toBe(200);
  });

  it('still works where crypto.randomUUID is unavailable (plain http)', () => {
    const c: any = globalThis.crypto;
    const original = c.randomUUID;
    try {
      Object.defineProperty(c, 'randomUUID', { value: undefined, configurable: true });
      expect(newRequestId()).toMatch(UUID);
    } finally {
      Object.defineProperty(c, 'randomUUID', { value: original, configurable: true });
    }
  });
});
