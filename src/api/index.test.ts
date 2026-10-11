import {expect, test, vi} from 'vitest';

import {createNativeApi} from './index.js';

import type {ApiOperation, ApiRequestOptions} from './index.js';

test('preserves Rip-Hunter request arguments without replay or recursive preflight', async () => {
  const request = vi.fn(async (_endpoint: string, _operation: ApiOperation, _options?: ApiRequestOptions) => ({
    ok: true
  }));
  const preflight = vi.fn(async () => 'bearer');
  const api = createNativeApi({
    endpoint: 'https://example.invalid/graphql',
    preflight,
    request: async <T,>(...args: [string, ApiOperation, ApiRequestOptions?]): Promise<T> =>
      request(...args) as Promise<T>,
    timeout: 123
  });
  const operation = {
    operationName: 'Named',
    query: 'mutation Named { x }',
    variables: {
      x: 1
    }
  };

  expect(await api.request(operation, {
    authenticated: false,
    token: 'renew'
  })).toEqual({
    ok: true
  });
  expect(preflight).not.toHaveBeenCalled();
  expect(request).toHaveBeenLastCalledWith('https://example.invalid/graphql', operation, {
    timeout: 123,
    token: 'renew'
  });

  const {signal} = new AbortController();
  await api.request(operation, {
    authenticated: true,
    signal,
    timeout: 0
  });

  expect(request).toHaveBeenLastCalledWith('https://example.invalid/graphql', operation, {
    signal,
    timeout: 0,
    token: 'bearer'
  });

  request.mockRejectedValueOnce({
    kind: 'network'
  });

  await expect(api.request(operation, {
    authenticated: false
  })).rejects.toMatchObject({
    kind: 'network'
  });
  expect(request).toHaveBeenCalledTimes(3);

  const noPreflight = createNativeApi({
    endpoint: 'https://example.invalid',
    request: async <T,>(): Promise<T> => {
      throw new Error('no request');
    },
    timeout: 0
  });

  await expect(noPreflight.request(operation, {
    authenticated: true
  })).rejects.toThrow('current credential');
});

test.each(['http://example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/#bad'])('rejects unsafe endpoint %s', (endpoint) => {
  expect(() => createNativeApi({
    endpoint,
    request: async <T,>(): Promise<T> => {
      throw new Error('unused');
    },
    timeout: 1
  })).toThrow('configuration');
});

test.each([-1, Infinity, NaN])('rejects invalid timeout %s', (timeout) => {
  expect(() => createNativeApi({
    endpoint: 'https://example.invalid',
    request: async <T,>(): Promise<T> => {
      throw new Error('unused');
    },
    timeout
  })).toThrow('configuration');
});
