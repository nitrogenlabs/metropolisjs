import {NATIVE_NOTIFICATION_CONSTANTS} from '../../stores/nativeNotificationStore.js';
import {appMutation} from '../../utils/api.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {NativeNotificationActions, NativePushRegistration} from '../../types/nativeNotifications.types.js';

export const createNativeNotificationActions = (flux: FluxFramework): NativeNotificationActions => ({
  register: async (input) => {
    const generation = flux.getState?.('app.sessionGeneration', 0) ?? 0;
    try {
      const safeInput = {
        ...(input.apnsEnvironment && {apnsEnvironment: input.apnsEnvironment}),
        installationId: input.installationId,
        platform: input.platform,
        token: input.token
      };
      const response = await appMutation<{nativePush: {register: NativePushRegistration}}>(
        flux, 'register', 'nativePush', {input: {type: 'NativePushRegistrationInput!', value: safeInput}},
        ['createdAt', 'enabled', 'installationId', 'platform', 'registrationId', 'revision', 'updatedAt'],
        {queueOffline: false}
      );
      const registration = response?.nativePush?.register;
      if(generation !== (flux.getState?.('app.sessionGeneration', 0) ?? 0)) {
        throw new Error('Session changed');
      }
      if(!registration?.registrationId || !Number.isInteger(registration.revision)) {
        throw new Error('Invalid push registration response');
      }
      await flux.dispatch({registration, type: NATIVE_NOTIFICATION_CONSTANTS.REGISTERED});
      return registration;
    } catch{
      if(generation === (flux.getState?.('app.sessionGeneration', 0) ?? 0)) {
        await flux.dispatch({error: 'register_failed', type: NATIVE_NOTIFICATION_CONSTANTS.ERROR});
      }
      throw new Error('Native notification registration failed');
    }
  },
  unregister: async (registrationId, revision) => {
    const generation = flux.getState?.('app.sessionGeneration', 0) ?? 0;
    try {
      const response = await appMutation<{nativePush: {unregister: boolean}}>(
        flux, 'unregister', 'nativePush', {
          registrationId: {type: 'ID!', value: registrationId},
          ...(revision !== undefined && {revision: {type: 'Int', value: revision}})
        }, [], {queueOffline: false}
      );
      const removed = response?.nativePush?.unregister;
      if(generation !== (flux.getState?.('app.sessionGeneration', 0) ?? 0)) {
        throw new Error('Session changed');
      }
      if(typeof removed !== 'boolean') {
        throw new Error('Invalid push unregister response');
      }
      if(removed) {
        await flux.dispatch({type: NATIVE_NOTIFICATION_CONSTANTS.UNREGISTERED});
      }
      return removed;
    } catch{
      if(generation === (flux.getState?.('app.sessionGeneration', 0) ?? 0)) {
        await flux.dispatch({error: 'unregister_failed', type: NATIVE_NOTIFICATION_CONSTANTS.ERROR});
      }
      throw new Error('Native notification unregistration failed');
    }
  }
});
