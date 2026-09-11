/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import type {FluxAction, FluxFramework} from '@nlabs/arkhamjs';

type CacheRecord = Record<string, any>;
export interface CacheIngestionOptions {
  readonly replace?: boolean;
}
type CacheAction = CacheRecord & CacheIngestionOptions;

// Merge response objects without mutating cached records. Arrays carry membership
// from the response; null and explicit replacement remain authoritative.
const isRecord = (value: unknown): value is CacheRecord => value !== null && typeof value === 'object'
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

export const mergeCachedRecord = <T>(previous: unknown, incoming: T, replace = false): T => {
  if(!replace && Array.isArray(previous) && Array.isArray(incoming)) {
    return incoming.map((item) => {
      if(!isRecord(item)) {
        return item;
      }
      const idKey = ['id', '_id', 'imageId', 'videoId', 'tagId', 'postId', 'eventId', 'messageId', 'conversationId', 'personaId', 'userId'].find((key) => item[key]);
      const cached = idKey ? previous.find((value) => value?.[idKey] === item[idKey]) : undefined;
      return mergeCachedRecord(cached, item);
    }) as T;
  }
  if(replace || !isRecord(previous) || !isRecord(incoming)) {
    return incoming;
  }
  const result: CacheRecord = {...previous};
  for(const [key, value] of Object.entries(incoming)) {
    if(key === '__proto__' || key === 'constructor' || key === 'prototype' || value === undefined) {
      continue;
    }
    result[key] = mergeCachedRecord(previous[key], value);
  }
  return result as T;
};

const descriptors: Record<string, readonly [string, string, string]> = {
  content: ['contentId', 'content', 'content'],
  conversation: ['conversationId', 'conversations', 'conversation'],
  event: ['eventId', 'events', 'event'],
  group: ['groupId', 'viewed', 'group'],
  image: ['imageId', 'images', 'image'],
  message: ['messageId', 'messages', 'message'],
  notification: ['notificationId', 'notifications', 'notification'],
  persona: ['personaId', 'listMap', 'persona'],
  permission: ['id', 'permissions', 'permission'],
  post: ['postId', 'viewed', 'post'],
  tag: ['tagId', 'tags', 'tag'],
  user: ['userId', 'users', 'user'],
  video: ['videoId', 'videos', 'video']
};
const keyOf = (record: CacheRecord | null | undefined, idField: string) => String(record?.[idField] || '').split('/').pop();

