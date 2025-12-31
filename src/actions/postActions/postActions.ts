/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId, parseNum } from '@nlabs/utils';

import { validatePostInput } from '../../adapters/postAdapter/postAdapter.js';
import { POST_CONSTANTS } from '../../stores/postStore.js';
import { appMutation, appQuery } from '../../utils/api.js';
import { createBaseActions } from '../../utils/baseActionFactory.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { PostType } from '../../adapters/postAdapter/postAdapter.js';
import type { ReaktorDbCollection } from '../../utils/api.js';
import type { BaseAdapterOptions } from '../../utils/validatorFactory.js';

const DATA_TYPE: ReaktorDbCollection = 'posts';

export interface PostAdapterOptions extends BaseAdapterOptions {
}

export interface PostActionsOptions {
  postAdapter?: (input: unknown, options?: PostAdapterOptions) => any;
  postAdapterOptions?: PostAdapterOptions;
}

export type PostApiResultsType = {
  posts: {
    addPost: PostType;
    getPost: PostType;
    getPostsByLatest: PostType[];
    getPostsByLocation: PostType[];
    getPostsByReactions: PostType[];
    getPostsByTags: PostType[];
    deletePost: PostType;
    updatePost: PostType;
  };
};

export interface PostActions {
  add: (postData: Partial<PostType>, postProps?: string[]) => Promise<PostType>;
  itemById: (postId: string, postProps?: string[]) => Promise<PostType>;
  listByLatest: (from?: number, to?: number, postProps?: string[]) => Promise<PostType[]>;
  listByLocation: (latitude: number, longitude: number, from?: number, to?: number, postProps?: string[]) => Promise<PostType[]>;
  listByReactions: (reactionNames: string[], latitude: number, longitude: number, from?: number, to?: number, postProps?: string[]) => Promise<PostType[]>;
  listByTags: (tags: string[], latitude: number, longitude: number, from?: number, to?: number, postProps?: string[]) => Promise<PostType[]>;
  delete: (postId: string, postProps?: string[]) => Promise<PostType>;
  update: (post: Partial<PostType>, postProps?: string[]) => Promise<PostType>;
  updatePostAdapter: (adapter: (input: unknown, options?: PostAdapterOptions) => any) => void;
  updatePostAdapterOptions: (options: PostAdapterOptions) => void;
}

const defaultPostValidator = (input: unknown, options?: PostAdapterOptions) => validatePostInput(input);

export const createPostActions = (
  flux: FluxFramework,
  options?: PostActionsOptions
): PostActions => {
  const postBase = createBaseActions(flux, defaultPostValidator, {
    adapter: options?.postAdapter,
    adapterOptions: options?.postAdapterOptions
  });
  const add = async (postData: Partial<PostType>, postProps: string[] = []): Promise<PostType> => {
    try {
      const queryVariables = {
        post: {
          type: 'PostInput!',
          value: postBase.validator(postData)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {addPost = {}}} = data;
        return flux.dispatch({post: addPost, type: POST_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<PostType>(flux, 'addPost', DATA_TYPE, queryVariables, ['postId', ...postProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const itemById = async (postId: string, postProps: string[] = []): Promise<PostType> => {
    try {
      const queryVariables = {
        postId: {
          type: 'ID!',
          value: parseId(postId)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPost: post = {}}} = data;
        return flux.dispatch({post, type: POST_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<PostType>(
        flux,
        'post',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'content',
          'isSaved',
          'modified',
          'name',
          'postId',
          'tags {name, tagId}',
          'user {birthdate, imageUrl, thumbUrl, userId, username}',
          'viewCount',
          ...postProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const listByLatest = async (
    from: number = 0,
    to: number = 0,
    postProps: string[] = []
  ): Promise<PostType[]> => {
    try {
      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPostsByLatest: postsByLatest = []}} = data;
        return flux.dispatch({
          list: postsByLatest,
          type: POST_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<PostType[]>(
        flux,
        'postsByLatest',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'content',
          'isSaved',
          'modified',
          'name',
          'postId',
          'tags {name, tagId}',
          'user {birthdate, imageUrl, thumbUrl, userId, username}',
          'viewCount',
          ...postProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByLocation = async (
    latitude: number,
    longitude: number,
    from: number = 0,
    to: number = 10,
    postProps: string[] = []
  ): Promise<PostType[]> => {
    try {
      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        latitude: {
          type: 'Float',
          value: parseNum(latitude)
        },
        longitude: {
          type: 'Float',
          value: parseNum(longitude)
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPostsByLocation: postsByLocation = []}} = data;
        return flux.dispatch({
          list: postsByLocation,
          type: POST_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<PostType[]>(
        flux,
        'postsByLocation',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'content',
          'isSaved',
          'modified',
          'name',
          'postId',
          'tags {name, tagId}',
          'user {birthdate, imageUrl, thumbUrl, userId, username}',
          'viewCount',
          ...postProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByReactions = async (
    reactionNames: string[],
    latitude: number,
    longitude: number,
    from: number = 0,
    to: number = 10,
    postProps: string[] = []
  ): Promise<PostType[]> => {
    try {
      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        latitude: {
          type: 'Float',
          value: parseNum(latitude)
        },
        longitude: {
          type: 'Float',
          value: parseNum(longitude)
        },
        reactions: {
          type: 'ReactionInput!',
          value: reactionNames
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPostsByReactions: postsByReactions = []}} = data;
        return flux.dispatch({
          list: postsByReactions,
          type: POST_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<PostType[]>(
        flux,
        'postsByReactions',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'content',
          'isSaved',
          'modified',
          'name',
          'postId',
          'tags {name, tagId}',
          'user {birthdate, imageUrl, thumbUrl, userId, username}',
          'viewCount',
          ...postProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByTags = async (
    tags: string[],
    latitude: number,
    longitude: number,
    from: number = 0,
    to: number = 10,
    postProps: string[] = []
  ): Promise<PostType[]> => {
    try {
      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        latitude: {
          type: 'Float',
          value: parseNum(latitude)
        },
        longitude: {
          type: 'Float',
          value: parseNum(longitude)
        },
        tags: {
          type: 'TagInput!',
          value: tags
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPostsByTags: postsByTags = []}} = data;
        return flux.dispatch({
          list: postsByTags,
          type: POST_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<PostType[]>(
        flux,
        'postsByTags',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'content',
          'isSaved',
          'modified',
          'name',
          'postId',
          'tags {name, tagId}',
          'user {birthdate, imageUrl, thumbUrl, userId, username}',
          'viewCount',
          ...postProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deletePost = async (postId: string, postProps: string[] = []): Promise<PostType> => {
    try {
      const queryVariables = {
        postId: {
          type: 'ID!',
          value: parseId(postId)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {deletePost = {}}} = data;
        return flux.dispatch({post: deletePost, type: POST_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<PostType>(flux, 'deletePost', DATA_TYPE, queryVariables, ['postId', ...postProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  const update = async (post: Partial<PostType>, postProps: string[] = []): Promise<PostType> => {
    try {
      const queryVariables = {
        post: {
          type: 'PostUpdateInput!',
          value: postBase.validator(post)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {updatePost = {}}} = data;
        return flux.dispatch({post: updatePost, type: POST_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<PostType>(flux, 'updatePost', DATA_TYPE, queryVariables, ['postId', ...postProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: POST_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  return {
    add,
    itemById,
    listByLatest,
    listByLocation,
    listByReactions,
    listByTags,
    delete: deletePost,
    update,
    updatePostAdapter: postBase.updateAdapter,
    updatePostAdapterOptions: postBase.updateOptions
  };
};
