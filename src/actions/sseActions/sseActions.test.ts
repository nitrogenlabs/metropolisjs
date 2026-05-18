import {beforeEach, describe, expect, it, vi} from 'vitest';

const createFlux = () => ({
  dispatch: vi.fn(),
  getState: vi.fn((path: string) => {
    if(path === 'app.config') {
      return {app: {urls: {websocket: 'wss://example.com/ws'}}};
    }
    if(path === 'user.session.token') {
      return 'token-1';
    }
    if(path === 'user.session.personaId') {
      return 'persona-1';
    }
    if(path === 'user.session.userId') {
      return 'user-1';
    }
    return undefined;
  })
});

describe('createSSEActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('covers SSE connection lifecycle and message dispatch', async () => {
    const createdSources: any[] = [];
    class MockEventSource {
      static CONNECTING = 0;
      static OPEN = 1;
      readyState = MockEventSource.OPEN;
      onerror?: (event: Event) => void;
      onmessage?: (event: MessageEvent) => void;
      onopen?: (event: Event) => void;
      close = vi.fn();

      constructor(public url: string, public options: any) {
        createdSources.push(this);
      }
    }
    vi.stubGlobal('EventSource', MockEventSource);
    const {createSSEActions} = await import('./sseActions.js');
    const flux = createFlux();
    const onMessage = vi.fn();
    const onOpen = vi.fn();
    const onError = vi.fn();
    const actions = createSSEActions(flux as any, {
      onError,
      onMessage,
      onOpen,
      sseOptions: {maxRetries: 1, retryInterval: 10, timeout: 20, url: 'https://example.com/events'}
    });
    const customHandler = vi.fn();

    actions.addEventListener('custom', customHandler);
    await actions.connect();
    expect(actions.isConnected()).toBe(true);

    createdSources[0].onopen?.(new Event('open'));
    createdSources[0].onmessage?.({data: 'payload', lastEventId: 'event-1', type: 'custom'} as MessageEvent);
    expect(onOpen).toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith({data: 'payload', event: 'custom', id: 'event-1'});
    expect(customHandler).toHaveBeenCalled();

    actions.removeEventListener('custom', customHandler);
    actions.sendMessage('audit', 'log');
    expect(flux.dispatch).toHaveBeenCalledWith({data: 'audit', eventType: 'log', type: 'SSE_MESSAGE_SENT'});

    createdSources[0].onerror?.(new Event('error'));
    expect(onError).toHaveBeenCalled();
    vi.advanceTimersByTime(10);

    actions.updateSSEOptions({sseOptions: {url: 'https://example.com/next'}});
    actions.disconnect();
    await expect(actions.connect({url: ''})).rejects.toThrow('SSE URL is required');
  });

  it('throws when sending before the SSE connection is open', async () => {
    const {createSSEActions} = await import('./sseActions.js');
    const actions = createSSEActions(createFlux() as any, {
      sseOptions: {url: 'https://example.com/events'}
    });

    expect(() => actions.sendMessage('audit')).toThrow('SSE connection not established');
  });

  it('dispatches an error when EventSource creation fails', async () => {
    class ThrowingEventSource {
      static CONNECTING = 0;
      static OPEN = 1;

      constructor() {
        throw new Event('blocked');
      }
    }
    vi.stubGlobal('EventSource', ThrowingEventSource);
    const {createSSEActions} = await import('./sseActions.js');
    const flux = createFlux();
    const onError = vi.fn();
    const actions = createSSEActions(flux as any, {
      onError,
      sseOptions: {url: 'https://example.com/events'}
    });

    await expect(actions.connect()).rejects.toMatchObject({type: 'blocked'});
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({type: 'blocked'}));
    expect(flux.dispatch).toHaveBeenCalledWith({
      type: 'SSE_CONNECTION_ERROR',
      error: expect.objectContaining({type: 'blocked'})
    });
  });
});
