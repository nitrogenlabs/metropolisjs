/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {MessageType} from '../adapters/messageAdapter/messageAdapter.js';

export const MESSAGE_CONSTANTS = {
  ADD_ITEM_ERROR: 'MESSAGE_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'MESSAGE_ADD_ITEM_SUCCESS',
  GET_CONVO_LIST_ERROR: 'MESSAGE_GET_CONVO_LIST_ERROR',
  GET_CONVO_LIST_SUCCESS: 'MESSAGE_GET_CONVO_LIST_SUCCESS',
  GET_ITEM_ERROR: 'MESSAGE_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'MESSAGE_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'MESSAGE_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'MESSAGE_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'MESSAGE_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'MESSAGE_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'MESSAGE_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'MESSAGE_UPDATE_ITEM_SUCCESS'
} as const;

interface MessageState {
  conversations: Record<string, MessageType[]>;
}

export const defaultValues: MessageState = {
  conversations: {}
};

export const messageStore = (type: string, data: {
  list?: MessageType[];
  conversationId?: string;
}, state = defaultValues): MessageState => {
  switch(type) {
    case MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS: {
      const {list, conversationId} = data;

      if(!conversationId) {
        return state;
      }

      const {conversations} = state;
      return {...state, conversations: {...conversations, [conversationId]: list || []}};
    }

    default: {
      return state;
    }
  }
};

export const messages = {
  action: messageStore,
  initialState: defaultValues,
  name: 'message'
};