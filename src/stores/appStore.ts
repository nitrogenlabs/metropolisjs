/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export const APP_CONSTANTS = {
  ADD_ITEM_ERROR: 'APP_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'APP_ADD_ITEM_SUCCESS',
  API_NETWORK_ERROR: 'APP_API_NETWORK_ERROR',
  API_NETWORK_SUCCESS: 'APP_API_NETWORK_SUCCESS',
  GET_ITEM_ERROR: 'APP_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'APP_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'APP_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'APP_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'APP_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'APP_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'APP_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'APP_UPDATE_ITEM_SUCCESS'
} as const;

interface AppState {
  network?: {
    error?: Error;
    status?: boolean;
  };
}

export const defaultValues: AppState = {};

export const appStore = (type: string, data: Partial<AppState>, state = defaultValues): AppState => {
  switch(type) {
    default: {
      return state;
    }
  }
};

export const app = {
  action: appStore,
  initialState: defaultValues,
  name: 'app'
};
