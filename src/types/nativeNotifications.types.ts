export type JsonValue = null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue};
export type PushScope = {appId: string; environment: string};
export type PushActor = {sessionId: string; userId: string};
export type NativePlatform = 'ANDROID' | 'IOS';
export type NativePermission = 'denied' | 'granted' | 'undetermined';
export type NativePushRegistrationInput = {
  apnsEnvironment?: 'production' | 'sandbox';
  installationId: string;
  platform: NativePlatform;
  token: string;
};
export type NativePushRegistration = {
  createdAt: string;
  enabled: boolean;
  installationId: string;
  platform: NativePlatform;
  registrationId: string;
  revision: number;
  updatedAt: string;
};
export type NativeNotification = {
  body: string;
  createdAt: string;
  data?: Record<string, JsonValue>;
  kind: string;
  notificationId: string;
  title: string;
  version: 1;
};
export type NativePushEnvelope = {notification: NativeNotification; recipientUserId: string; scope: PushScope};
export type NativePushToken = Omit<NativePushRegistrationInput, 'installationId'>;
export interface NativeNotificationAdapter {
  clearInitialResponse(): Promise<void>;
  getInitialResponse(): Promise<unknown>;
  getPermission(): Promise<NativePermission>;
  getToken(): Promise<NativePushToken>;
  onOpened(listener: (payload: unknown) => void): () => void;
  onReceived(listener: (payload: unknown) => void): () => void;
  onTokenChanged(listener: (token: NativePushToken) => void): () => void;
  requestPermission(): Promise<NativePermission>;
}
export interface NativeNotificationActions {
  register(input: NativePushRegistrationInput): Promise<NativePushRegistration>;
  unregister(registrationId: string, revision?: number): Promise<boolean>;
}
export interface NativeNotificationController {
  ingest(payload: unknown, source: 'native' | 'websocket'): Promise<boolean>;
  open(payload: unknown): Promise<boolean>;
  requestPermission(): Promise<NativePermission>;
  start(binding: PushScope & PushActor & {installationId: string}): Promise<void>;
  stop(): Promise<void>;
}
