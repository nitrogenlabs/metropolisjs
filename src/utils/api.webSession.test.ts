import {FluxFramework} from '@nlabs/arkhamjs';
import {afterEach, beforeEach, describe, expect, it, vi} from '@nlabs/lex/test-vitest';
import {ApiError} from '@nlabs/rip-hunter';

import {createRestActions, createWebSessionActions} from '../actions/index.js';
import {app, posts, users} from '../stores/index.js';
import {appMutation, appQuery, createMutation, createQuery, publicMutation, publicQuery, refreshSession, restRequest, rumBeaconRequest, rumMutation, rumRequest, uploadImage} from './api.js';

const identity = {idleExpiresAt: 3601000, observedAt: 1000, sid: 's', userId: 'owner', username: 'alias'};
const options = {
  endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
  scope: {appId: 'vault', environment: 'test', ownerUserId: 'owner'}
};
let flux: FluxFramework;
let controller: ReturnType<typeof createWebSessionActions>;
let requests: Array<{body: unknown; path: string; request: RequestInit}>;
let handler: (path: string) => Response | Promise<Response>;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status});

beforeEach(async () => {
  localStorage.clear();
  flux = new FluxFramework();
  await flux.init({stores: [app, posts, users]});
  await flux.setState('app.config', {app: {api: {url: '/graphql'}}});
  controller = createWebSessionActions(flux, options);
  requests = [];
  handler = (path) => {
    if(path.startsWith('/auth')) {
      return response(identity);
    }
    return response(path === '/graphql' ? {data: {posts: {item: {postId: 'one'}}}} : {postId: 'one'});
  };
  vi.stubGlobal('fetch', vi.fn(async (path: string, request: RequestInit) => {
    requests.push({body: typeof request.body === 'string' ? JSON.parse(request.body) : request.body, path, request});
    return handler(path);
  }));
});

