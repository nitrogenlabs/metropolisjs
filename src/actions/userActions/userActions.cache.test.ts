import {beforeEach, describe, expect, it, vi} from 'vitest';

const appMutationMock = vi.fn();
const appQueryMock = vi.fn();
const publicMutationMock = vi.fn();
const refreshSessionMock = vi.fn();
const clearPersistedSessionMock = vi.fn();
const hydrateSessionFromStorageMock = vi.fn();
const storeSessionMock = vi.fn(async (_flux, session = {}) => session);

vi.mock('../../utils/api.js', () => ({
  appMutation: appMutationMock,
  appQuery: appQueryMock,
  publicMutation: publicMutationMock,
  refreshSession: refreshSessionMock
}));

vi.mock('../../utils/session.js', () => ({
  clearPersistedSession: clearPersistedSessionMock,
  hydrateSessionFromStorage: hydrateSessionFromStorageMock,
  isLoggedIn: vi.fn(() => false),
  normalizeSession: vi.fn((session = {}) => session),
  storeSession: storeSessionMock
}));

vi.mock('../personaActions/personaActions.js', () => ({
  syncPersonaTagsToSession: vi.fn(async () => undefined)
}));

const {createUserActions} = await import('./userActions.js');

type StateValue = Record<string, unknown>;

const setStateAtPath = (state: StateValue, path: string, value: unknown) => {
  const parts = path.split('.');
  let current: StateValue = state;

  for(let index = 0; index < parts.length - 1; index++) {
    const key = parts[index];
    const nextValue = current[key];

    if(!nextValue || typeof nextValue !== 'object') {
      current[key] = {};
    }

    current = current[key] as StateValue;
  }

  current[parts[parts.length - 1]] = value;
};

const getStateAtPath = (state: StateValue, path: string) =>
  path.split('.').reduce<unknown>((result, key) => {
    if(result && typeof result === 'object') {
      return (result as StateValue)[key];
    }

    return undefined;
  }, state);

const createMockFlux = () => {
  const state: StateValue = {
    app: {
      config: {
        app: {
          api: {
            public: 'http://localhost:3000/public',
            url: 'http://localhost:3000/app'
          }
        },
        environment: 'test',
        isAuth: () => true
      }
    },
    user: {
      session: {}
    }
  };

  return {
    dispatch: vi.fn(async (payload) => payload),
    getState: vi.fn((key?: string | string[], fallback?: unknown) => {
      if(!key) {
        return state;
      }

      if(Array.isArray(key)) {
        const result = key.reduce<unknown>((current, part) => {
          if(current && typeof current === 'object') {
            return (current as StateValue)[part];
          }

          return undefined;
        }, state);

        return result === undefined ? fallback : result;
      }

      const result = getStateAtPath(state, key);
      return result === undefined ? fallback : result;
    }),
    setState: vi.fn(async (path: string, value: unknown) => {
      setStateAtPath(state, path, value);
      return value;
    }),
    state
  };
};

describe('createUserActions request cache', () => {
  beforeEach(() => {
    vi.useRealTimers();
    appMutationMock.mockReset();
    appQueryMock.mockReset();
    publicMutationMock.mockReset();
    refreshSessionMock.mockReset();
    clearPersistedSessionMock.mockReset();
    hydrateSessionFromStorageMock.mockReset();
    storeSessionMock.mockReset();
    hydrateSessionFromStorageMock.mockResolvedValue({});
  });

  it('reuses cached itemById results when the payload matches and cache is fresh', async () => {
    const flux = createMockFlux();
    const userActions = createUserActions(flux as any);
    const user = {userId: 'user-1', username: 'alpha'};

    appQueryMock.mockResolvedValue(user);

    const firstResult = await userActions.itemById('user-1', ['email'], {cacheTimeout: 5});
    const secondResult = await userActions.itemById('user-1', ['email'], {cacheTimeout: 5});

    expect(firstResult).toEqual(user);
    expect(secondResult).toEqual(user);
    expect(appQueryMock).toHaveBeenCalledTimes(1);
    expect(flux.getState('app.requestCache.user.itemById:user-1')).toMatchObject({
      cacheTimeout: 5,
      data: user
    });
  });

  it('refetches itemById when the requested payload differs', async () => {
    const flux = createMockFlux();
    const userActions = createUserActions(flux as any);

    appQueryMock
      .mockResolvedValueOnce({userId: 'user-1', username: 'alpha'})
      .mockResolvedValueOnce({email: 'alpha@example.com', userId: 'user-1', username: 'alpha'});

    await userActions.itemById('user-1', ['email'], {cacheTimeout: 5});
    await userActions.itemById('user-1', ['firstName'], {cacheTimeout: 5});

    expect(appQueryMock).toHaveBeenCalledTimes(2);
  });

  it('refetches itemById after the cache timeout expires', async () => {
    vi.useFakeTimers();

    const flux = createMockFlux();
    const userActions = createUserActions(flux as any);

    appQueryMock
      .mockResolvedValueOnce({userId: 'user-1', username: 'alpha'})
      .mockResolvedValueOnce({userId: 'user-1', username: 'alpha-2'});

    const firstResult = await userActions.itemById('user-1', ['email'], {cacheTimeout: 1});

    vi.advanceTimersByTime(61_000);

    const secondResult = await userActions.itemById('user-1', ['email'], {cacheTimeout: 1});

    expect(firstResult).toEqual({userId: 'user-1', username: 'alpha'});
    expect(secondResult).toEqual({userId: 'user-1', username: 'alpha-2'});
    expect(appQueryMock).toHaveBeenCalledTimes(2);
  });

  it('clears cached user queries after updateUser succeeds', async () => {
    const flux = createMockFlux();
    const userActions = createUserActions(flux as any);

    appQueryMock.mockResolvedValue({userId: 'user-1', username: 'alpha'});
    appMutationMock.mockResolvedValue({userId: 'user-1', username: 'beta'});

    await userActions.itemById('user-1', ['email'], {cacheTimeout: 5});
    await userActions.list(['email'], {cacheTimeout: 5});
    await userActions.search('alpha', ['email'], {cacheTimeout: 5});

    expect(appQueryMock).toHaveBeenCalledTimes(3);

    await userActions.updateUser({userId: 'user-1', username: 'beta'});

    appQueryMock.mockResolvedValue({userId: 'user-1', username: 'beta'});

    await userActions.itemById('user-1', ['email'], {cacheTimeout: 5});
    await userActions.list(['email'], {cacheTimeout: 5});
    await userActions.search('alpha', ['email'], {cacheTimeout: 5});

    expect(appMutationMock).toHaveBeenCalledTimes(1);
    expect(appQueryMock).toHaveBeenCalledTimes(6);
    expect(flux.setState).toHaveBeenCalledWith('app.requestCache.user.itemById:user-1', undefined);
    expect(flux.setState).toHaveBeenCalledWith('app.requestCache.user.list', undefined);
    expect(flux.setState).toHaveBeenCalledWith('app.requestCache.user.search', undefined);
  });
});
