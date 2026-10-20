/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

// @vitest-environment jsdom
import {render, waitFor} from '@nlabs/lex/test-react';
import {beforeEach, describe, expect, it} from '@nlabs/lex/test-vitest';

const apiMocks = vi.hoisted(() => ({
  refreshSession: vi.fn(async () => ({token: 'new-token'}))
}));

const reactFluxMocks = vi.hoisted(() => ({
  flux: undefined as any,
  state: new Map<string, unknown>()
}));

const personaMocks = vi.hoisted(() => ({
  syncPersonaTagsToSession: vi.fn(async () => undefined),
  syncPersonaToSession: vi.fn()
}));

const websocketMocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  wsClose: vi.fn(),
  wsInit: vi.fn()
}));

const rumMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  flush: vi.fn(),
  track: vi.fn()
}));

vi.mock('./utils/api.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./utils/api.js')>()),
  refreshSession: apiMocks.refreshSession
}));

vi.mock('./actions/personaActions/personaActions.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./actions/personaActions/personaActions.js')>()),
  syncPersonaTagsToSession: personaMocks.syncPersonaTagsToSession,
  syncPersonaToSession: personaMocks.syncPersonaToSession
}));

vi.mock('@nlabs/arkhamjs-utils-react', () => ({
  useFlux: () => reactFluxMocks.flux,
  useFluxState: (path: string, fallback?: unknown) => reactFluxMocks.state.get(path) ?? fallback
}));

vi.mock('./utils/actionFactory.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./utils/actionFactory.js')>()),
  createAction: vi.fn((actionType: string) => (actionType === 'awsRum' ? rumMocks : websocketMocks))
}));

const createFlux = (initialState: Record<string, unknown> = {}) => {
  const state = new Map<string, unknown>(Object.entries(initialState));
  const handlers = new Map<string, Array<(payload?: any) => void | Promise<void>>>();

  return {
    addMiddleware: vi.fn(),
    addStores: vi.fn(),
    dispatch: vi.fn(async (action: {[key: string]: unknown; type: string}) => action),
    getState: vi.fn((path: string, fallback?: unknown) => state.get(path) ?? fallback),
    getStore: vi.fn(),
    on: vi.fn((type: string, handler: (payload?: any) => void | Promise<void>) => {
      handlers.set(type, [...(handlers.get(type) || []), handler]);
      return () => undefined;
    }),
    setState: vi.fn(async (path: string, value: unknown) => {
      state.set(path, value);
      return value;
    }),
    trigger: async (type: string, payload?: unknown) => {
      for(const handler of handlers.get(type) || []) {
        // Exercise the same ordered event callbacks as Flux.
        // eslint-disable-next-line no-await-in-loop
        await handler(payload);
      }
    }
  };
};

