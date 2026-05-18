import {describe, expect, it} from 'vitest';

import * as stores from './index.js';

describe('stores index', () => {
  it('exports store reducers and constants', () => {
    expect(stores.app.action).toBeTypeOf('function');
    expect(stores.users.action).toBeTypeOf('function');
    expect(stores.WEBSOCKET_CONSTANTS.OPEN).toBe('WEBSOCKET_OPEN');
  });
});
