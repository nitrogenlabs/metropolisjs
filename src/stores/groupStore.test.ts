import {describe, expect, it} from 'vitest';

import {GROUP_CONSTANTS, groupStore} from './groupStore.js';

describe('groupStore', () => {
  it('stores viewed groups and group lists', () => {
    expect(groupStore(GROUP_CONSTANTS.GET_ITEM_SUCCESS, {group: {groupId: 'group-1'} as any}).viewed['group-1']).toBeDefined();
    expect(groupStore(GROUP_CONSTANTS.GET_LIST_SUCCESS, {list: [{groupId: 'group-1'} as any]}).lists.all).toHaveLength(1);
  });

  it('keeps state when group actions do not include usable data', () => {
    const state = groupStore(GROUP_CONSTANTS.GET_ITEM_SUCCESS, {});

    expect(groupStore(GROUP_CONSTANTS.GET_LIST_SUCCESS, {}, state)).toBe(state);
    expect(groupStore('UNKNOWN', {}, state)).toBe(state);
  });
});
