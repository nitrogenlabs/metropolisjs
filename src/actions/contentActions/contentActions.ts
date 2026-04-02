/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId } from '@nlabs/utils';

import { parseContentInput } from '../../adapters/contentAdapter/contentAdapter.js';
import { CONTENT_CONSTANTS } from '../../stores/contentStore.js';
import { appMutation, appQuery } from '../../utils/api.js';
import { createBaseActions } from '../../utils/baseActionFactory.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { ContentInputType, ContentType } from '../../adapters/contentAdapter/contentAdapter.js';
import type { BaseAdapterOptions } from '../../utils/validatorFactory.js';

const DATA_TYPE = 'contents';

export interface ContentAdapterOptions extends BaseAdapterOptions {
}

export interface ContentActionsOptions {
  contentAdapter?: (input: unknown, options?: ContentAdapterOptions) => any;
  contentAdapterOptions?: ContentAdapterOptions;
}

export type ContentApiResultsType = {
  contents: {
    addContent: ContentType;
    getContent: ContentType;
    getContentByKey: ContentType;
    getContentsByCategory: ContentType[];
    getContentsList: ContentType[];
    deleteContent: ContentType;
    updateContent: ContentType;
  };
};

export interface ContentActions {
  add: (contentData: ContentInputType, contentProps?: string[]) => Promise<ContentType>;
  itemById: (contentId: string, contentProps?: string[]) => Promise<ContentType>;
  itemByKey: (key: string, locale?: string, contentProps?: string[]) => Promise<ContentType>;
  listByCategory: (category: string, contentProps?: string[]) => Promise<ContentType[]>;
  list: (contentProps?: string[]) => Promise<ContentType[]>;
  delete: (contentId: string, contentProps?: string[]) => Promise<ContentType>;
  update: (content: ContentInputType, contentProps?: string[]) => Promise<ContentType>;
  updateContentAdapter: (adapter: (input: unknown, options?: ContentAdapterOptions) => any) => void;
  updateContentAdapterOptions: (options: ContentAdapterOptions) => void;
}

const defaultContentValidator = (input: unknown, options?: ContentAdapterOptions) => parseContentInput(input as ContentInputType);

export const createContentActions = (
  flux: FluxFramework,
  options?: ContentActionsOptions
): ContentActions => {
  const contentBase = createBaseActions(flux, defaultContentValidator, {
    ...(options?.contentAdapter && {adapter: options.contentAdapter}),
    ...(options?.contentAdapterOptions && {adapterOptions: options.contentAdapterOptions})
  });
  const add = async (contentData: ContentInputType, contentProps: string[] = []): Promise<ContentType> => {
    try {
      const queryVariables = {
        content: {
          type: 'ContentInput!',
          value: contentBase.validator(contentData)
        }
      };

      const onSuccess = (data: ContentApiResultsType) => {
        const addContent = data?.contents?.addContent || {};
        return flux.dispatch({content: addContent, type: CONTENT_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<ContentType>(flux, 'addContent', DATA_TYPE, queryVariables, ['contentId', 'key', 'locale', 'content', ...contentProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const itemById = async (contentId: string, contentProps: string[] = []): Promise<ContentType> => {
    try {
      const queryVariables = {
        contentId: {
          type: 'ID!',
          value: parseId(contentId)
        }
      };

      const onSuccess = (data: ContentApiResultsType) => {
        const content = data?.contents?.getContent || {};
        return flux.dispatch({content, type: CONTENT_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<ContentType>(
        flux,
        'content',
        DATA_TYPE,
        queryVariables,
        [
          'contentId',
          'key',
          'locale',
          'content',
          'description',
          'category',
          'isActive',
          ...contentProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const itemByKey = async (key: string, locale: string = 'en', contentProps: string[] = []): Promise<ContentType> => {
    try {
      const queryVariables = {
        key: {
          type: 'String!',
          value: key
        },
        locale: {
          type: 'String!',
          value: locale
        }
      };

      const onSuccess = (data: ContentApiResultsType) => {
        const content = data?.contents?.getContentByKey || {};
        return flux.dispatch({content, type: CONTENT_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<ContentType>(
        flux,
        'contentByKey',
        DATA_TYPE,
        queryVariables,
        [
          'contentId',
          'key',
          'locale',
          'content',
          'description',
          'category',
          'isActive',
          ...contentProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const listByCategory = async (category: string, contentProps: string[] = []): Promise<ContentType[]> => {
    try {
      const queryVariables = {
        category: {
          type: 'String!',
          value: category
        }
      };

      const onSuccess = (data: ContentApiResultsType) => {
        const contentsByCategory = data?.contents?.getContentsByCategory || [];
        return flux.dispatch({
          list: contentsByCategory,
          type: CONTENT_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<ContentType[]>(
        flux,
        'contentsByCategory',
        DATA_TYPE,
        queryVariables,
        [
          'contentId',
          'key',
          'locale',
          'content',
          'description',
          'category',
          'isActive',
          ...contentProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const list = async (contentProps: string[] = []): Promise<ContentType[]> => {
    try {
      const onSuccess = (data: ContentApiResultsType) => {
        const contentsList = data?.contents?.getContentsList || [];
        return flux.dispatch({
          list: contentsList,
          type: CONTENT_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<ContentType[]>(
        flux,
        'contentsList',
        DATA_TYPE,
        {},
        [
          'contentId',
          'key',
          'locale',
          'content',
          'description',
          'category',
          'isActive',
          ...contentProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteContent = async (contentId: string, contentProps: string[] = []): Promise<ContentType> => {
    try {
      const queryVariables = {
        contentId: {
          type: 'ID!',
          value: parseId(contentId)
        }
      };

      const onSuccess = (data: ContentApiResultsType) => {
        const deleteContent = data?.contents?.deleteContent || {};
        return flux.dispatch({content: deleteContent, type: CONTENT_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<ContentType>(flux, 'deleteContent', DATA_TYPE, queryVariables, ['contentId', ...contentProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  const update = async (content: ContentInputType, contentProps: string[] = []): Promise<ContentType> => {
    try {
      const queryVariables = {
        content: {
          type: 'ContentUpdateInput!',
          value: contentBase.validator(content)
        }
      };

      const onSuccess = (data: ContentApiResultsType) => {
        const updateContent = data?.contents?.updateContent || {};
        return flux.dispatch({content: updateContent, type: CONTENT_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<ContentType>(flux, 'updateContent', DATA_TYPE, queryVariables, ['contentId', ...contentProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  return {
    add,
    itemById,
    itemByKey,
    listByCategory,
    list,
    delete: deleteContent,
    update,
    updateContentAdapter: contentBase.updateAdapter,
    updateContentAdapterOptions: contentBase.updateOptions
  };
};
