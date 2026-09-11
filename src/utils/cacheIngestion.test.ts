/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {describe, expect, it} from 'vitest';

import * as stores from '../stores/index.js';
import {cachedAction, mergeCachedRecord, readCachedResponse, withCacheIngestion} from './cacheIngestion.js';

import type {FluxFramework, FluxStore} from '@nlabs/arkhamjs';

type TestStore = {action: (type: string, data: Record<string, unknown>, state?: any) => any; initialState: any};
const domainStores = stores as unknown as Record<string, TestStore>;

describe('cache ingestion', () => {
  it.each([
    ['content', 'contents', 'contentId', 'content'],
    ['conversation', 'conversation', 'conversationId', 'conversations'],
    ['event', 'events', 'eventId', 'events'],
    ['group', 'groups', 'groupId', 'viewed'],
    ['image', 'images', 'imageId', 'images'],
    ['message', 'messages', 'messageId', 'messages'],
    ['notification', 'notifications', 'notificationId', 'notifications'],
    ['persona', 'personas', 'personaId', 'listMap'],
    ['permission', 'permissions', 'id', 'permissions'],
    ['post', 'posts', 'postId', 'viewed'],
    ['tag', 'tags', 'tagId', 'tags'],
    ['user', 'users', 'userId', 'users'],
    ['video', 'video', 'videoId', 'videos']
  ])('deeply ingests %s items and respects explicit replacement', (domain, exportName, idField, mapField) => {
    const store = stores[exportName as keyof typeof stores] as FluxStore;
    const type = `${domain.toUpperCase()}_GET_ITEM_SUCCESS`;
    const first = {[idField]: 'record-1', metadata: {keep: true, value: 1}, nullable: 'old', tags: ['old']};
    const state = store.action(type, {[domain]: first}, store.initialState);
    const next = store.action(type, {[domain]: {[idField]: 'record-1', metadata: {value: 2}, nullable: null, tags: []}}, state);
    expect(next[mapField]['record-1']).toEqual({[idField]: 'record-1', metadata: {keep: true, value: 2}, nullable: null, tags: []});
    expect(state[mapField]['record-1']).toEqual(first);
    const replaced = store.action(type, {[domain]: {[idField]: 'record-1', metadata: {value: 3}}, replace: true}, next);
    expect(replaced[mapField]['record-1']).toEqual({[idField]: 'record-1', metadata: {value: 3}});
  });

  it('merges identified array objects while replacing their membership', () => {
    expect(mergeCachedRecord(
      {tags: [{metadata: {keep: true, value: 1}, tagId: 'one'}, {tagId: 'two'}]},
      {tags: [{metadata: {value: 2}, tagId: 'one'}]}
    )).toEqual({tags: [{metadata: {keep: true, value: 2}, tagId: 'one'}]});
    expect(mergeCachedRecord({value: 1}, {value: undefined})).toEqual({value: 1});
    expect(mergeCachedRecord({}, JSON.parse('{"__proto__":{"polluted":true},"value":1}'))).toEqual({value: 1});
  });

  it('updates every list containing an image and removes deleted membership', () => {
    const reduce = domainStores.images.action;
    let state = reduce('IMAGE_GET_LIST_SUCCESS', {itemId: 'mine', list: [{imageId: 'one', metadata: {keep: true}}]});
    state = reduce('IMAGE_GET_LIST_SUCCESS', {itemId: 'saved', list: [{imageId: 'one'}]}, state);
    state = reduce('IMAGE_UPDATE_ITEM_SUCCESS', {image: {imageId: 'one', metadata: {value: 2}}}, state);
    expect(state.lists.mine).toEqual(state.lists.saved);
    expect(state.lists.mine[0].metadata).toEqual({keep: true, value: 2});
    state = reduce('IMAGE_REMOVE_ITEM_SUCCESS', {image: {imageId: 'one'}}, state);
    expect(state.lists).toEqual({mine: [], saved: []});
    expect(state.images).toEqual({});
  });

  it('migrates legacy list records and preserves independent video/persona queries', () => {
    const images = domainStores.images.action('IMAGE_GET_ITEM_SUCCESS', {image: {imageId: 'one', metadata: {new: true}}}, {
      lists: {old: [{imageId: 'one', metadata: {keep: true}}]}
    });
    expect(images.images.one.metadata).toEqual({keep: true, new: true});
    let videos = domainStores.video.action('VIDEO_GET_LIST_SUCCESS', {list: [{videoId: 'one'}], listKey: 'item:one'});
    videos = domainStores.video.action('VIDEO_GET_LIST_SUCCESS', {list: [], listKey: 'reactions:saved'}, videos);
    expect(videos.lists).toEqual({'item:one': [{videoId: 'one'}], 'reactions:saved': []});
    const personas = domainStores.personas.action('PERSONA_GET_LIST_SUCCESS', {personas: [], relation: 'following'});
    expect(personas.lists.following).toEqual([]);
  });

  it('keeps another user and temporary auth errors from overwriting the session', () => {
    const session = {metadata: {keep: true}, token: 'current', userId: 'one'};
    const previous = {...domainStores.users.initialState, session};
    const other = domainStores.users.action('USER_GET_ITEM_SUCCESS', {user: {userId: 'two'}}, previous);
    expect(other.session).toEqual(session);
    const failed = domainStores.users.action('USER_GET_SESSION_ERROR', {error: new Error('network')}, other);
    expect(failed.session).toEqual(session);
    const updated = domainStores.users.action('USER_UPDATE_SESSION_SUCCESS', {user: {metadata: {new: true}}}, failed);
    expect(updated.session).toEqual({...session, metadata: {keep: true, new: true}});
    const changed = domainStores.users.action('USER_GET_SESSION_SUCCESS', {session: {token: 'next', userId: 'two'}}, updated);
    expect(changed.session).toEqual({token: 'next', userId: 'two'});
  });

  it('clears account state but preserves app configuration and advances its generation', () => {
    const state = domainStores.app.action('USER_SIGN_OUT_SUCCESS', {}, {config: {app: {name: 'example'}}, requestCache: {private: true}, sessionGeneration: 2});
    expect(state).toMatchObject({config: {app: {name: 'example'}}, sessionGeneration: 3});
    expect(state.requestCache).toBeUndefined();
    expect(domainStores.images.action('USER_SIGN_OUT_SUCCESS', {}, {images: {one: {imageId: 'one'}}})).toEqual(domainStores.images.initialState);
  });

  it('ingests counts, RSVP metadata, conversation lists and reaction results', () => {
    expect(domainStores.images.action('IMAGE_GET_COUNT_SUCCESS', {count: 0, itemId: 'one'}).countsByItem.one).toBe(0);
    let events = domainStores.events.action('EVENT_RSVP_ITEM_SUCCESS', {eventRsvp: {eventId: 'one', guests: 2, metadata: {keep: true}}});
    events = domainStores.events.action('EVENT_RSVP_ITEM_SUCCESS', {eventRsvp: {eventId: 'one', guests: 3}}, events);
    expect(events.rsvpsByEvent.one).toEqual({eventId: 'one', guests: 3, metadata: {keep: true}});
    const messages = domainStores.messages.action('MESSAGE_GET_CONVO_LIST_SUCCESS', {conversations: [{conversationId: 'one'}]});
    expect(messages.conversationMap.one).toEqual({conversationId: 'one'});
    expect(messages.conversationList).toHaveLength(1);
    const reactions = domainStores.reactions.action('REACTION_GET_COUNT_SUCCESS', {count: 2, itemId: 'one', itemType: 'images', name: 'saved'});
    expect(reactions.reactions['images:one::saved'].count).toBe(2);
  });

  it('deeply merges other store outputs while respecting explicit subscription deletion', () => {
    let state = domainStores.subscriptions.action('SUBSCRIPTION_GET_SUBSCRIPTION_SUCCESS', {itemKey: 'one', subscription: {metadata: {keep: true}}});
    state = domainStores.subscriptions.action('SUBSCRIPTION_GET_SUBSCRIPTION_SUCCESS', {itemKey: 'one', subscription: {metadata: {new: true}}}, state);
    expect(state.subscriptionsByItem.one.metadata).toEqual({keep: true, new: true});
    state = domainStores.subscriptions.action('SUBSCRIPTION_GET_SUBSCRIPTION_SUCCESS', {itemKey: 'one', subscription: null}, state);
    expect(state.subscriptionsByItem.one).toEqual({});
    const reduce = withCacheIngestion('example', (_type, data) => data, {});
    expect(reduce('EXAMPLE_SUCCESS', {nested: {value: 2}}, {nested: {keep: true}})).toEqual({nested: {keep: true, value: 2}});
    expect(reduce('EXAMPLE_CLEAR', {nested: {}}, {nested: {keep: true}})).toEqual({nested: {}});
  });

  it('projects event and memoized records from the committed canonical cache', () => {
    const state = {list: [], tags: {one: {name: 'current', tagId: 'one'}}};
    const flux = {getState: (path: string | string[]) => path === 'tag.tags' ? state.tags : state} as unknown as FluxFramework;
    const action = {tags: [{name: 'old', tagId: 'one'}], type: 'TAG_GET_LIST_SUCCESS'};
    expect(cachedAction(flux, action).tags).toEqual([{name: 'current', tagId: 'one'}]);
    expect(readCachedResponse(flux, 'tag.getTags', action)).toEqual({...action, tags: [{name: 'current', tagId: 'one'}]});
    expect(readCachedResponse(flux, 'tag.getTags', [{tagId: 'deleted'}])).toEqual([]);
    expect(readCachedResponse(flux, 'tag.getTag', {tag: {tagId: 'deleted'}})).toBeUndefined();
    expect(readCachedResponse(flux, 'tag.getTag', {tagId: 'one'})).toEqual(state.tags.one);
    expect(readCachedResponse(flux, 'other.get', false)).toBe(false);
    expect(cachedAction(flux, {type: 'UNKNOWN_ACTION'})).toEqual({type: 'UNKNOWN_ACTION'});
  });
});
