/**
 * Copyright (c) 2023-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId } from '@nlabs/utils';

import { validateProfileInput } from '../../adapters/profileAdapter/profileAdapter.js';
import { PROFILE_CONSTANTS } from '../../stores/profileStore.js';
import { appMutation, appQuery } from '../../utils/api.js';
import { createBaseActions } from '../../utils/baseActionFactory.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { ProfileType } from '../../adapters/profileAdapter/profileAdapter.js';

// Define the collection name for profiles
const DATA_TYPE = 'profiles';

export interface ProfileAdapterOptions {
  readonly strict?: boolean;
  readonly allowPartial?: boolean;
  readonly environment?: 'development' | 'production' | 'test';
  readonly customValidation?: (input: unknown) => unknown;
}

export interface ProfileActionsOptions {
  readonly profileAdapter?: (input: unknown, options?: ProfileAdapterOptions) => any;
  readonly profileAdapterOptions?: ProfileAdapterOptions;
}

export interface ProfileApiResultsType {
  readonly profiles: {
    readonly addProfile?: ProfileType;
    readonly deleteProfile?: ProfileType;
    readonly getProfile?: ProfileType;
    readonly getProfiles?: ProfileType[];
    readonly updateProfile?: ProfileType;
  };
}

export interface ProfileActions {
  readonly addProfile: (profileData: Partial<ProfileType>, profileProps?: string[]) => Promise<ProfileType>;
  readonly getProfile: (profileId: string, profileProps?: string[]) => Promise<ProfileType>;
  readonly getProfiles: (profileIds: string[], profileProps?: string[]) => Promise<ProfileType[]>;
  readonly deleteProfile: (profileId: string, profileProps?: string[]) => Promise<ProfileType>;
  readonly updateProfile: (profile: Partial<ProfileType>, profileProps?: string[]) => Promise<ProfileType>;
  readonly updateProfileAdapter: (adapter: (input: unknown, options?: ProfileAdapterOptions) => any) => void;
  readonly updateProfileAdapterOptions: (options: ProfileAdapterOptions) => void;
}

// Default validation function
const defaultProfileValidator = (input: unknown, options?: ProfileAdapterOptions) => validateProfileInput(input);

/**
 * Factory function to create ProfileActions with enhanced adapter injection capabilities.
 * Custom adapters are merged with default behavior, allowing partial overrides.
 *
 * @example
 * // Basic usage with default adapters
 * const profileActions = createProfileActions(flux);
 *
 * @example
 * // Custom adapter that extends default behavior
 * const customProfileAdapter = (input: unknown, options?: ProfileAdapterOptions) => {
 *   // input is already validated by default adapter
 *   return input;
 * };
 *
 * const profileActions = createProfileActions(flux, {
 *   profileAdapter: customProfileAdapter
 * });
 */
export const createProfileActions = (
  flux: FluxFramework,
  options?: ProfileActionsOptions
): ProfileActions => {
  const profileBase = createBaseActions(flux, defaultProfileValidator, {
    ...(options?.profileAdapter && {adapter: options.profileAdapter}),
    ...(options?.profileAdapterOptions && {adapterOptions: options.profileAdapterOptions})
  });

  // Action implementations
  const addProfile = async (profileData: Partial<ProfileType>, profileProps: string[] = []): Promise<ProfileType> => {
    try {
      const queryVariables = {
        profile: {
          type: 'ProfileInput!',
          value: profileBase.validator(profileData)
        }
      };

      const onSuccess = (data: ProfileApiResultsType) => {
        const {profiles: {addProfile = {}}} = data;
        return flux.dispatch({profile: addProfile, type: PROFILE_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<ProfileType>(flux, 'addProfile', DATA_TYPE, queryVariables, ['profileId', ...profileProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: PROFILE_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const getProfile = async (profileId: string, profileProps: string[] = []): Promise<ProfileType> => {
    try {
      const queryVariables = {
        profileId: {
          type: 'ID!',
          value: parseId(profileId)
        }
      };

      const onSuccess = (data: ProfileApiResultsType) => {
        const {profiles: {getProfile: profile = {}}} = data;
        return flux.dispatch({profile, type: PROFILE_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<ProfileType>(
        flux,
        'profile',
        DATA_TYPE,
        queryVariables,
        [
          'active',
          'gender',
          'hasLike',
          'hasView',
          'images(from: 0 to: 10) { id, imageId, imageUrl, thumbUrl }',
          'imageCount',
          'likeCount',
          'name',
          'profileId',
          'tags {name, tagId}',
          'userId',
          'viewCount',
          ...profileProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: PROFILE_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const getProfiles = async (profileIds: string[], profileProps: string[] = []): Promise<ProfileType[]> => {
    try {
      const queryVariables = {
        profileIds: {
          type: '[ID!]!',
          value: profileIds.map(parseId)
        }
      };

      const onSuccess = (data: ProfileApiResultsType) => {
        const {profiles: {getProfiles: profiles = []}} = data;
        return flux.dispatch({profiles, type: PROFILE_CONSTANTS.GET_LIST_SUCCESS});
      };

      return await appQuery<ProfileType[]>(
        flux,
        'profiles',
        DATA_TYPE,
        queryVariables,
        [
          'active',
          'gender',
          'hasLike',
          'hasView',
          'images(from: 0 to: 10) { id, imageId, imageUrl, thumbUrl }',
          'imageCount',
          'likeCount',
          'name',
          'profileId',
          'tags {name, tagId}',
          'userId',
          'viewCount',
          ...profileProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: PROFILE_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteProfile = async (profileId: string, profileProps: string[] = []): Promise<ProfileType> => {
    try {
      const queryVariables = {
        profileId: {
          type: 'ID!',
          value: parseId(profileId)
        }
      };

      const onSuccess = (data: ProfileApiResultsType) => {
        const {profiles: {deleteProfile: profile = {}}} = data;
        return flux.dispatch({profile, type: PROFILE_CONSTANTS.DELETE_ITEM_SUCCESS});
      };

      return await appMutation<ProfileType>(flux, 'deleteProfile', DATA_TYPE, queryVariables, ['profileId', ...profileProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: PROFILE_CONSTANTS.DELETE_ITEM_ERROR});
      throw error;
    }
  };

  const updateProfile = async (profile: Partial<ProfileType>, profileProps: string[] = []): Promise<ProfileType> => {
    try {
      const queryVariables = {
        profile: {
          type: 'ProfileInput!',
          value: profileBase.validator(profile)
        }
      };

      const onSuccess = (data: ProfileApiResultsType) => {
        const {profiles: {updateProfile: profile = {}}} = data;
        return flux.dispatch({profile, type: PROFILE_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<ProfileType>(flux, 'updateProfile', DATA_TYPE, queryVariables, ['profileId', ...profileProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: PROFILE_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  return {
    addProfile,
    getProfile,
    getProfiles,
    deleteProfile,
    updateProfile,
    updateProfileAdapter: profileBase.updateAdapter,
    updateProfileAdapterOptions: profileBase.updateOptions
  };
};