/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { capitalize, orderBy, pullAllBy, uniqBy } from '@nlabs/utils';

import { REACTION_CONSTANTS } from './reactionStore.js';
import { TAG_CONSTANTS } from './tagStore.js';

import type { ReactionType, TagType, User } from '../adapters/index.js';
import type { PersonaType } from '../adapters/personaAdapter/personaAdapter.js';

export const USER_CONSTANTS = {
  ADD_ITEM_ERROR: 'USER_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'USER_ADD_ITEM_SUCCESS',
  ADD_RELATION_ERROR: 'USER_ADD_RELATION_ERROR',
  ADD_RELATION_SUCCESS: 'USER_ADD_RELATION_SUCCESS',
  AUTHENTICATION_UPDATE: 'USER_AUTHENTICATION_UPDATE',
  CONFIRM_SIGN_UP_ERROR: 'USER_CONFIRM_SIGN_UP_ERROR',
  CONFIRM_SIGN_UP_SUCCESS: 'USER_CONFIRM_SIGN_UP_SUCCESS',
  FORGOT_PASSWORD_ERROR: 'USER_FORGOT_PASSWORD_ERROR',
  FORGOT_PASSWORD_SUCCESS: 'USER_FORGOT_PASSWORD_SUCCESS',
  GET_DETAILS_SUCCESS: 'USER_GET_DETAILS_SUCCESS',
  GET_ITEM_ERROR: 'USER_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'USER_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'USER_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'USER_GET_LIST_SUCCESS',
  GET_SESSION_ERROR: 'USER_GET_SESSION_ERROR',
  GET_SESSION_SUCCESS: 'USER_GET_SESSION_SUCCESS',
  HAS_USER_REACTIONS: 'USER_HAS_USER_REACTIONS',
  RECOVERY_ERROR: 'USER_RECOVERY_ERROR',
  RECOVERY_SUCCESS: 'USER_RECOVERY_SUCCESS',
  REMOVE_ITEM_ERROR: 'USER_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'USER_REMOVE_ITEM_SUCCESS',
  REMOVE_RELATION: 'USER_REMOVE_RELATION',
  RESEND_CODE_ERROR: 'USER_RESEND_CODE_ERROR',
  RESEND_CODE_SUCCESS: 'USER_RESEND_CODE_SUCCESS',
  RESET_PASSWORD_ERROR: 'USER_RESET_PASSWORD_ERROR',
  RESET_PASSWORD_SUCCESS: 'USER_RESET_PASSWORD_SUCCESS',
  SIGN_IN_ERROR: 'USER_SIGN_IN_ERROR',
  SIGN_IN_SUCCESS: 'USER_SIGN_IN_SUCCESS',
  SIGN_OUT_ERROR: 'USER_SIGN_OUT_ERROR',
  SIGN_OUT_SUCCESS: 'USER_SIGN_OUT_SUCCESS',
  SIGN_UP_ERROR: 'USER_SIGN_UP_ERROR',
  SIGN_UP_SUCCESS: 'USER_SIGN_UP_SUCCESS',
  UPDATE_ITEM_ERROR: 'USER_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'USER_UPDATE_ITEM_SUCCESS',
  UPDATE_PERSONA_ERROR: 'USER_UPDATE_PERSONA_ERROR',
  UPDATE_PERSONA_SUCCESS: 'USER_UPDATE_PERSONA_SUCCESS',
  UPDATE_SESSION_ERROR: 'USER_UPDATE_SESSION_ERROR',
  UPDATE_SESSION_SUCCESS: 'USER_UPDATE_SESSION_SUCCESS',
  VERIFY_ERROR: 'USER_VERIFY_ERROR',
  VERIFY_SUCCESS: 'USER_VERIFY_SUCCESS'
} as const;

export type UserConstantsType = typeof USER_CONSTANTS[keyof typeof USER_CONSTANTS];

interface UserState {
  error?: Error;
  likes: string[];
  lists: Record<string, unknown>;
  session: Partial<User>;
  users: Record<string, Partial<User>>;
}

export const defaultValues: UserState = {
  likes: [],
  lists: {},
  session: {},
  users: {}
};

export const countFieldMap = {
  like: 'likeCount',
  view: 'viewCount'
};

interface UserData {
  readonly error?: Error;
  readonly itemId?: string;
  readonly itemType?: string;
  readonly list?: User[];
  readonly persona?: PersonaType;
  readonly reaction?: ReactionType;
  readonly session?: User;
  readonly tag?: Record<string, unknown>;
  readonly user?: User;
}

