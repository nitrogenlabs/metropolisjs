/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {TRANSLATION_CONSTANTS} from '../../stores/translationStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {TranslationType} from '../../stores/translationStore.js';
import type {ReaktorDbCollection} from '../../utils/api.js';
import {initI18n, updateI18nResources} from '../../utils/i18n.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';

const DATA_TYPE: ReaktorDbCollection = 'translations';

export interface TranslationInputType {
  readonly key: string;
  readonly locale: string;
  readonly value: string;
  readonly namespace?: string;
}

export interface TranslationActionsOptions {
  translationAdapter?: (input: unknown, options?: BaseAdapterOptions) => any;
  translationAdapterOptions?: BaseAdapterOptions;
  autoSyncI18n?: boolean;
}

export type TranslationApiResultsType = {
  translations: {
    addTranslations: TranslationType[];
    getTranslations: TranslationType[];
  };
};

export interface TranslationActions {
  addTranslations: (translations: TranslationInputType[], translationProps?: string[]) => Promise<TranslationType[]>;
  getTranslation: (key: string, locale: string, namespace?: string) => string | null;
  getTranslations: (
    keys: string[],
    locale: string,
    namespace?: string,
    translationProps?: string[]
  ) => Promise<TranslationType[]>;
  hasTranslation: (key: string, locale: string, namespace?: string) => boolean;
  processPendingTranslations: (locale: string, namespace?: string) => Promise<void>;
  queueTranslationKey: (key: string, locale: string, namespace?: string) => void;
  syncWithI18n: () => void;
  updateTranslationAdapter: (adapter: (input: unknown, options?: BaseAdapterOptions) => any) => void;
  updateTranslationAdapterOptions: (options: BaseAdapterOptions) => void;
}

const defaultTranslationValidator = (input: unknown, options?: BaseAdapterOptions) => input as TranslationInputType;

export const createTranslationActions = (
  flux: FluxFramework,
  options?: TranslationActionsOptions
): TranslationActions => {
  const translationBase = createBaseActions(flux, defaultTranslationValidator, {
    ...(options?.translationAdapter && {adapter: options.translationAdapter}),
    ...(options?.translationAdapterOptions && {adapterOptions: options.translationAdapterOptions})
  });

  const syncWithI18n = () => {
    const state = flux.getState('translations') as any;
    const translations = state.translations || {};

    if(Object.keys(translations).length > 0) {
      if(!options?.autoSyncI18n) {
        initI18n(translations);
      } else {
        updateI18nResources(translations);
      }
    }
  };

  const addTranslations = async (
    translations: TranslationInputType[],
    translationProps: string[] = []
  ): Promise<TranslationType[]> => {
    try {
      const queryVariables = {
        translations: {
          type: '[TranslationInput!]!',
          value: translations.map((t) => translationBase.validator(t))
        }
      };

      const onSuccess = (data: TranslationApiResultsType) => {
        const {translations: {addTranslations = []}} = data;
        const result = flux.dispatch({
          translations: addTranslations,
          type: TRANSLATION_CONSTANTS.ADD_TRANSLATIONS_SUCCESS
        });
        if(options?.autoSyncI18n) {
          syncWithI18n();
        }
        return result;
      };

      return await appMutation<TranslationType[]>(
        flux,
        'addTranslations',
        DATA_TYPE,
        queryVariables,
        ['key', 'locale', 'value', 'namespace', ...translationProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TRANSLATION_CONSTANTS.ADD_TRANSLATIONS_ERROR});
      throw error;
    }
  };

  const getTranslation = (key: string, locale: string, namespace?: string): string | null => {
    const state = flux.getState('translations') as any;
    const translationKey = namespace ? `${namespace}:${key}:${locale}` : `${key}:${locale}`;
    const translation = state.translations?.[translationKey];
    return translation?.value || null;
  };

  const getTranslations = async (
    keys: string[],
    locale: string,
    namespace?: string,
    translationProps: string[] = []
  ): Promise<TranslationType[]> => {
    try {
      const queryVariables = {
        keys: {
          type: '[String!]!',
          value: keys
        },
        locale: {
          type: 'String!',
          value: locale
        },
        ...(namespace && {
          namespace: {
            type: 'String',
            value: namespace
          }
        })
      };

      const onSuccess = (data: TranslationApiResultsType) => {
        const {translations: {getTranslations = []}} = data;
        const result = flux.dispatch({
          translations: getTranslations,
          type: TRANSLATION_CONSTANTS.GET_TRANSLATIONS_SUCCESS
        });
        if(options?.autoSyncI18n) {
          syncWithI18n();
        }
        return result;
      };

      return await appQuery<TranslationType[]>(
        flux,
        'getTranslations',
        DATA_TYPE,
        queryVariables,
        ['key', 'locale', 'value', 'namespace', ...translationProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: TRANSLATION_CONSTANTS.GET_TRANSLATIONS_ERROR});
      throw error;
    }
  };

  const hasTranslation = (key: string, locale: string, namespace?: string): boolean => {
    const state = flux.getState('translations') as any;
    const translationKey = namespace ? `${namespace}:${key}:${locale}` : `${key}:${locale}`;
    return !!state.translations?.[translationKey];
  };

  const queueTranslationKey = (key: string, locale: string, namespace?: string): void => {
    const translationKey = namespace ? `${namespace}:${key}:${locale}` : `${key}:${locale}`;
    flux.dispatch({key: translationKey, type: TRANSLATION_CONSTANTS.QUEUE_TRANSLATION_KEY});
  };

  const processPendingTranslations = async (locale: string, namespace?: string): Promise<void> => {
    const state = flux.getState('translations') as any;
    const pendingKeys = Array.from(state.pendingKeys || []) as string[];

    if(pendingKeys.length === 0) {
      return;
    }

    flux.dispatch({isQueueing: true, type: TRANSLATION_CONSTANTS.SET_QUEUEING_STATE});

    try {
      const keysToFetch = pendingKeys
        .map((key: string) => {
          const parts = key.split(':');
          if(namespace) {
            return parts.length === 3 ? parts[1] : null;
          }
          return parts.length === 2 ? parts[0] : null;
        })
        .filter(Boolean) as string[];

      if(keysToFetch.length > 0) {
        await getTranslations(keysToFetch, locale, namespace);
      }
    } finally {
      flux.dispatch({isQueueing: false, type: TRANSLATION_CONSTANTS.SET_QUEUEING_STATE});
    }
  };

  return {
    addTranslations,
    getTranslation,
    getTranslations,
    hasTranslation,
    processPendingTranslations,
    queueTranslationKey,
    syncWithI18n,
    updateTranslationAdapter: translationBase.updateAdapter,
    updateTranslationAdapterOptions: translationBase.updateOptions
  };
};