/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {defaultValues, reactionStore, reactions} from './reactionStore';

describe('reactionStore', () => {
  it('should listen for default', () => {
    const updatedState = reactionStore('', {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('exports the reaction store descriptor', () => {
    expect(reactions).toEqual({
      action: reactionStore,
      initialState: defaultValues,
      name: 'reaction'
    });
  });
});