const ingestCachedAction = (name: string, reducer: (type: string, data: CacheAction, state: CacheRecord) => CacheRecord, initialState: CacheRecord, type: string, data: CacheAction, state: CacheRecord): CacheRecord => {
  if(type === 'USER_SIGN_OUT_SUCCESS') {
    // Keep application configuration, but discard account-scoped request caches.
    return name === 'app' ? {...initialState, config: state.config, metropolisInitialized: true, sessionGeneration: (state.sessionGeneration || 0) + 1, sessionHydrated: true} : {...initialState};
  }
  if(name === 'user' && (type === 'USER_GET_SESSION_ERROR' || type === 'USER_SIGN_IN_ERROR')) {
    // Authentication rejection/expiry is cleared explicitly by the API layer.
    return {...state, error: data.error};
  }
  if(name === 'reaction' && type.startsWith('REACTION_') && type.endsWith('_SUCCESS')) {
    const key = [data.itemType || '', data.itemId || '', data.personaId || '', data.name || data.reaction?.name || ''].join(':');
    return {...state, reactions: {...state.reactions, [key]: mergeCachedRecord(state.reactions?.[key], data, data.replace === true)}};
  }
  if(name === 'message' && type === 'MESSAGE_GET_CONVO_LIST_SUCCESS' && (data.conversation || data.conversations)) {
    const records = data.conversations || [data.conversation];
    const conversationMap = {...state.conversationMap};
    for(const record of records) {
      if(record?.conversationId) {
        conversationMap[record.conversationId] = mergeCachedRecord(conversationMap[record.conversationId], record, data.replace === true);
      }
    }
    return {...state, conversationList: records.map((record) => conversationMap[record.conversationId]), conversationMap};
  }
  const descriptor = descriptors[name];
  if(!descriptor) {
    const next = reducer(type, data, state);
    if(next === state) {
      return state;
    }
    if(name === 'subscription' && data.itemKey) {
      const field = type.includes('_PLAN_') ? 'plan' : 'subscription';
      if(Object.hasOwn(data, field) && (data[field] === null || data[field] === undefined)) {
        return next;
      }
    }
    if(data.replace || /(?:DELETE|REMOVE|CLEAR)/.test(type)) {
      return next;
    }
    const merged = mergeCachedRecord(state, next);
    if(Object.hasOwn(next, 'error')) {
      merged.error = next.error;
    }
    return merged;
  }
  const [idField, mapField, itemField] = descriptor;
  const belongsToStore = type.startsWith(`${name.toUpperCase()}_`);
  const isRemoval = belongsToStore && /(?:DELETE|REMOVE)_ITEM_SUCCESS$/.test(type);
  const isSuccess = belongsToStore && (type.endsWith('_SUCCESS') || type.endsWith('_COMPLETE'));
  const cached = {...state[mapField]};
  // Existing persisted versions may only contain list records.
  const legacyLists = [state.list, ...Object.values(state.lists || {}), ...Object.values(state.conversations || {})].filter(Array.isArray);
  for(const item of legacyLists.flat()) {
    const id = keyOf(item, idField);
    if(id && !cached[id]) {
      cached[id] = item;
    }
  }
  const enrich = (item: CacheRecord) => {
    const id = keyOf(item, idField);
    if(!id || !isRecord(item)) {
      return item;
    }
    const merged = mergeCachedRecord(cached[id], item, data.replace === true);
    if(!isRemoval) {
      cached[id] = merged;
    }
    return merged;
  };
  const payload = {...data};
  if(isSuccess) {
    for(const key of [itemField, 'list', `${itemField}s`]) {
      if(Array.isArray(payload[key])) {
        payload[key] = payload[key].map(enrich);
      } else if(isRecord(payload[key])) {
        payload[key] = enrich(payload[key]);
      }
    }
  }
  if(name === 'user') {
    const patch = payload.session || payload.user || payload.persona;
    const currentUserId = keyOf(state.session, 'userId');
    const incomingUserId = keyOf(patch, 'userId');
    const sameUser = !incomingUserId || incomingUserId === currentUserId;
    if(type === 'USER_UPDATE_SESSION_SUCCESS') {
      return {...state, session: mergeCachedRecord(state.session, patch || {}, data.replace === true)};
    }
    if(type === 'USER_GET_SESSION_SUCCESS') {
      return {...state, session: mergeCachedRecord(state.session, payload.session || {}, data.replace === true || !sameUser)};
    }
    let next = reducer(type, payload, state);
    if(isSuccess && payload.user?.userId && !['USER_SIGN_IN_SUCCESS', 'USER_SIGN_UP_SUCCESS'].includes(type)) {
      next = {...next, [mapField]: cached};
      next.session = sameUser && currentUserId
        ? mergeCachedRecord(state.session, payload.user, data.replace === true)
        : state.session;
    }
    return next;
  }
  let next = reducer(type, payload, state);
  if(!isSuccess) {
    return next;
  }
  if(type.endsWith('_GET_COUNT_SUCCESS') && data.itemId && data.count !== undefined) {
    next = {...next, countsByItem: {...state.countsByItem, [data.itemId]: data.count}};
  }
  if(name === 'event' && data.eventRsvp?.eventId) {
    const id = keyOf(data.eventRsvp, 'eventId');
    next = {...next, rsvpsByEvent: {...state.rsvpsByEvent, [id]: mergeCachedRecord(state.rsvpsByEvent?.[id], data.eventRsvp, data.replace === true)}};
  }
  const incomingList = payload.list || payload[`${itemField}s`];
  if(Array.isArray(incomingList)) {
    next = {...next, list: incomingList};
  }
  if(name === 'persona' && Array.isArray(payload.personas) && payload.relation) {
    next = {...next, lists: {...state.lists, [payload.relation]: payload.personas}};
  }
  if(name === 'video' && Array.isArray(payload.list) && payload.listKey) {
    next = {...next, lists: {...state.lists, [payload.listKey]: payload.list}};
  }
  const removedId = isRemoval ? keyOf(payload[itemField], idField) : '';
  if(removedId) {
    delete cached[removedId];
  }
  next = {...next, [mapField]: cached};
  const updateList = (list: CacheRecord[]) => list.filter((item) => !removedId || keyOf(item, idField) !== removedId)
    .map((item) => cached[keyOf(item, idField)] || item);
  if(Array.isArray(next.list)) {
    next.list = updateList(next.list);
  }
  for(const field of ['lists', 'conversations']) {
    if(!isRecord(next[field])) {
      continue;
    }
    next[field] = Object.fromEntries(Object.entries(next[field]).map(([key, value]) => [key, Array.isArray(value) ? updateList(value) : value]));
  }
  if(removedId && keyOf(next.item, idField) === removedId) {
    next.item = undefined;
  }
  return next;
};

