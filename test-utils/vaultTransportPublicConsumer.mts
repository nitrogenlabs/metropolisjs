import {FluxFramework} from '@nlabs/arkhamjs';
import {restRequest} from '@nlabs/metropolisjs';
import {websocket, WEBSOCKET_CONSTANTS} from '@nlabs/metropolisjs/stores';
import {ApiError} from '@nlabs/rip-hunter/errors';
import assert from 'node:assert/strict';

const original = globalThis.fetch;
const qualify = async (status: number): Promise<void> => {
  const flux = new FluxFramework();
  await flux.setState('app.networkType', 'wifi');
  let requests = 0;
  const body = {error: 'Synthetic domain refusal', state: 'frozen'};
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://fixture.invalid/domain');
    assert.equal(options?.method, 'POST');
    requests++;
    return Response.json(body, {status});
  };
  await assert.rejects(restRequest(flux, 'https://fixture.invalid/domain', 'POST', {value: 'synthetic'},
    {cache: false, queueOffline: false, timeout: 0}), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, status);
    assert.deepEqual(error.responseBody, body);
    return true;
  });
  assert.equal(requests, 1);
};
try {
  await qualify(400);
  await qualify(403);
  await qualify(409);
  await qualify(413);
  await qualify(429);
  await qualify(503);
} finally {
  globalThis.fetch = original;
}
process.stdout.write('Installed REST transport preserves public ApiError identity, status and JSON refusals with one request.\n');

const {createWebsocketActions} = await import('@nlabs/metropolisjs/actions');
type SocketActions = ReturnType<typeof createWebsocketActions>;
type PublicConnection = Awaited<ReturnType<SocketActions['wsConnect']>>;
const originalSocket = globalThis.WebSocket;
let constructed: (() => void) | undefined;
const native: {url: string; sent: string[]; onopen?: (event: {timeStamp: number}) => void;
  onerror?: (event: {timeStamp: number}) => void;
  onmessage?: (event: {data: string; timeStamp: number}) => void;
  onclose?: (event: {code: number; timeStamp: number}) => void;
  close: (code?: number) => void;}[] = [];
