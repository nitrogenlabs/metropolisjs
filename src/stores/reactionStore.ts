/**
 * Copyright (c) 2022-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {withCacheIngestion} from '../utils/cacheIngestion.js';

export const REACTION_CONSTANTS = {
  ADD_ITEM_ERROR: 'REACTION_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'REACTION_ADD_ITEM_SUCCESS',
  GET_COUNT_ERROR: 'REACTION_GET_COUNT_ERROR',
  GET_COUNT_SUCCESS: 'REACTION_GET_COUNT_SUCCESS',
  HAS_ERROR: 'REACTION_HAS_ERROR',
  HAS_SUCCESS: 'REACTION_HAS_SUCCESS',
  REMOVE_ITEM_ERROR: 'REACTION_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'REACTION_REMOVE_ITEM_SUCCESS'
} as const;

interface ReactionState {
  reactions?: Record<string, {
    count?: number;
    hasReaction?: boolean;
  }>;
}

export const defaultValues: ReactionState = {
  reactions: {}
};

export const reactionStore = (type: string, data: Partial<ReactionState>, state = defaultValues): ReactionState => {
  switch(type) {
    default: {
      return state;
    }
  }
};

export const reactions = {
  action: withCacheIngestion('reaction', reactionStore, defaultValues),
  initialState: defaultValues,
  name: 'reaction'
};
