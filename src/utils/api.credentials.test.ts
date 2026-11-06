import {afterEach, expect, test, vi} from 'vitest';

import type {FluxFramework} from '@nlabs/arkhamjs';

import {restRequest} from './api.js';

const endpoint = 'https://api.example.com/session';
const flux = {
  dispatch: vi.fn(),
  getState: vi.fn((key: string, fallback?: unknown) => key === 'app.networkType' ? 'wifi' : fallback),
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

test('passes multipart and binary bodies and a binary response type through to Rip-Hunter untouched', async () => {
  const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{"ok":true}',
    {headers: {'Content-Type': 'application/json'}}));
  vi.stubGlobal('fetch', request);
  const form = new FormData();
  form.append('name', 'Ada');
  const bytes = new Uint8Array([1, 2, 3]);

  await restRequest(flux, endpoint, 'POST', form, {queueOffline: false, timeout: 0});
  await restRequest(flux, endpoint, 'PUT', bytes, {queueOffline: false, timeout: 0});

  expect(request.mock.calls[0][1]?.body).toBe(form);
  expect(new Headers(request.mock.calls[0][1]?.headers).has('Content-Type')).toBe(false);
  expect(request.mock.calls[1][1]?.body).toBe(bytes);
  expect(new Headers(request.mock.calls[1][1]?.headers).get('Content-Type')).toBe('application/octet-stream');

  request.mockImplementationOnce(async () => new Response(new Blob(['png'], {type: 'image/png'})));

  const blob = await restRequest<Blob>(flux, endpoint, 'GET', undefined, {queueOffline: false, responseType: 'blob', timeout: 0});

  expect(blob).toBeInstanceOf(Blob);
});
