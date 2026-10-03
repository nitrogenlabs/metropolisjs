import {beforeEach, describe, expect, it, vi} from 'vitest';

import {createNativeNotificationActions} from './nativeNotificationActions.js';

const calls: any[] = [];
const registration = {
  createdAt: '2026-10-02T12:00:00Z', enabled: true, installationId: 'device-1', platform: 'ANDROID',
  registrationId: 'registration-1', revision: 1, updatedAt: '2026-10-02T12:00:00Z'
};
let failure = false;
let responseOverride: unknown;
let afterRequest = () => undefined;
vi.mock('../../utils/api.js', () => ({appMutation: async (...args: any[]) => {
  calls.push(args);
  if(failure) {
    throw new Error('private-token');
  }
  afterRequest();
  if(responseOverride !== undefined) {
    return responseOverride;
  }
  return {nativePush: {[args[1]]: args[1] === 'register' ? registration : true}};
}}));

describe('native notification API actions', () => {
  beforeEach(() => {
    calls.length = 0;
    failure = false;
    responseOverride = undefined;
    afterRequest = () => undefined;
  });

  it('uses shared GraphQL fields without client-supplied identity', async () => {
    const events: any[] = [];
    const flux = {dispatch: async (event: any) => {
      events.push(event);
      return event;
    }};
    const actions = createNativeNotificationActions(flux as any);
    const input = {installationId: 'device-1', platform: 'ANDROID' as const, token: 'private-token'};

    expect(await actions.register(input)).toEqual(registration);
    expect(calls[0].slice(1, 4)).toEqual(['register', 'nativePush', {input: {type: 'NativePushRegistrationInput!', value: input}}]);
    expect(calls[0][5].queueOffline).toBe(false);
    expect(JSON.stringify(events)).not.toContain('private-token');
    expect(await actions.unregister('registration-1', 1)).toBe(true);
    expect(calls[1][3].revision.value).toBe(1);
  });

  it('does not expose provider diagnostics in errors or Flux events', async () => {
    failure = true;
    const events: any[] = [];
    const actions = createNativeNotificationActions({dispatch: async (e: any) => {
      events.push(e);
    }} as any);

    await expect(actions.register({installationId: 'device-1', platform: 'ANDROID', token: 'private-token'})).rejects.not.toThrow('private-token');
    await expect(actions.unregister('registration-1')).rejects.not.toThrow('private-token');
    expect(JSON.stringify(events)).not.toContain('private-token');
  });

  it('does not dispatch late lifecycle results after session changes', async () => {
    let generation = 0;
    const events: any[] = [];
    const actions = createNativeNotificationActions({
      dispatch: async (event: any) => {
        events.push(event);
      }, getState: () => generation
    } as any);
    afterRequest = () => {
      generation++;
    };

    await expect(actions.register({installationId: 'device-1', platform: 'ANDROID', token: 'private-token'}))
      .rejects.toThrow();
    await expect(actions.unregister('registration-1', 1)).rejects.toThrow();
    expect(events).toEqual([]);
  });

  it('uses APNs environment without forwarding spoofed account fields', async () => {
    const actions = createNativeNotificationActions({dispatch: async () => undefined} as any);
    await actions.register({
      apnsEnvironment: 'sandbox', installationId: 'ios-device', platform: 'IOS', token: 'private-token', userId: 'other'
    } as any);

    expect(calls[0][3].input.value).toEqual({
      apnsEnvironment: 'sandbox', installationId: 'ios-device', platform: 'IOS', token: 'private-token'
    });

    responseOverride = {nativePush: {unregister: false}};

    expect(await actions.unregister('registration-1')).toBe(false);
  });

  it('rejects malformed API results instead of treating them as successful registration', async () => {
    const actions = createNativeNotificationActions({dispatch: async () => undefined} as any);
    responseOverride = null;

    await expect(actions.register({installationId: 'device-1', platform: 'ANDROID', token: 'private-token'}))
      .rejects.toThrow(/failed/);
    await expect(actions.unregister('registration-1')).rejects.toThrow(/failed/);
  });
});
