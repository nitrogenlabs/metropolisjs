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
    expect(socketteInstances[1]?.url).toBe('wss://example.com/socket?token=token-2');
  });
});
