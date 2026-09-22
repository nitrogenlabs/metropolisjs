/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {createAwsRumActions} from '../actions/awsRumActions/awsRumActions.js';
import {createContentActions} from '../actions/contentActions/contentActions.js';
import {createCrmActions} from '../actions/crmActions/crmActions.js';
import {createEventActions} from '../actions/eventActions/eventActions.js';
import {createGroupActions} from '../actions/groupActions/groupActions.js';
import {createHiggsfieldActions} from '../actions/higgsfieldActions/higgsfieldActions.js';
import {createImageActions} from '../actions/imageActions/imageActions.js';
import {createLocationActions} from '../actions/locationActions/locationActions.js';
import {createMessageActions} from '../actions/messageActions/messageActions.js';
import {createPermissionActions} from '../actions/permissionActions/permissionActions.js';
import {createPersonaActions} from '../actions/personaActions/personaActions.js';
import {createPostActions} from '../actions/postActions/postActions.js';
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
import type {AwsRumActionsOptions} from '../actions/awsRumActions/awsRumActions.js';
import type {ContentActionsOptions} from '../actions/contentActions/contentActions.js';
import type {CrmActionsOptions} from '../actions/crmActions/crmActions.js';
import type {EventActionsOptions} from '../actions/eventActions/eventActions.js';
import type {GroupActionsOptions} from '../actions/groupActions/groupActions.js';
import type {ImageActionsOptions} from '../actions/imageActions/imageActions.js';
import type {LocationActionsOptions} from '../actions/locationActions/locationActions.js';
import type {MessageActionsOptions} from '../actions/messageActions/messageActions.js';
import type {PermissionActionsOptions} from '../actions/permissionActions/permissionActions.js';
import type {PersonaActionsOptions} from '../actions/personaActions/personaActions.js';
import type {PostActionsOptions} from '../actions/postActions/postActions.js';
import type {ReactionActionsOptions} from '../actions/reactionActions/reactionActions.js';
import type {RestActionsOptions} from '../actions/restActions/restActions.js';
import type {SSEActionsOptions} from '../actions/sseActions/sseActions.js';
import type {TagActionsOptions} from '../actions/tagActions/tagActions.js';
import type {TranslationActionsOptions} from '../actions/translationActions/translationActions.js';
import type {UserActionsOptions} from '../actions/userActions/userActions.js';
import type {VideoActionsOptions} from '../actions/videoActions/videoActions.js';

const awsRumActionCache = new WeakMap<FluxFramework, {
  readonly actions: ReturnType<typeof createAwsRumActions>;
  readonly optionsKey: string;
}>();
const websocketActionCache = new WeakMap<FluxFramework, ReturnType<typeof createWebsocketActions>>();

const createAwsRumOptionsKey = (options: AwsRumActionsOptions = {}): string => JSON.stringify({
  analyticsId: options.analyticsId,
  analyticsTransport: options.analyticsTransport,
  debounceMs: options.debounceMs,
  dedupeMs: options.dedupeMs,
  enabled: options.enabled,
  respectPrivacySignals: options.respectPrivacySignals,
  throttleMs: options.throttleMs
});

export type ActionType =
  | 'awsRum'
  | 'content'
  | 'crm'
  | 'event'
  | 'group'
  | 'higgsfield'
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

export interface ActionMap {
  awsRum: ReturnType<typeof createAwsRumActions>;
  content: ReturnType<typeof createContentActions>;
  crm: ReturnType<typeof createCrmActions>;
  event: ReturnType<typeof createEventActions>;
  group: ReturnType<typeof createGroupActions>;
  higgsfield: ReturnType<typeof createHiggsfieldActions>;
  image: ReturnType<typeof createImageActions>;
  location: ReturnType<typeof createLocationActions>;
  message: ReturnType<typeof createMessageActions>;
  permission: ReturnType<typeof createPermissionActions>;
  persona: ReturnType<typeof createPersonaActions>;
  post: ReturnType<typeof createPostActions>;
  reaction: ReturnType<typeof createReactionActions>;
  rest: ReturnType<typeof createRestActions>;
  sse: ReturnType<typeof createSSEActions>;
  subscription: ReturnType<typeof createSubscriptionActions>;
  tag: ReturnType<typeof createTagActions>;
  translation: ReturnType<typeof createTranslationActions>;
  user: ReturnType<typeof createUserActions>;
  video: ReturnType<typeof createVideoActions>;
  websocket: ReturnType<typeof createWebsocketActions>;
}

export type ActionReturnType<T extends ActionType> = ActionMap[T];

export type ActionOptions =
  | AwsRumActionsOptions
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

const createActionByType = (
  actionType: ActionType,
  flux: FluxFramework,
  options?: ActionOptions
) => {
  switch(actionType) {
    case 'awsRum': {
      const awsRumOptions = (options || {}) as AwsRumActionsOptions;
      const optionsKey = createAwsRumOptionsKey(awsRumOptions);
      const cached = awsRumActionCache.get(flux);

      if(!cached || cached.optionsKey !== optionsKey) {
        if(cached) {
          void cached.actions.destroy();
        }

        const resolvedOptions = awsRumOptions.analyticsTransport === 'websocket'
          ? {...awsRumOptions, wsSend: (createActionByType('websocket', flux) as ReturnType<typeof createWebsocketActions>).wsSend}
          : awsRumOptions;
        const actions = createAwsRumActions(flux, resolvedOptions);
        awsRumActionCache.set(flux, {actions, optionsKey});
        return actions;
      }

      return cached.actions;
    }

    case 'content':
      return createContentActions(flux, options as ContentActionsOptions);

    case 'crm':
      return createCrmActions(flux, options as CrmActionsOptions);

    case 'event':
      return createEventActions(flux, options as EventActionsOptions);

    case 'group':
      return createGroupActions(flux, options as GroupActionsOptions);

    case 'higgsfield':
      return createHiggsfieldActions(flux);

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

export const createAction = <T extends ActionType>(
  actionType: T,
  flux: FluxFramework,
  options?: ActionOptions
): ActionReturnType<T> => createActionByType(actionType, flux, options) as ActionReturnType<T>;

export const createActions = <const T extends readonly ActionType[]>(
  actionTypes: T,
  flux: FluxFramework,
  options?: Partial<Record<ActionType, ActionOptions>>
): {[K in T[number]]: ActionReturnType<K>} => {
  const actions: Partial<ActionMap> = {};
  const mutableActions = actions as Record<ActionType, ActionReturnType<ActionType>>;

  actionTypes.forEach((type) => {
    mutableActions[type] = createAction(type, flux, options?.[type]);
  });

  return actions as {[K in T[number]]: ActionReturnType<K>};
};

export const createAllActions = (
  flux: FluxFramework,
  options?: Partial<Record<ActionType, ActionOptions>>
): ActionMap => {
  const allActionTypes = [
    'awsRum',
    'content',
    'crm',
    'event',
    'group',
    'higgsfield',
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
  ] as const;

  return createActions(allActionTypes, flux, options);
};

export type ActionTypes = ReturnType<typeof createAllActions>;
