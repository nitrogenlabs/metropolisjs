/**
 * Copyright (c) 2021-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {validateTagInput} from '../../adapters/tagAdapter/tagAdapter.js';
import {TAG_CONSTANTS} from '../../stores/tagStore.js';
import {appMutation, appQuery} from '../../utils/api.js';

import type {FluxAction, FluxFramework} from '@nlabs/arkhamjs';
import type {TagType} from '../../adapters/tagAdapter/tagAdapter.js';
import type {ReaktorDbCollection} from '../../utils/api.js';

const DATA_TYPE: ReaktorDbCollection = 'tags';
const DEFAULT_TAG_PROPS = ['added', 'category', 'description', 'modified', 'name', 'tagId'];
const DELETE_TAG_PROPS = DEFAULT_TAG_PROPS.filter((field) => field !== 'tagId');

const sanitizeTagProps = (tagProps: string[] = [], baseProps: string[] = DEFAULT_TAG_PROPS): string[] => {
  const fields = [...baseProps, ...tagProps];
  const seen = new Set<string>();

  return fields.reduce((result: string[], field: string) => {
    const nextField = String(field || '').trim();

    if(!nextField || seen.has(nextField)) {
      return result;
    }

    seen.add(nextField);
    result.push(nextField);
    return result;
  }, []);
};

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
    addTagToItem: TagType;
    deleteTag: TagType;
    deleteTagFromItem: boolean;
    getTagsByItem: TagType[];
    getTags: TagType[];
    updateTag: TagType;
  };
};

export interface TagActions {
  addTag: (tag: Partial<TagType>, tagProps?: string[]) => Promise<TagType>;
  addTagToItem: (tagId: string, itemDocId?: string, tagProps?: string[]) => Promise<TagType>;
  deleteTag: (tagId: string, tagProps?: string[]) => Promise<TagType>;
  deleteTagFromItem: (tagId: string, itemDocId?: string) => Promise<boolean>;
  getTagsByItem: (itemDocId: string, tagProps?: string[]) => Promise<TagType[]>;
  getTags: (
    searchQuery?: string,
    tagProps?: string[],
    options?: {forceRefresh?: boolean}
  ) => Promise<TagType[]>;
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
      const requestedTagProps = sanitizeTagProps(tagProps);
      const queryVariables = {
        tag: {
          type: 'TagInput!',
          value: validateTag(tag, tagAdapterOptions)
        }
      };

      const onSuccess = async (data: TagApiResultsType): Promise<FluxAction> => {
        const tag = data?.tags?.addTag || {};
        return await flux.dispatch({tag, type: TAG_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'addTag',
        DATA_TYPE,
        queryVariables,
        requestedTagProps,
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const addTagToItem = async (
    tagId: string,
    itemDocId = '',
    tagProps: string[] = []
  ): Promise<TagType> => {
    try {
      const session = (flux.getState('user.session', {}) || {}) as {personaId?: string; tags?: TagType[]};
      const sessionPersonaDocId = session?.personaId ? `personas/${session.personaId}` : '';
      const existingPersonaTag = itemDocId === sessionPersonaDocId
        ? (session?.tags || []).find((tag) => String(tag?.tagId || '').trim() === String(tagId || '').trim())
        : null;

      if(existingPersonaTag) {
        return existingPersonaTag;
      }

      const requestedTagProps = sanitizeTagProps(tagProps);
      const queryVariables = {
        itemDocId: {
          type: 'String!',
          value: itemDocId
        },
        tagId: {
          type: 'ID!',
          value: tagId
        }
      };

      const onSuccess = async (data: TagApiResultsType): Promise<FluxAction> => {
        const tag = data?.tags?.addTagToItem || {};

        if(itemDocId.startsWith('personas/')) {
          return await flux.dispatch({tag, type: TAG_CONSTANTS.ADD_PERSONA_SUCCESS});
        }

        return await flux.dispatch({itemDocId, tag, type: TAG_CONSTANTS.ADD_LINK_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'addTagToItem',
        DATA_TYPE,
        queryVariables,
        requestedTagProps,
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.ADD_PERSONA_ERROR});
      throw error;
    }
  };

  const deleteTag = async (tagId: string, tagProps: string[] = []): Promise<TagType> => {
    try {
      const requestedTagProps = sanitizeTagProps(tagProps, DELETE_TAG_PROPS);
      const queryVariables = {
        tagId: {
          type: 'ID!',
          value: tagId
        }
      };

      const onSuccess = async (data: TagApiResultsType): Promise<FluxAction> => {
        const tag = data?.tags?.deleteTag || {};
        const deletedTag = {
          ...tag,
          ...(tagId ? {tagId} : {})
        };
        return await flux.dispatch({tag: deletedTag, type: TAG_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'deleteTag',
        DATA_TYPE,
        queryVariables,
        requestedTagProps,
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  const deleteTagFromItem = async (
    tagId: string,
    itemDocId = ''
  ): Promise<boolean> => {
    try {
      const queryVariables = {
        itemDocId: {
          type: 'String!',
          value: itemDocId
        },
        tagId: {
          type: 'ID!',
          value: tagId
        }
      };

      const onSuccess = async (data: TagApiResultsType): Promise<FluxAction> => {
        const removed = data?.tags?.deleteTagFromItem ?? false;

        if(removed && itemDocId.startsWith('personas/')) {
          return await flux.dispatch({
            tag: {tagId},
            type: TAG_CONSTANTS.REMOVE_PERSONA_SUCCESS
          });
        }

        return await flux.dispatch({
          itemDocId,
          removed,
          tag: {tagId},
          type: TAG_CONSTANTS.REMOVE_LINK_SUCCESS
        });
      };

      return await appMutation<boolean>(
        flux,
        'deleteTagFromItem',
        DATA_TYPE,
        queryVariables,
        [],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.REMOVE_PERSONA_ERROR});
      throw error;
    }
  };

  const getTags = async (
    searchQuery = '',
    tagProps: string[] = [],
    options: {forceRefresh?: boolean} = {}
  ): Promise<TagType[]> => {
    const initialTags: TagType[] = flux.getState('tag.list', []) as TagType[];
    const cacheExpires: number = flux.getState('tag.expires', 0) as number;
    const now: number = Date.now();
    const requestedTagProps = sanitizeTagProps(tagProps);
    const forceRefresh = !!options?.forceRefresh;

    if(!forceRefresh && initialTags.length && now < cacheExpires && !searchQuery) {
      await flux.dispatch({tags: initialTags, type: TAG_CONSTANTS.GET_LIST_SUCCESS});
      return initialTags;
    }

    try {
      const queryVariables = searchQuery
        ? {
          searchQuery: {
            type: 'String',
            value: searchQuery
          }
        }
        : {};

      const onSuccess = async (data: TagApiResultsType): Promise<FluxAction> => {
        const getTags = data?.tags?.getTags || [];
        return await flux.dispatch({
          tags: getTags,
          type: TAG_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<TagType[]>(
        flux,
        'getTags',
        DATA_TYPE,
        queryVariables,
        requestedTagProps,
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.GET_LIST_SUCCESS});
      throw error;
    }
  };

  const getTagsByItem = async (
    itemDocId: string,
    tagProps: string[] = []
  ): Promise<TagType[]> => {
    try {
      const requestedTagProps = sanitizeTagProps(tagProps);
      const queryVariables = {
        itemDocId: {
          type: 'String!',
          value: itemDocId
        }
      };

      const onSuccess = async (data: TagApiResultsType): Promise<FluxAction> => {
        const tags = data?.tags?.getTagsByItem || [];

        return await flux.dispatch({
          tags,
          type: TAG_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<TagType[]>(
        flux,
        'getTagsByItem',
        DATA_TYPE,
        queryVariables,
        requestedTagProps,
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const updateTag = async (tag: Partial<TagType>, tagProps: string[] = []): Promise<TagType> => {
    try {
      const requestedTagProps = sanitizeTagProps(tagProps);
      const queryVariables = {
        tag: {
          type: 'TagInput!',
          value: validateTag(tag, tagAdapterOptions)
        }
      };

      const onSuccess = async (data: TagApiResultsType): Promise<FluxAction> => {
        const tag = data?.tags?.updateTag || {};
        return await flux.dispatch({tag, type: TAG_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<TagType>(
        flux,
        'updateTag',
        DATA_TYPE,
        queryVariables,
        requestedTagProps,
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TAG_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  return {
    addTag,
    addTagToItem,
    deleteTag,
    deleteTagFromItem,
    getTagsByItem,
    getTags,
    updateTag,
    updateTagAdapter,
    updateTagAdapterOptions
  };
};
