import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runAppActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createAppActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises app action methods', runAppActionsScenario);
});
