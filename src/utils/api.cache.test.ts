/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {appQuery, refreshSession, restRequest, uploadImage} from './api.js';

import type {FluxAction, FluxFramework} from '@nlabs/arkhamjs';

const transport = vi.hoisted(() => ({graphqlQuery: vi.fn(), post: vi.fn()}));
vi.mock('@nlabs/rip-hunter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nlabs/rip-hunter')>()),
  ...transport
}));

const createSessionFlux = () => {
  let session: Record<string, unknown> = {expires: Date.now() + 3600000, issued: Date.now(), token: 'current-token', userId: 'one'};
  let generation = 0;
  const dispatch = vi.fn(async (action: FluxAction) => {
    if(action.type === 'USER_SIGN_OUT_SUCCESS') {
      session = {};
      generation++;
    }
    return action;
  });
  const flux = {
    dispatch,
    getState: (path: string, fallback?: unknown) => {
      if(path === 'app.config') return {app: {api: {public: 'https://example.test/public', uploadImage: 'https://example.test/upload', url: 'https://example.test/app'}}};
      if(path === 'app.sessionGeneration') return generation;
      if(path === 'user.session') return session;
      if(path === 'user.session.token') return session.token;
      return fallback;
    },
    setState: async (path: string, value: Record<string, unknown>) => {
      if(path === 'user.session') session = value;
      return true;
    }
  } as unknown as FluxFramework;
  return {dispatch, flux};
};

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, reject, resolve};
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('request/session cache races', () => {
  it('reads the current token after rotation', async () => {
    const {flux} = createSessionFlux();
    await flux.setState('user.session', {expires: Date.now() + 3600000, token: 'rotated-token'});
    transport.graphqlQuery.mockResolvedValue({users: {item: {userId: 'one'}}});
    await appQuery(flux, 'item', 'users', {}, ['userId']);
    expect(transport.graphqlQuery).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {token: 'rotated-token'});
  });

  it('keeps the valid cached token when proactive refresh temporarily fails', async () => {
    const {flux} = createSessionFlux();
    await flux.setState('user.session', {expires: Date.now() + 120000, issued: Date.now() - 600000, token: 'current-token'});
    transport.graphqlQuery.mockRejectedValueOnce(new Error('network_error')).mockResolvedValueOnce({users: {item: {userId: 'one'}}});
    await appQuery(flux, 'item', 'users', {}, ['userId']);
    expect(flux.getState('user.session.token')).toBe('current-token');
    expect(transport.graphqlQuery).toHaveBeenCalledTimes(2);
    expect(transport.graphqlQuery.mock.calls[1][2]).toEqual({token: 'current-token'});
  });

  it('discards a GraphQL response from a logged-out session before ingestion', async () => {
    const {flux} = createSessionFlux();
    const response = deferred<object>();
    transport.graphqlQuery.mockReturnValue(response.promise);
    const onSuccess = vi.fn();
    const pending = appQuery(flux, 'item', 'users', {}, ['userId'], {onSuccess});
    const rejected = expect(pending).rejects.toThrow('session_changed');
    await vi.waitFor(() => expect(transport.graphqlQuery).toHaveBeenCalledOnce());
    await flux.dispatch({type: 'USER_SIGN_OUT_SUCCESS'});
    response.resolve({users: {item: {userId: 'one'}}});
    await rejected;
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not let a rejected request from an old login clear the new session', async () => {
    const {flux} = createSessionFlux();
    const response = deferred<object>();
    transport.graphqlQuery.mockReturnValue(response.promise);
    const pending = appQuery(flux, 'item', 'users', {}, ['userId']);
    const rejected = expect(pending).rejects.toThrow('session_changed');
    await vi.waitFor(() => expect(transport.graphqlQuery).toHaveBeenCalledOnce());
    await flux.dispatch({type: 'USER_SIGN_OUT_SUCCESS'});
    await flux.setState('user.session', {expires: Date.now() + 3600000, token: 'new-login', userId: 'two'});
    response.reject({errors: ['invalid_session']});
    await rejected;
    expect(flux.getState('user.session.token')).toBe('new-login');
  });

  it('does not clear a rotated token when the previous token is rejected', async () => {
    const {flux} = createSessionFlux();
    const response = deferred<object>();
    transport.graphqlQuery.mockReturnValue(response.promise);
    const pending = appQuery(flux, 'item', 'users', {}, ['userId']);
    await vi.waitFor(() => expect(transport.graphqlQuery).toHaveBeenCalledOnce());
    await flux.setState('user.session', {expires: Date.now() + 3600000, token: 'rotated-token'});
    response.reject({errors: ['invalid_session']});
    await pending;
    expect(flux.getState('user.session.token')).toBe('rotated-token');
  });

  it('does not revive credentials when refresh completes after logout', async () => {
    const {flux} = createSessionFlux();
    const response = deferred<object>();
    transport.graphqlQuery.mockReturnValue(response.promise);
    const pending = refreshSession(flux, 'current-token', 60);
    await vi.waitFor(() => expect(transport.graphqlQuery).toHaveBeenCalledOnce());
    await flux.dispatch({type: 'USER_SIGN_OUT_SUCCESS'});
    response.resolve({users: {refreshSession: {expires: Date.now() + 3600000, token: 'late-token'}}});
    await pending;
    expect(flux.getState('user.session')).toEqual({});
  });

  it('clears the active session when its refresh is explicitly rejected', async () => {
    const {flux, dispatch} = createSessionFlux();
    transport.graphqlQuery.mockRejectedValue({errors: ['invalid_session']});
    await refreshSession(flux, 'current-token', 60);
    expect(flux.getState('user.session')).toEqual({});
    expect(dispatch).toHaveBeenCalledWith({session: {}, type: 'USER_SIGN_OUT_SUCCESS'});
  });

  it('discards an authenticated REST result after logout', async () => {
    const {flux} = createSessionFlux();
    const response = deferred<object>();
    transport.post.mockReturnValue(response.promise);
    const onSuccess = vi.fn();
    const pending = restRequest(flux, 'https://example.test/profile', 'POST', {}, {authenticate: true, onSuccess});
    const rejected = expect(pending).rejects.toThrow('session_changed');
    await vi.waitFor(() => expect(transport.post).toHaveBeenCalledOnce());
    await flux.dispatch({type: 'USER_SIGN_OUT_SUCCESS'});
    response.resolve({userId: 'one'});
    await rejected;
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each(['json', 'multipart'])('discards a late %s image upload', async (format) => {
    const {flux} = createSessionFlux();
    const response = deferred<object>();
    const fetchMock = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal('fetch', fetchMock);
    transport.post.mockReturnValue(response.promise);
    const pending = uploadImage(flux, format === 'multipart' ? new FormData() : {base64: 'image'});
    const rejected = expect(pending).rejects.toThrow('session_changed');
    await vi.waitFor(() => expect(format === 'multipart' ? fetchMock : transport.post).toHaveBeenCalledOnce());
    await flux.dispatch({type: 'USER_SIGN_OUT_SUCCESS'});
    response.resolve(format === 'multipart'
      ? new Response(JSON.stringify({image: {imageId: 'late'}}), {headers: {'Content-Type': 'application/json'}})
      : {image: {imageId: 'late'}});
    await rejected;
  });
});
