/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validateVideoInput, type VideoType} from '../../adapters/videoAdapter/videoAdapter.js';
import {VIDEO_CONSTANTS} from '../../stores/videoStore.js';
import {appMutation, appQuery, type ReaktorDbCollection} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';

const DATA_TYPE: ReaktorDbCollection = 'videos';

export interface VideoAdapterOptions extends BaseAdapterOptions {
}

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
  add: (videoData: Partial<VideoType>, videoProps?: string[]) => Promise<VideoType>;
  delete: (videoId: string, videoProps?: string[]) => Promise<VideoType>;
  itemById: (videoId: string, videoProps?: string[]) => Promise<VideoType>;
  list: (from?: number, to?: number, videoProps?: string[]) => Promise<VideoType[]>;
  update: (video: Partial<VideoType>, videoProps?: string[]) => Promise<VideoType>;
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
    videoProps: string[] = []
  ): Promise<VideoType> => {
    try {
      const queryVariables = {
        video: {
          type: 'VideoInput!',
          value: videoBase.validator(videoData)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const {videos: {add: video = {}}} = data;
        return flux.dispatch({video, type: VIDEO_CONSTANTS.ADD_ITEM_SUCCESS});
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
    }
  };

  const itemById = async (videoId: string, videoProps: string[] = []): Promise<VideoType> => {
    try {
      const queryVariables = {
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const {videos: {itemById: video = {}}} = data;
        return flux.dispatch({video, type: VIDEO_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<VideoType>(
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
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const list = async (
    from: number = 0,
    to: number = 10,
    videoProps: string[] = []
  ): Promise<VideoType[]> => {
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

      const onSuccess = (data: VideoApiResultsType) => {
        const {videos: {list = []}} = data;
        return flux.dispatch({
          list,
          type: VIDEO_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<VideoType[]>(
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
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteVideo = async (
    videoId: string,
    videoProps: string[] = []
  ): Promise<VideoType> => {
    try {
      const queryVariables = {
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const {videos: {remove: video = {}}} = data;
        return flux.dispatch({video, type: VIDEO_CONSTANTS.REMOVE_ITEM_SUCCESS});
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
    }
  };

  const update = async (
    video: Partial<VideoType>,
    videoProps: string[] = []
  ): Promise<VideoType> => {
    try {
      const queryVariables = {
        video: {
          type: 'VideoUpdateInput!',
          value: videoBase.validator(video)
        }
      };

      const onSuccess = (data: VideoApiResultsType) => {
        const {videos: {update: video = {}}} = data;
        return flux.dispatch({video, type: VIDEO_CONSTANTS.UPDATE_ITEM_SUCCESS});
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
