export const nativePushContractFixture = {
  notification: {
    body: 'Open the app', createdAt: '2026-10-02T12:00:00Z',
    data: {conversationId: 'chat-1', flags: [true, null], nested: {count: 2}},
    kind: 'MESSAGE', notificationId: 'contract-1', title: 'New message', version: 1 as const
  },
  recipientUserId: 'user-1', scope: {appId: 'pulsify', environment: 'dev'}
};
