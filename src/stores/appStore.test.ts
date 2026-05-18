/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {appStore, defaultValues} from './appStore';

describe('appStore', () => {
  it('should listen for default', () => {
    const updatedState = appStore('', {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('keeps supplied app state for unknown actions', () => {
    const state = {network: {status: true}};
    expect(appStore('UNKNOWN', {}, state)).toBe(state);
  });
});
