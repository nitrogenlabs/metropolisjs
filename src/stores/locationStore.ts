/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {LocationType} from '../adapters/locationAdapter/locationAdapter.js';

export const LOCATION_CONSTANTS = {
  ADD_ITEM_ERROR: 'LOCATION_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'LOCATION_ADD_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'LOCATION_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'LOCATION_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'LOCATION_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'LOCATION_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'LOCATION_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'LOCATION_REMOVE_ITEM_SUCCESS',
  SET_CURRENT: 'LOCATION_SET_CURRENT',
  UPDATE_ITEM_ERROR: 'LOCATION_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'LOCATION_UPDATE_ITEM_SUCCESS'
} as const;

interface LocationState {
  current: LocationType | null;
}

export const defaultValues: LocationState = {
  current: null
};

export const locationStore = (type: string, data: {current?: LocationType}, state = defaultValues): LocationState => {
  switch(type) {
    case LOCATION_CONSTANTS.SET_CURRENT: {
      const {current} = data;
      return {...state, current: current || null};
    }
    default: {
      return state;
    }
  }
};

export const locations = {
  action: locationStore,
  initialState: defaultValues,
  name: 'location'
};