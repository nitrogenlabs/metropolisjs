/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {PostType} from '../adapters/postAdapter/postAdapter.js';

export const POST_CONSTANTS = {
  ADD_ITEM_ERROR: 'POST_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'POST_ADD_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'POST_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'POST_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'POST_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'POST_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'POST_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'POST_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'POST_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'POST_UPDATE_ITEM_SUCCESS'
} as const;

interface PostState {
  lists: Record<string, PostType[]>;
  viewed: Record<string, PostType>;
}

export const defaultValues: PostState = {
  lists: {},
  viewed: {}
};

export const postStore = (type: string, data: {post?: PostType}, state = defaultValues): PostState => {
  switch(type) {
    case POST_CONSTANTS.GET_ITEM_SUCCESS: {
      const {viewed} = state;
      const {post} = data;
      if(post && post.postId) {
        const postWithCache: PostType = {...post, cached: Date.now()};
        viewed[post.postId] = postWithCache;
        return {...state, viewed};
      }
      return state;
    }
    default: {
      return state;
    }
  }
};

export const posts = {
  action: postStore,
  initialState: defaultValues,
  name: 'post'
};