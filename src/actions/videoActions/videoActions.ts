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
import type {VideoMultipartUploadType, VideoType, VideoUploadPartInput, VideoUploadPartUrl} from '../../types/videos.types.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';

const DATA_TYPE = 'videos';

export type VideoAdapterOptions = BaseAdapterOptions;

export interface VideoActionsOptions {
  readonly videoAdapter?: (input: unknown, options?: VideoAdapterOptions) => any;
  readonly videoAdapterOptions?: VideoAdapterOptions;
}

export type VideoApiResultsType = {
  readonly videos: {
    readonly add?: VideoType;
    readonly abortMultipartUpload?: boolean;
    readonly completeMultipartUpload?: VideoType;
    readonly createMultipartUpload?: VideoMultipartUploadType;
    readonly getMultipartUploadPartUrls?: VideoUploadPartUrl[];
    readonly getVideoById?: VideoType;
    readonly getVideoListByItem?: VideoType[];
    readonly getVideoListByReactions?: VideoType[];
    readonly list?: VideoType[];
    readonly remove?: VideoType;
    readonly update?: VideoType;
  };
};

export interface VideoActions {
  readonly add: (videoData: Partial<VideoType>, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  readonly abortMultipartUpload: (videoId: string, uploadId: string, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  readonly completeMultipartUpload: (videoId: string, uploadId: string, parts: VideoUploadPartInput[], videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  readonly createMultipartUpload: (videoData: Partial<VideoType>, partCount: number, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoMultipartUploadType>;
  readonly delete: (videoId: string, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  readonly getMultipartUploadPartUrls: (videoId: string, uploadId: string, partNumbers: number[], requestOptions?: ActionRequestOptions) => Promise<VideoUploadPartUrl[]>;
  readonly getVideoById: (videoId: string, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  readonly list: (from?: number, to?: number, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType[]>;
  readonly listByItem: (itemId: string, from?: number, to?: number, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType[]>;
  readonly listByReactions: (reactions: string[], from?: number, to?: number, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType[]>;
  readonly update: (video: Partial<VideoType>, videoProps?: string[], requestOptions?: ActionRequestOptions) => Promise<VideoType>;
  readonly updateVideoAdapter: (adapter: (input: unknown, options?: VideoAdapterOptions) => any) => void;
  readonly updateVideoAdapterOptions: (options: VideoAdapterOptions) => void;
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

      const onSuccess = async (data: VideoApiResultsType) => {
        const video = data?.videos?.add || {};
        await flux.dispatch({type: VIDEO_CONSTANTS.ADD_ITEM_SUCCESS, video});
        return video;
      };

      return await appMutation<VideoType>(
        flux,
        'add',
        DATA_TYPE,
        queryVariables,
        ['videoId', ...videoProps],
        {onSuccess: onSuccess as any}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'video.list');
      await clearCachedRequest(flux, `video.listByItem:${String(videoData?.itemId || '')}`);
      await clearCachedRequest(flux, 'video.listByReactions');
    }
  };

  const getVideoById = async (videoId: string, videoProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<VideoType> => {
    try {
      const cachedResult = getCachedRequest<VideoType>(flux, `video.getVideoById:${videoId}`, {videoId, videoProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) => {
        const video = data?.videos?.getVideoById || {};
        await flux.dispatch({type: VIDEO_CONSTANTS.GET_ITEM_SUCCESS, video});
        return video;
      };

      const result = await appQuery<VideoType>(
        flux,
        'getVideoById',
        DATA_TYPE,
        queryVariables,
        [
          'description',
          'duration',
          'format',
          'height',
          'mimeType',
          'name',
          'privacy',
          'size',
          'thumbUrl',
          'url',
          'userId',
          'videoId',
          'width',
          ...videoProps
        ],
        {onSuccess: onSuccess as any}
      );
      return await setCachedRequest(flux, `video.getVideoById:${videoId}`, {videoId, videoProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const createMultipartUpload = async (
    videoData: Partial<VideoType>,
    partCount: number,
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoMultipartUploadType> => {
    try {
      const queryVariables = {
        partCount: {
          type: 'Int!',
          value: parseNum(partCount)
        },
        video: {
          type: 'VideoInput!',
          value: videoBase.validator(videoData)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) => {
        const upload = (data?.videos?.createMultipartUpload || {}) as VideoMultipartUploadType;
        const video = upload?.video || {};
        await flux.dispatch({type: VIDEO_CONSTANTS.ADD_ITEM_SUCCESS, video});
        return upload;
      };

      return await appMutation<VideoMultipartUploadType>(
        flux,
        'createMultipartUpload',
        DATA_TYPE,
        queryVariables,
        [
          'bucket',
          'key',
          'partSize',
          'uploadId',
          'videoId',
          'partUrls {partNumber url}',
          `video {videoId ${videoProps.join(' ')}}`
        ],
        {onSuccess: onSuccess as any}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'video.list');
      await clearCachedRequest(flux, `video.listByItem:${String(videoData?.itemId || '')}`);
      await clearCachedRequest(flux, 'video.listByReactions');
    }
  };

  const getMultipartUploadPartUrls = async (
    videoId: string,
    uploadId: string,
    partNumbers: number[],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoUploadPartUrl[]> => {
    try {
      const queryVariables = {
        partNumbers: {
          type: '[Int!]!',
          value: partNumbers.map((partNumber) => parseNum(partNumber))
        },
        uploadId: {
          type: 'String!',
          value: uploadId
        },
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) =>
        data?.videos?.getMultipartUploadPartUrls || [];

      return await appMutation<VideoUploadPartUrl[]>(
        flux,
        'getMultipartUploadPartUrls',
        DATA_TYPE,
        queryVariables,
        ['partNumber', 'url'],
        {onSuccess: onSuccess as any}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  const completeMultipartUpload = async (
    videoId: string,
    uploadId: string,
    parts: VideoUploadPartInput[],
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoType> => {
    try {
      const queryVariables = {
        parts: {
          type: '[VideoUploadPartInput!]',
          value: parts
        },
        uploadId: {
          type: 'String!',
          value: uploadId
        },
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) => {
        const video = data?.videos?.completeMultipartUpload || {};
        await flux.dispatch({type: VIDEO_CONSTANTS.UPDATE_ITEM_SUCCESS, video});
        await flux.dispatch({type: VIDEO_CONSTANTS.PROCESSING_COMPLETE, video});
        return video;
      };

      return await appMutation<VideoType>(
        flux,
        'completeMultipartUpload',
        DATA_TYPE,
        queryVariables,
        ['videoId', ...videoProps],
        {onSuccess: onSuccess as any}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `video.getVideoById:${videoId}`);
      await clearCachedRequest(flux, 'video.list');
      await clearCachedRequest(flux, 'video.listByReactions');
    }
  };

  const abortMultipartUpload = async (
    videoId: string,
    uploadId: string,
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    try {
      const queryVariables = {
        uploadId: {
          type: 'String!',
          value: uploadId
        },
        videoId: {
          type: 'ID!',
          value: parseId(videoId)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) =>
        !!data?.videos?.abortMultipartUpload;

      return await appMutation<boolean>(
        flux,
        'abortMultipartUpload',
        DATA_TYPE,
        queryVariables,
        [],
        {onSuccess: onSuccess as any}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `video.getVideoById:${videoId}`);
      await clearCachedRequest(flux, 'video.list');
      await clearCachedRequest(flux, 'video.listByReactions');
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

      const onSuccess = async (data: VideoApiResultsType) => {
        const list = data?.videos?.list || [];
        await flux.dispatch({
          list,
          type: VIDEO_CONSTANTS.GET_LIST_SUCCESS
        });
        return list;
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
          'privacy',
          'size',
          'thumbUrl',
          'url',
          'userId',
          'videoId',
          'width',
          ...videoProps
        ],
        {onSuccess: onSuccess as any}
      );
      return await setCachedRequest(flux, 'video.list', {from, to, videoProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByItem = async (
    itemId: string,
    from: number = 0,
    to: number = 10,
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoType[]> => {
    try {
      const cachedResult = getCachedRequest<VideoType[]>(flux, `video.listByItem:${itemId}`, {from, itemId, to, videoProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        itemId: {
          type: 'ID!',
          value: parseId(itemId)
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) => {
        const list = data?.videos?.getVideoListByItem || [];
        await flux.dispatch({
          list,
          type: VIDEO_CONSTANTS.GET_LIST_SUCCESS
        });
        return list;
      };

      const result = await appQuery<VideoType[]>(
        flux,
        'getVideoListByItem',
        DATA_TYPE,
        queryVariables,
        [
          'description',
          'durationMs',
          'fileSize',
          'fileType',
          'height',
          'hlsUrl',
          'playbackFileType',
          'playbackUrl',
          'privacy',
          'thumbUrl',
          'type',
          'url',
          'userId',
          'videoId',
          'width',
          ...videoProps
        ],
        {onSuccess: onSuccess as any}
      );
      return await setCachedRequest(flux, `video.listByItem:${itemId}`, {from, itemId, to, videoProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByReactions = async (
    reactions: string[],
    from: number = 0,
    to: number = 10,
    videoProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<VideoType[]> => {
    try {
      const cachedResult = getCachedRequest<VideoType[]>(flux, 'video.listByReactions', {from, reactions, to, videoProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        reactions: {
          type: '[String!]',
          value: reactions
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) => {
        const list = data?.videos?.getVideoListByReactions || [];
        await flux.dispatch({
          list,
          type: VIDEO_CONSTANTS.GET_LIST_SUCCESS
        });
        return list;
      };

      const result = await appQuery<VideoType[]>(
        flux,
        'getVideoListByReactions',
        DATA_TYPE,
        queryVariables,
        [
          'description',
          'durationMs',
          'fileSize',
          'fileType',
          'height',
          'hlsUrl',
          'playbackFileType',
          'playbackUrl',
          'privacy',
          'thumbUrl',
          'type',
          'url',
          'userId',
          'videoId',
          'width',
          ...videoProps
        ],
        {onSuccess: onSuccess as any}
      );
      return await setCachedRequest(flux, 'video.listByReactions', {from, reactions, to, videoProps}, result, requestOptions);
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

      const onSuccess = async (data: VideoApiResultsType) => {
        const video = data?.videos?.remove || {};
        await flux.dispatch({type: VIDEO_CONSTANTS.REMOVE_ITEM_SUCCESS, video});
        return video;
      };

      return await appMutation<VideoType>(
        flux,
        'remove',
        DATA_TYPE,
        queryVariables,
        ['videoId', ...videoProps],
        {onSuccess: onSuccess as any}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `video.getVideoById:${videoId}`);
      await clearCachedRequest(flux, 'video.list');
      await clearCachedRequest(flux, 'video.listByReactions');
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
          type: 'VideoInput!',
          value: videoBase.validator(video)
        }
      };

      const onSuccess = async (data: VideoApiResultsType) => {
        const video = data?.videos?.update || {};
        await flux.dispatch({type: VIDEO_CONSTANTS.UPDATE_ITEM_SUCCESS, video});
        return video;
      };

      return await appMutation<VideoType>(
        flux,
        'update',
        DATA_TYPE,
        queryVariables,
        ['videoId', ...videoProps],
        {onSuccess: onSuccess as any}
      );
    } catch(error) {
      flux.dispatch({error, type: VIDEO_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `video.getVideoById:${String(video?.videoId || '')}`);
      await clearCachedRequest(flux, 'video.list');
      await clearCachedRequest(flux, `video.listByItem:${String(video?.itemId || '')}`);
      await clearCachedRequest(flux, 'video.listByReactions');
    }
  };

  return {
    abortMultipartUpload,
    add,
    completeMultipartUpload,
    createMultipartUpload,
    delete: deleteVideo,
    getMultipartUploadPartUrls,
    getVideoById,
    list,
    listByItem,
    listByReactions,
    update,
    updateVideoAdapter: videoBase.updateAdapter,
    updateVideoAdapterOptions: videoBase.updateOptions
  };
};
