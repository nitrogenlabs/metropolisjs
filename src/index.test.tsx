// @vitest-environment jsdom
import {render, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

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
  wsClose: vi.fn(),
  wsInit: vi.fn(),
  sendNotification: vi.fn()
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
  createAction: vi.fn(() => websocketMocks)
}));

const createFlux = (initialState: Record<string, unknown> = {}) => {
  const state = new Map<string, unknown>(Object.entries(initialState));
  const handlers = new Map<string, Array<(payload?: any) => void | Promise<void>>>();

  return {
    addStores: vi.fn(),
    dispatch: vi.fn(async (action) => action),
    getState: vi.fn((path: string, fallback?: unknown) => state.get(path) ?? fallback),
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
        await handler(payload);
      }
    }
  };
};

describe('index onInit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reactFluxMocks.flux = undefined;
    reactFluxMocks.state = new Map<string, unknown>();
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

  it('refreshes missing and expired sessions', async () => {
    const {onInit} = await import('./index.js');
    const missingExpiresFlux = createFlux({
      'app.metropolisInitialized': true,
      'app.config': {app: {session: {maxMinutes: 45}}},
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
      'app.metropolisInitialized': true,
      'app.config': {app: {session: {maxMinutes: 20}}},
      'user.session': {expires: Date.now() + 60000, issued: Date.now() - 60000, token: expiredToken},
      'user.session.token': expiredToken
    });

    await onInit(expiredFlux as any);

    expect(apiMocks.refreshSession).toHaveBeenCalledTimes(2);
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
      expect(flux.setState).toHaveBeenCalledWith('app.sessionHydrated', true);
    });

    expect(contextValue.messages).toHaveLength(1);
    expect(contextValue.notifications).toHaveLength(1);
    expect(contextValue.isAuth()).toBe(true);
    expect(websocketMocks.wsInit).toHaveBeenCalledWith('token-1', 'persona-1');

    rendered.unmount();
    expect(websocketMocks.wsClose).toHaveBeenCalled();
  });
});
