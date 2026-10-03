import {NATIVE_NOTIFICATION_CONSTANTS as C} from '../stores/nativeNotificationStore.js';
import {NOTIFICATION_CONSTANTS} from '../stores/notificationStore.js';
import {parseNativePushEnvelope} from './envelope.js';
import {bindNativeNotificationIngress} from './ingress.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {
  NativeNotificationActions, NativeNotificationAdapter, NativeNotificationController,
  NativePushRegistration, NativePushToken, PushActor, PushScope
} from '../types/nativeNotifications.types.js';

type Binding = PushScope & PushActor & {installationId: string};
let controllerId = 0;

export const createNativeNotificationController = ({actions, actionsForBinding, adapter, flux, now = Date.now}: {
  actions: NativeNotificationActions;
  actionsForBinding?: (binding: Binding) => NativeNotificationActions;
  adapter: NativeNotificationAdapter;
  flux: FluxFramework;
  now?: () => number;
}): NativeNotificationController => {
  const id = ++controllerId;
  let generation = 0;
  let binding: Binding | undefined;
  let registration: NativePushRegistration | undefined;
  let currentActions = actions;
  let removers: (() => void)[] = [];
  let queue = Promise.resolve(true);
  let lastToken = '';
  let tokenObservation = 0;
  const inFlight = new Map<string, Promise<boolean>>();
  const received = new Map<string, number>();
  const opened = new Map<string, number>();
  const key = () => `native-${id}-${generation}`;
  const isActive = (g: number) => !!binding && generation === g;
  const error = async (g: number, code: string) => {
    if(isActive(g)) {
      await flux.dispatch({error: code, type: C.ERROR});
    }
  };
  const remember = (items: Map<string, number>, notificationId: string): boolean => {
    for(const [entry, timestamp] of items) {
      if(timestamp <= now() - 86400000) {
        items.delete(entry);
      }
    }
    if(items.has(notificationId)) {
      return false;
    }
    items.set(notificationId, now());
    while(items.size > 500) {
      items.delete(items.keys().next().value);
    }
    return true;
  };
  const matches = (payload: unknown) => {
    const envelope = parseNativePushEnvelope(payload);
    if(envelope && binding && envelope.scope.appId === binding.appId &&
      envelope.scope.environment === binding.environment && envelope.recipientUserId === binding.userId) {
      return envelope;
    }
    return null;
  };
  const ingest: NativeNotificationController['ingest'] = async (payload, source) => {
    const envelope = matches(payload);
    if(!envelope) {
      return false;
    }
    const {notificationId} = envelope.notification;
    const pending = inFlight.get(notificationId);
    if(pending) {
      await pending;
      return false;
    }
    if(!remember(received, notificationId)) {
      return false;
    }
    const g = generation;
    const {notification} = envelope;
    const insertion = (async () => {
      await flux.dispatch({
        nativeBindingKey: key(),
        notification: {
          ...notification,
          added: Date.parse(notification.createdAt), content: notification.body, type: notification.kind
        },
        type: NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS
      });
      if(!isActive(g)) {
        return false;
      }
      await flux.dispatch({notification, source, type: C.RECEIVED});
      return true;
    })();
    inFlight.set(notificationId, insertion);
    try {
      return await insertion;
    } finally {
      if(inFlight.get(notificationId) === insertion) {
        inFlight.delete(notificationId);
      }
    }
  };
  const open: NativeNotificationController['open'] = async (payload) => {
    const envelope = matches(payload);
    if(!envelope) {
      return false;
    }
    const g = generation;
    await ingest(envelope, 'native');
    if(!isActive(g) || !remember(opened, envelope.notification.notificationId)) {
      return false;
    }
    await flux.dispatch({notification: envelope.notification, type: C.OPENED});
    return true;
  };
  const register = (token: NativePushToken, g: number): Promise<boolean> => {
    const b = binding;
    const a = currentActions;
    const identity = JSON.stringify(token);
    queue = queue.catch(() => false).then(async () => {
      if(!b || !isActive(g)) {
        return false;
      }
      if(identity === lastToken) {
        return true;
      }
      const result = await a.register({...token, installationId: b.installationId});
      if(!isActive(g)) {
        await a.unregister(result.registrationId, result.revision).catch(() => undefined);
        return false;
      }
      registration = result;
      lastToken = identity;
      return true;
    }).catch(async () => {
      await error(g, 'register_failed');
      return false;
    });
    return queue;
  };
  const cancel = () => {
    const old = registration;
    const oldActions = currentActions;
    generation++;
    binding = undefined;
    registration = undefined;
    lastToken = '';
    for(const remove of removers) {
      remove();
    }
    removers = [];
    received.clear();
    opened.clear();
    inFlight.clear();
    tokenObservation++;
    const local = Promise.all([
      flux.dispatch({type: NOTIFICATION_CONSTANTS.SET_NATIVE_BINDING}), flux.dispatch({type: C.RESET})
    ]).then(() => undefined);
    const cleanup = old
      ? oldActions.unregister(old.registrationId, old.revision).catch(() => false) : Promise.resolve();
    return {cleanup, local};
  };
  const refreshPermission = async (g: number, prompt: boolean) => {
    const permission = prompt ? await adapter.requestPermission() : await adapter.getPermission();
    if(!isActive(g)) {
      return permission;
    }
    await flux.dispatch({permission, type: C.PERMISSION});
    if(permission === 'granted' && isActive(g)) {
      const observation = ++tokenObservation;
      const token = await adapter.getToken();
      const registered = isActive(g) && tokenObservation === observation
        ? await register(token, g) : await queue;
      if(prompt && isActive(g) && !registered) {
        throw new Error('Native push registration failed');
      }
    }
    return permission;
  };
  return {
    ingest,
    open,
    requestPermission: async () => {
      if(!binding) {
        return 'denied';
      }
      return refreshPermission(generation, true);
    },
    start: async (next) => {
      if(binding && JSON.stringify(binding) === JSON.stringify(next)) {
        return;
      }
      if(!next.appId || !next.environment || !next.userId || !next.sessionId || !next.installationId) {
        throw new Error('Authenticated native binding required');
      }
      const previous = cancel();
      const g = generation;
      await previous.local;
      if(generation !== g) {
        return;
      }
      binding = {...next};
      currentActions = actionsForBinding ? actionsForBinding(binding) : actions;
      await flux.dispatch({nativeBindingKey: key(), type: NOTIFICATION_CONSTANTS.SET_NATIVE_BINDING});
      if(!isActive(g)) {
        return;
      }
      removers = [
        adapter.onReceived((payload) => {
          if(isActive(g)) {
            void ingest(payload, 'native').catch(() => error(g, 'receive_failed'));
          }
        }),
        adapter.onOpened((payload) => {
          if(isActive(g)) {
            void open(payload).catch(() => error(g, 'open_failed'));
          }
        }),
        adapter.onTokenChanged((token) => {
          if(isActive(g)) {
            tokenObservation++;
            void register(token, g);
          }
        }),
        bindNativeNotificationIngress(flux, (payload) => (isActive(g) ? ingest(payload, 'websocket') : Promise.resolve(false)))
      ];
      try {
        await refreshPermission(g, false);
      } catch{
        await error(g, 'permission_failed');
      }
      try {
        const initial = await adapter.getInitialResponse();
        if(isActive(g) && initial) {
          await open(initial);
          if(isActive(g)) {
            await adapter.clearInitialResponse();
          }
        }
      } catch{
        await adapter.clearInitialResponse().catch(() => undefined);
        await error(g, 'initial_response_failed');
      }
    },
    stop: async () => {
      const {cleanup, local} = cancel();
      const pending = adapter.clearInitialResponse().catch(() => undefined);
      await local;
      await pending;
      await cleanup;
    }
  };
};
