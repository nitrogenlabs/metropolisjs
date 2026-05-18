import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runVideoActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createVideoActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises video action methods', runVideoActionsScenario);
});
