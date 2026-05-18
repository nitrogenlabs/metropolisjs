import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runEventActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createEventActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises event action methods', runEventActionsScenario);
});
