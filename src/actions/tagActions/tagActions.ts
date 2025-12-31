/**
 * Copyright (c) 2021-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { validateTagInput } from '../../adapters/tagAdapter/tagAdapter.js';
import { TAG_CONSTANTS } from '../../stores/tagStore.js';
import { appMutation, appQuery } from '../../utils/api.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { TagType } from '../../adapters/tagAdapter/tagAdapter.js';
import type { ReaktorDbCollection } from '../../utils/api.js';

const DATA_TYPE: ReaktorDbCollection = 'tags';

export interface TagAdapterOptions {
  strict?: boolean;
  allowPartial?: boolean;
  environment?: 'development' | 'production' | 'test';
  customValidation?: (input: unknown) => unknown;
}

export interface TagActionsOptions {
  tagAdapter?: (input: unknown, options?: TagAdapterOptions) => any;
  tagAdapterOptions?: TagAdapterOptions;
}

export type TagApiResultsType = {
  tags: {
    addTag: TagType;
    addTagToProfile: TagType;
    deleteTag: TagType;
    deleteTagFromProfile: TagType;
    getTags: TagType[];
    updateTag: TagType;
  };
};

export interface TagActions {
  addTag: (tag: Partial<TagType>, tagProps?: string[]) => Promise<TagType>;
  addTagToProfile: (tagId: string, tagProps?: string[]) => Promise<TagType>;
  deleteTag: (tagId: string, tagProps?: string[]) => Promise<TagType>;
  deleteTagFromProfile: (tagId: string, tagProps?: string[]) => Promise<TagType>;
  getTags: (tagProps?: string[]) => Promise<TagType[]>;
  updateTag: (tag: Partial<TagType>, tagProps?: string[]) => Promise<TagType>;
  updateTagAdapter: (adapter: (input: unknown, options?: TagAdapterOptions) => any) => void;
  updateTagAdapterOptions: (options: TagAdapterOptions) => void;
}

const defaultTagValidator = (input: unknown, options?: TagAdapterOptions) => validateTagInput(input);

const createTagValidator = (
  customAdapter?: (input: unknown, options?: TagAdapterOptions) => any,
  options?: TagAdapterOptions
) => (input: unknown, validatorOptions?: TagAdapterOptions) => {
  const mergedOptions = {...options, ...validatorOptions};
  let validated = defaultTagValidator(input, mergedOptions);

  if(customAdapter) {
    validated = customAdapter(validated, mergedOptions);
  }

  if(mergedOptions?.customValidation) {
    validated = mergedOptions.customValidation(validated) as TagType;
  }

  return validated;
};

export const createTagActions = (
  flux: FluxFramework,
  options?: TagActionsOptions
): TagActions => {
  let tagAdapterOptions: TagAdapterOptions = options?.tagAdapterOptions || {};
  let customTagAdapter = options?.tagAdapter;
  let validateTag = createTagValidator(customTagAdapter, tagAdapterOptions);

  const updateTagAdapter = (adapter: (input: unknown, options?: TagAdapterOptions) => any): void => {
    customTagAdapter = adapter;
    validateTag = createTagValidator(customTagAdapter, tagAdapterOptions);
  };

  const updateTagAdapterOptions = (options: TagAdapterOptions): void => {
    tagAdapterOptions = {...tagAdapterOptions, ...options};
    validateTag = createTagValidator(customTagAdapter, tagAdapterOptions);
  };

  const addTag = async (tag: Partial<TagType>, tagProps: string[] = []): Promise<TagType> => {
    try {
      const queryVariables = {
        tag: {
          type: 'TagInput!',
          value: validateTag(tag, tagAdapterOptions)
        }
      };

      const onSuccess = (data: TagApiResultsType) => {
        const {tags: {addTag: tag = {}}} = data;
        return flux.dispatch({tag, type: TAG_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'addTag',
        DATA_TYPE,
        queryVariables,
        ['category', 'id', 'name', 'tagId', ...tagProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const addTagToProfile = async (tagId: string, tagProps: string[] = []): Promise<TagType> => {
    try {
      const queryVariables = {
        tagId: {
          type: 'ID!',
          value: tagId
        }
      };

      const onSuccess = (data: TagApiResultsType) => {
        const {tags: {addTagToProfile: tag = {}}} = data;
        return flux.dispatch({tag, type: TAG_CONSTANTS.ADD_PROFILE_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'addTagToProfile',
        DATA_TYPE,
        queryVariables,
        ['category', 'id', 'name', 'tagId', ...tagProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.ADD_PROFILE_ERROR});
      throw error;
    }
  };

  const deleteTag = async (tagId: string, tagProps: string[] = []): Promise<TagType> => {
    try {
      const queryVariables = {
        tagId: {
          type: 'ID!',
          value: tagId
        }
      };

      const onSuccess = (data: TagApiResultsType) => {
        const {tags: {deleteTag: tag = {}}} = data;
        return flux.dispatch({tag, type: TAG_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'deleteTag',
        DATA_TYPE,
        queryVariables,
        ['category', 'id', 'name', 'tagId', ...tagProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  const deleteTagFromProfile = async (tagId: string, tagProps: string[] = []): Promise<TagType> => {
    try {
      const queryVariables = {
        tagId: {
          type: 'ID!',
          value: tagId
        }
      };

      const onSuccess = (data: TagApiResultsType) => {
        const {tags: {deleteTagFromProfile: tag = {}}} = data;
        return flux.dispatch({
          tag,
          type: TAG_CONSTANTS.REMOVE_PROFILE_SUCCESS
        });
      };

      return await appMutation<TagType>(
        flux,
        'deleteTagFromProfile',
        DATA_TYPE,
        queryVariables,
        ['category', 'id', 'name', 'tagId', ...tagProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.REMOVE_PROFILE_ERROR});
      throw error;
    }
  };

  const getTags = async (tagProps: string[] = []): Promise<TagType[]> => {
    const initialTags: TagType[] = flux.getState('tag.list', []) as TagType[];
    const cacheExpires: number = flux.getState('tag.expires', 0) as number;
    const now: number = Date.now();

    if(initialTags.length && now < cacheExpires) {
      await flux.dispatch({tags: initialTags, type: TAG_CONSTANTS.GET_LIST_SUCCESS});
      return initialTags;
    }

    try {
      const queryVariables = {
        from: {
          type: 'String',
          value: 0
        },
        search: {
          type: 'Int',
          value: ''
        },
        to: {
          type: 'Int',
          value: -1
        }
      };

      const onSuccess = (data: TagApiResultsType) => {
        const {tags: {getTags}} = data;
        return flux.dispatch({
          tags: getTags,
          type: TAG_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<TagType[]>(
        flux,
        'tags',
        DATA_TYPE,
        queryVariables,
        ['category', 'id', 'name', 'tagId', ...tagProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.GET_LIST_SUCCESS});
      throw error;
    }
  };

  const updateTag = async (tag: Partial<TagType>, tagProps: string[] = []): Promise<TagType> => {
    try {
      const queryVariables = {
        tag: {
          type: 'TagInput!',
          value: validateTag(tag, tagAdapterOptions)
        }
      };

      const onSuccess = (data: TagApiResultsType) => {
        const {tags: {updateTag: tag = {}}} = data;
        return flux.dispatch({tag, type: TAG_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'updateTag',
        DATA_TYPE,
        queryVariables,
        ['category', 'id', 'name', 'tagId', ...tagProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  return {
    addTag,
    addTagToProfile,
    deleteTag,
    deleteTagFromProfile,
    getTags,
    updateTag,
    updateTagAdapter,
    updateTagAdapterOptions
  };
};

