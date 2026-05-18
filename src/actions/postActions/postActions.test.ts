import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runPostActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createPostActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises post action methods', runPostActionsScenario);
});
