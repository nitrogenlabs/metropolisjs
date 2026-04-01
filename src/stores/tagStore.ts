/**
 * Copyright (c) 2021-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { DateTime } from 'luxon';

import type { TagType } from '../adapters/tagAdapter/tagAdapter.js';

export const TAG_CONSTANTS = {
  ADD_LINK_SUCCESS: 'TAG_ADD_LINK_SUCCESS',
  ADD_ITEM_ERROR: 'TAG_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'TAG_ADD_ITEM_SUCCESS',
  ADD_PERSONA_ERROR: 'TAG_ADD_PERSONA_ERROR',
  ADD_PERSONA_SUCCESS: 'TAG_ADD_PERSONA_SUCCESS',
  GET_LIST_ERROR: 'TAG_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'TAG_GET_LIST_SUCCESS',
  REMOVE_LINK_SUCCESS: 'TAG_REMOVE_LINK_SUCCESS',
  REMOVE_ITEM_ERROR: 'TAG_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'TAG_REMOVE_ITEM_SUCCESS',
  REMOVE_PERSONA_ERROR: 'TAG_REMOVE_PERSONA_ERROR',
  REMOVE_PERSONA_SUCCESS: 'TAG_REMOVE_PERSONA_SUCCESS',
  UPDATE_ITEM_ERROR: 'TAG_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'TAG_UPDATE_ITEM_SUCCESS'
} as const;

interface TagState {
  expires: number;
  list: TagType[];
}

export const defaultValues: TagState = {
  expires: Date.now(),
  list: []
};

export const tagStore = (type: string, data: {tags?: TagState['list']}, state = defaultValues): TagState => {
  switch(type) {
    case TAG_CONSTANTS.ADD_ITEM_SUCCESS:
    case TAG_CONSTANTS.UPDATE_ITEM_SUCCESS: {
      const {tag} = data as {tag?: TagType};
      const tagId = String(tag?.tagId || '').trim();

      if(!tagId) {
        return state;
      }

      const list = state.list.some((item) => String(item?.tagId || '').trim() === tagId)
        ? state.list.map((item) => (String(item?.tagId || '').trim() === tagId ? {...item, ...tag} : item))
        : [...state.list, tag as TagType];

      return {
        ...state,
        list: [...list].sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')))
      };
    }

    case TAG_CONSTANTS.GET_LIST_SUCCESS: {
      const {tags = []} = data;
      const expires: number = DateTime.local().plus({hours: 24}).toMillis();
      return {...state, expires, list: [...tags]};
    }

    case TAG_CONSTANTS.REMOVE_ITEM_SUCCESS: {
      const {tag} = data as {tag?: TagType};
      const tagId = String(tag?.tagId || '').trim();

      if(!tagId) {
        return state;
      }

      return {
        ...state,
        list: state.list.filter((item) => String(item?.tagId || '').trim() !== tagId)
      };
    }

    default: {
      return state;
    }
  }
};

export const tags = {
  action: tagStore,
  initialState: defaultValues,
  name: 'tag'
};
