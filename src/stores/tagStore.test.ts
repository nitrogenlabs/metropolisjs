/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {defaultValues, TAG_CONSTANTS, tagStore} from './tagStore';

describe('tagStore', () => {
  it('should listen for default', () => {
    const updatedState = tagStore('', {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('should listen for GET_LIST_SUCCESS', () => {
    const updatedState = tagStore(TAG_CONSTANTS.GET_LIST_SUCCESS, {}, defaultValues);
    return expect(updatedState).toEqual(expect.objectContaining({list: []}));
  });

  it('adds, updates, sorts, and removes tags by canonical tagId', () => {
    let state = tagStore(TAG_CONSTANTS.ADD_ITEM_SUCCESS, {tag: {name: 'Bravo', tagId: 'tag-2'} as any}, defaultValues);
    state = tagStore(TAG_CONSTANTS.ADD_ITEM_SUCCESS, {tag: {name: 'Alpha', tagId: 'tag-1'} as any}, state);

    expect(state.list.map((tag) => tag.name)).toEqual(['Alpha', 'Bravo']);

    state = tagStore(TAG_CONSTANTS.UPDATE_ITEM_SUCCESS, {tag: {name: 'Charlie', tagId: 'tag-2'} as any}, state);
    expect(state.list.map((tag) => tag.name)).toEqual(['Alpha', 'Charlie']);

    state = tagStore(TAG_CONSTANTS.REMOVE_ITEM_SUCCESS, {tag: {tagId: 'tag-1'} as any}, state);
    expect(state.list).toEqual([{name: 'Charlie', tagId: 'tag-2'}]);
    expect(tagStore(TAG_CONSTANTS.ADD_ITEM_SUCCESS, {tag: {name: 'Missing'} as any}, state)).toBe(state);
    expect(tagStore(TAG_CONSTANTS.REMOVE_ITEM_SUCCESS, {tag: {name: 'Missing'} as any}, state)).toBe(state);
  });
});