export const userStore = (type: string, data: UserData, state = defaultValues): UserState => {
  switch(type) {
    case REACTION_CONSTANTS.ADD_ITEM_SUCCESS:
    case REACTION_CONSTANTS.REMOVE_ITEM_SUCCESS: {
      const {itemId, itemType, reaction} = data;

      if(itemType !== 'users' || !reaction) {
        return state;
      }

      const {users} = state;
      const {name: reactionName = '', value: reactionValue} = reaction;
      const value: boolean = reactionValue === 'true';

      if(itemId && users[itemId]) {
        users[itemId][`has${capitalize(reactionName)}`] = value;

        if(reactionName !== 'view') {
          const countField: keyof typeof countFieldMap = reactionName as keyof typeof countFieldMap;
          const field = countFieldMap[countField];
          const currentCount = users[itemId][field] as number || 0;
          users[itemId][field] = value ? currentCount + 1 : currentCount - 1;
        }
      }

      return {...state, users};
    }
    case USER_CONSTANTS.UPDATE_SESSION_SUCCESS: {
      const {user} = data;
      if(user) {
        return {...state, session: {...state.session, ...user}};
      }
      return state;
    }
    case TAG_CONSTANTS.ADD_PROFILE_SUCCESS: {
      const {tag} = data;
      const {session = {}} = state;
      const {tags = []} = session;
      const updatedTags = uniqBy([...tags, tag], (item: TagType) => item.tagId);
      session.tags = orderBy(updatedTags, ['name'], ['asc']);
      return {...state, session};
    }
    case TAG_CONSTANTS.REMOVE_PROFILE_SUCCESS: {
      const {tag} = data;
      const {session = {}} = state;
      const {tags = []} = session;
      session.tags = pullAllBy(tags, [tag], 'tagId');
      return {...state, session};
    }
    case USER_CONSTANTS.ADD_ITEM_SUCCESS: {
      const {user} = data;
      if(user && user.userId) {
        const {users} = state;
        users[user.userId] = {...user, timestamp: Date.now()};
        return {...state, session: user, users};
      }
      return state;
    }
    case USER_CONSTANTS.GET_DETAILS_SUCCESS: {
      const {user} = data;
      if(user && user.userId) {
        const {users} = state;
        users[user.userId] = {...user, timestamp: Date.now()};
        return {...state, users};
      }
      return state;
    }
    case USER_CONSTANTS.GET_LIST_SUCCESS: {
      const {list} = data;
      if(list) {
        const {users} = state;

        list.forEach((user: User) => {
          if(user.userId) {
            const cachedUser: Partial<User> = users[user.userId] || {};
            users[user.userId] = {...cachedUser, ...user};
          }
        });
        return {...state, users};
      }
      return state;
    }
    case USER_CONSTANTS.SIGN_IN_ERROR: {
      const {username} = state.session;
      return {...state, session: {username: username || ''}};
    }
    case USER_CONSTANTS.SIGN_UP_ERROR: {
      const {error} = data;
      return {...state, error};
    }
    case USER_CONSTANTS.SIGN_IN_SUCCESS: {
      const {session} = data;
      if(session) {
        return {...state, lists: {}, session, users: {}};
      }
      return state;
    }
    case USER_CONSTANTS.SIGN_UP_SUCCESS: {
      const {user} = data;
      if(user && user.userId) {
        const {users} = state;
        users[user.userId] = {...user, timestamp: Date.now()};
        return {...state, error: undefined, users};
      }
      return state;
    }
    case USER_CONSTANTS.RESEND_CODE_ERROR: {
      const {session} = data;
      if(session) {
        return {...state, session: {...state.session, ...session}};
      }
      return state;
    }
    case USER_CONSTANTS.RESEND_CODE_SUCCESS: {
      const {session} = data;
      if(session) {
        return {...state, session: {...state.session, ...session}};
      }
      return state;
    }
    case USER_CONSTANTS.GET_SESSION_SUCCESS: {
      const {session} = data;
      return {...state, session: {...state.session, ...session}};
    }
    case USER_CONSTANTS.UPDATE_ITEM_SUCCESS: {
      const {user} = data;
      if(user && user.userId) {
        const {session, users} = state;
        return {...state, session: {...session, ...user}, users: {...users, [user.userId]: user}};
      }
      return state;
    }
    case USER_CONSTANTS.UPDATE_PERSONA_SUCCESS: {
      const {persona} = data;
      if(persona) {
        const {session} = state;
        return {...state, session: {...session, ...persona}};
      }
      return state;
    }
    default: {
      return state;
    }
  }
};

export const users = {
  action: userStore,
  initialState: defaultValues,
  name: 'user'
};