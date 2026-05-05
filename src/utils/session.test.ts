import {describe, expect, it, vi} from 'vitest';

import {
  clearPersistedSession,
  getRefreshWindowMinutes,
  hydrateSessionFromStorage,
  isLoggedIn,
  normalizeSession,
  readStoredSession,
  storeSession
} from './session.js';

const tokenPayload = {
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000) - 60
};
const token = `header.${Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')}.signature`;

const createMockFlux = (initialSession: Record<string, unknown> = {}) => {
  const state: Record<string, unknown> = {
    'user.session': initialSession
  };

  return {
    getState: vi.fn((key?: string, fallback?: unknown) => {
      if(!key) {
        return state;
      }

      return key in state ? state[key] : fallback;
    }),
    setState: vi.fn((key: string, value: unknown) => {
      state[key] = value;
      return Promise.resolve(true);
    }),
    state
  };
};

describe('session helpers', () => {
  it('hydrates a valid flux session back into state', async () => {
    const flux = createMockFlux({token, userId: 'user-storage'});

    const session = await hydrateSessionFromStorage(flux as any);

    expect(session).toEqual(expect.objectContaining({token, userId: 'user-storage'}));
    expect(flux.setState).toHaveBeenCalledWith('user.session', expect.objectContaining({token, userId: 'user-storage'}));
    expect(isLoggedIn(flux as any)).toBe(true);
  });

  it('reads the normalized session from flux state', async () => {
    const flux = createMockFlux();
    flux.state['user.session'] = {token, userId: 'user-2'};

    const session = await readStoredSession(flux as any);

    expect(session).toEqual(expect.objectContaining({token, userId: 'user-2'}));
  });

  it('normalizes token wrappers and session timestamps into milliseconds', () => {
    const normalized = normalizeSession({
      expires: tokenPayload.exp,
      idToken: {jwtToken: token},
      issued: tokenPayload.iat,
      userId: 'user-7'
    });

    expect(normalized).toEqual(expect.objectContaining({
      expires: tokenPayload.exp * 1000,
      issued: tokenPayload.iat * 1000,
      token,
      userId: 'user-7'
    }));
    expect(normalized.accessToken).toEqual({jwtToken: token});
    expect(normalized.idToken).toEqual({jwtToken: token});
  });

  it('returns an empty object when there is no session token', () => {
    expect(normalizeSession({userId: 'user-8'})).toEqual({});
  });

  it('hydrates an existing valid flux session and clears an invalid one', async () => {
    const validFlux = createMockFlux({token, userId: 'user-3'});
    const invalidFlux = createMockFlux({userId: 'user-4'});

    const validSession = await hydrateSessionFromStorage(validFlux as any);
    const invalidSession = await hydrateSessionFromStorage(invalidFlux as any);

    expect(validSession).toEqual(expect.objectContaining({token, userId: 'user-3'}));
    expect(invalidSession).toEqual({});
    expect(invalidFlux.setState).toHaveBeenCalledWith('user.session', {});
  });

  it('uses flux session state for login status and clearing', async () => {
    const flux = createMockFlux({token, userId: 'user-5'});

    expect(isLoggedIn(flux as any)).toBe(true);

    await clearPersistedSession(flux as any);

    expect(flux.setState).toHaveBeenCalledWith('user.session', {});
    expect(isLoggedIn(flux as any)).toBe(false);
  });

  it('stores a normalized session in flux state', () => {
    const flux = createMockFlux();

    return storeSession(flux as any, {token, userId: 'user-6'}).then((session) => {
      expect(session).toEqual(expect.objectContaining({token, userId: 'user-6'}));
      expect(flux.setState).toHaveBeenCalledWith('user.session', expect.objectContaining({token, userId: 'user-6'}));
    });
  });

  it('calculates refresh window from refreshAfterRatio when configured', () => {
    expect(getRefreshWindowMinutes(180, {minMinutes: 15, refreshAfterRatio: 2 / 3})).toBe(60);
  });
});
