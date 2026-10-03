import {describe, expect, it} from 'vitest';

import {normalizeNativeNotification, parseNativePushEnvelope} from './envelope.js';
import {nativePushContractFixture} from './nativePushContract.fixture.js';

describe('native notification ingress validation', () => {
  it('accepts the backend wire contract including nested JSON', () => {
    const parsed = parseNativePushEnvelope(JSON.stringify(nativePushContractFixture));

    expect(parsed?.notification.data).toEqual({conversationId: 'chat-1', flags: [true, null], nested: {count: 2}});
    expect(parsed?.notification.version).toBe(1);
    expect(parsed?.recipientUserId).toBe('user-1');
  });

  it('rejects scalar custom data instead of treating it as a record', () => {
    for(const data of [1, true, 'value']) {
      expect(normalizeNativeNotification({
        body: 'hello', createdAt: '2026-10-02T12:00:00Z', data,
        kind: 'MESSAGE', notificationId: 'id', version: 1
      })).toBeNull();
    }
  });

  it('maps existing Metropolis fields without changing their ID', () => {
    expect(normalizeNativeNotification({added: 0, content: 'hello', notificationId: 'old', type: 'MESSAGE'}))
      .toEqual({body: 'hello', createdAt: '1970-01-01T00:00:00.000Z', kind: 'MESSAGE', notificationId: 'old', title: '', version: 1});
  });

  it('returns null for malformed payloads rather than throwing during native callbacks', () => {
    for(const payload of [null, false, 'bad-json', '{', {notification: {version: 2}},
      {added: 1e99, content: 'bad', notificationId: 'bad', type: 'MESSAGE'}]) {
      expect(normalizeNativeNotification(payload)).toBeNull();
      expect(parseNativePushEnvelope(payload)).toBeNull();
    }
  });
});
