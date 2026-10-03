import {FluxFramework} from '@nlabs/arkhamjs';
import {describe, expect, it} from 'vitest';

import {nativeNotifications, NATIVE_NOTIFICATION_CONSTANTS as C} from '../stores/nativeNotificationStore.js';
import {notifications} from '../stores/notificationStore.js';
import {createNativeNotificationController} from './controller.js';

import type {NativeNotificationAdapter, NativePushToken} from '../types/nativeNotifications.types.js';

const binding = {appId: 'pulsify', environment: 'dev', installationId: 'device-1', sessionId: 'session-1', userId: 'user-1'};
const envelope = {
  notification: {body: 'Open app', createdAt: '2026-10-02T12:00:00Z', data: {conversationId: 'chat-1'}, kind: 'MESSAGE', notificationId: 'notice-1', title: 'New message', version: 1},
  recipientUserId: 'user-1', scope: {appId: 'pulsify', environment: 'dev'}
};
const deferred = () => {
  let resolve!: (value?: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return {promise, resolve};
};

const setup = async () => {
  const flux = new FluxFramework();
  await flux.addStores([nativeNotifications, notifications]);
  const received = new Set<(payload: unknown) => void>();
  const opened = new Set<(payload: unknown) => void>();
  const rotated = new Set<(token: NativePushToken) => void>();
  const state = {initial: null as unknown, permission: 'granted', prompted: 0, token: 'token-1', unregisterFails: false};
  const adapter: NativeNotificationAdapter = {
    clearInitialResponse: async () => {
      state.initial = null;
    },
    getInitialResponse: async () => state.initial,
    getPermission: async () => state.permission as any,
    getToken: async () => ({platform: 'ANDROID', token: state.token}),
    onOpened: (listener) => {
      opened.add(listener);
      return () => {
        opened.delete(listener);
      };
    },
    onReceived: (listener) => {
      received.add(listener);
      return () => {
        received.delete(listener);
      };
    },
    onTokenChanged: (listener) => {
      rotated.add(listener);
      return () => {
        rotated.delete(listener);
      };
    },
    requestPermission: async () => {
      state.prompted++;
      state.permission = 'granted';
      return 'granted';
    }
  };
  const backend = {registration: null as any, registrations: [] as any[], unregisters: [] as any[]};
  const actionsForBinding = (b: typeof binding) => ({
    register: async (input: any) => {
      const registration = {
        createdAt: envelope.notification.createdAt, enabled: true, installationId: input.installationId,
        platform: input.platform, registrationId: 'registration-1', revision: backend.registrations.length + 1,
        updatedAt: envelope.notification.createdAt
      };
      backend.registration = {...registration, sessionId: b.sessionId, userId: b.userId};
      backend.registrations.push({binding: b, input, registration});
      return registration;
    },
    unregister: async (id: string, revision?: number) => {
      backend.unregisters.push({actor: b, id, revision});
      if(state.unregisterFails) {
        throw new Error('offline');
      }
      if(backend.registration?.revision === revision && backend.registration?.userId === b.userId) {
        backend.registration = null;
        return true;
      }
      return false;
    }
  });
  const options = {
    actions: actionsForBinding(binding), actionsForBinding, adapter, flux,
    now: () => Date.parse(envelope.notification.createdAt)
  };
  return {
    adapter, backend, controller: createNativeNotificationController(options), flux,
    opened, options, received, rotated, state
  };
};

describe('native notification controller', () => {
  it('handles native receipt and tap callbacks without creating duplicate inbox items', async () => {
    const {controller, flux, opened, received} = await setup();
    await controller.start(binding);
    const receipt = deferred();
    flux.on(C.RECEIVED, () => receipt.resolve());
    [...received][0](envelope);
    await receipt.promise;
    const tap = deferred();
    flux.on(C.OPENED, () => tap.resolve());
    [...opened][0](envelope);
    await tap.promise;

    expect(flux.getState<any[]>('notification.list')).toHaveLength(1);

    await controller.stop();
  });

  it('rejects incomplete bindings and does not prompt while stopped', async () => {
    const {controller, state} = await setup();

    expect(await controller.requestPermission()).toBe('denied');
    await expect(controller.start({...binding, sessionId: ''})).rejects.toThrow('Authenticated');
    expect(state.prompted).toBe(0);
  });

  it('reports sanitized permission and initial-response failures', async () => {
    const {adapter, controller, flux, state} = await setup();
    state.initial = envelope;
    const errors: unknown[] = [];
    flux.on(C.ERROR, (event) => errors.push(event.error));
    adapter.getPermission = async () => {
      throw new Error('sensitive provider data');
    };
    adapter.getInitialResponse = async () => {
      throw new Error('private response');
    };
    await controller.start(binding);

    expect(errors).toEqual(['permission_failed', 'initial_response_failed']);
    expect(state.initial).toBeNull();

    await controller.stop();
  });

  it('reports a failed registration without retaining a backend binding', async () => {
    const {backend, flux, options} = await setup();
    const controller = createNativeNotificationController({
      ...options,
      actionsForBinding: () => ({
        register: async () => {
          throw new Error('private token');
        },
        unregister: async () => false
      })
    });
    await controller.start(binding);

    expect(flux.getState('nativeNotifications.error')).toBe('register_failed');
    expect(backend.registration).toBeNull();

    await controller.stop();
  });

  it('expires and bounds deduplication memory for the active account', async () => {
    const {options} = await setup();
    let clock = 0;
    const controller = createNativeNotificationController({...options, now: () => clock});
    await controller.start(binding);
    await controller.ingest(envelope, 'native');
    clock = 86400001;

    expect(await controller.ingest(envelope, 'native')).toBe(true);

    // Sequential arrivals intentionally exercise the eviction boundary.
    for(let index = 0; index < 501; index++) {
      // eslint-disable-next-line no-await-in-loop
      await controller.ingest({...envelope, notification: {...envelope.notification, notificationId: `id-${index}`}}, 'native');
    }

    expect(await controller.ingest(envelope, 'native')).toBe(true);

    await controller.stop();
  });

  it('doesNotPromptOnStart but supports an explicit permission request', async () => {
    const {backend, controller, state} = await setup();
    state.permission = 'undetermined';
    await controller.start(binding);

    expect(state.prompted).toBe(0);
    expect(backend.registrations).toEqual([]);
    expect(await controller.requestPermission()).toBe('granted');
    expect(backend.registrations).toHaveLength(1);

    await controller.stop();
  });

  it('registersGrantedToken and startStopIdempotent', async () => {
    const {backend, controller, received, opened, rotated} = await setup();
    await controller.start(binding);
    await controller.start(binding);

    expect(backend.registrations).toHaveLength(1);
    expect(received.size + opened.size + rotated.size).toBe(3);

    await controller.stop();
    await controller.stop();

    expect(received.size + opened.size + rotated.size).toBe(0);
    expect(backend.registration).toBeNull();
  });

  it('replacesRotatedToken', async () => {
    const {backend, controller, rotated, state} = await setup();
    await controller.start(binding);
    state.token = 'token-2';
    for(const listener of rotated) {
      listener({platform: 'ANDROID', token: 'token-2'});
    }
    await controller.requestPermission();

    expect(backend.registrations.at(-1)?.input.token).toBe('token-2');

    await controller.stop();
  });

  it.each([['native', 'websocket'], ['websocket', 'native']] as const)(
    'dedups %s then %s and updates the store before events', async (first, second) => {
      const {controller, flux} = await setup();
      let receipts = 0;
      let opens = 0;
      flux.on(C.RECEIVED, () => {
        expect(flux.getState<any[]>('notification.list')).toHaveLength(1);

        receipts++;
      });
      flux.on(C.OPENED, () => {
        expect(flux.getState<any[]>('notification.list')).toHaveLength(1);

        opens++;
      });
      await controller.start(binding);

      expect(await controller.ingest(envelope, first)).toBe(true);
      expect(await controller.ingest(envelope, second)).toBe(false);
      expect(await controller.open(envelope)).toBe(true);
      expect(await controller.open(envelope)).toBe(false);
      expect(receipts).toBe(1);
      expect(opens).toBe(1);

      await controller.stop();
    });

  it('offlineStopClearsPrivateState and ignores late native frames', async () => {
    const {controller, flux, received, state} = await setup();
    await controller.start(binding);
    const late = [...received][0];
    await controller.ingest(envelope, 'native');
    state.unregisterFails = true;
    await controller.stop();
    late(envelope);

    expect(flux.getState('notification.list')).toEqual([]);
  });

  it('coldStartOpensAfterReady and clears the launch response', async () => {
    const {controller, flux, state} = await setup();
    state.initial = envelope;
    let opened = 0;
    flux.on(C.OPENED, () => {
      opened++;
    });
    await controller.start(binding);

    expect(opened).toBe(1);
    expect(state.initial).toBeNull();

    await controller.stop();
  });

  it('clears a pending launch response on offline logout', async () => {
    const {controller, state} = await setup();
    await controller.start(binding);
    state.initial = envelope;
    state.unregisterFails = true;
    await controller.stop();

    expect(state.initial).toBeNull();
  });

  it('rejectsWrongUserAndMalformedEnvelope', async () => {
    const {controller, flux} = await setup();
    await controller.start(binding);

    expect(await controller.ingest({...envelope, recipientUserId: 'other'}, 'native')).toBe(false);
    expect(await controller.ingest({...envelope, scope: {...envelope.scope, environment: 'prod'}}, 'native')).toBe(false);
    expect(await controller.open({notification: {version: 2}})).toBe(false);
    expect(flux.getState('notification.list')).toEqual([]);

    await controller.stop();
  });

  it('dropsLateResultsAfterSwitch and lateOldUnregisterPreservesNewBinding', async () => {
    const {adapter, backend, controller} = await setup();
    const entered = deferred();
    const resume = deferred();
    const original = adapter.getToken;
    adapter.getToken = async () => {
      entered.resolve();
      await resume.promise;
      return original();
    };
    const oldStart = controller.start(binding);
    await entered.promise;
    const stopped = controller.stop();
    adapter.getToken = original;
    const newStart = controller.start({...binding, sessionId: 'session-2', userId: 'user-2'});
    resume.resolve();
    await Promise.all([oldStart, stopped, newStart]);

    expect(backend.registration?.userId).toBe('user-2');
    expect(backend.registrations.every((r) => r.binding.userId === 'user-2')).toBe(true);

    await controller.stop();
  });

  it('cleans up a registration accepted after logout using its original actor', async () => {
    const {backend, options} = await setup();
    const entered = deferred();
    const resume = deferred();
    const factory = options.actionsForBinding;
    const controller = createNativeNotificationController({
      ...options,
      actionsForBinding: (actor) => {
        const actions = factory(actor);
        return {
          ...actions,
          register: async (input) => {
            const result = await actions.register(input);
            if(actor.userId === 'user-1') {
              entered.resolve();
              await resume.promise;
            }
            return result;
          }
        };
      }
    });
    const starting = controller.start(binding);
    await entered.promise;
    await controller.stop();
    const replacement = controller.start({...binding, sessionId: 'session-2', userId: 'user-2'});
    resume.resolve();
    await Promise.all([starting, replacement]);

    expect(backend.registration?.userId).toBe('user-2');
    expect(backend.unregisters[0].actor.userId).toBe('user-1');
    expect(backend.unregisters[0].revision).toBe(1);

    await controller.stop();
  });
});
