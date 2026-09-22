/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId} from '@nlabs/utils';

import {parseContentInput} from '../../adapters/contentAdapter/contentAdapter.js';
import {CONTENT_CONSTANTS} from '../../stores/contentStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {ContentInputType, ContentType} from '../../adapters/contentAdapter/contentAdapter.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';

export interface ContentGenerationInput {
  maxTokens?: number;
  model?: string;
  prompt: string;
  provider: 'claude' | 'gemini' | 'openai';
  search?: boolean;
  system?: string;
}
export interface GeneratedContent {
  sources: {title: string; url: string}[];
  text: string;
}
export interface ContentGenerationOptions<TInput, TResult> {
  /** Application-owned durable jobs may replace the immediate GraphQL operation. */
  transport?: (input: TInput) => Promise<TResult>;
}
export type GenerateContent = <TInput extends {provider: string} = ContentGenerationInput, TResult = GeneratedContent>(
  input: TInput,
  options?: ContentGenerationOptions<TInput, TResult>
) => Promise<TResult>;
export const CONTENT_GENERATION_CONSTANTS = {
  ERROR: 'CONTENT_GENERATION_ERROR',
  SUCCESS: 'CONTENT_GENERATION_SUCCESS'
} as const;

const DATA_TYPE = 'contents';

export type ContentAdapterOptions = BaseAdapterOptions;

