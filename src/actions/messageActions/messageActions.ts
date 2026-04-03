/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import { validateMessageInput } from '../../adapters/messageAdapter/messageAdapter.js';
import { MESSAGE_CONSTANTS } from '../../stores/messageStore.js';
import { appMutation, appQuery } from '../../utils/api.js';
import { clearCachedRequest, getCachedRequest, setCachedRequest } from '../../utils/requestCache.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { ConversationType } from '../../adapters/conversationAdapter/conversationAdapter.js';
import type { MessageType } from '../../adapters/messageAdapter/messageAdapter.js';
import type { ApiResultsType } from '../../utils/api.js';
import type { ActionRequestOptions } from '../../utils/requestCache.js';

const DATA_TYPE = 'messages';

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
  sendMessage: (message: Partial<MessageType>, messageProps?: string[], requestOptions?: ActionRequestOptions) => Promise<MessageType>;
  getDirectConversation: (userId: string, requestOptions?: ActionRequestOptions) => Promise<ConversationType>;
  getMessages: (conversationId: string, messageProps?: string[], requestOptions?: ActionRequestOptions) => Promise<MessageType[]>;
  getConversations: (from?: number, to?: number, requestOptions?: ActionRequestOptions) => Promise<ConversationType[]>;
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
  let messageAdapterOptions = options?.messageAdapterOptions || {};
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
  const sendMessage = async (
    message: Partial<MessageType>,
    messageProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<MessageType> => {
    try {
      const queryVariables = {
        message: {
          type: 'MessageInput!',
          value: validateMessage(message, messageAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const message = data?.sendMessage || {};
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
    } finally {
      await clearCachedRequest(flux, `message.getMessages:${String(message?.conversationId || '')}`);
      await clearCachedRequest(flux, 'message.getConversations');
    }
  };

  const getDirectConversation = async (
    userId: string,
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConversationType> => {
    try {
      const cachedResult = getCachedRequest<ConversationType>(flux, `message.getDirectConversation:${userId}`, {userId}, requestOptions);

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        userId: {
          type: 'ID!',
          value: userId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const conversation = data?.directConversation || {};
        return flux.dispatch({conversation, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS});
      };

      const result = await appQuery<ConversationType>(
        flux,
        'directConversation',
        DATA_TYPE,
        queryVariables,
        ['added', 'conversationId', 'modified', 'name', 'users { userId, username }'],
        {onSuccess}
      );

      return await setCachedRequest(flux, `message.getDirectConversation:${userId}`, {userId}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_ERROR});
      throw error;
    }
  };

  const getMessages = async (
    conversationId: string,
    messageProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<MessageType[]> => {
    try {
      const cachedResult = getCachedRequest<MessageType[]>(
        flux,
        `message.getMessages:${conversationId}`,
        {conversationId, messageProps},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        conversationId: {
          type: 'ID!',
          value: conversationId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const messages = Array.isArray((data as {messages?: MessageType[]})?.messages)
          ? (data as {messages?: MessageType[]}).messages || []
          : [];

        return flux.dispatch({
          conversationId,
          list: messages,
          type: MESSAGE_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<MessageType[]>(
        flux,
        'messages',
        DATA_TYPE,
        queryVariables,
        ['added', 'content', 'modified', 'messageId', 'user { userId, username }', ...messageProps],
        {onSuccess}
      );

      return await setCachedRequest(flux, `message.getMessages:${conversationId}`, {conversationId, messageProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: MESSAGE_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const getConversations = async (
    from: number = 0,
    to: number = 10,
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConversationType[]> => {
    try {
      const cachedResult = getCachedRequest<ConversationType[]>(flux, 'message.getConversations', {from, to}, requestOptions);

      if(cachedResult) {
        return cachedResult;
      }

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
        const conversations = Array.isArray((data as {conversations?: ConversationType[]})?.conversations)
          ? (data as {conversations?: ConversationType[]}).conversations || []
          : [];
        return flux.dispatch({conversations, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS});
      };

      const result = await appQuery<ConversationType[]>(
        flux,
        'conversations',
        DATA_TYPE,
        queryVariables,
        ['added', 'content', 'conversationId', 'modified', 'name', 'thumbUrl', 'users { userId, username }'],
        {onSuccess}
      );

      return await setCachedRequest(flux, 'message.getConversations', {from, to}, result, requestOptions);
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
