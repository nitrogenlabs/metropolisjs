/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {defaultValues, WEBSOCKET_CONSTANTS, websocketStore} from './websocketStore';

describe('websocketStore', () => {
  it('should listen for default', () => {
    const updatedState = websocketStore('', {}, defaultValues);
    return expect(updatedState).toEqual(defaultValues);
  });

  it('should listen for CLOSE', () => {
    const updatedState = websocketStore(WEBSOCKET_CONSTANTS.CLOSE, {}, defaultValues);
    return expect(updatedState).toEqual({...defaultValues, isOpen: false});
  });

  it('should listen for OPEN', () => {
    const updatedState = websocketStore(WEBSOCKET_CONSTANTS.OPEN, {}, defaultValues);
    return expect(updatedState).toEqual({...defaultValues, isOpen: true});
  });

  it('should listen for MESSAGE', () => {
    const updatedState = websocketStore(WEBSOCKET_CONSTANTS.MESSAGE, {data: {test: 'test'}}, defaultValues);
    return expect(updatedState).toEqual({...defaultValues, data: {test: 'test'}});
  });

  it('toggles websocket state from arbitrary starting values', () => {
    expect(websocketStore(WEBSOCKET_CONSTANTS.OPEN, {}).isOpen).toBe(true);
    expect(websocketStore(WEBSOCKET_CONSTANTS.CLOSE, {}, {isOpen: true}).isOpen).toBe(false);
    expect(websocketStore(WEBSOCKET_CONSTANTS.MESSAGE, {data: {ok: true}}).data).toEqual({ok: true});
  });
});
