import {describe, expect, it, vi} from 'vitest';

import {
  clearPersistedSession,
  hydrateSessionFromStorage,
  isLoggedIn,
  readStoredSession
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
  it('reads the normalized session from flux state', async () => {
    const flux = createMockFlux();
    flux.state['user.session'] = {token, userId: 'user-2'};

    const session = await readStoredSession(flux as any);

    expect(session).toEqual(expect.objectContaining({token, userId: 'user-2'}));
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
});
