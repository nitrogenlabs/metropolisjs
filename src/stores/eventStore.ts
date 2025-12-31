/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type { EventType } from '../adapters/eventAdapter/eventAdapter.js';

export const EVENT_CONSTANTS = {
  ADD_ITEM_ERROR: 'EVENT_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'EVENT_ADD_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'EVENT_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'EVENT_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'EVENT_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'EVENT_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'EVENT_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'EVENT_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'EVENT_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'EVENT_UPDATE_ITEM_SUCCESS'
} as const;

interface EventState {
  lists: Record<string, Record<string, unknown>[]>;
}

export const defaultValues: EventState = {
  lists: {}
};

export const eventStore = (type: string, data: {
  list?: EventType[];
  type?: string;
}, state = defaultValues): EventState => {
  switch(type) {
    case EVENT_CONSTANTS.GET_LIST_SUCCESS: {
      const {list = [], type = 'default'} = data;
      const {lists = {}} = state;

      lists[type] = list.map((event) => event);
      return {...state, lists};
    }
    default: {
      return state;
    }
  }
};

export const events = {
  action: eventStore,
  initialState: defaultValues,
  name: 'event'
};