// Build event records from the committed cache. List membership and request
// context stay specific to this response, while object fields reflect ingestion.
export const cachedAction = (flux: FluxFramework, action: FluxAction): FluxAction => {
  const name = action.type.split('_')[0].toLowerCase();
  const descriptor = descriptors[name];
  if(!descriptor || !action.type.endsWith('_SUCCESS')) {
    return action;
  }
  const [idField, mapField, itemField] = descriptor;
  const state = flux.getState<CacheRecord>(name, {});
  const read = (item: CacheRecord) => state[mapField]?.[keyOf(item, idField)] || item;
  const result = {...action};
  for(const key of [itemField, 'list', `${itemField}s`]) {
    if(Array.isArray(result[key])) {
      result[key] = result[key].map(read);
    } else if(isRecord(result[key])) {
      result[key] = read(result[key]);
    }
  }
  if(name === 'user' && action.session) {
    result.session = state.session;
  }
  if(action.type === 'USER_UPDATE_SESSION_SUCCESS' && action.user) {
    result.user = state.session;
  }
  return result;
};

// Request memoization stores membership, never a second authoritative entity copy.
export const readCachedResponse = <T>(flux: FluxFramework, scope: string, data: T): T | undefined => {
  const name = scope.split('.')[0];
  const descriptor = descriptors[name];
  if(!descriptor) {
    return data;
  }
  const [idField, mapField, itemField] = descriptor;
  const records = flux.getState<Record<string, CacheRecord>>(`${name}.${mapField}`);
  // Older/custom stores may not have a canonical map yet.
  if(!records) {
    return data;
  }
  const read = (item: CacheRecord) => {
    const id = keyOf(item, idField);
    return id ? records[id] : item;
  };
  if(Array.isArray(data)) {
    return data.map(read).filter((item) => item !== undefined) as T;
  }
  if(!isRecord(data)) {
    return data;
  }
  if(keyOf(data, idField)) {
    return read(data) as T;
  }
  const result: CacheRecord = {...data};
  for(const key of [itemField, 'list', `${itemField}s`]) {
    if(Array.isArray(result[key])) {
      result[key] = result[key].map(read).filter((item) => item !== undefined);
    } else if(isRecord(result[key])) {
      result[key] = read(result[key]);
      if(result[key] === undefined) {
        return undefined;
      }
    }
  }
  return result as T;
};

export const withCacheIngestion = <S extends object>(
  name: string,
  reducer: (type: string, data: CacheAction, state: S) => S,
  initialState: S
): ((type: string, data?: CacheAction, state?: S) => S) => (
  (type, data = {}, state = initialState) => ingestCachedAction(name, reducer, initialState, type, data, state) as S
);
