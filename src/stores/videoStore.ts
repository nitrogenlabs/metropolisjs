/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export const VIDEO_CONSTANTS = {
  ADD_ITEM_ERROR: 'VIDEO_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'VIDEO_ADD_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'VIDEO_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'VIDEO_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'VIDEO_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'VIDEO_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'VIDEO_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'VIDEO_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'VIDEO_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'VIDEO_UPDATE_ITEM_SUCCESS'
} as const;

export type VideoConstantsType = typeof VIDEO_CONSTANTS[keyof typeof VIDEO_CONSTANTS];

interface VideoState {
  error?: Error;
  item?: Record<string, any>;
  list?: any[];
  videos?: Record<string, any>;
}

export const defaultValues: VideoState = {
  list: [],
  videos: {}
};

interface VideoData {
  readonly error?: Error;
  readonly list?: any[];
  readonly video?: Record<string, any>;
  readonly videos?: Record<string, any>;
}

export const videoStore = (
  type: string,
  data: VideoData,
  state = defaultValues
): VideoState => {
  switch(type) {
    case VIDEO_CONSTANTS.ADD_ITEM_SUCCESS: {
      const {video = {}} = data;
      const {videoId = ''} = video;
      const updatedVideos = {...state.videos, [videoId]: video};
      return {...state, item: video, videos: updatedVideos};
    }

    case VIDEO_CONSTANTS.GET_ITEM_SUCCESS: {
      const {video = {}} = data;
      const {videoId = ''} = video;
      const updatedVideos = {...state.videos, [videoId]: video};
      return {...state, item: video, videos: updatedVideos};
    }

    case VIDEO_CONSTANTS.GET_LIST_SUCCESS: {
      const {list = []} = data;
      const videos = list.reduce((acc, item) => {
        const {videoId} = item;
        return videoId ? {...acc, [videoId]: item} : acc;
      }, {});
      return {...state, list, videos: {...state.videos, ...videos}};
    }

    case VIDEO_CONSTANTS.UPDATE_ITEM_SUCCESS: {
      const {video = {}} = data;
      const {videoId = ''} = video;
      const updatedVideos = {...state.videos, [videoId]: video};
      return {...state, item: video, videos: updatedVideos};
    }

    case VIDEO_CONSTANTS.REMOVE_ITEM_SUCCESS: {
      const {video = {}} = data;
      const {videoId = ''} = video;
      const {[videoId]: removed, ...updatedVideos} = state.videos || {};
      return {...state, videos: updatedVideos};
    }

    case VIDEO_CONSTANTS.ADD_ITEM_ERROR:
    case VIDEO_CONSTANTS.GET_ITEM_ERROR:
    case VIDEO_CONSTANTS.GET_LIST_ERROR:
    case VIDEO_CONSTANTS.UPDATE_ITEM_ERROR:
    case VIDEO_CONSTANTS.REMOVE_ITEM_ERROR: {
      const {error} = data;
      return {...state, error};
    }

    default: {
      return state;
    }
  }
};

export const video = {
  action: videoStore,
  initialState: defaultValues,
  name: 'video'
};