class TestSocket {
  readonly url: string;
  sent: string[] = [];
  onopen?: (event: {timeStamp: number}) => void;
  onerror?: (event: {timeStamp: number}) => void;
  onmessage?: (event: {data: string; timeStamp: number}) => void;
  onclose?: (event: {code: number; timeStamp: number}) => void;
  constructor(url: string) {
    this.url = url;
    native.push(this);
    constructed?.();
  }
  send = (value: string) => {
    this.sent.push(value);
  };
  close = (code = 1000) => {
    this.onclose?.({code, timeStamp: 1});
  };
}
try {
  globalThis.WebSocket = TestSocket as unknown as typeof WebSocket;
  const flux = new FluxFramework();
  await flux.addStores([websocket]);
  let closes = 0;
  flux.on(WEBSOCKET_CONSTANTS.CLOSE, () => {
    closes++;
  });
  const messages: unknown[] = [];
  let delivered!: () => void;
  const delivery = new Promise<void>((resolve) => {
    delivered = resolve;
  });
  flux.on('WEBSOCKET_MESSAGE', (event) => {
    messages.push(event);
    delivered();
  });
  const construction = new Promise<void>((resolve) => {
    constructed = resolve;
  });
  let reached!: () => void;
  const requested = new Promise<void>((resolve) => {
    reached = resolve;
  });
  let release!: (url: string) => void;
  const ticket = new Promise<string>((resolve) => {
    release = resolve;
  });
  const actions = createWebsocketActions(flux, {authentication: 'none', connectTimeoutMs: 30000,
    reconnect: false, register: false, resolveUrl: async () => {
      reached();
      return ticket;
    }});
  const opening: Promise<PublicConnection> = actions.wsConnect();
  assert.equal(actions.wsConnect(), opening);
  await requested;
  assert.equal(native.length, 0);
  release('wss://events.test/?ticket=opaque%20ticket');
  await construction;
  const socket = native[0];
  assert.ok(socket);
  assert.equal(socket.url, 'wss://events.test/?ticket=opaque%20ticket');
  socket.onopen?.({timeStamp: 1});
  assert.ok(await opening);
  assert.equal(flux.getState('websocket.isOpen'), true);
  assert.deepEqual(socket.sent, []);
  socket.onmessage?.({data: '{"type":"job","sequence":3}', timeStamp: 2});
  await delivery;
  assert.equal(messages.length, 1);
  actions.wsClose();
  assert.equal(flux.getState('websocket.isOpen'), false);
  assert.equal(closes, 1);
  actions.wsClose();
  socket.onclose?.({code: 1000, timeStamp: 3});
  assert.equal(closes, 1);
  const replacementConstruction = new Promise<void>((resolve) => {
    constructed = resolve;
  });
  const replacementOpening = actions.wsConnect();
  await replacementConstruction;
  const replacement = native[1];
  assert.ok(replacement);
  replacement.onopen?.({timeStamp: 4});
  assert.ok(await replacementOpening);
  socket.onclose?.({code: 1000, timeStamp: 5});
  assert.equal(flux.getState('websocket.isOpen'), true);
  assert.equal(closes, 1);
  actions.wsClose();
  assert.equal(flux.getState('websocket.isOpen'), false);
  assert.equal(closes, 2);

  const bearerFlux = new FluxFramework();
  await bearerFlux.addStores([websocket]);
  let bearerCloses = 0;
  bearerFlux.on(WEBSOCKET_CONSTANTS.CLOSE, () => {
    bearerCloses++;
  });
  const bearerActions = createWebsocketActions(bearerFlux, {url: 'wss://bearer.test/'});
  assert.ok(bearerActions.wsInit('synthetic-token'));
  const bearerSocket = native[2];
  assert.ok(bearerSocket);
  bearerSocket.onopen?.({timeStamp: 6});
  assert.equal(bearerFlux.getState('websocket.isOpen'), true);
  bearerActions.wsClose();
  assert.equal(bearerFlux.getState('websocket.isOpen'), false);
  assert.equal(bearerCloses, 1);
  bearerActions.wsClose();
  bearerSocket.onclose?.({code: 1000, timeStamp: 7});
  assert.equal(bearerCloses, 1);

  const errorFlux = new FluxFramework();
  await errorFlux.addStores([websocket]);
  let errorCloses = 0;
  let errors = 0;
  errorFlux.on(WEBSOCKET_CONSTANTS.CLOSE, () => {
    errorCloses++;
  });
  errorFlux.on(WEBSOCKET_CONSTANTS.ERROR, () => {
    errors++;
  });
  const errorActions = createWebsocketActions(errorFlux, {authentication: 'none', connectTimeoutMs: 0,
    reconnect: false, register: false, url: 'wss://events.test/?ticket=terminal'});
  const errorConstruction = new Promise<void>((resolve) => {
    constructed = resolve;
  });
  const errorOpening = errorActions.wsConnect();
  await errorConstruction;
  const errorSocket = native[3];
  assert.ok(errorSocket);
  errorSocket.onopen?.({timeStamp: 4});
  assert.ok(await errorOpening);
  assert.equal(errorFlux.getState('websocket.isOpen'), true);
  errorSocket.onerror?.({timeStamp: 5});
  assert.equal(errorFlux.getState('websocket.isOpen'), false);
  assert.equal(errorCloses, 1);
  assert.equal(errors, 1);
  errorSocket.onclose?.({code: 1000, timeStamp: 6});
  errorSocket.onerror?.({timeStamp: 7});
  errorActions.wsClose();
  assert.equal(errorCloses, 1);
  assert.equal(errors, 1);
  const originalPerformance = globalThis.performance;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const scheduled = new Set<unknown>();
  let clockReads = 0;
  let ticketRequests = 0;
  let deadlineActions: SocketActions | undefined;
  try {
    globalThis.performance = {now: () => (clockReads++ === 0 ? 0 : 2)} as Performance;
    globalThis.setTimeout = (() => {
      const handle = 1 as unknown as ReturnType<typeof setTimeout>;
      scheduled.add(handle);
      return handle;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = (handle) => {
      scheduled.delete(handle);
    };
    const deadlineFlux = new FluxFramework();
    await deadlineFlux.addStores([websocket]);
    deadlineActions = createWebsocketActions(deadlineFlux, {authentication: 'none', connectTimeoutMs: 1,
      reconnect: false, register: false, resolveUrl: async () => {
        ticketRequests++;
        return 'wss://events.test/?ticket=after-synchronous-expiry';
      }});
    const beforeExpirySockets = native.length;
    const expired = deadlineActions.wsConnect();
    assert.equal(await expired, null);
    assert.equal(native.length, beforeExpirySockets);
    const requestsBeforeRetry = ticketRequests;
    const afterExpiryConstruction = new Promise<void>((resolve) => {
      constructed = resolve;
    });
    const afterExpiry = deadlineActions.wsConnect();
    assert.notEqual(afterExpiry, expired);
    await afterExpiryConstruction;
    const afterExpirySocket = native.at(-1);
    assert.ok(afterExpirySocket);
    assert.equal(afterExpirySocket.url, 'wss://events.test/?ticket=after-synchronous-expiry');
    afterExpirySocket.onopen?.({timeStamp: 8});
    assert.ok(await afterExpiry);
    assert.equal(native.length, beforeExpirySockets + 1);
    assert.equal(ticketRequests, requestsBeforeRetry + 1);
    assert.equal(deadlineFlux.getState('websocket.isOpen'), true);
    assert.equal(scheduled.size, 0);
    deadlineActions.wsClose();
    assert.equal(deadlineFlux.getState('websocket.isOpen'), false);
  } finally {
    deadlineActions?.wsClose();
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.performance = originalPerformance;
    globalThis.setTimeout = originalSetTimeout;
  }
  process.stdout.write('Public opaque ticket connection preserves lifecycle events and recovers with a fresh explicit attempt after synchronous deadline expiry.\n');
} finally {
  globalThis.WebSocket = originalSocket;
}
