import {FluxFramework} from '@nlabs/arkhamjs';
import {FluxProvider, useFluxState} from '@nlabs/arkhamjs-utils-react';
import {act, cleanup, render, screen, waitFor} from '@nlabs/lex/test-react';
import {afterEach, beforeEach, describe, expect, it, vi} from '@nlabs/lex/test-vitest';
import {useContext} from 'react';

import {Metropolis, MetropolisContext, createWebSessionActions} from './index.js';
import {app} from './stores/index.js';

import type {WebSessionState} from './stores/webSessionStore.js';

const identity = {idleExpiresAt: 3_601_000, observedAt: 1000, sid: 'synthetic', userId: 'owner', username: 'Owner'};
const options = {
  endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
  scope: {appId: 'vault', environment: 'synthetic', ownerUserId: 'owner'}
};
const firstConfig = {test: {app: {name: 'first'}}};
const secondConfig = {test: {app: {name: 'second'}}};
const started = 'APP_SESSION_HYDRATION_STARTED';
const completed = 'APP_SESSION_HYDRATION_COMPLETED';
let flux: FluxFramework;
let calls: string[];
let handler: (path: string) => Response | Promise<Response>;
const response = (status: number): Response => Response.json(status === 200 ? identity : {}, {status});
const Probe = () => {
  const hydrated: boolean = useFluxState('app.sessionHydrated', false);
  const session: WebSessionState | undefined = useFluxState('webSession');
  const context = useContext(MetropolisContext);
  return <p data-testid="hydration">{hydrated ? 'ready' : 'hydrating'}:{session?.status ?? 'missing'}:{String(context?.isAuth())}</p>;
};
const deferredRestore = () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  handler = () => pending;
  return release;
};
const deferredFlagPersistence = async (phase: 'start' | 'complete', status: number) => {
  let armed = phase === 'start';
  let held = false;
  let release: (value: boolean) => void = () => {};
  const pending = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  flux = new FluxFramework();
  await flux.init({
    storage: {
      getStorageData: async () => ({}),
      setStorageData: async (_key: string, state: {app?: {sessionHydrated?: boolean}}) => {
        if(armed && !held && state.app?.sessionHydrated === (phase === 'complete')) {
          held = true;
          return pending;
        }
        return true;
      }
    },
    storageWait: 0,
    stores: [app]
  });
  // Authenticated boot clears legacy cache first; arm after verification so the
  // held true write is the root completion, not the earlier cache-clear write.
  flux.on(status === 200 ? 'WEB_SESSION_AUTHENTICATED' : 'WEB_SESSION_BLOCKED', () => {
    armed = true;
  });
  return {held: () => held, pending, release: () => release(true)};
};

