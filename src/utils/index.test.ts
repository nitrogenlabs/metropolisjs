import {describe, expect, it} from 'vitest';

import * as utils from './index.js';

describe('utils index', () => {
  it('exports public utilities and hooks', () => {
    expect(utils.createAction).toBeTypeOf('function');
    expect(utils.createValidatorFactory).toBeTypeOf('function');
    expect(utils.useMetropolis).toBeTypeOf('function');
  });
});
