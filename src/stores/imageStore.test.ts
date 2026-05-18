/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {defaultValues, IMAGE_CONSTANTS, imageStore} from './imageStore';

describe('imageStore', () => {
  it('should listen for default', () => {
    const updatedState = imageStore('', {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('should listen for GET_LIST_SUCCESS', () => {
    const updatedState = imageStore(IMAGE_CONSTANTS.GET_LIST_SUCCESS, {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('stores image lists by item id', () => {
    const updatedState = imageStore(IMAGE_CONSTANTS.GET_LIST_SUCCESS, {
      itemId: 'post-1',
      list: [{imageId: 'image-1'} as any]
    }, defaultValues);

    expect(updatedState.lists['post-1']).toHaveLength(1);
  });
});
