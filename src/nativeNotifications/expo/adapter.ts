import type {NativeNotificationAdapter, NativePermission, NativePushToken} from '../../types/nativeNotifications.types.js';

type Subscription = {remove(): void};
export interface ExpoNotificationsPort {
  AndroidImportance: {DEFAULT: number};
  addNotificationReceivedListener(listener: (notification: any) => void): Subscription;
  addNotificationResponseReceivedListener(listener: (response: any) => void): Subscription;
  addPushTokenListener(listener: (token: any) => void): Subscription;
  clearLastNotificationResponseAsync(): Promise<void>;
  getDevicePushTokenAsync(): Promise<{data: unknown; type: string}>;
  getLastNotificationResponseAsync(): Promise<unknown>;
  getPermissionsAsync(): Promise<{status: string}>;
  requestPermissionsAsync(): Promise<{status: string}>;
  setNotificationChannelAsync(id: string, channel: {importance: number; name: string}): Promise<unknown>;
}

const permission = ({status}: {status: string}): NativePermission => {
  if(status === 'granted' || status === 'denied') {
    return status;
  }
  return 'undetermined';
};
const envelope = (notification: any): unknown => notification?.request?.content?.data?.envelope
  ?? notification?.request?.trigger?.payload?.envelope
  ?? notification?.request?.trigger?.remoteMessage?.data?.envelope ?? null;

export const createExpoNativeNotificationAdapter = ({
  androidChannelId = 'default', androidChannelName = 'Notifications', apnsEnvironment, notifications, platform
}: {
  androidChannelId?: string;
  androidChannelName?: string;
  apnsEnvironment?: 'production' | 'sandbox';
  notifications: ExpoNotificationsPort;
  platform: 'android' | 'ios';
}): NativeNotificationAdapter => {
  const channel = async () => {
    if(platform === 'android') {
      await notifications.setNotificationChannelAsync(androidChannelId, {
        importance: notifications.AndroidImportance.DEFAULT, name: androidChannelName
      });
    }
  };
  const token = (value: {data: unknown; type: string}): NativePushToken => {
    if(!value || value.type !== platform || typeof value.data !== 'string' || !value.data) {
      throw new Error('Invalid native token');
    }
    if(platform === 'ios' && apnsEnvironment !== 'production' && apnsEnvironment !== 'sandbox') {
      throw new Error('APNs environment required');
    }
    return platform === 'ios'
      ? {apnsEnvironment, platform: 'IOS', token: value.data} : {platform: 'ANDROID', token: value.data};
  };
  return {
    clearInitialResponse: () => notifications.clearLastNotificationResponseAsync(),
    getInitialResponse: async () => {
      const response = await notifications.getLastNotificationResponseAsync() as any;
      return envelope(response?.notification);
    },
    getPermission: async () => permission(await notifications.getPermissionsAsync()),
    getToken: async () => {
      await channel();
      return token(await notifications.getDevicePushTokenAsync());
    },
    onOpened: (listener) => {
      const subscription = notifications.addNotificationResponseReceivedListener((response) => {
        listener(envelope(response?.notification));
      });
      return () => subscription.remove();
    },
    onReceived: (listener) => {
      const subscription = notifications.addNotificationReceivedListener((notification) => {
        listener(envelope(notification));
      });
      return () => subscription.remove();
    },
    onTokenChanged: (listener) => {
      const subscription = notifications.addPushTokenListener((value) => {
        try {
          listener(token(value));
        } catch{
          // Ignore mismatched/non-native tokens; never expose their value in diagnostics.
        }
      });
      return () => subscription.remove();
    },
    requestPermission: async () => {
      await channel();
      return permission(await notifications.requestPermissionsAsync());
    }
  };
};
