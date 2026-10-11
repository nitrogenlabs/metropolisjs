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
