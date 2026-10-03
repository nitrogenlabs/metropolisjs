import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {appQuery} from './api.js';

import type {FluxFramework} from '@nlabs/arkhamjs';

const transport = vi.hoisted(() => ({graphqlQuery: vi.fn()}));
vi.mock('@nlabs/rip-hunter', async (original) => ({...(await original<typeof import('@nlabs/rip-hunter')>()), ...transport}));
const now = Date.parse('2026-10-03T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => vi.useRealTimers());

describe('request refresh scheduling compatibility', () => {
  it.each([
    [120_000, {autoRefresh: false}, false],
    [29_999, {}, false],
    [30_000, {}, true],
    [300_000, {minMinutes: 5}, true],
    [330_000, {minMinutes: 5}, false],
    [600_000, {minMinutes: 15}, true],
    [600_000, {refreshAfterRatio: 0.5}, true]
  ] as const)('remaining=%s config=%j refresh=%s', async (remaining, config, refresh) => {
    let session = {expires: now + remaining, issued: now - 1_800_000, token: 'current-token'};
    const flux = {
      dispatch: async (action: unknown) => action,
      getState: (path: string, fallback?: unknown) => {
        if(path === 'app.config') {
          return {app: {api: {public: 'https://example.test/public', url: 'https://example.test/app'}, session: config}};
        }
        if(path === 'user.session') {
          return session;
        }
        if(path === 'user.session.token') {
          return session.token;
        }
        return fallback;
      },
      setState: async (path: string, value: typeof session) => {
        if(path === 'user.session') {
          session = value;
        }
        return true;
      }
    } as unknown as FluxFramework;
    transport.graphqlQuery.mockImplementation(async (_url, request) => (request.query.includes('refreshSession')
      ? {users: {refreshSession: {expires: now + 3_600_000, issued: now, token: 'next-token'}}}
      : {users: {item: {id: 'one'}}}));
    await appQuery(flux, 'item', 'users', {}, ['id']);

    expect(transport.graphqlQuery.mock.calls.filter(([, request]) => request.query.includes('refreshSession'))).toHaveLength(refresh ? 1 : 0);
    expect(session.token).toBe(refresh ? 'next-token' : 'current-token');
    expect(transport.graphqlQuery.mock.calls.at(-1)?.[2]).toEqual({token: refresh ? 'next-token' : 'current-token'});
  });
});
