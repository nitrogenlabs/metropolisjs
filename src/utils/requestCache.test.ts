import {beforeEach, describe, expect, it, vi} from 'vitest';

import {clearCachedRequest, getCachedRequest, setCachedRequest} from './requestCache.js';

const createFlux = () => {
  const state = new Map<string, unknown>();

  return {
    getState: vi.fn((path: string) => state.get(path)),
    setState: vi.fn(async (path: string, value: unknown) => {
      state.set(path, value);
      return value;
    })
  };
};

describe('requestCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  it('stores, reads, and clears scoped cached requests', async () => {
    const flux = createFlux();
    const payload = {b: 2, a: {z: 1}};

    expect(getCachedRequest(flux as any, 'scope', payload, {cacheTimeout: 5})).toBeUndefined();
    await expect(setCachedRequest(flux as any, 'scope', payload, {ok: true}, {cacheTimeout: 5})).resolves.toEqual({ok: true});
    expect(getCachedRequest(flux as any, 'scope', {a: {z: 1}, b: 2}, {cacheTimeout: 5})).toEqual({ok: true});

    await clearCachedRequest(flux as any, 'scope');
    expect(getCachedRequest(flux as any, 'scope', payload, {cacheTimeout: 5})).toBeUndefined();
  });

  it('ignores disabled, expired, and mismatched cache entries', async () => {
    const flux = createFlux();

    await setCachedRequest(flux as any, 'scope', {id: 'one'}, 'cached', {cacheTimeout: 1});
    expect(getCachedRequest(flux as any, 'scope', {id: 'two'}, {cacheTimeout: 1})).toBeUndefined();
    vi.advanceTimersByTime(61 * 1000);
    expect(getCachedRequest(flux as any, 'scope', {id: 'one'}, {cacheTimeout: 1})).toBeUndefined();
    await expect(setCachedRequest({} as any, 'scope', {}, 'raw', {cacheTimeout: 1})).resolves.toBe('raw');
    expect(getCachedRequest(flux as any, 'scope', {}, {cacheTimeout: 0})).toBeUndefined();
  });
});
