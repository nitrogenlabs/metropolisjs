/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import { validateMessageInput } from '../../adapters/messageAdapter/messageAdapter.js';
import { MESSAGE_CONSTANTS } from '../../stores/messageStore.js';
import { appMutation, appQuery } from '../../utils/api.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { ConversationType } from '../../adapters/conversationAdapter/conversationAdapter.js';
import type { MessageType } from '../../adapters/messageAdapter/messageAdapter.js';
import type { ApiResultsType, ReaktorDbCollection } from '../../utils/api.js';

const DATA_TYPE: ReaktorDbCollection = 'messages';

export interface MessageAdapterOptions {
  strict?: boolean;
  allowPartial?: boolean;
  environment?: 'development' | 'production' | 'test';
  customValidation?: (input: unknown) => unknown;
}

export interface MessageActionsOptions {
  messageAdapter?: (input: unknown, options?: MessageAdapterOptions) => any;
  messageAdapterOptions?: MessageAdapterOptions;
}

export type MessageApiResultsType = {
  sendMessage: MessageType;
  getDirectConversation: ConversationType;
  getMessages: MessageType[];
  getConversations: ConversationType[];
};

export interface MessageActions {
  sendMessage: (message: Partial<MessageType>, messageProps?: string[]) => Promise<MessageType>;
  getDirectConversation: (userId: string) => Promise<ConversationType>;
  getMessages: (conversationId: string, messageProps?: string[]) => Promise<MessageType[]>;
  getConversations: (from?: number, to?: number) => Promise<ConversationType[]>;
  updateMessageAdapter: (adapter: (input: unknown, options?: MessageAdapterOptions) => any) => void;
  updateMessageAdapterOptions: (options: MessageAdapterOptions) => void;
}

const defaultMessageValidator = (input: unknown, options?: MessageAdapterOptions) => validateMessageInput(input);

const createMessageValidator = (
  customAdapter?: (input: unknown, options?: MessageAdapterOptions) => any,
  options?: MessageAdapterOptions
) => (input: unknown, validatorOptions?: MessageAdapterOptions) => {
  const mergedOptions = {...options, ...validatorOptions};

  let validated = defaultMessageValidator(input, mergedOptions);

  if(customAdapter) {
    validated = customAdapter(validated, mergedOptions);
  }

  if(mergedOptions?.customValidation) {
    validated = mergedOptions.customValidation(validated) as MessageType;
  }

  return validated;
};

export const createMessageActions = (
  flux: FluxFramework,
  options?: MessageActionsOptions
): MessageActions => {
  let messageAdapterOptions: MessageAdapterOptions = options?.messageAdapterOptions || {};
  let customMessageAdapter = options?.messageAdapter;

  let validateMessage = createMessageValidator(customMessageAdapter, messageAdapterOptions);

  const updateMessageAdapter = (adapter: (input: unknown, options?: MessageAdapterOptions) => any): void => {
    customMessageAdapter = adapter;
    validateMessage = createMessageValidator(customMessageAdapter, messageAdapterOptions);
  };

  const updateMessageAdapterOptions = (options: MessageAdapterOptions): void => {
    messageAdapterOptions = {...messageAdapterOptions, ...options};
    validateMessage = createMessageValidator(customMessageAdapter, messageAdapterOptions);
  };
  const sendMessage = async (message: Partial<MessageType>, messageProps: string[] = []): Promise<MessageType> => {
    try {
      const queryVariables = {
        message: {
          type: 'MessageInput!',
          value: validateMessage(message, messageAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {sendMessage: message = {}} = data;
        return flux.dispatch({message, type: MESSAGE_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<MessageType>(
        flux,
        'sendMessage',
        DATA_TYPE,
        queryVariables,
        ['added', 'content', 'modified', 'messageId', 'user { userId, username }', ...messageProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: MESSAGE_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const getDirectConversation = async (userId: string): Promise<ConversationType> => {
    try {
      const queryVariables = {
        userId: {
          type: 'ID!',
          value: userId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {directConversation: conversation = {}} = data;
        return flux.dispatch({conversation, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS});
      };

      return await appQuery<ConversationType>(
        flux,
        'directConversation',
        DATA_TYPE,
        queryVariables,
        ['added', 'conversationId', 'modified', 'name', 'users { userId, username }'],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_ERROR});
      throw error;
    }
  };

  const getMessages = async (conversationId: string, messageProps: string[] = []): Promise<MessageType[]> => {
    try {
      const queryVariables = {
        conversationId: {
          type: 'ID!',
          value: conversationId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {messages = []} = data as {messages: MessageType[]};

        return flux.dispatch({
          conversationId,
          list: messages,
          type: MESSAGE_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<MessageType[]>(
        flux,
        'messages',
        DATA_TYPE,
        queryVariables,
        ['added', 'content', 'modified', 'messageId', 'user { userId, username }', ...messageProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: MESSAGE_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const getConversations = async (from: number = 0, to: number = 10): Promise<ConversationType[]> => {
    try {
      const queryVariables = {
        from: {
          type: 'Int',
          value: from
        },
        to: {
          type: 'Int',
          value: to
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {conversations = []} = data;
        return flux.dispatch({conversations, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS});
      };

      return await appQuery<ConversationType[]>(
        flux,
        'conversations',
        DATA_TYPE,
        queryVariables,
        ['added', 'content', 'conversationId', 'modified', 'name', 'thumbUrl', 'users { userId, username }'],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_ERROR});
      throw error;
    }
  };

  return {
    sendMessage,
    getDirectConversation,
    getMessages,
    getConversations,
    updateMessageAdapter,
    updateMessageAdapterOptions
  };
};

