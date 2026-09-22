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
      'awsRum',
      'content',
      'crm',
      'event',
      'group',
      'higgsfield',
      'image',
      'location',
      'message',
      'permission',
      'persona',
      'post',
      'reaction',
      'rest',
      'sse',
      'subscription',
      'tag',
      'translation',
      'user',
      'video',
      'websocket'
    ]);

    expect(createAction('websocket', flux as any)).toBe(createAction('websocket', flux as any));
    expect(createAction('awsRum', flux as any, {analyticsId: 'metropolis'})).toBe(
      createAction('awsRum', flux as any, {analyticsId: 'metropolis'})
    );
    expect(createAction('awsRum', flux as any, {analyticsId: 'other'})).not.toBe(
      createAction('awsRum', flux as any, {analyticsId: 'metropolis'})
    );
  });

  it('wires the shared websocket action into awsRum when analyticsTransport is websocket', async () => {
    const wsFlux = {
      dispatch: vi.fn(async (payload: unknown) => payload),
      getState: vi.fn((path: string, fallback?: unknown) => fallback),
      setState: vi.fn(),
      on: vi.fn()
    };

    const websocket = createAction('websocket', wsFlux as any);
    const wsSendSpy = vi.spyOn(websocket, 'wsSend').mockImplementation(() => {});
    const awsRum = createAction('awsRum', wsFlux as any, {analyticsId: 'metropolis', analyticsTransport: 'websocket'});

    awsRum.track({name: 'click', type: 'click'});
    await awsRum.flush();

    expect(wsSendSpy).toHaveBeenCalledWith(expect.objectContaining({action: 'rum.track'}));
  });

  it('creates selected actions and rejects unknown action types', () => {
    const actions = createActions(['user', 'post', 'rest'], flux as any);

    expect(actions.user).toBeDefined();
    expect(actions.post).toBeDefined();
    expect(actions.rest).toBeDefined();
    expect(() => createAction('nope' as any, flux as any)).toThrow('Unknown action type');
  });
});
