import {afterEach, beforeEach, describe, expect, it, vi} from '@nlabs/lex/test-vitest';

import {assertWebSessionEndpoint, captureWebSessionOptions, createWebSessionMarker, sameWebSessionOptions, webSessionRequestOptions} from './webSessionRuntime.js';

const scope = {appId: 'vault', environment: 'test', ownerUserId: 'owner'};
const options = {
  endpoints: {activity: '/activity', restore: '/session', signIn: '/signin', signOut: '/signout'}, scope
};

beforeEach(() => localStorage.clear());

afterEach(() => vi.restoreAllMocks());

describe('cookie runtime boundaries', () => {
  it('malformed stored marker cannot silently admit restore', async () => {
    await createWebSessionMarker(scope).write(true);
    const key = localStorage.key(0)!;
    const stored = JSON.parse(localStorage.getItem(key)!);
    stored.value = {unexpected: 'malformed'};
    localStorage.setItem(key, JSON.stringify(stored));

    expect(await createWebSessionMarker(scope).read()).toBe(true);
  });

  it.each(['', 'namedEndpoint', 'https://evil.test/session', '//evil.test/session', '/session#fragment', 'javascript:void(0)', 'http://u:p@localhost/session'])('rejects unsafe endpoint %s', (endpoint) => {
    expect(() => assertWebSessionEndpoint(endpoint)).toThrow('configuration');
  });

  it.each([null, {}, {...scope, appId: ''}, {...scope, ownerUserId: 'x'.repeat(257)}])('rejects malformed scope %j', (value) => {
    expect(() => captureWebSessionOptions({...options, scope: value as typeof scope})).toThrow('configuration');
  });

  it('captures immutable scope/endpoints and volatile callback by identity', () => {
    const mutable = {...options, endpoints: {...options.endpoints}, scope: {...scope}};
    const captured = captureWebSessionOptions(mutable);
    mutable.scope.ownerUserId = 'other';
    mutable.endpoints.restore = '/changed';

    expect(captured.scope.ownerUserId).toBe('owner');
    expect(captured.endpoints.restore).toBe('/session');
    expect(sameWebSessionOptions(captured, options)).toBe(true);
    expect(sameWebSessionOptions(captured, mutable)).toBe(false);
    expect(() => captureWebSessionOptions({...options, onBeforeSessionClear: 'serialized' as never})).toThrow('configuration');
    expect(() => captureWebSessionOptions({...options, endpoints: undefined as never})).toThrow('configuration');
  });

  it('cleans caller authentication/browser-owned headers and CSRF on GET', () => {
    const outgoing = webSessionRequestOptions('/private', 'GET', {
      cache: true, credentials: 'omit', headers: new Headers({Authorization: 'Bearer secret', Cookie: 'secret', Origin: 'x', Referer: 'x', 'Sec-Fetch-Site': 'cross-site', 'X-Reaktor-CSRF': 'old', 'X-Trace': 'trace'}), token: 'secret'
    });

    expect(outgoing.token).toBeUndefined();
    expect(outgoing.cache).toBe(false);
    expect(outgoing.credentials).toBe('same-origin');
    expect(Object.fromEntries(outgoing.headers!)).toEqual({accept: 'application/json', 'content-type': 'application/json', 'x-trace': 'trace'});
  });

  it('marker is durable with no TTL and new instances read it after reload', async () => {
    const marker = createWebSessionMarker(scope);

    expect(await marker.read()).toBe(false);

    await marker.write(true);

    expect(await createWebSessionMarker(scope).read()).toBe(true);

    const stored = JSON.parse(localStorage.getItem(localStorage.key(0)!)!);

    expect(stored.ttl).toBe(0);
    expect(stored.value).toEqual({webSessionSuppression: {suppressed: true}});

    await marker.write(false);

    expect(await createWebSessionMarker(scope).read()).toBe(false);
  });

  it('different scope cannot collide with marker namespace', async () => {
    await createWebSessionMarker({appId: 'a.b', environment: 'c', ownerUserId: 'd'}).write(true);

    expect(await createWebSessionMarker({appId: 'a', environment: 'b.c', ownerUserId: 'd'}).read()).toBe(false);
  });

  it('unavailable or quota storage fails closed before restore admission', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const marker = createWebSessionMarker(scope);

    await expect(marker.read()).rejects.toThrow('marker_persistence');
    await expect(marker.write(true)).rejects.toThrow('marker_persistence');
  });

  it('rejected persistence is sanitized', async () => {
    // Exercise an upstream rejection distinct from the browser adapter false receipt.
    const {FluxFramework} = await import('@nlabs/arkhamjs');
    vi.spyOn(FluxFramework.prototype, 'setState').mockRejectedValue(new Error('raw storage details'));
    const marker = createWebSessionMarker(scope);

    await expect(marker.write(true)).rejects.toThrow('marker_persistence');
  });
});
