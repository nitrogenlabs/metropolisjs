import {afterEach, expect, test, vi} from 'vitest';

import {restRequest} from './api.js';

import type {FluxFramework} from '@nlabs/arkhamjs';

const endpoint = 'https://api.example.com/session';
const flux = {
  dispatch: vi.fn(),
  getState: vi.fn((key: string, fallback?: unknown) => (key === 'app.networkType' ? 'wifi' : fallback)),
  setState: vi.fn()
} as unknown as FluxFramework;

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test('forwards explicit Fetch credentials through the public REST request boundary', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}',
    {headers: {'Content-Type': 'application/json'}}));
  vi.stubGlobal('fetch', request);

  await expect(restRequest(flux, endpoint, 'POST', {value: 1},
    {credentials: 'include', queueOffline: false, timeout: 0})).resolves.toEqual({ok: true});

  expect(request).toHaveBeenCalledWith(endpoint, expect.objectContaining({
    body: '{"value":1}', credentials: 'include', method: 'POST'
  }));
});

test('preserves the platform credential default when credentials are omitted', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}',
    {headers: {'Content-Type': 'application/json'}}));
  vi.stubGlobal('fetch', request);

  await restRequest(flux, endpoint, 'POST', {value: 1}, {queueOffline: false, timeout: 0});

  expect(request.mock.calls[0][1]).not.toHaveProperty('credentials');
});

test('passes multipart bodies through without replacing their content type', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ok: true}));
  vi.stubGlobal('fetch', request);
  const form = new FormData();
  form.append('name', 'Synthetic');

  await restRequest(flux, endpoint, 'POST', form, {queueOffline: false, timeout: 0});

  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(endpoint, expect.objectContaining({body: form, method: 'POST'}));
  expect(request.mock.calls[0][1]?.body).toBe(form);
  expect(new Headers(request.mock.calls[0][1]?.headers).has('Content-Type')).toBe(false);
});

test('passes binary request bytes through with their transport content type', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ok: true}));
  vi.stubGlobal('fetch', request);
  const bytes = new Uint8Array([1, 2, 3]);

  await restRequest(flux, endpoint, 'PUT', bytes, {queueOffline: false, timeout: 0});

  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(endpoint, expect.objectContaining({body: bytes, method: 'PUT'}));
  expect(request.mock.calls[0][1]?.body).toBe(bytes);
  expect(new Headers(request.mock.calls[0][1]?.headers).get('Content-Type')).toBe('application/octet-stream');
});

test('preserves the requested binary response through the REST action boundary', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(new TextEncoder().encode('synthetic'), {headers: {'Content-Type': 'image/png'}}));
  vi.stubGlobal('fetch', request);

  const result = await restRequest<Blob>(flux, endpoint, 'GET', undefined,
    {cache: false, queueOffline: false, responseType: 'blob', timeout: 0});

  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(endpoint, expect.objectContaining({method: 'GET'}));
  expect(result).toBeInstanceOf(Blob);
  expect(await result.text()).toBe('synthetic');
});
