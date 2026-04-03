import {beforeEach, describe, expect, it, vi} from 'vitest';

const appMutationMock = vi.fn();
const appQueryMock = vi.fn();
const publicMutationMock = vi.fn();
const refreshSessionMock = vi.fn();
const clearPersistedSessionMock = vi.fn();
const hydrateSessionFromStorageMock = vi.fn();
const normalizeSessionMock = vi.fn((session = {}) => session);
const syncPersonaTagsToSessionMock = vi.fn(async () => undefined);

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
  normalizeSession: normalizeSessionMock
}));

vi.mock('../personaActions/personaActions.js', () => ({
  syncPersonaTagsToSession: syncPersonaTagsToSessionMock
}));

const {createUserActions} = await import('./userActions.js');

type StateValue = Record<string, unknown>;

const setStateAtPath = (state: StateValue, path: string, value: unknown) => {
  const parts = path.split('.');
  let current: StateValue = state;

  for(let index = 0; index < parts.length - 1; index++) {
    const key = parts[index];

    if(!current[key] || typeof current[key] !== 'object') {
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

describe('createUserActions', () => {
  beforeEach(() => {
    appMutationMock.mockReset();
    appQueryMock.mockReset();
    publicMutationMock.mockReset();
    refreshSessionMock.mockReset();
    clearPersistedSessionMock.mockReset();
    hydrateSessionFromStorageMock.mockReset();
    normalizeSessionMock.mockClear();
    syncPersonaTagsToSessionMock.mockClear();
    hydrateSessionFromStorageMock.mockResolvedValue({});
  });

  it('creates the current user action surface', () => {
    const actions = createUserActions(createMockFlux() as any);

    expect(actions.addUser).toBeTypeOf('function');
    expect(actions.confirmCode).toBeTypeOf('function');
    expect(actions.confirmSignUp).toBeTypeOf('function');
    expect(actions.currentAuthenticatedUser).toBeTypeOf('function');
    expect(actions.currentUser).toBeTypeOf('function');
    expect(actions.forgotPassword).toBeTypeOf('function');
    expect(actions.itemById).toBeTypeOf('function');
    expect(actions.list).toBeTypeOf('function');
    expect(actions.listByConnection).toBeTypeOf('function');
    expect(actions.listByLatest).toBeTypeOf('function');
    expect(actions.listByReactions).toBeTypeOf('function');
    expect(actions.listByTags).toBeTypeOf('function');
    expect(actions.refreshSession).toBeTypeOf('function');
    expect(actions.remove).toBeTypeOf('function');
    expect(actions.resetPassword).toBeTypeOf('function');
    expect(actions.search).toBeTypeOf('function');
    expect(actions.session).toBeTypeOf('function');
    expect(actions.signIn).toBeTypeOf('function');
    expect(actions.signOut).toBeTypeOf('function');
    expect(actions.signUp).toBeTypeOf('function');
    expect(actions.updatePassword).toBeTypeOf('function');
    expect(actions.updateUser).toBeTypeOf('function');
    expect(actions.updateUserAdapter).toBeTypeOf('function');
    expect(actions.updateUserAdapterOptions).toBeTypeOf('function');
  });

  it('returns the hydrated session from currentAuthenticatedUser', async () => {
    const flux = createMockFlux();
    const actions = createUserActions(flux as any);
    const session = {token: 'token-1', userId: 'user-1', username: 'alpha'};

    hydrateSessionFromStorageMock.mockResolvedValue(session);

    await expect(actions.currentAuthenticatedUser()).resolves.toEqual(session);
  });

  it('persists and returns the normalized session from signIn', async () => {
    const flux = createMockFlux();
    const actions = createUserActions(flux as any);
    const signInSession = {
      users: {
        signIn: {
          expires: 999,
          issued: 111,
          token: 'token-1',
          userId: 'user-1',
          username: 'alpha'
        }
      }
    };
    const sessionUser = {
      users: {
        getUserBySession: {
          personaId: 'persona-1',
          userAccess: 'member',
          userId: 'user-1',
          username: 'alpha'
        }
      }
    };

    publicMutationMock.mockImplementation(async (_flux, _name, _type, _variables, _props, options) => {
      await options?.onSuccess?.(signInSession);
      return signInSession.users.signIn;
    });
    appQueryMock.mockResolvedValue(sessionUser);

    const result = await actions.signIn({password: 'secret', username: 'alpha'});

    expect(result).toEqual({
      expires: 999,
      issued: 111,
      personaId: 'persona-1',
      token: 'token-1',
      userAccess: 'member',
      userId: 'user-1',
      username: 'alpha'
    });
    expect(publicMutationMock).toHaveBeenCalledWith(
      flux,
      'signIn',
      'users',
      expect.any(Object),
      ['expires', 'issued', 'token', 'userId', 'username'],
      expect.any(Object)
    );
    expect(syncPersonaTagsToSessionMock).toHaveBeenCalledWith(flux, 'persona-1');
    expect(flux.setState).toHaveBeenCalledWith(
      'user.session',
      expect.objectContaining({
        token: 'token-1',
        userId: 'user-1'
      })
    );
  });

  it('clears session state on signOut', async () => {
    const flux = createMockFlux();
    const actions = createUserActions(flux as any);

    await expect(actions.signOut()).resolves.toBe(true);

    expect(clearPersistedSessionMock).toHaveBeenCalledWith(flux);
    expect(flux.setState).toHaveBeenCalledWith('user.session', {});
    expect(flux.dispatch).toHaveBeenCalledWith({
      session: {},
      type: 'USER_SIGN_OUT_SUCCESS'
    });
  });

  it('supports adapter updates', () => {
    const actions = createUserActions(createMockFlux() as any);
    const adapter = vi.fn((input: unknown) => input);

    actions.updateUserAdapter(adapter);
    actions.updateUserAdapterOptions({strict: true});

    expect(actions.updateUserAdapter).toBeTypeOf('function');
    expect(actions.updateUserAdapterOptions).toBeTypeOf('function');
  });
});
