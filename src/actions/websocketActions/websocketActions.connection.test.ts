import {FluxFramework} from '@nlabs/arkhamjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {websocket, WEBSOCKET_CONSTANTS} from '../../stores/websocketStore.js';
import {createWebsocketActions} from './websocketActions.js';

import type {WebsocketActionsOptions} from './websocketActions.js';

class Socket {
  static instances: Socket[] = [];
  onclose: ((event: {code: number; timeStamp: number}) => void) | null = null;
  onerror: ((event: {timeStamp: number}) => void) | null = null;
  onmessage: ((event: {data: string; timeStamp: number}) => void) | null = null;
  onopen: ((event: {timeStamp: number}) => void) | null = null;
  close = vi.fn((code = 1000) => this.onclose?.({code, timeStamp: 1}));
  send = vi.fn();
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    Socket.instances.push(this);
  }
}
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return {promise, resolve};
};
const setup = (options: WebsocketActionsOptions = {}) => {
  const dispatch = vi.fn();
  const flux = {dispatch, getState: (_key: string, fallback?: unknown) => fallback} as unknown as FluxFramework;
  return {actions: createWebsocketActions(flux, {authentication: 'none', connectTimeoutMs: 50,
    reconnect: false, register: false, url: 'wss://events.test/?ticket=opaque', ...options}), dispatch};
};

