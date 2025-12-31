/**
 * Copyright (c) 2023-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId } from '@nlabs/utils';

import type { ProfileType } from '../adapters/profileAdapter/profileAdapter.js';

export const PROFILE_CONSTANTS = {
  ADD_ITEM_ERROR: 'PROFILE_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'PROFILE_ADD_ITEM_SUCCESS',
  DELETE_ITEM_ERROR: 'PROFILE_DELETE_ITEM_ERROR',
  DELETE_ITEM_SUCCESS: 'PROFILE_DELETE_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'PROFILE_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'PROFILE_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'PROFILE_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'PROFILE_GET_LIST_SUCCESS',
  UPDATE_ITEM_ERROR: 'PROFILE_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'PROFILE_UPDATE_ITEM_SUCCESS'
};

export interface ProfileState {
  readonly error?: Error;
  readonly list: ProfileType[];
  readonly listMap: Record<string, ProfileType>;
}

export const initialProfileState: ProfileState = {
  error: undefined,
  list: [],
  listMap: {}
};

export const profileStore = (state = initialProfileState, action = {}, _next = {}): ProfileState => {
  const {error, profile, profiles, type = ''} = action as {
    error?: Error;
    profile?: ProfileType;
    profiles?: ProfileType[];
    type: string;
  };

  switch(type) {
    case PROFILE_CONSTANTS.ADD_ITEM_SUCCESS:
    case PROFILE_CONSTANTS.UPDATE_ITEM_SUCCESS:
    case PROFILE_CONSTANTS.GET_ITEM_SUCCESS:
      if(profile) {
        const profileId = parseId(profile.profileId ?? '');
        const list = [...state.list];
        const listMap = {...state.listMap};
        const index = list.findIndex((item) => parseId(item.profileId ?? '') === profileId);

                  if(index >= 0) {
            list[index] = {...list[index], ...profile};
          } else {
            list.push(profile);
          }

          listMap[profileId] = profile;

        return {...state, error: undefined, list, listMap};
      }
      return state;

    case PROFILE_CONSTANTS.DELETE_ITEM_SUCCESS:
      if(profile) {
        const profileId = parseId(profile.profileId ?? '');
        const list = state.list.filter((item) => parseId(item.profileId ?? '') !== profileId);
        const listMap = {...state.listMap};
        delete listMap[profileId];

        return {...state, error: undefined, list, listMap};
      }
      return state;

    case PROFILE_CONSTANTS.GET_LIST_SUCCESS:
              if(profiles?.length) {
          const list = [...state.list];
          const listMap = {...state.listMap};

          profiles.forEach((profile) => {
          const profileId = parseId(profile.profileId ?? '');
          const index = list.findIndex((item) => parseId(item.profileId ?? '') === profileId);

          if(index >= 0) {
            list[index] = {...list[index], ...profile};
          } else {
            list.push(profile);
          }

          listMap[profileId] = profile;
        });

        return {...state, error: undefined, list, listMap};
      }
      return state;

    case PROFILE_CONSTANTS.ADD_ITEM_ERROR:
    case PROFILE_CONSTANTS.DELETE_ITEM_ERROR:
    case PROFILE_CONSTANTS.GET_ITEM_ERROR:
    case PROFILE_CONSTANTS.GET_LIST_ERROR:
    case PROFILE_CONSTANTS.UPDATE_ITEM_ERROR:
      return {...state, error};

    default:
      return state;
  }
};

export const profiles = {
  action: profileStore,
  initialState: initialProfileState,
  name: 'profile'
};