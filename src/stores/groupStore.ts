/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {GroupType} from '../types/groups.types.js';

export const GROUP_CONSTANTS = {
  ADD_ITEM_ERROR: 'GROUP_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'GROUP_ADD_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'GROUP_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'GROUP_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'GROUP_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'GROUP_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'GROUP_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'GROUP_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'GROUP_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'GROUP_UPDATE_ITEM_SUCCESS'
} as const;

export type GroupConstantsType = typeof GROUP_CONSTANTS[keyof typeof GROUP_CONSTANTS];

interface GroupState {
  lists: Record<string, GroupType[]>;
  viewed: Record<string, GroupType>;
}

export const defaultValues: GroupState = {
  lists: {},
  viewed: {}
};

export const groupStore = (type: string, data: {group?: GroupType; list?: GroupType[]}, state = defaultValues): GroupState => {
  switch(type) {
    case GROUP_CONSTANTS.GET_ITEM_SUCCESS: {
      const {viewed} = state;
      const {group} = data;

      if(group && group.groupId) {
        const groupWithCache: GroupType = {...group, cached: Date.now()};
        viewed[group.groupId] = groupWithCache;
        return {...state, viewed};
      }
      return state;
    }
    case GROUP_CONSTANTS.GET_LIST_SUCCESS: {
      const {lists} = state;
      const {list} = data;
      if(Array.isArray(list)) {
        lists.all = list;
        return {...state, lists};
      }
      return state;
    }
    default: {
      return state;
    }
  }
};

export const groups = {
  action: groupStore,
  initialState: defaultValues,
  name: 'group'
};
