/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validateVideoInput} from '../../adapters/videoAdapter/videoAdapter.js';
import {VIDEO_CONSTANTS} from '../../stores/videoStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {VideoType} from '../../types/videos.types.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

const DATA_TYPE = 'videos';

export type VideoAdapterOptions = BaseAdapterOptions;

export interface VideoActionsOptions {
  videoAdapter?: (input: unknown, options?: VideoAdapterOptions) => any;
  videoAdapterOptions?: VideoAdapterOptions;
}

export type VideoApiResultsType = {
  videos: {
    add?: VideoType;
    itemById?: VideoType;
    list?: VideoType[];
    remove?: VideoType;
    update?: VideoType;
  };
};

export interface VideoActions {
  add: (videoData: Partial<VideoType>, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  delete: (videoId: string, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  itemById: (videoId: string, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  list: (from?: number, to?: number, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType[]>;
  update: (video: Partial<VideoType>, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  updateVideoAdapter: (adapter: (input: unknown, options?: VideoAdapterOptions) => any) => void;
  updateVideoAdapterOptions: (options: VideoAdapterOptions) => void;
}

const defaultVideoValidator = (input: unknown, options?: VideoAdapterOptions) =>
  validateVideoInput(input);

export const createVideoActions = (
  flux: FluxFramework,
  options?: VideoActionsOptions
): VideoActions => {
  const videoBase = createBaseActions(flux, defaultVideoValidator, {
    adapter: options?.videoAdapter,
    adapterOptions: options?.videoAdapterOptions
  });

  const add = async (
    videoData: Partial<VideoType>,
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoType> => {
    try {
      const queryVariables = {
        video: {
          type: 'VideoInput!',
          value: videoBase.validator(videoData)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const video = data?.videos?.add || {};
        return flux.dispatch({type: VIDEO_CONSTANTS.ADD_ITEM_SUCCESS, video});
      };

      return await appMutation<VideoType>(
        flux,
        'add',
        DATA_TYPE,
        queryVariables,
        ['videoId', ...videoProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'video.list');
    }
  };

  const itemById = async (videoId: string, videoProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<VideoType> => {
    try {
      const cachedResult = getCachedRequest<VideoType>(flux, `video.itemById:${videoId}`, {videoId, videoProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const video = data?.videos?.itemById || {};
        return flux.dispatch({type: VIDEO_CONSTANTS.GET_ITEM_SUCCESS, video});
      };

      const result = await appQuery<VideoType>(
        flux,
        'itemById',
        DATA_TYPE,
        queryVariables,
        [
          'description',
          'duration',
          'format',
          'height',
          'mimeType',
          'name',
          'size',
          'thumbUrl',
          'url',
          'userId',
          'videoId',
          'width',
          ...videoProps
        ],
        {onSuccess}
      );
      return await setCachedRequest(flux, `video.itemById:${videoId}`, {videoId, videoProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const list = async (
    from: number = 0,
    to: number = 10,
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoType[]> => {
    try {
      const cachedResult = getCachedRequest<VideoType[]>(flux, 'video.list', {from, to, videoProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

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

      const onSuccess = (data: VideoApiResultsType) => {
        const list = data?.videos?.list || [];
        return flux.dispatch({
          list,
          type: VIDEO_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<VideoType[]>(
        flux,
        'list',
        DATA_TYPE,
        queryVariables,
        [
          'description',
          'duration',
          'format',
          'height',
          'mimeType',
          'name',
          'size',
          'thumbUrl',
          'url',
          'userId',
          'videoId',
          'width',
          ...videoProps
        ],
        {onSuccess}
      );
      return await setCachedRequest(flux, 'video.list', {from, to, videoProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteVideo = async (
    videoId: string,
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoType> => {
    try {
      const queryVariables = {
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const video = data?.videos?.remove || {};
        return flux.dispatch({type: VIDEO_CONSTANTS.REMOVE_ITEM_SUCCESS, video});
      };

      return await appMutation<VideoType>(
        flux,
        'remove',
        DATA_TYPE,
        queryVariables,
        ['videoId', ...videoProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `video.itemById:${videoId}`);
      await clearCachedRequest(flux, 'video.list');
    }
  };

  const update = async (
    video: Partial<VideoType>,
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoType> => {
    try {
      const queryVariables = {
        video: {
          type: 'VideoUpdateInput!',
          value: videoBase.validator(video)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const video = data?.videos?.update || {};
        return flux.dispatch({type: VIDEO_CONSTANTS.UPDATE_ITEM_SUCCESS, video});
      };

      return await appMutation<VideoType>(
        flux,
        'update',
        DATA_TYPE,
        queryVariables,
        ['videoId', ...videoProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `video.itemById:${String(video?.videoId || '')}`);
      await clearCachedRequest(flux, 'video.list');
    }
  };

  return {
    add,
    delete: deleteVideo,
    itemById,
    list,
    update,
    updateVideoAdapter: videoBase.updateAdapter,
    updateVideoAdapterOptions: videoBase.updateOptions
  };
};
