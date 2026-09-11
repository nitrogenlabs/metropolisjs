/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {withCacheIngestion} from '../utils/cacheIngestion.js';

export interface TranslationType {
  readonly key: string;
  readonly locale: string;
  readonly value: string;
  readonly namespace?: string;
  readonly timestamp?: number;
}

export interface TranslationState {
  readonly error?: Error;
  readonly translations: Record<string, TranslationType>;
  readonly pendingKeys: Set<string>;
  readonly isQueueing: boolean;
  readonly lastSync: number;
}

export const TRANSLATION_CONSTANTS = {
  ADD_TRANSLATIONS_SUCCESS: 'TRANSLATION_ADD_TRANSLATIONS_SUCCESS',
  ADD_TRANSLATIONS_ERROR: 'TRANSLATION_ADD_TRANSLATIONS_ERROR',
  GET_TRANSLATIONS_SUCCESS: 'TRANSLATION_GET_TRANSLATIONS_SUCCESS',
  GET_TRANSLATIONS_ERROR: 'TRANSLATION_GET_TRANSLATIONS_ERROR',
  QUEUE_TRANSLATION_KEY: 'TRANSLATION_QUEUE_TRANSLATION_KEY',
  CLEAR_PENDING_KEYS: 'TRANSLATION_CLEAR_PENDING_KEYS',
  SET_QUEUEING_STATE: 'TRANSLATION_SET_QUEUEING_STATE'
} as const;

export type TranslationConstantsType = typeof TRANSLATION_CONSTANTS[keyof typeof TRANSLATION_CONSTANTS];

const defaultValues: TranslationState = {
  translations: {},
  pendingKeys: new Set(),
  isQueueing: false,
  lastSync: 0
};

interface TranslationData {
  readonly error?: Error;
  readonly translations?: TranslationType[];
  readonly key?: string;
  readonly isQueueing?: boolean;
}

const createTranslationKey = (key: string, locale: string, namespace?: string): string => (namespace ? `${namespace}:${key}:${locale}` : `${key}:${locale}`);

export const translationStore = (type: string, data: TranslationData, state = defaultValues): TranslationState => {
  switch(type) {
    case TRANSLATION_CONSTANTS.ADD_TRANSLATIONS_SUCCESS: {
      const {translations} = data;
      if(translations?.length) {
        const newTranslations = {...state.translations};
        const newPendingKeys = new Set(state.pendingKeys);

        translations.forEach((translation) => {
          const translationKey = createTranslationKey(translation.key, translation.locale, translation.namespace);
          newTranslations[translationKey] = {
            ...translation,
            timestamp: Date.now()
          };
          newPendingKeys.delete(translationKey);
        });

        return {
          ...state,
          error: undefined,
          translations: newTranslations,
          pendingKeys: newPendingKeys,
          lastSync: Date.now()
        };
      }
      return state;
    }

    case TRANSLATION_CONSTANTS.GET_TRANSLATIONS_SUCCESS: {
      const {translations} = data;
      if(translations?.length) {
        const newTranslations = {...state.translations};

        translations.forEach((translation) => {
          const translationKey = createTranslationKey(translation.key, translation.locale, translation.namespace);
          newTranslations[translationKey] = {
            ...translation,
            timestamp: Date.now()
          };
        });

        return {
          ...state,
          error: undefined,
          translations: newTranslations,
          lastSync: Date.now()
        };
      }
      return state;
    }

    case TRANSLATION_CONSTANTS.QUEUE_TRANSLATION_KEY: {
      const {key} = data;
      if(key) {
        const newPendingKeys = new Set(state.pendingKeys);
        newPendingKeys.add(key);
        return {
          ...state,
          pendingKeys: newPendingKeys
        };
      }
      return state;
    }

    case TRANSLATION_CONSTANTS.CLEAR_PENDING_KEYS: {
      return {
        ...state,
        pendingKeys: new Set()
      };
    }

    case TRANSLATION_CONSTANTS.SET_QUEUEING_STATE: {
      const {isQueueing} = data;
      return {
        ...state,
        isQueueing: isQueueing || false
      };
    }

    case TRANSLATION_CONSTANTS.ADD_TRANSLATIONS_ERROR:
    case TRANSLATION_CONSTANTS.GET_TRANSLATIONS_ERROR: {
      const {error} = data;
      return {
        ...state,
        error
      };
    }

    default: {
      return state;
    }
  }
};

export const translations = {
  action: withCacheIngestion('translations', translationStore, defaultValues),
  initialState: defaultValues,
  name: 'translations'
};