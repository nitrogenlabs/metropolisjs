import {beforeEach, describe, it} from 'vitest';

import {resetActionScenarioMocks, runConversationActionsScenario} from '../../tests/actionTestScenarios.js';

describe('createConversationActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises conversation action methods', runConversationActionsScenario);
});
