import {beforeEach, describe, expect, it, vi} from 'vitest';

const graphqlQueryMock = vi.fn();
const postMock = vi.fn();

vi.mock('@nlabs/rip-hunter', () => ({
  ApiError: class ApiError extends Error {
    readonly errors: string[];

    constructor(errors: string[] = [], message = '') {
      super(message);
      this.errors = errors;
      this.name = 'ApiError';
    }
  },
  graphqlQuery: graphqlQueryMock,
  post: postMock
}));

const {
  appMutation,
  appQuery,
  createMutation,
  createQuery,
  publicMutation,
  publicQuery,
  refreshSession,
  uploadImage
} = await import('./api.js');

const createMockFlux = () => ({
  clearAppData: vi.fn(async () => undefined),
  dispatch: vi.fn(async (payload) => payload),
  getState: vi.fn((key: string, fallback?: unknown) => {
    if(key === 'app.config') {
      return {
        app: {
          api: {
            public: 'http://localhost:3000/public',
            uploadImage: 'http://localhost:3000/upload',
            url: 'http://localhost:3000/app'
          }
        },
        environment: 'test',
        isAuth: () => true
      };
    }

    if(key === 'app.networkType') {
      return 'wifi';
    }

    if(key === 'user.session.token') {
      return 'test-token';
    }

    if(key === 'user.session') {
      return {
        expires: Date.now() + (60 * 60 * 1000),
        issued: Date.now(),
        token: 'test-token',
        userId: 'user-1',
        username: 'alpha'
      };
    }

    return fallback;
  }),
  setState: vi.fn(async (_path: string, value: unknown) => value)
});

describe('api utilities', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset();
    postMock.mockReset();
  });

  it('creates queries without variables', () => {
    const result = createQuery('getItems', 'users', {}, ['id', 'name']);

    expect(result.variables).toEqual({});
    expect(result.query).toContain('query getItems');
    expect(result.query).toContain('users {');
    expect(result.query).toContain('getItems');
    expect(result.query).toContain('{id, name}');
  });

  it('creates mutations with variables', () => {
    const result = createMutation('refreshSession', 'users', {
      token: {
        type: 'String!',
        value: 'abc'
      }
    }, ['token']);

    expect(result.query).toContain('mutation UsersRefreshSession');
    expect(result.query).toContain('$token: String!');
    expect(result.variables).toEqual({token: 'abc'});
  });

  it('uses the app URL for authenticated appQuery calls', async () => {
    const flux = createMockFlux();
    graphqlQueryMock.mockResolvedValue({users: {getItem: {userId: 'user-1'}}});

    await appQuery(flux as any, 'getItem', 'users', {}, ['userId']);

    expect(graphqlQueryMock).toHaveBeenCalledWith(
      'http://localhost:3000/app',
      expect.objectContaining({
        query: expect.stringContaining('query getItem')
      }),
      {token: 'test-token'}
    );
  });

  it('uses the public URL for unauthenticated publicMutation calls', async () => {
    const flux = createMockFlux();
    graphqlQueryMock.mockResolvedValue({users: {addUser: {userId: 'user-1'}}});

    await publicMutation(flux as any, 'addUser', 'users', {}, ['userId']);

    expect(graphqlQueryMock).toHaveBeenCalledWith(
      'http://localhost:3000/public',
      expect.objectContaining({
        query: expect.stringContaining('mutation UsersAddUser')
      }),
      {token: ''}
    );
  });

  it('uploads images with the bearer token header', async () => {
    const flux = createMockFlux();
    const image = {base64: 'abc'};
    postMock.mockResolvedValue({imageId: 'image-1'});

    await uploadImage(flux as any, image);

    expect(postMock).toHaveBeenCalledWith(
      'http://localhost:3000/upload',
      image,
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
  });

  it('refreshes the session and stores the merged session', async () => {
    const flux = createMockFlux();
    const refreshPayload = {
      exp: Math.floor(Date.now() / 1000) + 7200,
      iat: Math.floor(Date.now() / 1000)
    };
    const refreshToken = `header.${Buffer.from(JSON.stringify(refreshPayload)).toString('base64url')}.signature`;
    graphqlQueryMock.mockResolvedValue({
      users: {
        refreshSession: {
          expires: refreshPayload.exp,
          issued: refreshPayload.iat,
          token: refreshToken
        }
      }
    });

    const result = await refreshSession(flux as any, 'test-token', 15);

    expect(result).toEqual({
      session: expect.objectContaining({
        expires: refreshPayload.exp * 1000,
        issued: refreshPayload.iat * 1000,
        token: refreshToken,
        userId: 'user-1',
        username: 'alpha'
      }),
      type: 'USER_UPDATE_SESSION_SUCCESS'
    });
    expect(flux.setState).toHaveBeenCalledWith('user.session', expect.objectContaining({
      expires: refreshPayload.exp * 1000,
      issued: refreshPayload.iat * 1000,
      token: refreshToken,
      userId: 'user-1',
      username: 'alpha'
    }));
  });

  it('uses the public URL for publicQuery calls', async () => {
    const flux = createMockFlux();
    graphqlQueryMock.mockResolvedValue({users: {getItem: {userId: 'user-1'}}});

    await publicQuery(flux as any, 'getItem', 'users', {}, ['userId']);

    expect(graphqlQueryMock).toHaveBeenCalledWith(
      'http://localhost:3000/public',
      expect.objectContaining({
        query: expect.stringContaining('query getItem')
      }),
      {token: ''}
    );
  });

  it('uses the app URL for appMutation calls', async () => {
    const flux = createMockFlux();
    graphqlQueryMock.mockResolvedValue({users: {updateUser: {userId: 'user-1'}}});

    await appMutation(flux as any, 'updateUser', 'users', {}, ['userId']);

    expect(graphqlQueryMock).toHaveBeenCalledWith(
      'http://localhost:3000/app',
      expect.objectContaining({
        query: expect.stringContaining('mutation UsersUpdateUser')
      }),
      {token: 'test-token'}
    );
  });

  it('clears auth state and dispatches sign out when graphql returns an expired session error', async () => {
    const flux = createMockFlux();
    graphqlQueryMock.mockRejectedValue({errors: ['expired_session']});

    const result = await appQuery(flux as any, 'getItem', 'users', {}, ['userId']);

    expect(result).toEqual({});
    expect(flux.setState).toHaveBeenCalledWith('user.session', {});
    expect(flux.clearAppData).toHaveBeenCalledTimes(1);
    expect(flux.dispatch).toHaveBeenCalledWith({
      session: {},
      type: 'USER_SIGN_OUT_SUCCESS'
    });
  });
});
