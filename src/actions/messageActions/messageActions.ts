/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {parseId} from '@nlabs/utils';
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
  messages?: {
    addMessage?: MessageType;
    conversations?: ConversationType[];
    directConversation?: ConversationType;
    getMessage?: MessageType;
    getMessages?: MessageType[];
    getConversations?: ConversationType[];
  };
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

  const getActivePersonaId = (): string => parseId(String(flux.getState('user.session.personaId') || ''));
  const getActiveUserId = (): string => parseId(String(flux.getState('user.session.userId') || ''));

  const sendMessage = async (
    message: Partial<MessageType>,
    messageProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<MessageType> => {
    try {
      const nextMessage = validateMessage(message, messageAdapterOptions);
      const personaId = parseId(String(nextMessage.personaId || getActivePersonaId() || ''));
      const userId = parseId(String(nextMessage.userId || getActiveUserId() || ''));
      const queryVariables = {
        message: {
          type: 'MessageInput!',
          value: {
            ...nextMessage,
            ...(personaId && {personaId}),
            ...(userId && {userId})
          }
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const message = (data as MessageApiResultsType)?.messages?.addMessage || {};
        return flux.dispatch({message, type: MESSAGE_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<MessageApiResultsType>(
        flux,
        'addMessage',
        DATA_TYPE,
        queryVariables,
        ['added', 'content', 'modified', 'messageId', 'user { userId, personaId, name, username, thumbUrl, imageUrl }', ...messageProps],
        {onSuccess}
      ).then((result) => ((result as MessageApiResultsType)?.messages?.addMessage || {}) as MessageType);
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
        const conversation = (data as MessageApiResultsType)?.messages?.directConversation || {};
        return flux.dispatch({conversation, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS});
      };

      const result = await appQuery<MessageApiResultsType>(
        flux,
        'directConversation',
        DATA_TYPE,
        queryVariables,
        ['added', 'conversationId', 'modified', 'name', 'users { userId, personaId, name, username, thumbUrl, imageUrl }'],
        {onSuccess}
      );

      const conversation = (
        (result as unknown as {conversation?: ConversationType})?.conversation
        || result?.messages?.directConversation
        || {}
      );
      return await setCachedRequest(flux, `message.getDirectConversation:${userId}`, {userId}, conversation as ConversationType, requestOptions);
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
          type: 'String',
          value: conversationId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const messages = Array.isArray((data as MessageApiResultsType)?.messages?.getMessages)
          ? (data as MessageApiResultsType).messages?.getMessages || []
          : [];

        return flux.dispatch({
          conversationId,
          list: messages,
          type: MESSAGE_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<MessageApiResultsType>(
        flux,
        'getMessages',
        DATA_TYPE,
        queryVariables,
        ['added', 'content', 'modified', 'messageId', 'user { userId, personaId, name, username, thumbUrl, imageUrl }', ...messageProps],
        {onSuccess}
      );

      const messages = result?.messages?.getMessages || [];
      return await setCachedRequest(flux, `message.getMessages:${conversationId}`, {conversationId, messageProps}, messages as MessageType[], requestOptions);
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
        const conversations = Array.isArray((data as MessageApiResultsType)?.messages?.getConversations)
          ? (data as MessageApiResultsType).messages?.getConversations || []
          : [];
        return flux.dispatch({conversations, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS});
      };

      const result = await appQuery<MessageApiResultsType>(
        flux,
        'getConversations',
        DATA_TYPE,
        queryVariables,
        ['added', 'conversationId', 'direct', 'modified', 'name', 'users { userId, personaId, name, username, thumbUrl, imageUrl }'],
        {onSuccess}
      );

      const conversations = result?.messages?.getConversations || [];
      return await setCachedRequest(flux, 'message.getConversations', {from, to}, conversations as ConversationType[], requestOptions);
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
