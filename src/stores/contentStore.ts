/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import type { ContentType } from '../adapters/contentAdapter/contentAdapter.js';

export const CONTENT_CONSTANTS = {
  ADD_ITEM_ERROR: 'CONTENT_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'CONTENT_ADD_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'CONTENT_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'CONTENT_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'CONTENT_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'CONTENT_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'CONTENT_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'CONTENT_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'CONTENT_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'CONTENT_UPDATE_ITEM_SUCCESS'
} as const;

export type ContentConstantsType = typeof CONTENT_CONSTANTS[keyof typeof CONTENT_CONSTANTS];

interface ContentState {
  error?: Error;
  content: Record<string, Partial<ContentType>>;
  lists: Record<string, unknown>;
}

const defaultValues: ContentState = {
  content: {},
  lists: {}
};

interface ContentData {
  readonly content?: ContentType;
  readonly error?: Error;
  readonly list?: ContentType[];
}

export const contentStore = (type: string, data: ContentData, state = defaultValues): ContentState => {
  switch(type) {
    case CONTENT_CONSTANTS.ADD_ITEM_SUCCESS: {
      const {content} = data;
      if(content && content.contentId) {
        const {content: contents} = state;
        contents[content.contentId] = {...content, timestamp: Date.now()};
        return {...state, content: contents};
      }
      return state;
    }
    case CONTENT_CONSTANTS.GET_ITEM_SUCCESS: {
      const {content} = data;
      if(content && content.contentId) {
        const {content: contents} = state;
        contents[content.contentId] = {...content, timestamp: Date.now()};
        return {...state, content: contents};
      }
      return state;
    }
    case CONTENT_CONSTANTS.GET_LIST_SUCCESS: {
      const {list} = data;
      if(list) {
        const {content: contents} = state;

        list.forEach((content: ContentType) => {
          if(content.contentId) {
            const cachedContent: Partial<ContentType> = contents[content.contentId] || {};
            contents[content.contentId] = {...cachedContent, ...content};
          }
        });

        return {...state, content: contents};
      }
      return state;
    }
    case CONTENT_CONSTANTS.REMOVE_ITEM_SUCCESS: {
      const {content} = data;
      if(content && content.contentId) {
        const {content: contents} = state;
        delete contents[content.contentId];
        return {...state, content: contents};
      }
      return state;
    }
    case CONTENT_CONSTANTS.UPDATE_ITEM_SUCCESS: {
      const {content} = data;
      if(content && content.contentId) {
        const {content: contents} = state;
        contents[content.contentId] = {...contents[content.contentId], ...content, timestamp: Date.now()};
        return {...state, content: contents};
      }
      return state;
    }
    case CONTENT_CONSTANTS.ADD_ITEM_ERROR:
    case CONTENT_CONSTANTS.GET_ITEM_ERROR:
    case CONTENT_CONSTANTS.GET_LIST_ERROR:
    case CONTENT_CONSTANTS.REMOVE_ITEM_ERROR:
    case CONTENT_CONSTANTS.UPDATE_ITEM_ERROR: {
      const {error} = data;
      return {...state, error};
    }
    default: {
      return state;
    }
  }
};

export const contents = {
  action: contentStore,
  initialState: defaultValues,
  name: 'content'
};