beforeEach(() => {
  vi.useFakeTimers();
  Socket.instances = [];
  vi.stubGlobal('WebSocket', Socket);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('asynchronous cookie ticket socket connection', () => {
  it('clears an attempt that expires synchronously during setup and permits a fresh explicit ticket connection', async () => {
    const resolveUrl = vi.fn(async () => 'wss://events.test/?ticket=fresh');
    const {actions} = setup({connectTimeoutMs: 1, resolveUrl});
    const clock = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(2).mockReturnValue(2);
    try {
      const expired = actions.wsConnect();

      expect(await expired).toBeNull();

      const fresh = actions.wsConnect();

      expect(fresh).not.toBe(expired);

      await vi.advanceTimersByTimeAsync(0);

      expect(resolveUrl).toHaveBeenCalledOnce();
      expect(Socket.instances.map((socket) => socket.url)).toEqual(['wss://events.test/?ticket=fresh']);

      Socket.instances[0].onopen?.({timeStamp: 2});

      expect(await fresh).not.toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      clock.mockRestore();
      actions.wsClose();
    }
  });

  it('delivers plain versioned hints through the shared Flux channel', async () => {
    const {actions, dispatch} = setup();
    const opening = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    const socket = Socket.instances[0];
    socket.onopen?.({timeStamp: 1});
    await opening;
    socket.onmessage?.({data: '{"type":"job","sequence":3}', timeStamp: 2});

    expect(dispatch).toHaveBeenLastCalledWith({data: {sequence: 3, type: 'job'}, timestamp: 2,
      type: 'WEBSOCKET_MESSAGE'});

    actions.wsClose();
  });

  it('resolves only after open, uses the exact ticket URL and sends no token or registration', async () => {
    const ticket = deferred<string>();
    const resolveUrl = vi.fn(() => ticket.promise);
    const {actions, dispatch} = setup({resolveUrl});
    const opening = actions.wsConnect();

    expect(actions.wsConnect()).toBe(opening);
    expect(Socket.instances).toHaveLength(0);

    ticket.resolve('wss://events.test/?ticket=one%20ticket');
    await vi.advanceTimersByTimeAsync(0);

    expect(Socket.instances).toHaveLength(1);

    const socket = Socket.instances[0];

    expect(socket.url).toBe('wss://events.test/?ticket=one%20ticket');

    socket.onopen?.({timeStamp: 1});

    expect(await opening).not.toBeNull();
    expect(resolveUrl).toHaveBeenCalledOnce();
    expect(socket.send).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({timestamp: 1, type: 'WEBSOCKET_OPEN'});
    expect(vi.getTimerCount()).toBe(0);
    expect(await actions.wsConnect()).not.toBeNull();

    actions.wsClose();
  });

  it('invalidates a held URL when closed before resolution and allows a fresh ticket', async () => {
    const ticket = deferred<string>();
    const resolveUrl = vi.fn().mockReturnValueOnce(ticket.promise).mockResolvedValue('wss://events.test/?ticket=fresh');
    const {actions} = setup({resolveUrl});
    const old = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);

    expect(resolveUrl).toHaveBeenCalledOnce();

    actions.wsClose();

    expect(await old).toBeNull();

    const fresh = actions.wsConnect();
    ticket.resolve('wss://events.test/?ticket=old');
    await vi.advanceTimersByTimeAsync(0);

    expect(Socket.instances.map((socket) => socket.url)).toEqual(['wss://events.test/?ticket=fresh']);

    Socket.instances[0].onopen?.({timeStamp: 1});

    expect(await fresh).not.toBeNull();

    actions.wsClose();
  });

  it('does not acquire a ticket for an attempt closed before its URL work begins', async () => {
    const resolveUrl = vi.fn(async () => 'wss://events.test/?ticket=fresh');
    const {actions} = setup({resolveUrl});
    const old = actions.wsConnect();
    actions.wsClose();

    expect(await old).toBeNull();

    const fresh = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);

    expect(resolveUrl).toHaveBeenCalledOnce();
    expect(Socket.instances.map((socket) => socket.url)).toEqual(['wss://events.test/?ticket=fresh']);

    Socket.instances[0].onopen?.({timeStamp: 1});

    expect(await fresh).not.toBeNull();

    actions.wsClose();
  });

  it.each(['close', 'error'] as const)('returns null on %s and never reconnects a consumed ticket', async (failure) => {
    const {actions} = setup();
    const opening = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    const socket = Socket.instances[0];
    if(failure === 'close') {
      socket.onclose?.({code: 1006, timeStamp: 1});
    } else {
      socket.onerror?.({timeStamp: 1});
    }

    expect(await opening).toBeNull();

    await vi.advanceTimersByTimeAsync(120000);

    expect(Socket.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closes on timeout while the URL resolver is still pending', async () => {
    const ticket = deferred<string>();
    const {actions} = setup({resolveUrl: () => ticket.promise});
    const opening = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(50);

    expect(await opening).toBeNull();

    ticket.resolve('wss://events.test/?ticket=expired');
    await vi.advanceTimersByTimeAsync(0);

    expect(Socket.instances).toHaveLength(0);
  });

  it('does not reconnect a ticket after an established connection fails, and resolves a fresh URL only explicitly', async () => {
    const resolveUrl = vi.fn().mockResolvedValueOnce('wss://events.test/?ticket=first')
      .mockResolvedValueOnce('wss://events.test/?ticket=second');
    const {actions} = setup({resolveUrl});
    const first = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    Socket.instances[0].onopen?.({timeStamp: 1});
    await first;
    Socket.instances[0].onclose?.({code: 1006, timeStamp: 2});
    await vi.advanceTimersByTimeAsync(120000);

    expect(Socket.instances).toHaveLength(1);
    expect(resolveUrl).toHaveBeenCalledOnce();

    const second = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);

    expect(Socket.instances[1].url).toBe('wss://events.test/?ticket=second');

    Socket.instances[1].onopen?.({timeStamp: 3});
    await second;
    actions.wsClose();
  });

  it('closes a socket that fails to open within the explicit budget', async () => {
    const {actions} = setup();
    const opening = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    const socket = Socket.instances[0];
    await vi.advanceTimersByTimeAsync(50);

    expect(await opening).toBeNull();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores every old callback after close and replacement', async () => {
    const {actions, dispatch} = setup();
    const first = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    const old = Socket.instances[0];
    old.onopen?.({timeStamp: 1});
    await first;
    const stale = {close: old.onclose!, error: old.onerror!, message: old.onmessage!, open: old.onopen!};
    actions.wsClose();
    const second = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    dispatch.mockClear();
    stale.open({timeStamp: 2});
    stale.error({timeStamp: 2});
    stale.message({data: '{"action":"notification.created","data":{"notification":{"content":"private"}}}', timeStamp: 2});
    stale.close({code: 1006, timeStamp: 2});

    expect(dispatch).not.toHaveBeenCalled();

    Socket.instances[1].onopen?.({timeStamp: 3});

    expect(await second).not.toBeNull();

    actions.wsClose();
  });

  it.each([undefined, '', 'reject'])('refuses an unavailable resolved URL %s', async (value) => {
    const {actions} = setup({resolveUrl: async () => {
      if(value === 'reject') {
        throw new Error('Private failure');
      }
      return value;
    }});

    expect(await actions.wsConnect()).toBeNull();
    expect(Socket.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves zero as disabled and bounds durations above the timer limit', async () => {
    const disabled = setup({connectTimeoutMs: 0});
    const opening = disabled.actions.wsConnect();
    await vi.advanceTimersByTimeAsync(2147483648);

    expect(vi.getTimerCount()).toBe(0);

    Socket.instances[0].onopen?.({timeStamp: 1});
    await opening;
    disabled.actions.wsClose();
    const large = setup({connectTimeoutMs: 2147483648});
    const later = large.actions.wsConnect();
    await vi.advanceTimersByTimeAsync(2147483647);

    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(await later).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([-1, Infinity, NaN])('refuses invalid connect duration %s', (connectTimeoutMs) => {
    expect(() => setup({connectTimeoutMs})).toThrow('Invalid WebSocket connect timeout');
  });

  it('does not close a replacement when an obsolete URL resolver rejects', async () => {
    let reject!: (reason: Error) => void;
    const old = new Promise<string>((_resolve, failed) => {
      reject = failed;
    });
    const {actions} = setup({resolveUrl: vi.fn().mockReturnValueOnce(old).mockResolvedValue('wss://fresh.test')});
    const first = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    actions.wsClose();

    expect(await first).toBeNull();

    const replacement = actions.wsConnect();
    await vi.advanceTimersByTimeAsync(0);
    reject(new Error('Old private failure'));
    await vi.advanceTimersByTimeAsync(0);
    Socket.instances[0].onopen?.({timeStamp: 1});

    expect(await replacement).not.toBeNull();
    expect(Socket.instances[0].close).not.toHaveBeenCalled();

    actions.wsClose();
  });
});

describe('existing bearer and message compatibility with the native transport port', () => {
  const bearer = () => {
    const dispatch = vi.fn();
    const flux = {dispatch, getState: (key: string, fallback?: unknown) => {
      if(key === 'user.session.token') {
        return 'bearer';
      }
      if(key === 'app.config') {
        return {app: {urls: {websocket: 'wss://bearer.test?existing=1'}}};
      }
      return fallback;
    }} as unknown as FluxFramework;
    return {actions: createWebsocketActions(flux), dispatch};
  };

  it('automatically connects queued sends and retains default registration before application frames', () => {
    const {actions} = bearer();
    actions.wsSend({action: 'queued'});
    const socket = Socket.instances[0];

    expect(socket.url).toContain('&token=bearer&clientId=');

    socket.onopen?.({timeStamp: 1});

    expect(socket.send.mock.calls.map(([frame]) => JSON.parse(frame).action)).toEqual(['websocketConnect', 'queued']);

    actions.sendTyping('conversation', false);

    expect(JSON.parse(socket.send.mock.calls.at(-1)![0])).toEqual({action: 'messageTyping', data: {
      conversationId: 'conversation', isTyping: false, name: '', personaId: '', userId: '', username: '', users: []
    }});

    actions.wsClose();
  });

  it('preserves user typing expiry and resets it on a repeated typing hint', async () => {
    const {actions, dispatch} = bearer();
    const receive = (isTyping: boolean) => actions.onReceive({data: JSON.stringify({action: 'message.typing',
      data: {typing: {conversationId: 'c', isTyping, userId: 'u'}}})});
    receive(true);
    receive(true);
    await vi.advanceTimersByTimeAsync(60000);

    expect(dispatch).toHaveBeenLastCalledWith({type: 'MESSAGE_TYPING_STATUS_UPDATE',
      typing: {conversationId: 'c', isTyping: false, personaId: '', userId: 'u'}});

    receive(true);
    actions.wsClose();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles complete conversations and messages without a typing identity', () => {
    const {actions, dispatch} = bearer();
    actions.onReceive({data: JSON.stringify({action: 'message.created', data: {
      conversation: {content: 'original', conversationId: 'c'}, message: {content: 'message', conversationId: 'c'}
    }})});

    expect(dispatch).toHaveBeenCalledWith({conversation: {content: 'original', conversationId: 'c'},
      type: 'MESSAGE_GET_CONVO_LIST_SUCCESS'});

    actions.onReceive({data: JSON.stringify({action: 'message.created', data: {message: {conversationId: 'c', userId: 'u'}}})});

    expect(dispatch).toHaveBeenLastCalledWith({type: 'MESSAGE_TYPING_STATUS_UPDATE',
      typing: {conversationId: 'c', isTyping: false, personaId: '', userId: 'u'}});

    actions.onReceive({data: null});
    actions.onReceive({data: 'null'});
    actions.sendNotification({added: 1, modified: 2, notificationId: 'existing'});

    expect(Socket.instances).toHaveLength(1);

    actions.wsClose();
  });
});

describe('shared connection store and current-generation close events', () => {
  const initialized = async (mode: 'legacy' | 'ticket', reconnect = true) => {
    const flux = new FluxFramework();
    await flux.init({name: 'websocket-store-contract', stores: [websocket]});
    const closed = vi.fn();
    const errors = vi.fn();
    flux.on(WEBSOCKET_CONSTANTS.CLOSE, closed);
    flux.on(WEBSOCKET_CONSTANTS.ERROR, errors);
    const actions = createWebsocketActions(flux, {reconnect, url: 'wss://events.test/socket',
      ...mode === 'ticket' ? {authentication: 'none' as const, register: false} : {}});
    if(mode === 'legacy') {
      actions.wsInit('bearer');
    } else {
      const opening = actions.wsConnect();
      await vi.advanceTimersByTimeAsync(0);
      Socket.instances[0].onopen?.({timeStamp: 1});
      await opening;
    }
    if(mode === 'legacy') {
      Socket.instances[0].onopen?.({timeStamp: 1});
    }
    await vi.advanceTimersByTimeAsync(0);

    expect(flux.getState('websocket.isOpen')).toBe(true);

    return {actions, closed, errors, flux};
  };

  it.each(['legacy', 'ticket'] as const)('%s explicit close updates the real store and dispatches CLOSE exactly once', async (mode) => {
    const {actions, closed, flux} = await initialized(mode);
    const oldClose = Socket.instances[0].onclose!;
    actions.wsClose();
    await vi.advanceTimersByTimeAsync(0);

    expect(flux.getState('websocket.isOpen')).toBe(false);
    expect(closed).toHaveBeenCalledOnce();

    actions.wsClose();
    oldClose({code: 1006, timeStamp: 2});
    await vi.advanceTimersByTimeAsync(0);

    expect(closed).toHaveBeenCalledOnce();

    if(mode === 'legacy') {
      actions.wsInit('replacement');
    } else {
      void actions.wsConnect();
    }
    await vi.advanceTimersByTimeAsync(0);
    Socket.instances[1].onopen?.({timeStamp: 3});
    await vi.advanceTimersByTimeAsync(0);
    oldClose({code: 1006, timeStamp: 4});
    await vi.advanceTimersByTimeAsync(0);

    expect(flux.getState('websocket.isOpen')).toBe(true);
    expect(closed).toHaveBeenCalledOnce();

    actions.wsClose();
  });

  it.each(['legacy', 'ticket'] as const)('%s terminal error closes the real store and emits one CLOSE plus ERROR', async (mode) => {
    const {actions, closed, errors, flux} = await initialized(mode, false);
    const socket = Socket.instances[0];
    socket.onerror?.({timeStamp: 2});
    await vi.advanceTimersByTimeAsync(0);

    expect(socket.close).toHaveBeenCalledOnce();
    expect(flux.getState('websocket.isOpen')).toBe(false);
    expect(closed).toHaveBeenCalledOnce();
    expect(errors).toHaveBeenCalledOnce();

    socket.onclose?.({code: 1006, timeStamp: 3});
    actions.wsClose();
    await vi.advanceTimersByTimeAsync(120000);

    expect(closed).toHaveBeenCalledOnce();
    expect(Socket.instances).toHaveLength(1);
  });
});
