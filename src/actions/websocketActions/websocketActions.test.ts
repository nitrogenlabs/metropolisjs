import {beforeEach, describe, expect, it, vi} from 'vitest';

const socketteInstances: Array<{
  close: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  options: Record<string, unknown>;
  url: string;
}> = [];

vi.mock('sockette', () => ({
  default: class SocketteMock {
    close = vi.fn();
    json = vi.fn();
    options: Record<string, unknown>;
    url: string;

    constructor(url: string, options: Record<string, unknown>) {
      this.options = options;
      this.url = url;
      socketteInstances.push(this);
    }
  }
}));

const {createWebsocketActions} = await import('./websocketActions.js');
const {NOTIFICATION_CONSTANTS} = await import('../../stores/notificationStore.js');
const {WEBSOCKET_CONSTANTS} = await import('../../stores/websocketStore.js');

const createFlux = () => ({
  dispatch: vi.fn((payload) => payload),
  getState: vi.fn((key?: string, fallback?: unknown) => {
    if(key === 'app.config') {
      return {
        app: {
          urls: {
            websocket: 'wss://example.com/socket'
          }
        }
      };
    }

    if(key === 'user.session.token') {
      return 'token-1';
    }

    return fallback;
  })
});

describe('createWebsocketActions', () => {
  beforeEach(() => {
    socketteInstances.length = 0;
  });

  it('sends notifications over websocket and dispatches them locally', () => {
    const flux = createFlux();
    const actions = createWebsocketActions(flux as any);

    actions.wsInit('token-1');
    const notification = actions.sendNotification({content: 'hello'});
    const onOpen = socketteInstances[0]?.options?.onopen as (event: {timeStamp: number}) => void;

    onOpen?.({timeStamp: 1});

    expect(notification).toEqual(expect.objectContaining({content: 'hello'}));
    expect(flux.dispatch).toHaveBeenCalledWith({
      notification: expect.objectContaining({content: 'hello'}),
      type: NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS
    });
    expect(socketteInstances[0]?.json).toHaveBeenCalledWith({
      action: 'notification.created',
      data: {
        notification: expect.objectContaining({content: 'hello'})
      }
    });
  });

  it('dispatches websocket notifications received from other clients', () => {
    const flux = createFlux();
    const actions = createWebsocketActions(flux as any);

    actions.onReceive({
      data: JSON.stringify({
        action: 'notification.created',
        data: {
          notification: {
            content: 'remote hello',
            notificationId: 'notification-remote-1'
          }
        }
      }),
      timeStamp: 1234
    });

    expect(flux.dispatch).toHaveBeenNthCalledWith(1, {
      data: {
        action: 'notification.created',
        data: {
          notification: {
            content: 'remote hello',
            notificationId: 'notification-remote-1'
          }
        }
      },
      timestamp: 1234,
      type: WEBSOCKET_CONSTANTS.MESSAGE
    });
    expect(flux.dispatch).toHaveBeenNthCalledWith(2, {
      notification: {
        content: 'remote hello',
        notificationId: 'notification-remote-1'
      },
      type: NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS
    });
  });

  it('reconnects when the websocket token changes', () => {
    const flux = createFlux();
    const actions = createWebsocketActions(flux as any);

    const firstSocket = actions.wsInit('token-1');
    const secondSocket = actions.wsInit('token-2');

    expect(firstSocket).not.toBeNull();
    expect(socketteInstances[0]?.close).toHaveBeenCalledWith(1000, 'metropolis_close');
    expect(secondSocket).not.toBe(firstSocket);
    expect(socketteInstances[1]?.url).toContain('wss://example.com/socket?');
    expect(socketteInstances[1]?.url).toContain('token=token-2');
    expect(socketteInstances[1]?.url).toContain('clientId=');
  });

  it('skips invalid sends and init, reuses existing sockets, and dispatches close/error events', () => {
    const flux = createFlux();
    const actions = createWebsocketActions(flux as any);

    expect(actions.sendNotification(null as any)).toBeNull();
    expect(createWebsocketActions({
      ...flux,
      getState: vi.fn((key?: string, fallback?: unknown) => {
        if(key === 'app.config') {
          return {app: {urls: {websocket: 'wss://example.com/ws'}}};
        }
        return fallback;
      })
    } as any).wsInit('')).toBeNull();

    const firstSocket = actions.wsInit('token-1', 'persona-1');
    const secondSocket = actions.wsInit('token-1', 'persona-1');
    expect(secondSocket).toBe(firstSocket);

    actions.onError({timeStamp: 2});
    actions.onClose({timeStamp: 3});

    expect(flux.dispatch).toHaveBeenCalledWith({timestamp: 2, type: 'WEBSOCKET_ERROR'});
    expect(flux.dispatch).toHaveBeenCalledWith({timestamp: 3, type: 'WEBSOCKET_CLOSE'});
  });

  it('ignores incomplete websocket payloads', () => {
    const flux = createFlux();
    const actions = createWebsocketActions(flux as any);

    actions.sendTyping('', true);
    actions.onReceive({data: JSON.stringify({action: 'message.created', data: {message: {content: 'missing conversation'}}}), timeStamp: 1});
    actions.onReceive({data: JSON.stringify({action: 'message.typing', data: {typing: {conversationId: '', isTyping: true}}}), timeStamp: 2});
    actions.onReceive({data: JSON.stringify({action: 'notification.created', data: {notification: null}}), timeStamp: 3});
    actions.onReceive({data: JSON.stringify({action: 'video.processing.completed', data: {video: null}}), timeStamp: 4});

    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'WEBSOCKET_MESSAGE'}));
    expect(socketteInstances).toHaveLength(0);
  });

  it('covers send, receive, typing, notification, video, and close flows', () => {
    vi.useFakeTimers();
    const flux = createFlux();
    const actions = createWebsocketActions(flux as any);

    expect(actions.wsInit()).toBeDefined();
    expect(socketteInstances).toHaveLength(1);
    const socket = socketteInstances[0];

    actions.wsSend({action: 'queued'});
    (socket.options.onopen as any)({timeStamp: 1});
    expect(socket.json).toHaveBeenCalledWith(expect.objectContaining({action: 'websocketConnect'}));
    expect(socket.json).toHaveBeenCalledWith({action: 'queued'});

    actions.sendTyping('conversation-1', true, {personaId: 'persona-1', userId: 'user-1', users: [{userId: 'user-2'}]});
    expect(socket.json).toHaveBeenCalledWith(expect.objectContaining({action: 'messageTyping'}));

    const notification = actions.sendNotification({content: 'Hi'} as any);
    expect(notification?.notificationId).toBeTruthy();

    actions.onReceive({data: '', timeStamp: 2});
    actions.onReceive({data: '{bad', timeStamp: 3});
    actions.onReceive({
      timeStamp: 4,
      data: JSON.stringify({
        action: 'message.created',
        data: {
          message: {
            content: 'Hello',
            conversationId: 'conversation-1',
            messageId: 'message-1',
            user: {personaId: 'persona-1'},
            userId: 'user-1'
          }
        }
      })
    });
    actions.onReceive({
      timeStamp: 5,
      data: JSON.stringify({
        action: 'message.typing',
        data: {typing: {conversationId: 'conversation-1', isTyping: true, personaId: 'persona-1'}}
      })
    });
    actions.onReceive({
      timeStamp: 5.5,
      data: JSON.stringify({
        action: 'message.typing',
        data: {typing: {conversationId: 'conversation-1', isTyping: false, personaId: 'persona-1'}}
      })
    });
    actions.onReceive({
      timeStamp: 6,
      data: JSON.stringify({
        action: 'notification.created',
        data: {notification: {notificationId: 'notification-1'}}
      })
    });
    actions.onReceive({
      timeStamp: 7,
      data: JSON.stringify({
        action: 'video.processing.completed',
        data: {video: {videoId: 'video-1'}}
      })
    });
    vi.advanceTimersByTime(60000);

    actions.onError({timeStamp: 8});
    actions.onClose({timeStamp: 9});
    actions.wsClose();
    expect(socket.close).toHaveBeenCalledWith(1000, 'metropolis_close');
  });
});
