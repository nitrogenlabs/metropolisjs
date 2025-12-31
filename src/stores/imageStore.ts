/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type { ImageType } from '../adapters/imageAdapter/imageAdapter.js';

export const IMAGE_CONSTANTS = {
  ADD_ITEM_ERROR: 'IMAGE_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'IMAGE_ADD_ITEM_SUCCESS',
  GET_COUNT_ERROR: 'IMAGE_GET_COUNT_ERROR',
  GET_COUNT_SUCCESS: 'IMAGE_GET_COUNT_SUCCESS',
  GET_LIST_ERROR: 'IMAGE_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'IMAGE_GET_LIST_SUCCESS',
  OPEN: 'IMAGE_OPEN',
  REMOVE_ITEM_ERROR: 'IMAGE_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'IMAGE_REMOVE_ITEM_SUCCESS',
  UPLOAD_ITEM_ERROR: 'IMAGE_UPLOAD_ITEM_ERROR',
  UPLOAD_ITEM_SUCCESS: 'IMAGE_UPLOAD_ITEM_SUCCESS'
} as const;

interface ImageState {
  lists: Record<string, ImageType[]>;
}

export const defaultValues: ImageState = {
  lists: {}
};

export const imageStore = (type: string, data: {
  list?: ImageType[];
  itemId?: string;
}, state = defaultValues): ImageState => {
  switch(type) {
    case IMAGE_CONSTANTS.GET_LIST_SUCCESS: {
      const {list, itemId} = data;

      if(!itemId) {
        return state;
      }

      const {lists} = state;
      return {...state, lists: {...lists, [itemId]: list || []}};
    }
    default: {
      return state;
    }
  }
};

export const images = {
  action: imageStore,
  initialState: defaultValues,
  name: 'image'
};