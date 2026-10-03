import {describe, expect, it} from 'vitest';

import {createExpoNativeNotificationAdapter} from './adapter.js';

const setup = () => {
  const calls: string[] = [];
  const listeners = new Map<string, (value: any) => void>();
  const state = {initial: null as any, permission: 'undetermined', token: {data: 'native-token', type: 'android'}};
  const subscribe = (name: string, listener: (value: any) => void) => {
    listeners.set(name, listener);
    return {remove: () => listeners.delete(name)};
  };
  const notifications = {
    AndroidImportance: {DEFAULT: 3},
    addNotificationReceivedListener: (listener: (value: any) => void) => subscribe('receive', listener),
    addNotificationResponseReceivedListener: (listener: (value: any) => void) => subscribe('open', listener),
    addPushTokenListener: (listener: (value: any) => void) => subscribe('token', listener),
    clearLastNotificationResponseAsync: async () => {
      state.initial = null;
    },
    getDevicePushTokenAsync: async () => {
      calls.push('token');
      return state.token;
    },
    getLastNotificationResponseAsync: async () => state.initial,
    getPermissionsAsync: async () => ({status: state.permission}),
    requestPermissionsAsync: async () => {
      calls.push('prompt');
      return {status: 'granted'};
    },
    setNotificationChannelAsync: async (id: string) => {
      calls.push(`channel:${id}`);
      return null;
    }
  };
  return {calls, listeners, notifications, state};
};

describe('Expo native notification adapter', () => {
  it('does not prompt or configure presentation on creation, and maps permissions', async () => {
    const {calls, notifications, state} = setup();
    const adapter = createExpoNativeNotificationAdapter({notifications, platform: 'android'});

    expect(calls).toEqual([]);
    expect(await adapter.getPermission()).toBe('undetermined');

    state.permission = 'denied';

    expect(await adapter.getPermission()).toBe('denied');
    expect(await adapter.requestPermission()).toBe('granted');
    expect(calls).toEqual(['channel:default', 'prompt']);
  });

  it('creates an Android channel before obtaining a native FCM token', async () => {
    const {calls, notifications} = setup();
    const adapter = createExpoNativeNotificationAdapter({
      androidChannelId: 'messages', notifications, platform: 'android'
    });

    expect(await adapter.getToken()).toEqual({platform: 'ANDROID', token: 'native-token'});
    expect(calls).toEqual(['channel:messages', 'token']);
  });

  it('validates iOS token transport and APNs environment without creating Android channels', async () => {
    const {calls, notifications, state} = setup();
    const adapter = createExpoNativeNotificationAdapter({apnsEnvironment: 'sandbox', notifications, platform: 'ios'});

    await expect(adapter.getToken()).rejects.toThrow('Invalid native token');

    state.token.type = 'ios';

    expect(await adapter.getToken()).toEqual({apnsEnvironment: 'sandbox', platform: 'IOS', token: 'native-token'});
    expect(calls).toEqual(['token', 'token']);

    state.token.data = '';

    await expect(adapter.getToken()).rejects.toThrow('Invalid native token');
  });

  it('extracts envelopes from receipt, tap and launch response and removes all listeners', async () => {
    const {listeners, notifications, state} = setup();
    const adapter = createExpoNativeNotificationAdapter({notifications, platform: 'android'});
    const received: unknown[] = [];
    const opened: unknown[] = [];
    const tokens: unknown[] = [];
    const removers = [
      adapter.onReceived((value) => received.push(value)), adapter.onOpened((value) => opened.push(value)),
      adapter.onTokenChanged((value) => tokens.push(value))
    ];
    const notice = {request: {content: {data: {envelope: '{"version":1}'}}}};
    listeners.get('receive')!(notice);
    listeners.get('open')!({notification: notice});
    listeners.get('token')!({data: 'rotated', type: 'android'});
    listeners.get('token')!({data: 'wrong-platform', type: 'ios'});
    state.initial = {notification: notice};

    expect(received).toEqual(['{"version":1}']);
    expect(opened).toEqual(['{"version":1}']);
    expect(tokens).toEqual([{platform: 'ANDROID', token: 'rotated'}]);
    expect(await adapter.getInitialResponse()).toBe('{"version":1}');

    await adapter.clearInitialResponse();

    expect(await adapter.getInitialResponse()).toBeNull();

    removers.forEach((remove) => remove());

    expect(listeners.size).toBe(0);
  });
});
