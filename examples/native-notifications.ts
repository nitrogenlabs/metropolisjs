import {createNativeNotificationActions} from '../src/actions/nativeNotificationActions/nativeNotificationActions.js';
import {createNativeNotificationController} from '../src/nativeNotifications/controller.js';
import {createExpoNativeNotificationAdapter} from '../src/nativeNotifications/expo/adapter.js';
import {nativeNotifications} from '../src/stores/nativeNotificationStore.js';
import {notifications} from '../src/stores/notificationStore.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {ExpoNotificationsPort} from '../src/nativeNotifications/expo/adapter.js';
import type {PushActor, PushScope} from '../src/types/nativeNotifications.types.js';

// App owns secure persistence, random ID generation, credentials and presentation.
export const setupNativeNotifications = async ({actor, flux, nativeRuntime, platform, scope, storage}: {
  actor: PushActor;
  flux: FluxFramework;
  nativeRuntime: ExpoNotificationsPort;
  platform: 'android' | 'ios';
  scope: PushScope;
  storage: {get(): Promise<string | null>; newId(): string; set(id: string): Promise<void>};
}) => {
  let installationId = await storage.get();
  if(!installationId) {
    installationId = storage.newId();
    await storage.set(installationId);
  }
  await flux.addStores([nativeNotifications, notifications]);
  const controller = createNativeNotificationController({
    actions: createNativeNotificationActions(flux),
    adapter: createExpoNativeNotificationAdapter({
      apnsEnvironment: 'sandbox', notifications: nativeRuntime, platform
    }),
    flux
  });
  await controller.start({...scope, ...actor, installationId});
  // Call requestPermission only from the app's explicit opt-in action.
  // Await stop BEFORE replacing this flux's authenticated session.
  return controller;
};
