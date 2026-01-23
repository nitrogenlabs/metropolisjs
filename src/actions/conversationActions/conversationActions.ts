/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validateConversationInput, type ConversationType} from '../../adapters/conversationAdapter/conversationAdapter.js';
import {CONVERSATION_CONSTANTS} from '../../stores/conversationStore.js';
import {appMutation, appQuery, type ReaktorDbCollection} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';

const DATA_TYPE: ReaktorDbCollection = 'conversations';

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
  add: (conversationData: Partial<ConversationType>, conversationProps?: string[]) => Promise<ConversationType>;
  delete: (conversationId: string, conversationProps?: string[]) => Promise<ConversationType>;
  itemById: (conversationId: string, conversationProps?: string[]) => Promise<ConversationType>;
  list: (from?: number, to?: number, conversationProps?: string[]) => Promise<ConversationType[]>;
  update: (conversation: Partial<ConversationType>, conversationProps?: string[]) => Promise<ConversationType>;
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
    conversationProps: string[] = []
  ): Promise<ConversationType> => {
    try {
      const queryVariables = {
        conversation: {
          type: 'ConversationInput!',
          value: conversationBase.validator(conversationData)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const {conversations: {add: conversation = {}}} = data;
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
    }
  };

  const itemById = async (conversationId: string, conversationProps: string[] = []): Promise<ConversationType> => {
    try {
      const queryVariables = {
        conversationId: {
          type: 'ID!',
          value: parseId(conversationId)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const {conversations: {itemById: conversation = {}}} = data;
        return flux.dispatch({conversation, type: CONVERSATION_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<ConversationType>(
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
    } catch(error) {
      flux.dispatch({error, type: CONVERSATION_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const list = async (
    from: number = 0,
    to: number = 10,
    conversationProps: string[] = []
  ): Promise<ConversationType[]> => {
    try {
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
        const {conversations: {list = []}} = data;
        return flux.dispatch({
          list,
          type: CONVERSATION_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<ConversationType[]>(
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
    } catch(error) {
      flux.dispatch({error, type: CONVERSATION_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteConversation = async (
    conversationId: string,
    conversationProps: string[] = []
  ): Promise<ConversationType> => {
    try {
      const queryVariables = {
        conversationId: {
          type: 'ID!',
          value: parseId(conversationId)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const {conversations: {remove: conversation = {}}} = data;
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
    }
  };

  const update = async (
    conversation: Partial<ConversationType>,
    conversationProps: string[] = []
  ): Promise<ConversationType> => {
    try {
      const queryVariables = {
        conversation: {
          type: 'ConversationUpdateInput!',
          value: conversationBase.validator(conversation)
        }
      };

      const onSuccess = (data: ConversationApiResultsType) => {
        const {conversations: {update: conversation = {}}} = data;
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