describe('index onInit', () => {
  it('preserves legacy healthy and nearing expiry bearer behavior', async () => {
    const {onInit} = await import('./index.js');
    await Promise.all([300000, 1800000].map(async (remaining) => {
      const now = Date.now();
      const flux = createFlux({
        'app.config': {app: {session: {maxMinutes: 60}}},
        'user.session': {expires: now + remaining, issued: now - 1800000, token: 'legacy'},
        'user.session.token': 'legacy'
      });
      await onInit(flux as any);
    }));

    expect(apiMocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('supports JWT-derived expiry and session defaults on the legacy boot path', async () => {
    const {onInit} = await import('./index.js');
    const now = Date.now();
    const token = `${btoa('{}')}.${btoa(JSON.stringify({exp: Math.floor(now / 1000) + 600}))}.sig`;
    const jwtOnly = createFlux({'user.session': {token}, 'user.session.token': token});
    await onInit(jwtOnly as any);
    const sameTimestamp = createFlux({
      'user.session': {expires: now + 120000, issued: now + 120000, token: 'legacy'},
      'user.session.token': 'legacy'
    });
    await onInit(sameTimestamp as any);

    expect(apiMocks.refreshSession).toHaveBeenCalledWith(jwtOnly, token, 15);
    expect(apiMocks.refreshSession).toHaveBeenCalledWith(sameTimestamp, 'legacy', 15);
  });

  it('patches optional legacy tag fields without leaking a missing owner session', async () => {
    const {onInit} = await import('./index.js');
    const flux = createFlux({'user.session': {tags: [{}, {tagId: 'empty-name'}, {name: 'Z'}]}});
    await onInit(flux as any);
    await flux.trigger('TAG_ADD_PERSONA_SUCCESS', {tag: {tagId: 'added'}});
    await flux.trigger('TAG_REMOVE_PERSONA_SUCCESS', {tag: {tagId: 'empty-name'}});

    expect((flux.getState('user.session') as {tags: unknown[]}).tags).toHaveLength(3);

    await flux.setState('user.session', false);
    await flux.trigger('TAG_ADD_PERSONA_SUCCESS', {tag: {tagId: 'next'}});
    await flux.setState('user.session', false);
    await flux.trigger('TAG_REMOVE_PERSONA_SUCCESS', {tag: {tagId: 'next'}});

    expect((flux.getState('user.session') as {tags: unknown[]}).tags).toEqual([]);
  });

  it('cleans up a provider unmounted while hydration is awaiting storage', async () => {
    const {Metropolis} = await import('./index.js');
    const flux = createFlux();
    let release: (() => void) | undefined;
    flux.setState.mockImplementationOnce(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    reactFluxMocks.flux = flux;
    const mounted = render(<Metropolis><div /></Metropolis>);
    mounted.unmount();
    release?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(flux.getState('app.sessionHydrated')).not.toBe(true);
  });

  it('handles persona events with embedded tags and tag patches without valid IDs', async () => {
    const {onInit} = await import('./index.js');
    const flux = createFlux({'user.session': {tags: [{name: 'Z', tagId: 'old'}, {name: 'A', tagId: 'new'}]}});
    await onInit(flux as any);
    await flux.trigger('PERSONA_ADD_ITEM_SUCCESS', {persona: {personaId: 'p', tags: []}});
    await flux.trigger('PERSONA_UPDATE_ITEM_SUCCESS', {});
    await flux.trigger('TAG_ADD_PERSONA_SUCCESS', {});
    await flux.trigger('TAG_REMOVE_PERSONA_SUCCESS', {});
    await flux.trigger('TAG_ADD_PERSONA_SUCCESS', {tag: {name: 'M', tagId: 'new'}});

    expect((flux.getState('user.session') as {tags: unknown[]}).tags).toEqual([{name: 'M', tagId: 'new'}, {name: 'Z', tagId: 'old'}]);

    await flux.trigger('TAG_REMOVE_PERSONA_SUCCESS', {tag: {tagId: 'old'}});

    expect((flux.getState('user.session') as {tags: unknown[]}).tags).toEqual([{name: 'M', tagId: 'new'}]);

    await flux.setState('user.session', undefined);
    await flux.trigger('TAG_ADD_PERSONA_SUCCESS', {tag: {name: 'Only', tagId: 'one'}});

    expect((flux.getState('user.session') as {tags: unknown[]}).tags).toEqual([{name: 'Only', tagId: 'one'}]);

    await flux.setState('user.session', undefined);
    await flux.trigger('TAG_REMOVE_PERSONA_SUCCESS', {tag: {tagId: 'one'}});

    expect((flux.getState('user.session') as {tags: unknown[]}).tags).toEqual([]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    reactFluxMocks.flux = undefined;
    reactFluxMocks.state = new Map<string, unknown>();
    rumMocks.track.mockReset();
  });

  it('registers stores and session/tag handlers once', async () => {
    const {onInit} = await import('./index.js');
    const {PERSONA_CONSTANTS, TAG_CONSTANTS, USER_CONSTANTS} = await import('./stores/index.js');
    const flux = createFlux({
      'app.config': {app: {session: {maxMinutes: 30, refreshWindowMinutes: 10}}},
      'user.session': {personaId: 'persona-1', tags: [{name: 'Old', tagId: 'tag-1'}]},
      'user.session.token': ''
    });

    await onInit(flux as any);

    expect(flux.addStores).toHaveBeenCalledTimes(1);
    expect(flux.setState).toHaveBeenCalledWith('app.metropolisInitialized', true);

    await flux.trigger(PERSONA_CONSTANTS.ADD_ITEM_SUCCESS, {persona: {personaId: 'persona-1'}});
    await flux.trigger(PERSONA_CONSTANTS.UPDATE_ITEM_SUCCESS, {persona: {personaId: 'persona-1'}});
    await flux.trigger(TAG_CONSTANTS.ADD_PERSONA_SUCCESS, {tag: {name: 'New', tagId: 'tag-2'}});
    await flux.trigger(TAG_CONSTANTS.REMOVE_PERSONA_SUCCESS, {tag: {tagId: 'tag-1'}});
    await flux.trigger(USER_CONSTANTS.SIGN_OUT_SUCCESS);

    expect(personaMocks.syncPersonaToSession).toHaveBeenCalledTimes(2);
    expect(personaMocks.syncPersonaTagsToSession).toHaveBeenCalledTimes(2);
    expect(flux.dispatch).toHaveBeenCalled();

    await onInit(flux as any);

    expect(flux.addStores).toHaveBeenCalledTimes(1);
  });

  it('clears missing-expiry and expired sessions instead of renewing inactivity', async () => {
    const {onInit} = await import('./index.js');
    const missingExpiresFlux = createFlux({
      'app.config': {app: {session: {maxMinutes: 45}}},
      'app.metropolisInitialized': true,
      'user.session': {token: 'plain-token'},
      'user.session.token': 'plain-token'
    });

    await onInit(missingExpiresFlux as any);

    const expiredToken = [
      Buffer.from('{}').toString('base64url'),
      Buffer.from(JSON.stringify({exp: Math.floor(Date.now() / 1000) - 60})).toString('base64url'),
      'sig'
    ].join('.');
    const expiredFlux = createFlux({
      'app.config': {app: {session: {maxMinutes: 20}}},
      'app.metropolisInitialized': true,
      'user.session': {expires: Date.now() + 60000, issued: Date.now() - 60000, token: expiredToken},
      'user.session.token': expiredToken
    });

    await onInit(expiredFlux as any);

    expect(apiMocks.refreshSession).not.toHaveBeenCalled();
    expect(missingExpiresFlux.dispatch).toHaveBeenCalledWith({session: {}, type: 'USER_SIGN_OUT_SUCCESS'});
    expect(expiredFlux.dispatch).toHaveBeenCalledWith({session: {}, type: 'USER_SIGN_OUT_SUCCESS'});
  });

  it('renders with a native window alias that has no DOM listeners and cleans up analytics', async () => {
    const {Metropolis} = await import('./index.js');
    reactFluxMocks.flux = createFlux();
    const browserWindow = globalThis.window;
    try {
      vi.stubGlobal('window', {});
      const rendered = render(<Metropolis><div>native child</div></Metropolis>);

      expect(rendered.getByText('native child')).toBeDefined();

      rendered.unmount();

      expect(rumMocks.destroy).toHaveBeenCalled();
    } finally {
      vi.stubGlobal('window', browserWindow);
    }
  });

  it('renders the provider, hydrates session state, and manages websocket lifecycle', async () => {
    const {Metropolis, MetropolisContext} = await import('./index.js');
    const flux = createFlux({
      'user.session': {token: 'token-1', userActive: true},
      'user.session.personaId': 'persona-1',
      'user.session.token': 'token-1'
    });
    let contextValue: any;

    reactFluxMocks.flux = flux;
    reactFluxMocks.state = new Map<string, unknown>([
      ['app.sessionHydrated', true],
      ['message.conversations', {one: [{messageId: 'message-1'}]}],
      ['notification.list', [{notificationId: 'notification-1'}]],
      ['user.session', {token: 'token-1', userActive: true}],
      ['user.session.personaId', 'persona-1'],
      ['user.session.token', 'token-1']
    ]);

    const rendered = render(
      <Metropolis config={{local: {app: {name: 'Local'}}}} translations={{hello: 'Hello'}}>
        <MetropolisContext.Consumer>
          {(value) => {
            contextValue = value;
            return <div>child</div>;
          }}
        </MetropolisContext.Consumer>
      </Metropolis>
    );

    await waitFor(() => {
      expect(flux.setState).toHaveBeenCalledWith('app.config', expect.objectContaining({app: expect.objectContaining({name: 'Local'})}));
      expect(flux.dispatch).toHaveBeenCalledWith({type: 'APP_SESSION_HYDRATION_COMPLETED'});
    });

    expect(contextValue.messages).toHaveLength(1);
    expect(contextValue.notifications).toHaveLength(1);
    expect(contextValue.isAuth()).toBe(true);
    expect(websocketMocks.wsInit).toHaveBeenCalledWith('token-1', 'persona-1');

    window.dispatchEvent(new CustomEvent('nlabs:gotham:analytics', {
      detail: {name: 'page_view', path: '/docs', type: 'page_view'}
    }));

    expect(rumMocks.track).toHaveBeenCalledWith({name: 'page_view', path: '/docs', type: 'page_view'});

    window.dispatchEvent(new Event('pagehide'));

    expect(rumMocks.flush).toHaveBeenCalledWith({useBeacon: true});

    const visibilityState = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(rumMocks.flush).toHaveBeenCalledTimes(2);

    visibilityState.mockRestore();

    rendered.unmount();

    expect(websocketMocks.wsClose).toHaveBeenCalled();

    window.dispatchEvent(new Event('pagehide'));

    expect(rumMocks.flush).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated analytics events and visible-document changes without renewing sessions', async () => {
    const {Metropolis, MetropolisContext} = await import('./index.js');
    const flux = createFlux();
    reactFluxMocks.flux = flux;
    reactFluxMocks.state.set('app.sessionHydrated', true);
    let context: any;
    const mounted = render(<Metropolis config={{test: {isAuth: undefined}}}><MetropolisContext.Consumer>{(value) => {
      context = value;
      return <div />;
    }}</MetropolisContext.Consumer></Metropolis>);
    window.dispatchEvent(new Event('nlabs:gotham:analytics'));
    document.dispatchEvent(new Event('visibilitychange'));
    context.updateMessage({messageId: 'local'});

    expect(context.isAuth()).toBe(false);
    expect(rumMocks.track).not.toHaveBeenCalled();
    expect(rumMocks.flush).not.toHaveBeenCalled();
    expect(websocketMocks.wsInit).not.toHaveBeenCalled();

    mounted.unmount();
  });
});
