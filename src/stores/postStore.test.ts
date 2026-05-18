/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {defaultValues, POST_CONSTANTS, postStore} from './postStore';

describe('postStore', () => {
  it('should listen for default', () => {
    const updatedState = postStore('', {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('should listen for GET_LIST_SUCCESS', () => {
    const updatedState = postStore(POST_CONSTANTS.GET_LIST_SUCCESS, {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('stores viewed posts from item responses', () => {
    const state = postStore(POST_CONSTANTS.GET_ITEM_SUCCESS, {post: {postId: 'post-1'} as any});

    expect(state.viewed['post-1']).toBeDefined();
    expect(postStore(POST_CONSTANTS.GET_ITEM_SUCCESS, {}, state)).toBe(state);
  });
});