beforeEach(async () => {
  localStorage.clear();
  flux = new FluxFramework();
  await flux.init({stores: [app]});
  calls = [];
  handler = () => response(200);
  vi.stubGlobal('fetch', async (path: string) => {
    calls.push(path);
    if(!['/auth/session', '/auth/signout'].includes(path)) {
      throw new Error('Outbound transport blocked');
    }
    return handler(path);
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('mounted public hydration notifications', () => {
  it.each([
    {phase: 'start' as const, status: 200},
    {phase: 'start' as const, status: 503},
    {phase: 'complete' as const, status: 200},
    {phase: 'complete' as const, status: 503}
  ])('fences stale $phase notification after deferred flag persistence on replacement $status', async ({phase, status}) => {
    const persistence = await deferredFlagPersistence(phase, status);
    handler = () => response(status);
    const events: unknown[] = [];
    flux.on(started, () => events.push({flag: flux.getState('app.sessionHydrated'), type: started}));
    flux.on(completed, () => events.push({flag: flux.getState('app.sessionHydrated'), type: completed}));
    const tree = (config: typeof firstConfig) => <FluxProvider flux={flux}>
      <Metropolis config={config} webSession={options}><Probe /></Metropolis>
    </FluxProvider>;
    const mounted = render(tree(firstConfig));
    await waitFor(() => expect(persistence.held()).toBe(true));
    const releaseRestore = phase === 'complete' ? deferredRestore() : undefined;

    mounted.rerender(tree(secondConfig));
    const want = status === 200 ? 'authenticated:true' : 'blocked:false';
    if(phase === 'complete') {
      await waitFor(() => expect(calls).toHaveLength(2));

      expect(screen.getByTestId('hydration').textContent).toBe(`hydrating:${want}`);
    } else {
      await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe(`ready:${want}`));
    }
    const beforeRelease = [...events];
    const currentFlag = flux.getState('app.sessionHydrated');

    await act(async () => {
      persistence.release();
      await persistence.pending;
    });

    expect(events).toEqual(beforeRelease);
    expect(flux.getState('app.sessionHydrated')).toBe(currentFlag);
    expect(screen.getByTestId('hydration').textContent).toBe(`${phase === 'complete' ? 'hydrating' : 'ready'}:${want}`);

    if(releaseRestore) {
      await act(async () => {
        releaseRestore(response(status));
      });
      await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe(`ready:${want}`));
    }

    expect(events.filter((event) => (event as {type: string}).type === completed)).toEqual([
      {flag: true, type: completed}
    ]);
    expect(calls).toHaveLength(phase === 'complete' ? 2 : 1);
  });

  it.each([
    {phase: 'start' as const, status: 200},
    {phase: 'start' as const, status: 503},
    {phase: 'complete' as const, status: 200},
    {phase: 'complete' as const, status: 503}
  ])('fences $phase notification after deferred flag persistence on unmount $status', async ({phase, status}) => {
    const persistence = await deferredFlagPersistence(phase, status);
    handler = () => response(status);
    const events: unknown[] = [];
    flux.on(started, (event) => events.push(event));
    flux.on(completed, (event) => events.push(event));
    const mounted = render(<FluxProvider flux={flux}>
      <Metropolis config={firstConfig} webSession={options}><Probe /></Metropolis>
    </FluxProvider>);
    await waitFor(() => expect(persistence.held()).toBe(true));
    const beforeRelease = [...events];

    mounted.unmount();
    await act(async () => {
      persistence.release();
      await persistence.pending;
    });

    expect(events).toEqual(beforeRelease);
    expect(events).toEqual(phase === 'complete' ? [{type: started}] : []);
    expect(calls).toHaveLength(phase === 'complete' ? 1 : 0);
  });

  it.each([
    {auth: true, status: 200, want: 'authenticated'},
    {auth: false, status: 401, want: 'anonymous'},
    {auth: false, status: 503, want: 'blocked'}
  ])('notifies hydration completion after deferred restore $status', async ({auth, status, want}) => {
    const release = deferredRestore();
    const observations: unknown[] = [];
    flux.on(started, (event) => observations.push({event, hydrated: flux.getState('app.sessionHydrated')}));
    flux.on(completed, (event) => observations.push({event, hydrated: flux.getState('app.sessionHydrated')}));
    render(<FluxProvider flux={flux}><Metropolis webSession={options}><Probe /></Metropolis></FluxProvider>);
    await waitFor(() => expect(calls).toEqual(['/auth/session']));

    expect(screen.getByTestId('hydration').textContent).toMatch(/^hydrating:/);

    await act(async () => {
      release(response(status));
    });

    await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe(`ready:${want}:${String(auth)}`));

    expect(observations).toEqual([
      {event: {type: started}, hydrated: false},
      {event: {type: completed}, hydrated: true}
    ]);
    expect(calls).toEqual(['/auth/session']);
    expect(flux.getState('user.session.token')).toBeUndefined();
  });

  it('completes suppressed restore without a request or fabricated authentication/signout', async () => {
    const controller = createWebSessionActions(flux, options);
    handler = () => Response.json({authenticated: false});
    await controller.signOut();
    calls = [];
    const authentication: unknown[] = [];
    const flags: unknown[] = [];
    flux.on(started, () => flags.push(flux.getState('app.sessionHydrated')));
    flux.on(completed, () => flags.push(flux.getState('app.sessionHydrated')));
    flux.on('WEB_SESSION_AUTHENTICATED', (event) => authentication.push(event));
    flux.on('WEB_SESSION_SIGNED_OUT', (event) => authentication.push(event));
    render(<FluxProvider flux={flux}>
      <Metropolis config={firstConfig} webSession={options}><Probe /></Metropolis>
    </FluxProvider>);

    await waitFor(() => expect(flags).toEqual([false, true]));

    expect(screen.getByTestId('hydration').textContent).toBe('ready:anonymous:false');
    expect(calls).toEqual([]);
    expect(authentication).toEqual([]);
  });

  it('registers the app reducer on a cold root and completes a rejected transport', async () => {
    flux.removeStores(['app']);
    handler = () => {
      throw new Error('synthetic network failure');
    };
    const hydrated: unknown[] = [];
    flux.on(completed, () => hydrated.push(flux.getState('app.sessionHydrated')));
    render(<FluxProvider flux={flux}>
      <Metropolis config={firstConfig} webSession={options}><Probe /></Metropolis>
    </FluxProvider>);

    await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe('ready:blocked:false'));

    expect(hydrated).toEqual([true]);
    expect(calls).toEqual(['/auth/session']);
  });

  it('preserves a preregistered app reducer while notifying its committed hydration flag', async () => {
    flux.removeStores(['app']);
    const customApp = {
      action: (_type: string, _data: unknown, state: {custom: string; sessionHydrated: boolean}) => state,
      initialState: {custom: 'preserved', sessionHydrated: true},
      name: 'app'
    };
    await flux.addStores([customApp]);
    const release = deferredRestore();
    const flags: unknown[] = [];
    flux.on(started, () => flags.push(flux.getState('app.sessionHydrated')));
    flux.on(completed, () => flags.push(flux.getState('app.sessionHydrated')));
    render(<FluxProvider flux={flux}>
      <Metropolis config={firstConfig} webSession={options}><Probe /></Metropolis>
    </FluxProvider>);
    await waitFor(() => expect(calls).toEqual(['/auth/session']));

    expect(screen.getByTestId('hydration').textContent).toBe('hydrating:anonymous:false');

    await act(async () => {
      release(response(503));
    });
    await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe('ready:blocked:false'));

    expect(flags).toEqual([false, true]);
    expect(flux.getState('app.custom')).toBe('preserved');
    expect(flux.getStore('app')?.action).toBe(customApp.action);
  });

  it('notifies committed blocked state after a later authenticated verification fails', async () => {
    render(<FluxProvider flux={flux}>
      <Metropolis config={firstConfig} webSession={options}><Probe /></Metropolis>
    </FluxProvider>);
    await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe('ready:authenticated:true'));
    const blocked: unknown[] = [];
    const signouts: unknown[] = [];
    flux.on('WEB_SESSION_BLOCKED', (event) => blocked.push({event, session: flux.getState('webSession')}));
    flux.on('WEB_SESSION_SIGNED_OUT', (event) => signouts.push(event));
    handler = () => response(503);

    await act(async () => {
      await expect(createWebSessionActions(flux, options).restore()).rejects.toThrow('web_session_unavailable');
    });

    expect(screen.getByTestId('hydration').textContent).toBe('ready:blocked:false');
    expect(blocked).toEqual([{
      event: {scope: options.scope, type: 'WEB_SESSION_BLOCKED'},
      session: {generation: 0, identity, scope: options.scope, status: 'blocked'}
    }]);
    expect(signouts).toEqual([]);
    expect(calls).toEqual(['/auth/session', '/auth/session']);
  });

  it('publishes false again for legitimate configuration reinitialization', async () => {
    const events: boolean[] = [];
    flux.on(started, () => events.push(flux.getState('app.sessionHydrated')));
    flux.on(completed, () => events.push(flux.getState('app.sessionHydrated')));
    const tree = (config: typeof firstConfig) => <FluxProvider flux={flux}>
      <Metropolis config={config} webSession={options}><Probe /></Metropolis>
    </FluxProvider>;
    const mounted = render(tree(firstConfig));
    await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe('ready:authenticated:true'));
    const release = deferredRestore();

    mounted.rerender(tree(secondConfig));
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(screen.getByTestId('hydration').textContent).toBe('hydrating:authenticated:true');
    expect(events).toEqual([false, true, false]);

    await act(async () => {
      release(response(503));
    });
    await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe('ready:blocked:false'));

    expect(events).toEqual([false, true, false, true]);
  });

  it.each([200, 503])('does not complete a disposed root after its deferred restore settles %s', async (status) => {
    const release = deferredRestore();
    const completions: unknown[] = [];
    flux.on(completed, (event) => completions.push(event));
    const mounted = render(<FluxProvider flux={flux}>
      <Metropolis config={firstConfig} webSession={options}><Probe /></Metropolis>
    </FluxProvider>);
    await waitFor(() => expect(calls).toEqual(['/auth/session']));

    mounted.unmount();
    await act(async () => {
      release(response(status));
    });

    expect(completions).toEqual([]);
    expect(flux.getState('app.sessionHydrated')).toBe(false);
    expect(flux.getState('webSession.status')).toBe('anonymous');
  });

  it('only the current effect completes a shared restore after stale configuration cleanup', async () => {
    const release = deferredRestore();
    const completions: unknown[] = [];
    flux.on(completed, (event) => completions.push(event));
    const tree = (config: typeof firstConfig) => <FluxProvider flux={flux}>
      <Metropolis config={config} webSession={options}><Probe /></Metropolis>
    </FluxProvider>;
    const mounted = render(tree(firstConfig));
    await waitFor(() => expect(calls).toEqual(['/auth/session']));

    mounted.rerender(tree(secondConfig));
    await act(async () => {
      release(response(503));
    });

    await waitFor(() => expect(screen.getByTestId('hydration').textContent).toBe('ready:blocked:false'));

    expect(completions).toEqual([{type: completed}]);
    expect(calls).toEqual(['/auth/session']);
  });
});
