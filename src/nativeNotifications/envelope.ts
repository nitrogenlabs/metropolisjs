import type {NativeNotification, NativePushEnvelope} from '../types/nativeNotifications.types.js';

const json = (value: unknown, seen = new Set<object>()): boolean => {
  if(value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if(typeof value === 'number') {
    return Number.isFinite(value);
  }
  if(typeof value !== 'object' || seen.has(value)) {
    return false;
  }
  if(!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    return false;
  }
  seen.add(value);
  const valid = Object.values(value).every((item) => json(item, seen));
  seen.delete(value);
  return valid;
};

export const normalizeNativeNotification = (payload: unknown): NativeNotification | null => {
  if(!payload || typeof payload !== 'object') {
    return null;
  }
  const item = payload as Record<string, unknown>;
  const note = item.notification && typeof item.notification === 'object'
    ? item.notification as Record<string, unknown> : item;
  if(note.version !== undefined && note.version !== 1) {
    return null;
  }
  const {notificationId} = note;
  const title = typeof note.title === 'string' ? note.title : '';
  const body = typeof note.body === 'string' ? note.body : note.content;
  const kind = typeof note.kind === 'string' ? note.kind : note.type;
  let createdAt = typeof note.createdAt === 'string' ? note.createdAt : undefined;
  if(!createdAt && typeof note.added === 'number') {
    const date = new Date(note.added);
    if(Number.isFinite(date.getTime())) {
      createdAt = date.toISOString();
    }
  }
  if(typeof notificationId !== 'string' || !notificationId || typeof body !== 'string' ||
    typeof kind !== 'string' || !kind || !createdAt || !Number.isFinite(Date.parse(createdAt)) ||
    (note.data !== undefined && (!note.data || typeof note.data !== 'object' ||
      Array.isArray(note.data) || !json(note.data)))) {
    return null;
  }
  return {body, createdAt, ...(note.data !== undefined && {data: note.data as NativeNotification['data']}),
    kind, notificationId, title, version: 1};
};

export const parseNativePushEnvelope = (payload: unknown): NativePushEnvelope | null => {
  let value = payload;
  if(typeof value === 'string') {
    if(value.length > 8192) {
      return null;
    }
    try {
      value = JSON.parse(value);
    } catch{
      return null;
    }
  }
  if(!value || typeof value !== 'object' || !json(value)) {
    return null;
  }
  const item = value as NativePushEnvelope;
  const notification = normalizeNativeNotification(item.notification);
  if(!notification || item.notification.version !== 1 || typeof item.recipientUserId !== 'string' ||
    typeof item.scope?.appId !== 'string' || typeof item.scope?.environment !== 'string') {
    return null;
  }
  return {notification, recipientUserId: item.recipientUserId, scope: item.scope};
};