afterEach(() => {
  controller.dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cookie request preflight', () => {
  describe.each(['REST', 'GraphQL'] as const)('%s error classification', (transport) => {
    const request = (onSuccess?: () => Promise<null>) => (transport === 'REST'
      ? createRestActions(flux, {authenticate: true}).put('/private', {}, {onSuccess})
      : appMutation(flux, 'save', 'posts', {}, ['postId'], {onSuccess}));

    it.each([400, 403, 405, 409, 413, 422, 429, 500, 503])('retains verified identity and private cache after domain HTTP %i', async (status) => {
      const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
      await controller.restore();
      await flux.setState('post.viewed.private', {postId: 'private'});
      const before = flux.getState('webSession');
      const events: string[] = [];
      for(const type of ['WEB_SESSION_SIGNED_OUT', 'APP_API_NETWORK_SUCCESS', 'APP_API_NETWORK_ERROR', 'REST_REQUEST_SUCCESS', 'REST_REQUEST_ERROR']) {
        flux.on(type, () => {
          events.push(type);
        });
      }
      const body = {error: 'domain_denied'};
      clock.mockReturnValue(1_800_000);
      handler = () => response(body, status);
      const success = vi.fn(async () => null);
      const error = await request(success).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({errors: ['http_error'], responseBody: body, source: {message: `HTTP ${status}`}, status});
      expect(flux.getState('webSession')).toEqual(before);
      expect(flux.getState('post.viewed.private')).toEqual({postId: 'private'});
      expect(success).not.toHaveBeenCalled();
      expect(events).toEqual(transport === 'REST' ? ['REST_REQUEST_ERROR'] : []);

      clock.mockReturnValue(3_599_999);
      handler = () => response(transport === 'REST' ? {postId: 'next'} : {data: {postId: 'next'}});

      expect(await request()).toEqual({postId: 'next'});
      expect(flux.getState('webSession')).toEqual(before);
      expect(requests.map(({path}) => path)).toEqual(['/auth/session', ...Array<string>(2).fill(transport === 'REST' ? '/private' : '/graphql')]);

      clock.mockReturnValue(3_600_000);
      handler = () => response({error: 'unavailable'}, 503);

      await expect(request()).rejects.toThrow();
      expect(flux.getState('webSession.status')).toBe('blocked');
      expect(requests.map(({path}) => path)).toEqual(['/auth/session', ...Array<string>(2).fill(transport === 'REST' ? '/private' : '/graphql'), '/auth/session']);
    });

    it.each([400, 403, 405])('rejects the exact transport error for ordinary HTTP %i', async (status) => {
      await controller.restore();
      const before = flux.getState('webSession');
      const error = new ApiError([{message: 'http_error'}], new Error('domain denied'), {status});
      handler = () => {
        throw error;
      };

      await expect(request()).rejects.toBe(error);
      expect(flux.getState('webSession')).toEqual(before);
    });

    it.each([
      {code: 'http_error', status: 401},
      {code: 'invalid_session', status: undefined},
      {code: 'expired_session', status: undefined}
    ])('preserves the exact $code/$status error while clearing rejected private state', async ({code, status}) => {
      await controller.restore();
      await flux.setState('post.viewed.private', {postId: 'private'});
      const events: string[] = [];
      flux.on('WEB_SESSION_SIGNED_OUT', () => {
        expect(flux.getState('post.viewed')).toEqual({});

        events.push('signedOut');
      });
      const error = new ApiError([{message: code}], new Error('session rejected'), status === undefined ? undefined : {status});
      handler = () => {
        throw error;
      };
      const success = vi.fn(async () => null);

      await expect(request(success)).rejects.toBe(error);
      expect(flux.getState('webSession.status')).toBe('anonymous');
      expect(flux.getState('post.viewed')).toEqual({});
      expect(success).not.toHaveBeenCalled();
      expect(events).toEqual(['signedOut']);
      expect(requests).toHaveLength(2);
    });

    it.each([401, 403])('fences an old HTTP %i denial before replacement account invalidation or ingestion', async (status) => {
      await controller.restore();
      let finish: ((value: Response) => void) | undefined;
      handler = (path) => (path.startsWith('/auth') ? response({...identity, sid: 'replacement'}) : new Promise((resolve) => {
        finish = resolve;
      }));
      const success = vi.fn(async () => null);
      const pending = request(success);
      const rejected = expect(pending).rejects.toThrow('session_changed');
      await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
      await controller.signIn({email: 'e', password: 'p'});
      await flux.setState('post.viewed.private', {postId: 'replacement'});
      const before = flux.getState('webSession');
      const signedOut = vi.fn();
      flux.on('WEB_SESSION_SIGNED_OUT', signedOut);
      finish?.(response({error: 'unauthorized'}, status));
      await rejected;

      expect(flux.getState('webSession')).toEqual(before);
      expect(flux.getState('post.viewed.private')).toEqual({postId: 'replacement'});
      expect(success).not.toHaveBeenCalled();
      expect(signedOut).not.toHaveBeenCalled();
    });
  });

  it('GraphQL denial invalidates and unavailable/offline failures never queue', async () => {
    await controller.restore();
    handler = () => response({error: 'unavailable'}, 503);

    await expect(appQuery(flux, 'item', 'posts', {}, ['postId'])).rejects.toThrow();
    expect(flux.getState('webSession.status')).toBe('authenticated');

    handler = () => response({error: 'unauthorized'}, 401);

    await expect(appQuery(flux, 'item', 'posts', {}, ['postId'])).rejects.toThrow();
    expect(flux.getState('webSession.status')).toBe('anonymous');
  });

  it('preflight cannot attach a pending old request to a replacement signin', async () => {
    let finish: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('session') ? new Promise((resolve) => {
      finish = resolve;
    }) : response(identity));
    const request = restRequest(flux, '/private', 'GET', undefined, {authenticate: true});
    const rejected = expect(request).rejects.toThrow();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await controller.signIn({email: 'e', password: 'p'});
    finish?.(response(identity));
    await rejected;

    expect(requests.map(({path}) => path)).not.toContain('/private');
  });

  it('REST and GraphQL cookie preflight need no token, including first boot', async () => {
    expect(await restRequest(flux, '/private', 'GET', undefined, {authenticate: true})).toEqual({postId: 'one'});
    expect(await appQuery(flux, 'item', 'posts', {}, ['postId'])).toEqual({posts: {item: {postId: 'one'}}});
    expect(flux.getState('user.session.token')).toBeUndefined();
    expect(requests.map((request) => request.path)).toEqual(['/auth/session', '/private', '/graphql']);
    expect(requests.slice(1).every(({request}) => request.credentials === 'same-origin'
      && !new Headers(request.headers).has('Authorization'))).toBe(true);
  });

  it('cookie401 throws not empty success', async () => {
    await controller.restore();
    await flux.setState('post.viewed.private', {postId: 'private'});
    handler = () => response({error: 'unauthorized'}, 401);

    await expect(restRequest(flux, '/private', 'GET', undefined, {authenticate: true})).rejects.toThrow();
    expect(flux.getState('webSession.status')).toBe('anonymous');
    expect(flux.getState('post.viewed')).toEqual({});
    expect(requests).toHaveLength(2);
  });

  it('no old account response ingestion', async () => {
    await controller.restore();
    let complete: ((value: Response) => void) | undefined;
    handler = (path) => (path === '/private' ? new Promise((resolve) => {
      complete = resolve;
    }) : response({authenticated: false}));
    const success = vi.fn();
    const pending = restRequest(flux, '/private', 'GET', undefined, {authenticate: true, onSuccess: success});
    const rejected = expect(pending).rejects.toThrow('session_changed');
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
    await controller.signOut();
    complete?.(response({postId: 'old'}));
    await rejected;

    expect(success).not.toHaveBeenCalled();
  });

  it('same-origin credentials and CSRF only', async () => {
    await controller.restore();
    await restRequest(flux, '/private', 'POST', {title: 'save'}, {
      authenticate: true, cache: true, credentials: 'include', headers: new Headers({Authorization: 'Bearer injected', Origin: 'https://evil.test'}), token: 'injected'
    });
    const outgoing = requests.at(-1)?.request;

    expect(outgoing?.credentials).toBe('same-origin');
    expect(Object.fromEntries(new Headers(outgoing?.headers))).toEqual({
      accept: 'application/json', 'content-type': 'application/json', 'x-reaktor-csrf': '1'
    });
    await expect(restRequest(flux, 'https://evil.test/private', 'GET', undefined, {authenticate: true})).rejects.toThrow('configuration');
  });

  it('offline mutation never queued/replayed', async () => {
    await controller.restore();
    await flux.setState('app.networkType', 'none');
    const queued = vi.fn();
    flux.on('APP_API_NETWORK_ERROR', queued);

    await expect(restRequest(flux, '/private', 'POST', {}, {authenticate: true})).rejects.toThrow('network_unavailable');
    await expect(appQuery(flux, 'item', 'posts', {}, ['postId'])).rejects.toThrow('network_unavailable');
    expect(requests).toHaveLength(1);
    expect(queued).not.toHaveBeenCalled();
  });
});

