import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runReactionActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createReactionActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises reaction action methods', runReactionActionsScenario);
});
