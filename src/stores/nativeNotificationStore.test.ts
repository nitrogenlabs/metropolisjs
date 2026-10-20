import {describe, expect, it} from '@nlabs/lex/test-vitest';

import {NATIVE_NOTIFICATION_CONSTANTS as C, nativeNotificationStore} from './nativeNotificationStore.js';

describe('native lifecycle state', () => {
  it('preserves missing-payload fields as undefined and reset restores null defaults', () => {
    const registered = nativeNotificationStore(C.REGISTERED, {});
    const permission = nativeNotificationStore(C.PERMISSION, {}, registered);
    const failed = nativeNotificationStore(C.ERROR, {}, permission);

    expect(failed).toEqual({error: undefined, permission: undefined, registration: undefined});
    expect(nativeNotificationStore(C.RESET, {}, failed)).toEqual({error: null, permission: null, registration: null});
  });

  it('tracks registration, permissions and errors and clears private state', () => {
    const registration = {createdAt: '2026-10-02T12:00:00Z', enabled: true, installationId: 'device-1', platform: 'ANDROID' as const, registrationId: 'registration-1', revision: 1, updatedAt: '2026-10-02T12:00:00Z'};
    let state = nativeNotificationStore(C.REGISTERED, {registration});

    expect(state.registration).toEqual(registration);

    state = nativeNotificationStore(C.PERMISSION, {permission: 'granted'}, state);

    expect(state.permission).toBe('granted');

    state = nativeNotificationStore(C.ERROR, {error: 'register_failed'}, state);

    expect(state.error).toBe('register_failed');
    expect(nativeNotificationStore('unknown', {}, state)).toEqual(state);
    expect(nativeNotificationStore(C.UNREGISTERED, {}, state).registration).toBeNull();
    expect(nativeNotificationStore(C.RESET, {}, state)).toEqual({error: null, permission: null, registration: null});
  });
});
