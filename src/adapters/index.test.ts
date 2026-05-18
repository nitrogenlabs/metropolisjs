import {describe, expect, it} from 'vitest';

import * as adapters from './index.js';

describe('adapters index', () => {
  it('exports adapter parsers and permission helpers', () => {
    expect(adapters.parseApp).toBeTypeOf('function');
    expect(adapters.parseUser).toBeTypeOf('function');
    expect(adapters.hasPermission).toBeTypeOf('function');
  });
});
