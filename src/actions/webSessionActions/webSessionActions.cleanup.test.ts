import {FluxFramework} from '@nlabs/arkhamjs';
import {afterEach, beforeEach, describe, expect, it} from '@nlabs/lex/test-vitest';
import * as transport from '@nlabs/rip-hunter/http';

import {app, posts, users} from '../../stores/index.js';
import {createWebSessionActions} from './webSessionActions.js';

import type {WebSessionActions} from '../../utils/webSessionRuntime.js';

const options = {
  endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
  scope: {appId: 'cleanup', environment: 'test', ownerUserId: 'owner'}
};
const credentials = {password: 'private', username: 'owner'};
const controllers: WebSessionActions[] = [];
const setup = async () => {
  const flux = new FluxFramework();
  await flux.init({stores: [app, posts, users]});
  const controller = createWebSessionActions(flux, options);
  controllers.push(controller);
  return {controller, flux};
};
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((fulfill, refuse) => {
    resolve = fulfill;
    reject = refuse;
  });
  return {promise, reject, resolve};
};
const captured = vi.hoisted(() => ({error: undefined as unknown}));
vi.mock('@nlabs/rip-hunter/http', async (original) => {
  const actual = await original<typeof import('@nlabs/rip-hunter/http')>();
  return {...actual, httpRequest: async (...args: Parameters<typeof actual.httpRequest>) => {
    try {
      return await actual.httpRequest(...args);
    } catch(error) {
      captured.error = error;
      throw error;
    }
  }};
});
let request: RequestInit | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  captured.error = undefined;
  request = undefined;
  vi.stubGlobal('fetch', vi.fn(() => {
    throw new Error('Unexpected request');
  }));
});

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.dispose());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const rejectedResponse = (status = 401) => {
  const response = new Response('private response', {status});
  const cancel = vi.spyOn(response.body!, 'cancel');
  vi.mocked(fetch).mockImplementation(async (_url, init) => {
    request = init;
    return response;
  });
  return {cancel, response};
};

describe('session rejected response ownership', () => {
  it('cancels the actual rejected native body without decoding private bytes', async () => {
    const {controller} = await setup();
    const {cancel, response} = rejectedResponse();
    const decode = vi.spyOn(response, 'json');

    await expect(controller.restore()).resolves.toBeUndefined();

    expect(response.bodyUsed).toBe(true);

    expect(response.body?.locked).toBe(false);

    expect(cancel).toHaveBeenCalledExactlyOnceWith();

    expect(decode).not.toHaveBeenCalled();

    expect(fetch).toHaveBeenCalledOnce();
  });

  it('awaits cancellation before publishing anonymous restoration', async () => {
    const {controller, flux} = await setup();
    const cleanup = deferred();
    const signedOut = vi.fn();
    flux.on('WEB_SESSION_SIGNED_OUT', signedOut);
    const {cancel} = rejectedResponse();
    cancel.mockReturnValue(cleanup.promise);
    let settled = false;
    const restore = controller.restore().finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(cancel).toHaveBeenCalledExactlyOnceWith();

    expect(settled).toBe(false);

    expect(signedOut).not.toHaveBeenCalled();

    cleanup.resolve();

    await expect(restore).resolves.toBeUndefined();

    expect(flux.getState('webSession.status')).toBe('anonymous');

    expect(signedOut).toHaveBeenCalledOnce();

    expect(fetch).toHaveBeenCalledOnce();

    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['reject', 'throw'] as const)('retains the exact HTTP error when cancellation fails by %s', async (failure) => {
    const {controller} = await setup();
    const {cancel} = rejectedResponse(503);
    const privateError = new Error('private cleanup failure');
    cancel.mockImplementation(() => {
      if(failure === 'throw') {
        throw privateError;
      }
      return Promise.reject(privateError);
    });
    const error = await controller.signIn(credentials).catch((value: unknown) => value);

    expect(error).toEqual({status: 503});

    expect(error).toBe(captured.error);

    expect(error).not.toBe(privateError);

    expect(cancel).toHaveBeenCalledExactlyOnceWith();

    expect(fetch).toHaveBeenCalledOnce();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a denied restore anonymous even when cancellation rejects', async () => {
    const {controller, flux} = await setup();
    const {cancel} = rejectedResponse();
    cancel.mockRejectedValue(new Error('private cleanup failure'));

    await expect(controller.restore()).resolves.toBeUndefined();

    expect(flux.getState('webSession.status')).toBe('anonymous');

    expect(cancel).toHaveBeenCalledOnce();

    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each(['resolve', 'reject'] as const)('bounds held cleanup by the original deadline and preserves its exact reason after late %s', async (completion) => {
    const {controller} = await setup();
    const cleanup = deferred();
    const response = new Response('private response', {status: 503});
    const cancel = vi.spyOn(response.body!, 'cancel').mockReturnValue(cleanup.promise);
    let deliver!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      request = init;
      return new Promise<Response>((resolve) => {
        deliver = resolve;
      });
    });
    let settled = false;
    const signin = controller.signIn(credentials).catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledOnce();

    expect(deliver).toBeTypeOf('function');

    await vi.advanceTimersByTimeAsync(20_000);
    deliver(response);
    await vi.advanceTimersByTimeAsync(0);

    expect(cancel).toHaveBeenCalledExactlyOnceWith();

    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(9_999);

    expect(settled).toBe(false);

    expect(request?.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const error = await signin;

    expect(error).toBeInstanceOf(transport.HttpRequestError);

    expect(error).toMatchObject({kind: 'timeout'});

    expect(error).toBe(request?.signal?.reason);

    expect(error).toBe(captured.error);

    expect(request?.signal?.aborted).toBe(true);

    expect(vi.getTimerCount()).toBe(0);

    if(completion === 'resolve') {
      cleanup.resolve();
    } else {
      cleanup.reject(new Error('private late cleanup failure'));
    }
    await vi.advanceTimersByTimeAsync(60_000);

    expect(await signin).toBe(error);

    expect(cancel).toHaveBeenCalledOnce();

    expect(fetch).toHaveBeenCalledOnce();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves an HTTP error for a response without a body', async () => {
    const {controller} = await setup();
    vi.mocked(fetch).mockResolvedValue(new Response(null, {status: 401}));

    const error = await controller.signIn(credentials).catch((value: unknown) => value);

    expect(error).toEqual({status: 401});

    expect(error).toBe(captured.error);

    expect(fetch).toHaveBeenCalledOnce();

    expect(vi.getTimerCount()).toBe(0);
  });
});
