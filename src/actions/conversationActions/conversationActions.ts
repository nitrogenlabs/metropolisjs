/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validateConversationInput} from '../../adapters/conversationAdapter/conversationAdapter.js';
import {CONVERSATION_CONSTANTS} from '../../stores/conversationStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {ConversationType} from '../../adapters/conversationAdapter/conversationAdapter.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

const DATA_TYPE = 'conversations';

export interface ConversationAdapterOptions extends BaseAdapterOptions {
}

export interface ConversationActionsOptions {
  conversationAdapter?: (input: unknown, options?: ConversationAdapterOptions) => any;
  conversationAdapterOptions?: ConversationAdapterOptions;
}

export type ConversationApiResultsType = {
  conversations: {
    add?: ConversationType;
    itemById?: ConversationType;
    list?: ConversationType[];
    remove?: ConversationType;
    update?: ConversationType;
  };
};

export interface ConversationActions {
  add: (conversationData: Partial<ConversationType>, conversationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ConversationType>;
  delete: (conversationId: string, conversationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ConversationType>;
  itemById: (conversationId: string, conversationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ConversationType>;
  list: (from?: number, to?: number, conversationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ConversationType[]>;
  update: (conversation: Partial<ConversationType>, conversationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ConversationType>;
  updateConversationAdapter: (adapter: (input: unknown, options?: ConversationAdapterOptions) => any) => void;
  updateConversationAdapterOptions: (options: ConversationAdapterOptions) => void;
}

const defaultConversationValidator = (input: unknown, options?: ConversationAdapterOptions) =>
  validateConversationInput(input);

export const createConversationActions = (
  flux: FluxFramework,
  options?: ConversationActionsOptions
): ConversationActions => {
  const conversationBase = createBaseActions(flux, defaultConversationValidator, {
    adapter: options?.conversationAdapter,
    adapterOptions: options?.conversationAdapterOptions
  });

  const add = async (
    conversationData: Partial<ConversationType>,
    conversationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConversationType> => {
    try {
      const queryVariables = {
        conversation: {
          type: 'ConversationInput!',
          value: conversationBase.validator(conversationData)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const conversation = data?.conversations?.add || {};
        return flux.dispatch({conversation, type: CONVERSATION_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<ConversationType>(
        flux,
        'add',
        DATA_TYPE,
        queryVariables,
        ['conversationId', ...conversationProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONVERSATION_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'conversation.list');
    }
  };

  const itemById = async (conversationId: string, conversationProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<ConversationType> => {
    try {
      const cachedResult = getCachedRequest<ConversationType>(flux, `conversation.itemById:${conversationId}`, {conversationId, conversationProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        conversationId: {
          type: 'ID!',
          value: parseId(conversationId)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const conversation = data?.conversations?.itemById || {};
        return flux.dispatch({conversation, type: CONVERSATION_CONSTANTS.GET_ITEM_SUCCESS});
      };

      const result = await appQuery<ConversationType>(
        flux,
        'itemById',
        DATA_TYPE,
        queryVariables,
        [
          'conversationId',
          'isGroup',
          'lastMessageAt',
          'memberCount',
          'members',
          'name',
          'ownerId',
          'settings',
          'userId',
          ...conversationProps
        ],
        {onSuccess}
      );
      return await setCachedRequest(flux, `conversation.itemById:${conversationId}`, {conversationId, conversationProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: CONVERSATION_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const list = async (
    from: number = 0,
    to: number = 10,
    conversationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConversationType[]> => {
    try {
      const cachedResult = getCachedRequest<ConversationType[]>(flux, 'conversation.list', {from, to, conversationProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const list = data?.conversations?.list || [];
        return flux.dispatch({
          list,
          type: CONVERSATION_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<ConversationType[]>(
        flux,
        'list',
        DATA_TYPE,
        queryVariables,
        [
          'conversationId',
          'isGroup',
          'lastMessageAt',
          'memberCount',
          'members',
          'name',
          'ownerId',
          'settings',
          'userId',
          ...conversationProps
        ],
        {onSuccess}
      );
      return await setCachedRequest(flux, 'conversation.list', {from, to, conversationProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: CONVERSATION_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteConversation = async (
    conversationId: string,
    conversationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConversationType> => {
    try {
      const queryVariables = {
        conversationId: {
          type: 'ID!',
          value: parseId(conversationId)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const conversation = data?.conversations?.remove || {};
        return flux.dispatch({conversation, type: CONVERSATION_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<ConversationType>(
        flux,
        'remove',
        DATA_TYPE,
        queryVariables,
        ['conversationId', ...conversationProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONVERSATION_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `conversation.itemById:${conversationId}`);
      await clearCachedRequest(flux, 'conversation.list');
    }
  };

  const update = async (
    conversation: Partial<ConversationType>,
    conversationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConversationType> => {
    try {
      const queryVariables = {
        conversation: {
          type: 'ConversationUpdateInput!',
          value: conversationBase.validator(conversation)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const conversation = data?.conversations?.update || {};
        return flux.dispatch({conversation, type: CONVERSATION_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<ConversationType>(
        flux,
        'update',
        DATA_TYPE,
        queryVariables,
        ['conversationId', ...conversationProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: CONVERSATION_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `conversation.itemById:${String(conversation?.conversationId || '')}`);
      await clearCachedRequest(flux, 'conversation.list');
    }
  };

  return {
    add,
    delete: deleteConversation,
    itemById,
    list,
    update,
    updateConversationAdapter: conversationBase.updateAdapter,
    updateConversationAdapterOptions: conversationBase.updateOptions
  };
};
