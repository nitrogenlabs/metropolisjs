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
  TYPING_STATUS_UPDATE: 'MESSAGE_TYPING_STATUS_UPDATE',
  UPDATE_ITEM_ERROR: 'MESSAGE_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'MESSAGE_UPDATE_ITEM_SUCCESS'
} as const;

export interface MessageTypingStatus {
  readonly conversationId?: string;
  readonly isTyping?: boolean;
  readonly name?: string;
  readonly personaId?: string;
  readonly updatedAt?: number;
  readonly userId?: string;
  readonly username?: string;
}

export interface MessageState {
  readonly conversations: Record<string, MessageType[]>;
  readonly typingByConversation: Record<string, Record<string, MessageTypingStatus>>;
}

export const defaultValues: MessageState = {
  conversations: {},
  typingByConversation: {}
};

const getTypingIdentity = (typing?: MessageTypingStatus): string => String(typing?.personaId || typing?.userId || '');

export const messageStore = (type: string, data: {
  message?: MessageType;
  list?: MessageType[];
  conversationId?: string;
  typing?: MessageTypingStatus;
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
    case MESSAGE_CONSTANTS.GET_LIST_SUCCESS: {
      const {conversationId, list = []} = data;

      if(!conversationId) {
        return state;
      }

      return {
        ...state,
        conversations: {
          ...state.conversations,
          [conversationId]: list
        }
      };
    }
    case MESSAGE_CONSTANTS.ADD_ITEM_SUCCESS: {
      const {message} = data;
      const conversationId = String(message?.conversationId || '');

      if(!conversationId || !message) {
        return state;
      }

      const existingMessages = state.conversations?.[conversationId] || [];
      const nextMessageId = String(message.messageId || message.id || message._key || '');
      const hasExistingMessage = existingMessages.some((item) => (
        String(item.messageId || item.id || item._key || '') === nextMessageId
      ));

      if(hasExistingMessage && nextMessageId) {
        return state;
      }

      return {
        ...state,
        conversations: {
          ...state.conversations,
          [conversationId]: [...existingMessages, message]
        }
      };
    }
    case MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE: {
      const typing = data?.typing || {};
      const conversationId = String(typing?.conversationId || '');
      const typingId = getTypingIdentity(typing);

      if(!conversationId || !typingId) {
        return state;
      }

      const currentConversationTyping = {...(state.typingByConversation?.[conversationId] || {})};

      if(!typing?.isTyping) {
        delete currentConversationTyping[typingId];

        if(!Object.keys(currentConversationTyping).length) {
          const {[conversationId]: removed, ...restTypingByConversation} = state.typingByConversation || {};
          return {
            ...state,
            typingByConversation: restTypingByConversation
          };
        }

        return {
          ...state,
          typingByConversation: {
            ...state.typingByConversation,
            [conversationId]: currentConversationTyping
          }
        };
      }

      return {
        ...state,
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: {
            ...currentConversationTyping,
            [typingId]: {
              ...typing,
              conversationId,
              isTyping: true,
              personaId: String(typing?.personaId || ''),
              updatedAt: Number(typing?.updatedAt || Date.now()),
              userId: String(typing?.userId || '')
            }
          }
        }
      };
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
