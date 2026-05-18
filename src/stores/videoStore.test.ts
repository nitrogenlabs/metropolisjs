import {describe, expect, it} from 'vitest';

import {VIDEO_CONSTANTS, videoStore} from './videoStore.js';

describe('videoStore', () => {
  it('handles collection success and error branches', () => {
    const video = {videoId: 'video-1', name: 'Video'};
    let state = videoStore(VIDEO_CONSTANTS.ADD_ITEM_SUCCESS, {video});

    state = videoStore(VIDEO_CONSTANTS.GET_LIST_SUCCESS, {list: [video]}, state);
    state = videoStore(VIDEO_CONSTANTS.GET_ITEM_SUCCESS, {video: {...video, name: 'Viewed'}}, state);
    state = videoStore(VIDEO_CONSTANTS.UPDATE_ITEM_SUCCESS, {video: {...video, name: 'Updated'}}, state);
    state = videoStore(VIDEO_CONSTANTS.PROCESSING_COMPLETE, {
      video: {...video, uploadStatus: 'done'}
    }, state);
    expect(state.videos?.['video-1']?.uploadStatus).toBe('done');

    state = videoStore(VIDEO_CONSTANTS.REMOVE_ITEM_SUCCESS, {video}, state);
    expect(state.videos?.['video-1']).toBeUndefined();
    expect(videoStore(VIDEO_CONSTANTS.GET_ITEM_ERROR, {error: new Error('bad')}, state).error?.message).toBe('bad');
    expect(videoStore(VIDEO_CONSTANTS.ADD_ITEM_ERROR, {error: new Error('add')}, state).error?.message).toBe('add');
    expect(videoStore(VIDEO_CONSTANTS.UPDATE_ITEM_ERROR, {error: new Error('update')}, state).error?.message).toBe('update');
    expect(videoStore(VIDEO_CONSTANTS.REMOVE_ITEM_ERROR, {error: new Error('remove')}, state).error?.message).toBe('remove');
  });
});