export interface ContentActionsOptions {
  contentAdapter?: (input: unknown, _options?: ContentAdapterOptions) => any;
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
  generateContent: GenerateContent;
  add: (
    contentData: ContentInputType,
    contentProps?: string[],
    requestOptions?: ActionRequestOptions
  ) => Promise<ContentType>;
  itemById: (contentId: string, contentProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ContentType>;
  itemByKey: (
    key: string,
    locale?: string,
    contentProps?: string[],
    requestOptions?: ActionRequestOptions
  ) => Promise<ContentType>;
  listByCategory: (
    category: string,
    contentProps?: string[],
    requestOptions?: ActionRequestOptions
  ) => Promise<ContentType[]>;
  list: (contentProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ContentType[]>;
  delete: (contentId: string, contentProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ContentType>;
  update: (
    content: ContentInputType,
    contentProps?: string[],
    requestOptions?: ActionRequestOptions
  ) => Promise<ContentType>;
  updateContentAdapter: (adapter: (input: unknown, _options?: ContentAdapterOptions) => any) => void;
  updateContentAdapterOptions: (options: ContentAdapterOptions) => void;
}

const defaultContentValidator = (input: unknown, _options?: ContentAdapterOptions) =>
  parseContentInput(input as ContentInputType);

export const createContentActions = (flux: FluxFramework, options?: ContentActionsOptions): ContentActions => {
  const generateContent: GenerateContent = async <TInput extends {provider: string}, TResult>(
    input: TInput,
    requestOptions: ContentGenerationOptions<TInput, TResult> = {}
  ): Promise<TResult> => {
    try {
      if(!input.provider?.trim()) {
        throw new Error('A content provider is required.');
      }
      const result = requestOptions.transport
        ? await requestOptions.transport(input)
        : await appMutation<TResult>(
          flux,
          'generateContent',
          DATA_TYPE,
          {input: {type: 'ContentGenerationInput!', value: input}},
          ['text', 'sources {title url}'],
          {
            onSuccess: (data) => (data as any)?.contents?.generateContent,
            queueOffline: false
          }
        );
      if(result === undefined || result === null) {
        throw new Error('Content generation returned no confirmed result.');
      }
      await flux.setState('content.generation', result);
      await flux.dispatch({result, type: CONTENT_GENERATION_CONSTANTS.SUCCESS});
      return result;
    } catch(error) {
      await flux.dispatch({error, type: CONTENT_GENERATION_CONSTANTS.ERROR});
      throw error;
    }
  };
  const contentBase = createBaseActions(flux, defaultContentValidator, {
    ...(options?.contentAdapter && {adapter: options.contentAdapter}),
    ...(options?.contentAdapterOptions && {adapterOptions: options.contentAdapterOptions})
  });
  const add = async (
    contentData: ContentInputType,
    contentProps: string[] = [],
    _requestOptions: ActionRequestOptions = {}
  ): Promise<ContentType> => {
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

      return await appMutation<ContentType>(
        flux,
        'addContent',
        DATA_TYPE,
        queryVariables,
        ['contentId', 'key', 'locale', 'content', ...contentProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'content.list');
    }
  };

  const itemById = async (
    contentId: string,
    contentProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ContentType> => {
    try {
      const cachedResult = getCachedRequest<ContentType>(
        flux,
        `content.itemById:${contentId}`,
        {contentId, contentProps},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

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

      const result = await appQuery<ContentType>(
        flux,
        'content',
        DATA_TYPE,
        queryVariables,
        ['contentId', 'key', 'locale', 'content', 'description', 'category', 'isActive', ...contentProps],
        {onSuccess}
      );
      return await setCachedRequest(
        flux,
        `content.itemById:${contentId}`,
        {contentId, contentProps},
        result,
        requestOptions
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const itemByKey = async (
    key: string,
    locale: string = 'en',
    contentProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ContentType> => {
    try {
      const cachedResult = getCachedRequest<ContentType>(
        flux,
        `content.itemByKey:${key}:${locale}`,
        {contentProps, key, locale},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

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

      const result = await appQuery<ContentType>(
        flux,
        'contentByKey',
        DATA_TYPE,
        queryVariables,
        ['contentId', 'key', 'locale', 'content', 'description', 'category', 'isActive', ...contentProps],
        {onSuccess}
      );
      return await setCachedRequest(
        flux,
        `content.itemByKey:${key}:${locale}`,
        {contentProps, key, locale},
        result,
        requestOptions
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const listByCategory = async (
    category: string,
    contentProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ContentType[]> => {
    try {
      const cachedResult = getCachedRequest<ContentType[]>(
        flux,
        `content.listByCategory:${category}`,
        {category, contentProps},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

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

      const result = await appQuery<ContentType[]>(
        flux,
        'contentsByCategory',
        DATA_TYPE,
        queryVariables,
        ['contentId', 'key', 'locale', 'content', 'description', 'category', 'isActive', ...contentProps],
        {onSuccess}
      );
      return await setCachedRequest(
        flux,
        `content.listByCategory:${category}`,
        {category, contentProps},
        result,
        requestOptions
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const list = async (
    contentProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ContentType[]> => {
    try {
      const cachedResult = getCachedRequest<ContentType[]>(flux, 'content.list', {contentProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const onSuccess = (data: ContentApiResultsType) => {
        const contentsList = data?.contents?.getContentsList || [];
        return flux.dispatch({
          list: contentsList,
          type: CONTENT_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<ContentType[]>(
        flux,
        'contentsList',
        DATA_TYPE,
        {},
        ['contentId', 'key', 'locale', 'content', 'description', 'category', 'isActive', ...contentProps],
        {onSuccess}
      );
      return await setCachedRequest(flux, 'content.list', {contentProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteContent = async (
    contentId: string,
    contentProps: string[] = [],
    _requestOptions: ActionRequestOptions = {}
  ): Promise<ContentType> => {
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

      return await appMutation<ContentType>(
        flux,
        'deleteContent',
        DATA_TYPE,
        queryVariables,
        ['contentId', ...contentProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `content.itemById:${contentId}`);
      await clearCachedRequest(flux, 'content.list');
    }
  };

  const update = async (
    content: ContentInputType,
    contentProps: string[] = [],
    _requestOptions: ActionRequestOptions = {}
  ): Promise<ContentType> => {
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

      return await appMutation<ContentType>(
        flux,
        'updateContent',
        DATA_TYPE,
        queryVariables,
        ['contentId', ...contentProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONTENT_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `content.itemById:${String(content?.contentId || '')}`);
      await clearCachedRequest(flux, 'content.list');
    }
  };

  return {
    add,
    delete: deleteContent,
    generateContent,
    itemById,
    itemByKey,
    list,
    listByCategory,
    update,
    updateContentAdapter: contentBase.updateAdapter,
    updateContentAdapterOptions: contentBase.updateOptions
  };
};
