import {FluxFramework} from '@nlabs/arkhamjs';
import {afterEach, beforeEach, describe, expect, it, vi} from '@nlabs/lex/test-vitest';

import {app, posts, users} from '../../stores/index.js';
import * as actions from '../index.js';

import type {WebSessionIdentity} from '../../session/webSessionPolicy.js';
import type {WebSessionActions} from '../../utils/webSessionRuntime.js';

// Flat identity reproduced by the isolated immutable Reaktor1.20.0 wire fixture.
const identity: WebSessionIdentity = {
  idleExpiresAt: 3_601_000, observedAt: 1000, sid: 'bc80d796-d5f0-4d3c-9e0f-0e59df6fcc2c', userId: 'owner', username: 'alias'
};
const options = {
  endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
  scope: {appId: 'vault', environment: 'test', ownerUserId: 'owner'}
};
type Controller = WebSessionActions;
const factory = (flux: FluxFramework, overrides: Partial<typeof options> & {
  onBeforeSessionClear?: (reason: string, previous: WebSessionIdentity, scope: typeof options.scope) => void;
} = {}): Controller => (actions as unknown as {
  createWebSessionActions: (flux: FluxFramework, options: unknown) => Controller;
}).createWebSessionActions(flux, {...options, ...overrides});
const controllers: Controller[] = [];
const response = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  headers: {'Content-Type': 'application/json'}, status
});
const setup = async () => {
  const flux = new FluxFramework();
  await flux.init({stores: [app, posts, users]});
  const controller = factory(flux);
  controllers.push(controller);
  return {controller, flux};
};
let calls: Array<{body: unknown; method: string; path: string; request: RequestInit}>;
let handler: (path: string, request: RequestInit) => Response | Promise<Response>;

