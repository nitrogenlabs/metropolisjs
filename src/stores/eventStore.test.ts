/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {defaultValues, EVENT_CONSTANTS, eventStore} from './eventStore';

describe('eventStore', () => {
  it('should listen for EVENT_GET_LIST_SUCCESS', () => {
    const updatedState = eventStore(EVENT_CONSTANTS.GET_LIST_SUCCESS, {}, defaultValues);
    return expect(updatedState).toEqual({
      ...defaultValues,
      lists: {
        default: []
      }
    });
  });
});
