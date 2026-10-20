import type {NativePermission, NativePushRegistration} from '../types/nativeNotifications.types.js';

export const NATIVE_NOTIFICATION_CONSTANTS = {
  ERROR: 'NATIVE_NOTIFICATION_ERROR',
  OPENED: 'NATIVE_NOTIFICATION_OPENED',
  PERMISSION: 'NATIVE_NOTIFICATION_PERMISSION',
  RECEIVED: 'NATIVE_NOTIFICATION_RECEIVED',
  REGISTERED: 'NATIVE_NOTIFICATION_REGISTERED',
  RESET: 'NATIVE_NOTIFICATION_RESET',
  UNREGISTERED: 'NATIVE_NOTIFICATION_UNREGISTERED'
} as const;

export type NativeNotificationState = {
  error: string | null | undefined;
  permission: NativePermission | null | undefined;
  registration: NativePushRegistration | null | undefined;
};
export const defaultNativeNotificationState: NativeNotificationState = {
  error: null, permission: null, registration: null
};
export const nativeNotificationStore = (
  type: string,
  data: Partial<NativeNotificationState>,
  state = defaultNativeNotificationState
): NativeNotificationState => {
  switch(type) {
    case NATIVE_NOTIFICATION_CONSTANTS.REGISTERED: return {...state, error: null, registration: data.registration};
    case NATIVE_NOTIFICATION_CONSTANTS.UNREGISTERED: return {...state, registration: null};
    case NATIVE_NOTIFICATION_CONSTANTS.PERMISSION: return {...state, permission: data.permission};
    case NATIVE_NOTIFICATION_CONSTANTS.ERROR: return {...state, error: data.error};
    case NATIVE_NOTIFICATION_CONSTANTS.RESET: return defaultNativeNotificationState;
    default: return state;
  }
};
export const nativeNotifications = {
  action: nativeNotificationStore,
  initialState: defaultNativeNotificationState,
  name: 'nativeNotifications'
};