beforeEach(() => {
  localStorage.clear();
  calls = [];
  handler = (path) => response(path.endsWith('signout') ? {authenticated: false} : identity);
  vi.stubGlobal('fetch', vi.fn(async (url: string, request: RequestInit) => {
    calls.push({body: request.body ? JSON.parse(String(request.body)) : undefined,
      method: String(request.method), path: url, request});
    return handler(url, request);
  }));
});

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.dispose());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('cookie session lifecycle', () => {
  it.each([
    {email: 'Owner@example.test', password: 'private-password'},
    {password: 'private-password', username: 'admin'},
    {password: 'private-password', username: 'Owner@example.test'}
  ])('serializes only the supplied credential identifier and never stores credentials: %j', async (credentials) => {
    const {controller, flux} = await setup();

    await expect(controller.signIn(credentials)).resolves.toEqual(identity);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual(credentials);
    expect(Object.keys(calls[0]?.body as object).sort()).toEqual(Object.keys(credentials).sort());
    expect(JSON.stringify(flux.getState())).not.toMatch(/private-password|Owner@example|admin/);
    expect(JSON.stringify(localStorage)).not.toMatch(/private-password|Owner@example|admin/);
  });

  it.each([
    null, undefined, [], {}, {password: 'p'}, {email: 'e', password: 'p', username: 'u'},
    {email: 'e', password: 'p', username: undefined}, {email: undefined, password: 'p', username: 'u'},
    {email: ' ', password: 'p'}, {password: 'p', username: ''}, {password: 'p', username: 42},
    {email: 'e', password: ''}, {password: undefined, username: 'u'}
  ])('rejects invalid or ambiguous credentials before session clear or a request: %j', async (credentials) => {
    const {controller, flux} = await setup();
    await controller.restore();
    const before = structuredClone(flux.getState());
    calls = [];

    await expect(controller.signIn(credentials as Parameters<Controller['signIn']>[0])).rejects.toThrow('web_session_credentials');

    expect(calls).toEqual([]);
    expect(flux.getState()).toEqual(before);
    expect(await controller.ensureSession()).toEqual(identity);
  });

  it('captures exclusive credentials before waiting behind an active cookie mutation', async () => {
    const {controller} = await setup();
    await controller.restore();
    let finish: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('activity') ? new Promise((resolve) => {
      finish = resolve;
    }) : response(identity));
    const activity = controller.recordActivity().catch((error: Error) => error.message);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const credentials = {password: 'original-password', username: 'original-user'};
    const signin = controller.signIn(credentials);
    credentials.username = 'changed-user';
    credentials.password = 'changed-password';
    finish?.(response(identity));
    await activity;
    await signin;

    expect(calls.filter(({path}) => path.endsWith('signin')).map(({body}) => body))
      .toEqual([{password: 'original-password', username: 'original-user'}]);
  });

  it('native-fetch-semantic timeout settles cancellation before a newer cookie writer; no replay', async () => {
    vi.useFakeTimers();
    const {controller} = await setup();
    await controller.restore();
    let finish: ((value: Response) => void) | undefined;
    let rawSettled = false;
    handler = (path, request) => (path.endsWith('activity') ? new Promise((resolve, reject) => {
      finish = resolve;
      request.signal?.addEventListener('abort', () => {
        rawSettled = true;
        reject(request.signal?.reason);
      }, {once: true});
    }) : (() => {
      expect(rawSettled).toBe(true);

      return response(identity);
    })());
    const activity = controller.recordActivity().then(() => 'success', (error: Error) => error.message);
    await vi.advanceTimersByTimeAsync(0);

    expect(finish).toBeTypeOf('function');

    await vi.advanceTimersByTimeAsync(30_000);

    expect(await activity).toBe('invalid_session');
    expect(rawSettled).toBe(true);
    expect(calls.at(-1)?.request.signal?.aborted).toBe(true);

    await controller.signIn({email: 'e', password: 'p'});
    finish?.(response(identity));
    await vi.advanceTimersByTimeAsync(0);

    expect(calls.map(({path}) => path)).toEqual(['/auth/session', '/auth/activity', '/auth/signin']);
  });

  it.each([false, true])('superseded queued credentials never dispatch after the newest sign-in (rebind %s)', async (rebind) => {
    const {controller, flux} = await setup();
    await controller.restore();
    let finish: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('activity') ? new Promise((resolve) => {
      finish = resolve;
    }) : response(identity));
    const activity = controller.recordActivity().catch((error: Error) => error.message);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const first = controller.signIn({email: 'old', password: 'old'}).catch((error: Error) => error.message);
    let current = controller;
    if(rebind) {
      controller.dispose();
      current = factory(flux);
      controllers.push(current);
    }
    const latest = current.signIn({email: 'new', password: 'new'});
    finish?.(response(identity));

    expect(await activity).toBe(rebind ? 'web_session_disposed' : 'web_session_stale');
    expect(await first).toBe(rebind ? 'web_session_disposed' : 'web_session_stale');

    await latest;

    expect(calls.filter(({path}) => path.endsWith('signin')).map(({body}) => body)).toEqual([{email: 'new', password: 'new'}]);
  });

  it('genuine dispose and same-scope rebind retain pending cookie ordering', async () => {
    const {controller, flux} = await setup();
    await controller.restore();
    let finish: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('activity') ? new Promise((resolve) => {
      finish = resolve;
    }) : response(identity));
    const activity = controller.recordActivity();
    const disposed = expect(activity).rejects.toThrow('disposed');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    controller.dispose();
    const rebound = factory(flux);
    controllers.push(rebound);
    const signin = rebound.signIn({email: 'e', password: 'p'});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.map(({path}) => path)).toEqual(['/auth/session', '/auth/activity']);

    finish?.(response(identity));
    await disposed;
    await signin;

    expect(calls.map(({path}) => path)).toEqual(['/auth/session', '/auth/activity', '/auth/signin']);
    expect((await rebound.ensureSession()).sid).toBe(identity.sid);
  });

  it('delayed accepted activity does not invalidate newer same-session verification', async () => {
    vi.useFakeTimers();
    const {controller, flux} = await setup();
    await controller.restore();
    await flux.setState('post.viewed.private', {postId: 'private', title: 'unsaved'});
    const ended = vi.fn();
    flux.on('WEB_SESSION_SIGNED_OUT', ended);
    let finish: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('activity') ? new Promise((resolve) => {
      finish = resolve;
    }) : response({...identity, idleExpiresAt: 3_602_000, observedAt: 3000}));
    const activity = controller.recordActivity();
    await vi.advanceTimersByTimeAsync(0);
    await controller.restore();
    finish?.(response({...identity, idleExpiresAt: 3_602_000, observedAt: 2000}));
    const accepted = await activity;

    expect(accepted.observedAt).toBe(2000);
    expect((await controller.ensureSession()).observedAt).toBe(3000);
    expect(flux.getState('webSession.status')).toBe('authenticated');
    expect(flux.getState('post.viewed.private.title')).toBe('unsaved');
    expect(ended).not.toHaveBeenCalled();

    handler = () => response({error: 'unauthorized'}, 401);
    await vi.advanceTimersByTimeAsync(3_599_000);

    expect(flux.getState('webSession.status')).toBe('anonymous');
  });

  it('offline session verification fails closed without dispatch or replay', async () => {
    const {controller, flux} = await setup();
    await flux.setState('app.networkType', 'none');

    await expect(controller.restore()).rejects.toThrow('unavailable');
    expect(calls).toEqual([]);
  });

  it('new generation restore does not join a superseded restore flight', async () => {
    const {controller} = await setup();
    let finish: ((value: Response) => void) | undefined;
    handler = () => new Promise((resolve) => {
      finish = resolve;
    });
    const first = controller.restore();
    const denied = expect(first).rejects.toThrow('stale');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    handler = () => response(identity);
    await controller.signIn({email: 'e', password: 'p'});
    const restored = controller.restore();

    expect(restored).not.toBe(first);
    expect(await restored).toEqual(identity);

    finish?.(response(identity));
    await denied;
  });

  it('replacement signin waits for an in-flight cookie-writing touch', async () => {
    const {controller} = await setup();
    await controller.restore();
    let finish: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('activity') ? new Promise((resolve) => {
      finish = resolve;
    }) : response(identity));
    const activity = controller.recordActivity();
    const denied = expect(activity).rejects.toThrow('stale');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const signin = controller.signIn({email: 'e', password: 'p'});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.map(({path}) => path)).toEqual(['/auth/session', '/auth/activity']);

    finish?.(response(identity));
    await denied;
    await signin;

    expect(calls.at(-1)?.path).toBe('/auth/signin');
  });

  it('conflicting binding is rejected; identical binding reuses controller', async () => {
    const {controller, flux} = await setup();

    expect(factory(flux)).toBe(controller);
    expect(() => factory(flux, {scope: {...options.scope, ownerUserId: 'other'}})).toThrow('configuration');
  });

  it('restore is single-flight while boot is pending', async () => {
    const {controller} = await setup();
    const first = controller.restore();
    const second = controller.restore();

    expect(first).toBe(second);
    expect(await first).toEqual(identity);
    expect(calls).toHaveLength(1);
  });

  it('foreground revalidates read-only before private work', async () => {
    const {controller} = await setup();
    await controller.restore();
    let finish: ((value: Response) => void) | undefined;
    handler = () => new Promise((resolve) => {
      finish = resolve;
    });
    window.dispatchEvent(new Event('focus'));
    const pending = controller.ensureSession();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    finish?.(response(identity));

    expect(await pending).toEqual(identity);

    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
    finish?.(response(identity));

    expect(calls.every(({method}) => method === 'GET')).toBe(true);
  });

  it('server denial confirms exact expiry and preserves prior account once', async () => {
    vi.useFakeTimers();
    const flux = new FluxFramework();
    await flux.init({stores: [app, posts, users]});
    const callback = vi.fn();
    const controller = factory(flux, {onBeforeSessionClear: callback});
    controllers.push(controller);
    handler = () => response({...identity, idleExpiresAt: 2000});
    await controller.restore();
    handler = () => response({error: 'unauthorized'}, 401);
    await vi.advanceTimersByTimeAsync(1000);

    expect(callback.mock.calls[0]?.[0]).toBe('expired');
    expect(callback).toHaveBeenCalledOnce();
    expect(flux.getState('webSession.status')).toBe('anonymous');
    await expect(controller.ensureSession()).rejects.toThrow();
  });

  it('malformed restore clears authenticated identity', async () => {
    const {controller, flux} = await setup();
    await controller.restore();
    handler = () => response({session: identity});

    expect(await controller.restore()).toBeUndefined();
    expect(flux.getState('webSession.status')).toBe('anonymous');
  });

  it('older read cannot undo a newer accepted touch', async () => {
    const {controller} = await setup();
    await controller.restore();
    let finish: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('session') ? new Promise((resolve) => {
      finish = resolve;
    })
      : response({...identity, idleExpiresAt: 3602000, observedAt: 2000}));
    const restoring = controller.restore();
    const rejected = expect(restoring).rejects.toThrow('stale');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await controller.recordActivity();
    finish?.(response(identity));
    await rejected;

    expect((await controller.ensureSession()).observedAt).toBe(2000);
  });

  it.each([401, 503])('activity failure %s never extends deadline', async (status) => {
    const {controller, flux} = await setup();
    await controller.restore();
    handler = () => response({error: status === 401 ? 'unauthorized' : 'unavailable'}, status);

    await expect(controller.recordActivity()).rejects.toThrow();
    expect(flux.getState('webSession.status')).toBe(status === 401 ? 'anonymous' : 'authenticated');
    expect(flux.getState('webSession.identity.idleExpiresAt')).toBe(status === 401 ? undefined : 3601000);
  });

  it('callback failure on rejected restore remains sanitized after invalidation', async () => {
    const flux = new FluxFramework();
    await flux.init({stores: [app, posts, users]});
    const controller = factory(flux, {onBeforeSessionClear: () => {
      throw new Error('private draft');
    }});
    controllers.push(controller);
    await controller.restore();
    handler = () => response({error: 'unauthorized'}, 401);

    await expect(controller.restore()).rejects.toThrow('preservation_failed');
    expect(flux.getState('webSession.status')).toBe('anonymous');
  });

  it('replacement preserves the verified scope before clearing; failed preservation blocks signin', async () => {
    const flux = new FluxFramework();
    await flux.init({stores: [app, posts, users]});
    const preserved: unknown[] = [];
    const controller = factory(flux, {onBeforeSessionClear: (reason, prior, scope) => {
      preserved.push({prior, reason, scope});
      throw new Error('private draft');
    }});
    controllers.push(controller);
    await controller.restore();

    await expect(controller.signIn({email: 'e', password: 'p'})).rejects.toThrow('preservation_failed');
    expect(preserved).toEqual([{prior: identity, reason: 'replaced', scope: options.scope}]);
    expect(calls.map(({path}) => path)).toEqual(['/auth/session']);
  });

  it('dispose fences an already pending restore and never logs out remotely', async () => {
    const {controller} = await setup();
    let finish: ((value: Response) => void) | undefined;
    handler = () => new Promise((resolve) => {
      finish = resolve;
    });
    const pending = controller.restore();
    const rejected = expect(pending).rejects.toThrow('disposed');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    controller.dispose();
    finish?.(response(identity));
    await rejected;

    expect(calls.map(({path}) => path)).toEqual(['/auth/session']);
  });

  it('logout marker wins a boot read still initializing', async () => {
    const {controller} = await setup();
    const restore = controller.restore();
    const rejected = expect(restore).rejects.toThrow('stale');
    await controller.signOut();
    await rejected;
    controller.dispose();
    const next = await setup();

    expect(await next.controller.restore()).toBeUndefined();
  });

  it('deadline performs one read-only verification; unavailable blocks without confirmed logout', async () => {
    vi.useFakeTimers();
    const {controller, flux} = await setup();
    handler = () => response({...identity, idleExpiresAt: 2000});
    await controller.restore();
    const ended = vi.fn();
    flux.on('WEB_SESSION_SIGNED_OUT', ended);
    handler = () => response({error: 'unavailable'}, 503);
    await vi.advanceTimersByTimeAsync(1000);

    expect(flux.getState('webSession.status')).toBe('blocked');
    await expect(controller.ensureSession()).rejects.toThrow();
    await expect(controller.ensureSession()).rejects.toThrow();
    expect(calls.map((call) => [call.method, call.path])).toEqual([['GET', '/auth/session'], ['GET', '/auth/session']]);
    expect(ended).not.toHaveBeenCalled();
  });

  it('state precedes listeners', async () => {
    const {controller, flux} = await setup();
    let seen: unknown;
    flux.on('WEB_SESSION_AUTHENTICATED', () => {
      seen = flux.getState('webSession.identity');
    });
    await controller.restore();

    expect(seen).toEqual(identity);
    expect(flux.getState('user.session.token')).toBeUndefined();
  });

  it('restore30min after login succeeds without JWT; restore polling never touches', async () => {
    const {controller} = await setup();
    handler = () => response({...identity, observedAt: 1_801_000});

    expect((await controller.restore())?.sid).toBe(identity.sid);

    await controller.restore();

    expect(calls.map((call) => [call.method, call.path])).toEqual([['GET', '/auth/session'], ['GET', '/auth/session']]);
  });

  it('same-origin credentials and CSRF only; no plaintext credentials/drafts in state or logs', async () => {
    const {controller, flux} = await setup();
    await controller.signIn({email: 'owner@example.test', password: 'private-password'});

    expect(calls[0]?.body).toEqual({email: 'owner@example.test', password: 'private-password'});
    expect(calls[0]?.request.credentials).toBe('same-origin');
    expect(Object.fromEntries(new Headers(calls[0]?.request.headers))).toEqual({
      accept: 'application/json', 'content-type': 'application/json', 'x-reaktor-csrf': '1'
    });
    expect(JSON.stringify(flux.getState())).not.toMatch(/private-password|owner@example|token|draft/);
    expect(JSON.stringify(localStorage)).not.toMatch(/private-password|owner@example|token|draft/);
  });

  it('active input beyond60min remains live', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const {controller} = await setup();
    await controller.restore();
    vi.spyOn(performance, 'now').mockReturnValue(3_000_000);
    handler = () => response({...identity, idleExpiresAt: 6_601_000, observedAt: 3_001_000});
    await controller.recordActivity();
    vi.spyOn(performance, 'now').mockReturnValue(4_000_000);

    expect((await controller.ensureSession()).idleExpiresAt).toBe(6_601_000);
    expect(calls.map((call) => call.path)).toEqual(['/auth/session', '/auth/activity']);
  });

  it('activity during pending touch is not lost', async () => {
    const {controller} = await setup();
    await controller.restore();
    let resolveTouch: ((value: Response) => void) | undefined;
    handler = () => new Promise((resolve) => {
      resolveTouch = resolve;
    });
    const first = controller.recordActivity();
    await vi.waitFor(() => expect(resolveTouch).toBeTypeOf('function'));
    const second = controller.recordActivity();
    handler = () => response({...identity, idleExpiresAt: 3_603_000, observedAt: 3000});
    resolveTouch?.(response({...identity, idleExpiresAt: 3_602_000, observedAt: 2000}));

    expect((await first).observedAt).toBe(3000);
    expect((await second).observedAt).toBe(3000);
    expect(calls.filter((call) => call.path.endsWith('activity'))).toHaveLength(2);
  });

  it('restore/activity flights are purpose scoped', async () => {
    const {controller} = await setup();
    await controller.restore();
    let complete: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('activity') ? new Promise((resolve) => {
      complete = resolve;
    }) : response(identity));
    const activity = controller.recordActivity();
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'));

    expect(await controller.restore()).toEqual(identity);

    complete?.(response({...identity, idleExpiresAt: 3_602_000, observedAt: 2000}));
    await activity;

    expect(calls.map((call) => call.path)).toEqual(['/auth/session', '/auth/activity', '/auth/session']);
  });

  it.each(['restore', 'recordActivity', 'signIn'] as const)('logout wins late %s', async (method) => {
    const {controller, flux} = await setup();
    await controller.restore();
    let complete: ((value: Response) => void) | undefined;
    handler = (path) => (path.endsWith('signout') ? response({authenticated: false}) : new Promise((resolve) => {
      complete = resolve;
    }));
    const pending = method === 'signIn' ? controller.signIn({email: 'e', password: 'p'}) : controller[method]();
    const denied = expect(pending).rejects.toThrow('stale');
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
    const logout = controller.signOut();
    complete?.(response(identity));
    await denied;
    await logout;

    expect(flux.getState('webSession.status')).toBe('anonymous');
    await expect(controller.ensureSession()).rejects.toThrow();
  });

  it('unknown logout suppression survives reload; new explicit same-owner signin clears suppression only after server success', async () => {
    const {controller} = await setup();
    await controller.restore();
    handler = () => response({error: 'unavailable'}, 503);

    expect(await controller.signOut()).toEqual({remote: 'unknown'});

    controller.dispose();
    const reloaded = await setup();
    calls = [];

    expect(await reloaded.controller.restore()).toBeUndefined();
    expect(calls).toHaveLength(0);
    await expect(reloaded.controller.signIn({email: 'e', password: 'p'})).rejects.toThrow();
    expect(await reloaded.controller.restore()).toBeUndefined();

    handler = () => response(identity);
    await reloaded.controller.signIn({email: 'e', password: 'p'});

    expect((await reloaded.controller.ensureSession()).sid).toBe(identity.sid);
  });

  it('failed marker write never claims durable suppression', async () => {
    const {controller, flux} = await setup();
    await controller.restore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(controller.signOut()).rejects.toThrow('marker_persistence');
    expect(flux.getState('webSession.status')).toBe('anonymous');
    await expect(controller.ensureSession()).rejects.toThrow();
    expect(calls.at(-1)?.path).toBe('/auth/signout');
  });

  it('preservation callback precedes clear and cannot prevent invalidation', async () => {
    const flux = new FluxFramework();
    await flux.init({stores: [app, posts, users]});
    const callback = vi.fn(() => {
      expect(flux.getState('post.viewed.private.title')).toBe('unsaved');

      throw new Error('raw private draft');
    });
    const controller = factory(flux, {onBeforeSessionClear: callback});
    controllers.push(controller);
    await controller.restore();
    await flux.setState('post.viewed.private', {title: 'unsaved'});

    await expect(controller.signOut()).rejects.toThrow('preservation_failed');
    expect(flux.getState('post.viewed')).toEqual({});
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]).toEqual(['signout', identity, options.scope]);
  });
});