describe('bearer defaults and request shape compatibility', () => {
  it('missing optional endpoint config retains public defaults and RUM fallback ordering', async () => {
    controller.dispose();
    handler = () => response({data: {ok: true}});
    await flux.setState('user.session', {expires: Date.now() + 3600000, issued: Date.now(), token: 'bearer'});
    await flux.setState('app.config', {});
    await appQuery(flux, 'all', 'posts', {}, []);
    await appMutation(flux, 'save', 'posts', {}, []);
    await publicMutation(flux, 'save', 'posts', {}, []);
    await rumMutation(flux, 'record', 'posts', {}, []);

    expect(requests.map(({path}) => path)).toEqual(['', '', '', '']);
    expect(rumBeaconRequest(flux, {})).toBe(false);
    await expect(rumRequest(flux, {})).rejects.toMatchObject({errors: ['invalid_url']});

    await flux.setState('app.config', {app: {api: {public: '/public', rum: '/rum'}}});
    await rumRequest(flux, {});
    await flux.setState('app.config', {app: {api: {public: '/public'}}});
    await rumMutation(flux, 'record', 'posts', {}, []);

    expect(requests.slice(-2).map(({path}) => path)).toEqual(['/rum', '/public']);
  });

  it.each([
    ['plain failure', 'text/plain', 'plain failure'],
    ['', 'text/plain', 'Bad Request'],
    [{error: ''}, 'application/json', 'Bad Request']
  ])('legacy multipart response error is retained for %j', async (body, contentType, message) => {
    controller.dispose();
    await flux.setState('user.session', {expires: Date.now() + 3600000, issued: Date.now(), token: 'bearer'});
    await flux.setState('app.config', {app: {api: {uploadImage: '/upload'}}});
    handler = () => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      headers: {'Content-Type': contentType}, status: 400, statusText: 'Bad Request'
    });

    await expect(uploadImage(flux, new FormData())).rejects.toMatchObject({errors: ['upload_error'], source: {message}});
  });

  it('legacy offline requests retain their queued response callback contract', async () => {
    controller.dispose();
    await flux.setState('app.networkType', 'none');
    const rest = await restRequest<{retry: {responseMethod: () => void}}>(flux, '/private');

    expect(rest.retry.responseMethod()).toBeUndefined();

    const gql = await publicQuery<{retry: {responseMethod: () => void}}>(flux, 'item', 'posts', {}, []);

    expect(gql.retry.responseMethod()).toBeUndefined();
    expect(requests).toHaveLength(0);
  });

  it('legacy bearer expired credentials remain rejected and cleared', async () => {
    controller.dispose();
    const now = Date.now();
    await flux.setState('user.session', {expires: now - 1, issued: now - 3600000, token: 'old'});

    expect(await restRequest(flux, '/private', 'GET', undefined, {authenticate: true})).toEqual({});

    const token = `${btoa('{}')}.${btoa(JSON.stringify({exp: Math.floor(now / 1000) - 1}))}.sig`;
    await flux.setState('user.session', {expires: now + 100000, issued: now - 3600000, token});

    expect(await appQuery(flux, 'item', 'posts', {}, [])).toEqual({});
    expect(requests).toHaveLength(0);
  });

  it('query/mutation variable lists use literal GraphQL declarations and values', () => {
    const query = createQuery('Find Item', 'posts', {id: {type: 'String!', value: 'one'}}, ['postId']);

    expect(query.query.replace(/\s+/g, ' ')).toBe('query FindItem($id: String!) { posts { findItem(id: $id) {postId} } }');
    expect(query.variables).toEqual({id: 'one'});
    expect(createMutation('save item', 'posts', {id: {type: 'String!', value: 'one'}}).variables).toEqual({id: 'one'});
    expect(createQuery('all', 'posts').variables).toEqual({});
    expect(createMutation('all', 'posts').query).toContain('mutation PostsAll');
  });

  it('public wrappers retain configured URL defaults and GraphQL callbacks', async () => {
    controller.dispose();
    await flux.setState('app.config', {app: {api: {endpoints: {rum: '/events'}, public: '/public', rum: '/rum', url: '/graphql'}}});
    handler = () => response({data: {ok: true}});
    await publicQuery(flux, 'all', 'posts', {}, []);
    await publicMutation(flux, 'save', 'posts', {}, []);
    await rumMutation(flux, 'record', 'posts', {}, []);
    await rumRequest(flux, {events: []});

    expect(requests.map(({path}) => path)).toEqual(['/public', '/public', '/rum', '/events']);

    await flux.setState('user.session', {expires: Date.now() + 3600000, issued: Date.now(), token: 'bearer'});
    await appMutation(flux, 'save', 'posts', {}, []);

    expect(new Headers(requests.at(-1)?.request.headers).get('Authorization')).toBe('Bearer bearer');
    expect(requests.at(-1)?.request.credentials).toBeUndefined();
    expect(await refreshSession(flux, '')).not.toBeUndefined();
  });
});
