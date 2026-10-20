/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {FluxFramework} from '@nlabs/arkhamjs';

import {APP_CONSTANTS, app, appStore, defaultValues} from './appStore.js';

describe('appStore', () => {
  it('commits public hydration actions before observers while preserving unrelated app state', async () => {
    const flux = new FluxFramework();
    await flux.init({stores: [app]});
    await flux.setState('app.network', {status: true});
    await flux.setState('app.sessionHydrated', true);
    const flags: unknown[] = [];
    flux.on(APP_CONSTANTS.SESSION_HYDRATION_STARTED, () => flags.push(flux.getState('app.sessionHydrated')));
    flux.on(APP_CONSTANTS.SESSION_HYDRATION_COMPLETED, () => flags.push(flux.getState('app.sessionHydrated')));

    await flux.dispatch({type: APP_CONSTANTS.SESSION_HYDRATION_STARTED});
    await flux.dispatch({type: APP_CONSTANTS.SESSION_HYDRATION_COMPLETED});

    expect(flags).toEqual([false, true]);
    expect(flux.getState('app.network')).toEqual({status: true});
  });

  it('should listen for default', () => {
    const updatedState = appStore('', {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('keeps supplied app state for unknown actions', () => {
    const state = {network: {status: true}};

    expect(appStore('UNKNOWN', {}, state)).toBe(state);
  });
});
