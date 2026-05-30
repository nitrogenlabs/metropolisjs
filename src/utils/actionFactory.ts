/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {createContentActions} from '../actions/contentActions/contentActions.js';
import {createCrmActions} from '../actions/crmActions/crmActions.js';
import {createEventActions} from '../actions/eventActions/eventActions.js';
import {createGroupActions} from '../actions/groupActions/groupActions.js';
import {createImageActions} from '../actions/imageActions/imageActions.js';
import {createLocationActions} from '../actions/locationActions/locationActions.js';
import {createMessageActions} from '../actions/messageActions/messageActions.js';
import {createPermissionActions} from '../actions/permissionActions/permissionActions.js';
import {createPostActions} from '../actions/postActions/postActions.js';
import {createPersonaActions} from '../actions/personaActions/personaActions.js';
import {createReactionActions} from '../actions/reactionActions/reactionActions.js';
import {createRestActions} from '../actions/restActions/restActions.js';
import {createSSEActions} from '../actions/sseActions/sseActions.js';
import {createSubscriptionActions} from '../actions/subscriptionActions/subscriptionActions.js';
import {createTagActions} from '../actions/tagActions/tagActions.js';
import {createTranslationActions} from '../actions/translationActions/translationActions.js';
import {createUserActions} from '../actions/userActions/userActions.js';
import {createVideoActions} from '../actions/videoActions/videoActions.js';
import {createWebsocketActions} from '../actions/websocketActions/websocketActions.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {ContentActionsOptions} from '../actions/contentActions/contentActions.js';
import type {CrmActionsOptions} from '../actions/crmActions/crmActions.js';
import type {EventActionsOptions} from '../actions/eventActions/eventActions.js';
import type {GroupActionsOptions} from '../actions/groupActions/groupActions.js';
import type {ImageActionsOptions} from '../actions/imageActions/imageActions.js';
import type {LocationActionsOptions} from '../actions/locationActions/locationActions.js';
import type {MessageActionsOptions} from '../actions/messageActions/messageActions.js';
import type {PermissionActionsOptions} from '../actions/permissionActions/permissionActions.js';
import type {PostActionsOptions} from '../actions/postActions/postActions.js';
import type {PersonaActionsOptions} from '../actions/personaActions/personaActions.js';
import type {ReactionActionsOptions} from '../actions/reactionActions/reactionActions.js';
import type {RestActionsOptions} from '../actions/restActions/restActions.js';
import type {SSEActionsOptions} from '../actions/sseActions/sseActions.js';
import type {TagActionsOptions} from '../actions/tagActions/tagActions.js';
import type {TranslationActionsOptions} from '../actions/translationActions/translationActions.js';
import type {UserActionsOptions} from '../actions/userActions/userActions.js';
import type {VideoActionsOptions} from '../actions/videoActions/videoActions.js';

const websocketActionCache = new WeakMap<FluxFramework, ReturnType<typeof createWebsocketActions>>();

export type ActionType =
  | 'content'
  | 'crm'
  | 'event'
  | 'group'
  | 'image'
  | 'location'
  | 'message'
  | 'permission'
  | 'post'
  | 'persona'
  | 'reaction'
  | 'rest'
  | 'sse'
  | 'subscription'
  | 'tag'
  | 'translation'
  | 'user'
  | 'video'
  | 'websocket';

export type ActionOptions =
  | ContentActionsOptions
  | CrmActionsOptions
  | EventActionsOptions
  | GroupActionsOptions
  | ImageActionsOptions
  | LocationActionsOptions
  | MessageActionsOptions
  | PermissionActionsOptions
  | PostActionsOptions
  | PersonaActionsOptions
  | ReactionActionsOptions
  | RestActionsOptions
  | SSEActionsOptions
  | TagActionsOptions
  | TranslationActionsOptions
  | UserActionsOptions
  | VideoActionsOptions
  | undefined;

export const createAction = <T extends ActionType>(
  actionType: T,
  flux: FluxFramework,
  options?: ActionOptions
) => {
  switch(actionType) {
    case 'content':
      return createContentActions(flux, options as ContentActionsOptions);

    case 'crm':
      return createCrmActions(flux, options as CrmActionsOptions);

    case 'event':
      return createEventActions(flux, options as EventActionsOptions);

    case 'group':
      return createGroupActions(flux, options as GroupActionsOptions);

    case 'image':
      return createImageActions(flux, options as ImageActionsOptions);

    case 'location':
      return createLocationActions(flux, options as LocationActionsOptions);

    case 'message':
      return createMessageActions(flux, options as MessageActionsOptions);

    case 'permission':
      return createPermissionActions(flux, options as PermissionActionsOptions);

    case 'post':
      return createPostActions(flux, options as PostActionsOptions);

    case 'persona':
      return createPersonaActions(flux, options as PersonaActionsOptions);

    case 'reaction':
      return createReactionActions(flux, options as ReactionActionsOptions);

    case 'rest':
      return createRestActions(flux, options as RestActionsOptions);

    case 'sse':
      return createSSEActions(flux, options as SSEActionsOptions);

    case 'subscription':
      return createSubscriptionActions(flux);

    case 'tag':
      return createTagActions(flux, options as TagActionsOptions);

    case 'translation':
      return createTranslationActions(flux, options as TranslationActionsOptions);

    case 'user':
      return createUserActions(flux, options as UserActionsOptions);

    case 'video':
      return createVideoActions(flux, options as VideoActionsOptions);

    case 'websocket':
      if(!websocketActionCache.has(flux)) {
        websocketActionCache.set(flux, createWebsocketActions(flux));
      }

      return websocketActionCache.get(flux) as ReturnType<typeof createWebsocketActions>;

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
};

export const createActions = (
  actionTypes: ActionType[],
  flux: FluxFramework,
  options?: Partial<Record<ActionType, ActionOptions>>
): Partial<Record<ActionType, ActionReturnType<ActionType>>> => {
  const actions: Partial<Record<ActionType, ActionReturnType<ActionType>>> = {};

  actionTypes.forEach((type) => {
    actions[type] = createAction(type, flux, options?.[type]) as ActionReturnType<ActionType>;
  });

  return actions;
};

export const createAllActions = (
  flux: FluxFramework,
  options?: Partial<Record<ActionType, ActionOptions>>
) => {
  const allActionTypes: ActionType[] = [
    'content',
    'crm',
    'event',
    'group',
    'image',
    'location',
    'message',
    'permission',
    'post',
    'persona',
    'reaction',
    'rest',
    'sse',
    'subscription',
    'tag',
    'translation',
    'user',
    'video',
    'websocket'
  ];

  return createActions(allActionTypes, flux, options);
};

export type ActionTypes = ReturnType<typeof createAllActions>;
export type ActionReturnType<T extends ActionType> = ReturnType<typeof createAction<T>>;
