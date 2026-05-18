import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runConnectionActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createConnectionActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises connection action methods', runConnectionActionsScenario);
});
