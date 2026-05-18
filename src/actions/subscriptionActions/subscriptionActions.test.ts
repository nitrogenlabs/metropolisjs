import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runSubscriptionActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createSubscriptionActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises subscription action methods', runSubscriptionActionsScenario);
});
