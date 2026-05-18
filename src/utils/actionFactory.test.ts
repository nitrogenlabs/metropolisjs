import {describe, expect, it, vi} from 'vitest';

import {createAction, createActions, createAllActions} from './actionFactory.js';

const flux = {
  dispatch: vi.fn(),
  getState: vi.fn((path: string, fallback?: unknown) => fallback),
  setState: vi.fn(),
  on: vi.fn()
};

describe('actionFactory', () => {
  it('creates every action type and caches websocket actions per flux instance', () => {
    const all = createAllActions(flux as any);

    expect(Object.keys(all).sort()).toEqual([
      'content',
      'event',
      'group',
      'image',
      'location',
      'message',
      'permission',
      'persona',
      'post',
      'reaction',
      'sse',
      'subscription',
      'tag',
      'translation',
      'user',
      'video',
      'websocket'
    ]);

    expect(createAction('websocket', flux as any)).toBe(createAction('websocket', flux as any));
  });

  it('creates selected actions and rejects unknown action types', () => {
    const actions = createActions(['user', 'post'], flux as any);

    expect(actions.user).toBeDefined();
    expect(actions.post).toBeDefined();
    expect(() => createAction('nope' as any, flux as any)).toThrow('Unknown action type');
  });
});
