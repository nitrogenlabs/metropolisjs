import {describe, expect, it} from 'vitest';

import * as actions from './index.js';

describe('actions index', () => {
  it('exports action factories', () => {
    expect(actions.createAppActions).toBeTypeOf('function');
    expect(actions.createCrmActions).toBeTypeOf('function');
    expect(actions.createRestActions).toBeTypeOf('function');
    expect(actions.createUserActions).toBeTypeOf('function');
    expect(actions.createWebsocketActions).toBeTypeOf('function');
  });
});
