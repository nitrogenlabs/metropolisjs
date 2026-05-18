/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {ContentType} from '../adapters/contentAdapter/contentAdapter';
import {CONTENT_CONSTANTS, contentStore} from './contentStore';

describe('contentStore', () => {
  it('should return default state', () => {
    const state = contentStore('UNKNOWN_ACTION', {}, {content: {}, lists: {}});
    expect(state).toEqual({content: {}, lists: {}});
  });

  it('should handle ADD_ITEM_SUCCESS', () => {
    const content = {contentId: '123', key: 'test', locale: 'en' as const, content: 'Test content'} as ContentType;
    const state = contentStore(CONTENT_CONSTANTS.ADD_ITEM_SUCCESS, {content}, {content: {}, lists: {}});
    expect(state.content['123']).toBeDefined();
    expect(state.content['123'].key).toBe('test');
  });

  it('should handle GET_ITEM_SUCCESS', () => {
    const content = {contentId: '123', key: 'test', locale: 'en' as const, content: 'Test content'} as ContentType;
    const state = contentStore(CONTENT_CONSTANTS.GET_ITEM_SUCCESS, {content}, {content: {}, lists: {}});
    expect(state.content['123']).toBeDefined();
    expect(state.content['123'].key).toBe('test');
  });

  it('should handle GET_LIST_SUCCESS', () => {
    const list = [
      {contentId: '123', key: 'test1', locale: 'en' as const, content: 'Test content 1'},
      {contentId: '456', key: 'test2', locale: 'en' as const, content: 'Test content 2'}
    ] as ContentType[];
    const state = contentStore(CONTENT_CONSTANTS.GET_LIST_SUCCESS, {list}, {content: {}, lists: {}});
    expect(Object.keys(state.content).length).toBe(2);
    expect(state.content['123'].key).toBe('test1');
    expect(state.content['456'].key).toBe('test2');
  });

  it('should handle error actions', () => {
    const error = new Error('Test error');
    const state = contentStore(CONTENT_CONSTANTS.ADD_ITEM_ERROR, {error}, {content: {}, lists: {}});
    expect(state.error).toBe(error);
  });

  it('handles update and remove success branches', () => {
    const content = {contentId: '123', key: 'test', locale: 'en' as const, content: 'Test content'} as ContentType;
    let state = contentStore(CONTENT_CONSTANTS.ADD_ITEM_SUCCESS, {content}, {content: {}, lists: {}});

    state = contentStore(CONTENT_CONSTANTS.UPDATE_ITEM_SUCCESS, {
      content: {...content, key: 'updated'}
    }, state);
    expect(state.content['123'].key).toBe('updated');

    state = contentStore(CONTENT_CONSTANTS.REMOVE_ITEM_SUCCESS, {content}, state);
    expect(state.content['123']).toBeUndefined();
    expect(contentStore(CONTENT_CONSTANTS.ADD_ITEM_SUCCESS, {}, state)).toBe(state);
  });
});
