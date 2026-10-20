import {FluxFramework} from '@nlabs/arkhamjs';
import {act, cleanup, render, screen, waitFor} from '@nlabs/lex/test-react';
import {afterEach, beforeEach, describe, expect, it} from '@nlabs/lex/test-vitest';
import {StrictMode, useContext} from 'react';

import * as root from './index.js';

const state = vi.hoisted(() => ({flux: undefined as FluxFramework | undefined}));
vi.mock('@nlabs/arkhamjs-utils-react', () => ({
  useFlux: () => state.flux,
  useFluxState: (path: string, fallback: unknown) => state.flux?.getState(path, fallback)
}));
const identity = {idleExpiresAt: 3601000, observedAt: 1000, sid: 's', userId: 'owner', username: 'alias'};
const options = {
  endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
  scope: {appId: 'vault', environment: 'test', ownerUserId: 'owner'}
};
let calls: string[];

beforeEach(async () => {
  localStorage.clear();
  state.flux = new FluxFramework();
  await state.flux.init();
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    calls.push(path);
    return new Response(JSON.stringify(identity), {headers: {'Content-Type': 'application/json'}});
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cookie root integration', () => {
  it('unavailable cookie boot completes blocked without an unhandled effect rejection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({error: 'unavailable'}), {
      headers: {'Content-Type': 'application/json'}, status: 503
    })));
    render(<root.Metropolis webSession={options}><div /></root.Metropolis>);
    await waitFor(() => expect(state.flux?.getState('webSession.status')).toBe('blocked'));
    await waitFor(() => expect(state.flux?.getState('app.sessionHydrated')).toBe(true));
  });

  it('public onInit accepts explicit runtime options and never restores a token', async () => {
    const flux = state.flux!;
    await root.onInit(flux, options);
    const controller = root.createWebSessionActions(flux, options);

    expect(await controller.ensureSession()).toEqual(identity);
    expect(calls).toEqual(['/auth/session']);

    controller.dispose();
  });

  it('React effect replay preserves one current binding without remote logout', async () => {
    const flux = state.flux!;
    const hook = root as unknown as {useWebSessionActions: () => ReturnType<typeof root.createWebSessionActions>};
    let bound: ReturnType<typeof root.createWebSessionActions> | undefined;
    const Child = () => {
      bound = hook.useWebSessionActions();
      return <div />;
    };
    render(<StrictMode><root.Metropolis webSession={options}><Child /></root.Metropolis></StrictMode>);
    await waitFor(() => expect(flux.getState('app.sessionHydrated')).toBe(true));

    await expect(bound?.ensureSession()).resolves.toEqual(identity);
    await expect(root.createWebSessionActions(flux, options).ensureSession()).resolves.toEqual(identity);
    expect(calls.every((path) => path === '/auth/session')).toBe(true);
  });

  it('cookie boot skips legacy hydrate/refresh and root and factory share one binding', async () => {
    const flux = state.flux!;
    await flux.setState('user.session', {expires: 1, token: 'expired-legacy'});
    const controller = root.createWebSessionActions(flux, options);
    const hook = root as unknown as {useWebSessionActions: () => typeof controller};
    let bound: unknown;
    const Child = () => {
      bound = hook.useWebSessionActions();
      return <div>Ready</div>;
    };
    const mounted = render(<root.Metropolis webSession={options}><Child /></root.Metropolis>);
    await waitFor(() => expect(flux.getState('app.sessionHydrated')).toBe(true));

    expect(screen.getByText('Ready')).toBeTruthy();
    expect(bound).toBe(controller);
    expect(calls).toEqual(['/auth/session']);
    expect(flux.getState('user.session')).toEqual({});

    mounted.unmount();

    expect(calls).toEqual(['/auth/session']);
    await expect(controller.ensureSession()).rejects.toThrow('disposed');
  });

  it('cookie isAuth ignores permissive legacy default', async () => {
    const flux = state.flux!;
    let isAuth: (() => boolean) | undefined;
    const Child = () => {
      isAuth = useContext(root.MetropolisContext)?.isAuth;
      return <div />;
    };
    render(<root.Metropolis config={{test: {isAuth: () => true}}} webSession={options}><Child /></root.Metropolis>);
    await waitFor(() => expect(flux.getState('app.sessionHydrated')).toBe(true));

    expect(isAuth?.()).toBe(true);

    await act(async () => {
      await root.createWebSessionActions(flux, options).signOut();
    });

    expect(isAuth?.()).toBe(false);
  });
});
