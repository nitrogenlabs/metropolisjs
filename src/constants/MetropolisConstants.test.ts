import {describe, expect, it} from 'vitest';

import {MetropolisConstants} from './MetropolisConstants.js';

describe('MetropolisConstants', () => {
  it('exports stable action constants', () => {
    expect(MetropolisConstants.INITIALIZE).toBe('METROPOLIS_APP_INITIALIZE');
    expect(MetropolisConstants.UPDATE_SESSION).toBe('METROPOLIS_APP_UPDATE_SESSION');
  });
});
