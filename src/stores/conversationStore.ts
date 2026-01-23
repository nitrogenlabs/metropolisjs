/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export const CONVERSATION_CONSTANTS = {
  ADD_ITEM_ERROR: 'CONVERSATION_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'CONVERSATION_ADD_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'CONVERSATION_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'CONVERSATION_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'CONVERSATION_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'CONVERSATION_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'CONVERSATION_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'CONVERSATION_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'CONVERSATION_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'CONVERSATION_UPDATE_ITEM_SUCCESS'
} as const;

export type ConversationConstantsType = typeof CONVERSATION_CONSTANTS[keyof typeof CONVERSATION_CONSTANTS];

interface ConversationState {
  error?: Error;
  item?: Record<string, any>;
  list?: any[];
  conversations?: Record<string, any>;
}

export const defaultValues: ConversationState = {
  conversations: {},
  list: []
};

interface ConversationData {
  readonly conversation?: Record<string, any>;
  readonly conversations?: Record<string, any>;
  readonly error?: Error;
  readonly list?: any[];
}

export const conversationStore = (
  type: string,
  data: ConversationData,
  state = defaultValues
): ConversationState => {
  switch(type) {
    case CONVERSATION_CONSTANTS.ADD_ITEM_SUCCESS: {
      const {conversation = {}} = data;
      const {conversationId = ''} = conversation;
      const updatedConversations = {...state.conversations, [conversationId]: conversation};
      return {...state, conversations: updatedConversations, item: conversation};
    }

    case CONVERSATION_CONSTANTS.GET_ITEM_SUCCESS: {
      const {conversation = {}} = data;
      const {conversationId = ''} = conversation;
      const updatedConversations = {...state.conversations, [conversationId]: conversation};
      return {...state, conversations: updatedConversations, item: conversation};
    }

    case CONVERSATION_CONSTANTS.GET_LIST_SUCCESS: {
      const {list = []} = data;
      const conversations = list.reduce((acc, item) => {
        const {conversationId} = item;
        return conversationId ? {...acc, [conversationId]: item} : acc;
      }, {});
      return {...state, conversations: {...state.conversations, ...conversations}, list};
    }

    case CONVERSATION_CONSTANTS.UPDATE_ITEM_SUCCESS: {
      const {conversation = {}} = data;
      const {conversationId = ''} = conversation;
      const updatedConversations = {...state.conversations, [conversationId]: conversation};
      return {...state, conversations: updatedConversations, item: conversation};
    }

    case CONVERSATION_CONSTANTS.REMOVE_ITEM_SUCCESS: {
      const {conversation = {}} = data;
      const {conversationId = ''} = conversation;
      const {[conversationId]: removed, ...updatedConversations} = state.conversations || {};
      return {...state, conversations: updatedConversations};
    }

    case CONVERSATION_CONSTANTS.ADD_ITEM_ERROR:
    case CONVERSATION_CONSTANTS.GET_ITEM_ERROR:
    case CONVERSATION_CONSTANTS.GET_LIST_ERROR:
    case CONVERSATION_CONSTANTS.UPDATE_ITEM_ERROR:
    case CONVERSATION_CONSTANTS.REMOVE_ITEM_ERROR: {
      const {error} = data;
      return {...state, error};
    }

    default: {
      return state;
    }
  }
};

export const conversation = {
  action: conversationStore,
  initialState: defaultValues,
  name: 'conversation'
};
