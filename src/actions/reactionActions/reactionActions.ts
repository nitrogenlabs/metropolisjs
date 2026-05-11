/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {Flux} from '@nlabs/arkhamjs';

import {validateReactionInput} from '../../adapters/reactionAdapter/reactionAdapter.js';
import {REACTION_CONSTANTS} from '../../stores/reactionStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {ReactionType} from '../../adapters/reactionAdapter/reactionAdapter.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

const DATA_TYPE = 'reactions';

export interface ReactionAdapterOptions {
  strict?: boolean;
  allowPartial?: boolean;
  environment?: 'development' | 'production' | 'test';
  customValidation?: (input: unknown) => unknown;
}

export interface ReactionActionsOptions {
  reactionAdapter?: (input: unknown, options?: ReactionAdapterOptions) => any;
  reactionAdapterOptions?: ReactionAdapterOptions;
}

export type ReactionApiResultsType = {
  reactions: {
    addPersonaReaction: ReactionType;
    addReaction: ReactionType;
    deletePersonaReaction: ReactionType;
    deleteReaction: ReactionType;
    getReactionCount: number;
    hasPersonaReaction: boolean;
    hasReaction: boolean;
  };
};

export interface ReactionActions {
  addPersonaReaction: (personaId: string, itemId: string, itemType: string, reaction: Partial<ReactionType>, reactionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ReactionType>;
  addReaction: (itemId: string, itemType: string, reaction: Partial<ReactionType>, reactionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ReactionType>;
  deletePersonaReaction: (personaId: string, itemId: string, itemType: string, reactionName: string, reactionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ReactionType>;
  deleteReaction: (itemId: string, itemType: string, reactionName: string, reactionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ReactionType>;
  getReactionCount: (itemId: string, itemType: string, reactionName: string, requestOptions?: ActionRequestOptions) => Promise<number>;
  hasPersonaReaction: (personaId: string, itemId: string, itemType: string, reactionName: string, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  hasReaction: (itemId: string, itemType: string, reactionName: string, direction: string, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  abbreviateCount: (count: number) => string;
  updateReactionAdapter: (adapter: (input: unknown, options?: ReactionAdapterOptions) => any) => void;
  updateReactionAdapterOptions: (options: ReactionAdapterOptions) => void;
}

const defaultReactionValidator = (input: unknown, options?: ReactionAdapterOptions) => validateReactionInput(input);

const createReactionValidator = (
  customAdapter?: (input: unknown, options?: ReactionAdapterOptions) => any,
  options?: ReactionAdapterOptions
) => (input: unknown, validatorOptions?: ReactionAdapterOptions) => {
  const mergedOptions = {...options, ...validatorOptions};

  let validated = defaultReactionValidator(input, mergedOptions);

  if(customAdapter) {
    validated = customAdapter(validated, mergedOptions);
  }

  if(mergedOptions?.customValidation) {
    validated = mergedOptions.customValidation(validated) as ReactionType;
  }

  return validated;
};

export const createReactionActions = (
  flux: FluxFramework,
  options?: ReactionActionsOptions
): ReactionActions => {
  let reactionAdapterOptions = options?.reactionAdapterOptions || {};
  let customReactionAdapter = options?.reactionAdapter;
  let validateReaction = createReactionValidator(customReactionAdapter, reactionAdapterOptions);

  const updateReactionAdapter = (adapter: (input: unknown, options?: ReactionAdapterOptions) => any): void => {
    customReactionAdapter = adapter;
    validateReaction = createReactionValidator(customReactionAdapter, reactionAdapterOptions);
  };

  const updateReactionAdapterOptions = (options: ReactionAdapterOptions): void => {
    reactionAdapterOptions = {...reactionAdapterOptions, ...options};
    validateReaction = createReactionValidator(customReactionAdapter, reactionAdapterOptions);
  };

  const addReaction = async (
    itemId: string,
    itemType: string,
    reaction: Partial<ReactionType>,
    reactionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ReactionType> => {
    const validatedReaction = validateReaction(reaction, reactionAdapterOptions);
    const {value} = validatedReaction;
    const formatValue = value !== undefined ? value.toString() : value;

    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: `${itemType}/${itemId}`
        },
        reaction: {
          type: 'ReactionInput',
          value: {
            ...validatedReaction,
            value: formatValue
          }
        }
      };

      const onSuccess = (data: ReactionApiResultsType) => {
        const reaction = data?.reactions?.addReaction || {};
        return Flux.dispatch({itemId, itemType, reaction, type: REACTION_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<ReactionType>(flux, 'addReaction', DATA_TYPE, queryVariables, ['id', 'name', 'value', ...reactionProps], {
        onSuccess
      });
    } catch(error) {
      flux.dispatch({error, type: REACTION_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `reaction.getReactionCount:${itemType}:${itemId}:${reaction.name || ''}`);
      await clearCachedRequest(flux, `reaction.hasReaction:${itemType}:${itemId}:${reaction.name || ''}`);
    }
  };

  const addPersonaReaction = async (
    personaId: string,
    itemId: string,
    itemType: string,
    reaction: Partial<ReactionType>,
    reactionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ReactionType> => {
    const validatedReaction = validateReaction(reaction, reactionAdapterOptions);
    const {value} = validatedReaction;
    const formatValue = value !== undefined ? value.toString() : value;

    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: `${itemType}/${itemId}`
        },
        personaId: {
          type: 'ID',
          value: personaId
        },
        reaction: {
          type: 'ReactionInput',
          value: {
            ...validatedReaction,
            value: formatValue
          }
        }
      };

      const onSuccess = (data: ReactionApiResultsType) => {
        const reaction = data?.reactions?.addPersonaReaction || {};
        return Flux.dispatch({itemId, itemType, reaction, type: REACTION_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<ReactionType>(flux, 'addPersonaReaction', DATA_TYPE, queryVariables, ['id', 'name', 'type', 'value', ...reactionProps], {
        onSuccess
      });
    } catch(error) {
      flux.dispatch({error, type: REACTION_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `reaction.getReactionCount:${itemType}:${itemId}:${reaction.name || ''}`);
      await clearCachedRequest(flux, `reaction.hasPersonaReaction:${personaId}:${itemType}:${itemId}:${reaction.name || ''}`);
    }
  };

  const deleteReaction = async (
    itemId: string,
    itemType: string,
    reactionName: string,
    reactionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ReactionType> => {
    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: `${itemType}/${itemId}`
        },
        reactionName: {
          type: 'String',
          value: reactionName
        }
      };

      const onSuccess = (data: ReactionApiResultsType) => {
        const reaction = data?.reactions?.deleteReaction || {};
        return Flux.dispatch({
          itemId,
          itemType,
          reaction,
          type: REACTION_CONSTANTS.REMOVE_ITEM_SUCCESS
        });
      };

      return await appMutation<ReactionType>(flux, 'deleteReaction', DATA_TYPE, queryVariables, ['id', 'name', 'value', ...reactionProps], {
        onSuccess
      });
    } catch(error) {
      flux.dispatch({error, type: REACTION_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `reaction.getReactionCount:${itemType}:${itemId}:${reactionName}`);
      await clearCachedRequest(flux, `reaction.hasReaction:${itemType}:${itemId}:${reactionName}`);
    }
  };

  const deletePersonaReaction = async (
    personaId: string,
    itemId: string,
    itemType: string,
    reactionName: string,
    reactionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ReactionType> => {
    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: `${itemType}/${itemId}`
        },
        personaId: {
          type: 'ID',
          value: personaId
        },
        reactionName: {
          type: 'String!',
          value: reactionName
        }
      };

      const onSuccess = (data: ReactionApiResultsType) => {
        const reaction = data?.reactions?.deletePersonaReaction || {};
        return Flux.dispatch({
          itemId,
          itemType,
          reaction,
          type: REACTION_CONSTANTS.REMOVE_ITEM_SUCCESS
        });
      };

      return await appMutation<ReactionType>(flux, 'deletePersonaReaction', DATA_TYPE, queryVariables, ['id', 'name', 'type', 'value', ...reactionProps], {
        onSuccess
      });
    } catch(error) {
      flux.dispatch({error, type: REACTION_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `reaction.getReactionCount:${itemType}:${itemId}:${reactionName}`);
      await clearCachedRequest(flux, `reaction.hasPersonaReaction:${personaId}:${itemType}:${itemId}:${reactionName}`);
    }
  };

  const getReactionCount = async (
    itemId: string,
    itemType: string,
    reactionName: string,
    requestOptions: ActionRequestOptions = {}
  ): Promise<number> => {
    try {
      const cachedResult = getCachedRequest<number>(
        flux,
        `reaction.getReactionCount:${itemType}:${itemId}:${reactionName}`,
        {itemId, itemType, reactionName},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: `${itemType}/${itemId}`
        },
        reactionName: {
          type: 'String',
          value: reactionName
        }
      };

      const onSuccess = (data: ReactionApiResultsType) => {
        const getReactionCount = data?.reactions?.getReactionCount ?? 0;
        return flux.dispatch({
          count: getReactionCount,
          itemId,
          name: reactionName,
          type: REACTION_CONSTANTS.GET_COUNT_SUCCESS
        });
      };

      const result = await appQuery<number>(
        flux,
        'getReactionCount',
        DATA_TYPE,
        queryVariables,
        [],
        {onSuccess}
      );

      return await setCachedRequest(
        flux,
        `reaction.getReactionCount:${itemType}:${itemId}:${reactionName}`,
        {itemId, itemType, reactionName},
        result,
        requestOptions
      );
    } catch(error) {
      flux.dispatch({error, type: REACTION_CONSTANTS.GET_COUNT_ERROR});
      throw error;
    }
  };

  const hasReaction = async (
    itemId: string,
    itemType: string,
    reactionName: string,
    direction: string,
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    try {
      const cachedResult = getCachedRequest<boolean>(
        flux,
        `reaction.hasReaction:${itemType}:${itemId}:${reactionName}`,
        {direction, itemId, itemType, reactionName},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        direction: {
          type: 'String',
          value: direction
        },
        itemId: {
          type: 'ID!',
          value: `${itemType}/${itemId}`
        },
        reactionName: {
          type: 'String',
          value: reactionName
        }
      };

      const onSuccess = (data: ReactionApiResultsType) => {
        const hasReaction = data?.reactions?.hasReaction ?? false;
        return Flux.dispatch({
          hasReaction,
          itemId: `${itemType}/${itemId}`,
          name: reactionName,
          type: REACTION_CONSTANTS.HAS_SUCCESS
        });
      };

      const result = await appQuery<boolean>(
        flux,
        'hasReaction',
        DATA_TYPE,
        queryVariables,
        [],
        {onSuccess}
      );

      return await setCachedRequest(
        flux,
        `reaction.hasReaction:${itemType}:${itemId}:${reactionName}`,
        {direction, itemId, itemType, reactionName},
        result,
        requestOptions
      );
    } catch(error) {
      flux.dispatch({error, type: REACTION_CONSTANTS.HAS_ERROR});
      throw error;
    }
  };

  const hasPersonaReaction = async (
    personaId: string,
    itemId: string,
    itemType: string,
    reactionName: string,
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    try {
      const cachedResult = getCachedRequest<boolean>(
        flux,
        `reaction.hasPersonaReaction:${personaId}:${itemType}:${itemId}:${reactionName}`,
        {itemId, itemType, personaId, reactionName},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: `${itemType}/${itemId}`
        },
        personaId: {
          type: 'ID',
          value: personaId
        },
        reactionName: {
          type: 'String!',
          value: reactionName
        }
      };

      const onSuccess = (data: ReactionApiResultsType) => {
        const hasReaction = data?.reactions?.hasPersonaReaction ?? false;
        return Flux.dispatch({
          hasReaction,
          itemId: `${itemType}/${itemId}`,
          name: reactionName,
          type: REACTION_CONSTANTS.HAS_SUCCESS
        });
      };

      const result = await appQuery<boolean>(
        flux,
        'hasPersonaReaction',
        DATA_TYPE,
        queryVariables,
        [],
        {onSuccess}
      );

      return await setCachedRequest(
        flux,
        `reaction.hasPersonaReaction:${personaId}:${itemType}:${itemId}:${reactionName}`,
        {itemId, itemType, personaId, reactionName},
        result,
        requestOptions
      );
    } catch(error) {
      flux.dispatch({error, type: REACTION_CONSTANTS.HAS_ERROR});
      throw error;
    }
  };

  const abbreviateCount = (count: number): string => {
    const value = count || 0;
    let newValue = value.toString();

    if(value >= 1000) {
      const suffixes = ['', 'k', 'm', 'b', 't'];
      const suffixNum = Math.floor(`${value}`.length / 3);
      let shortValue = 0;
      let shortString = '';

      for(let precision = 2; precision >= 1; precision--) {
        shortValue = parseFloat((suffixNum !== 0 ? value / Math.pow(1000, suffixNum) : value).toPrecision(precision));
        shortString = shortValue.toString();
        const dotLessShortValue = `${shortValue}`.replace(/[^a-zA-Z 0-9]+/g, '');

        if(dotLessShortValue.length <= 2) {
          break;
        }
      }

      if(shortValue % 1 !== 0) {
        shortString = shortValue.toFixed(1);
      }

      newValue = shortString + suffixes[suffixNum];
    }

    return newValue;
  };

  // Return the actions object
  return {
    addPersonaReaction,
    addReaction,
    deletePersonaReaction,
    deleteReaction,
    getReactionCount,
    hasPersonaReaction,
    hasReaction,
    abbreviateCount,
    updateReactionAdapter,
    updateReactionAdapterOptions
  };
};
