/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useMetropolis } from './useMetropolis.js';

export interface UseTranslationsOptions {
  readonly locale?: string;
  readonly namespace?: string;
  readonly autoProcess?: boolean;
  readonly processInterval?: number;
}

export interface UseTranslationsReturn {
  readonly t: (key: string, fallback?: string) => string;
  readonly hasTranslation: (key: string) => boolean;
  readonly queueTranslation: (key: string) => void;
  readonly processPending: () => Promise<void>;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

export const useTranslations = (options: UseTranslationsOptions = {}): UseTranslationsReturn => {
  const {
    locale = 'en',
    namespace,
    autoProcess = true,
    processInterval = 1000
  } = options;

  const {translationActions} = useMetropolis();
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessRef = useRef<number>(0);

  const t = useCallback((key: string, fallback?: string): string => {
    if (!translationActions) {
      return fallback || key;
    }

    const translation = translationActions.getTranslation(key, locale, namespace);

    if (translation) {
      return translation;
    }

    if (autoProcess && !translationActions.hasTranslation(key, locale, namespace)) {
      translationActions.queueTranslationKey(key, locale, namespace);
    }

    return fallback || key;
  }, [translationActions, locale, namespace, autoProcess]);

  const hasTranslation = useCallback((key: string): boolean => {
    if (!translationActions) {
      return false;
    }

    return translationActions.hasTranslation(key, locale, namespace);
  }, [translationActions, locale, namespace]);

  const queueTranslation = useCallback((key: string): void => {
    if (!translationActions) return;
    translationActions.queueTranslationKey(key, locale, namespace);
  }, [translationActions, locale, namespace]);

  const processPending = useCallback(async (): Promise<void> => {
    if (!translationActions) return;

    const now = Date.now();
    if (now - lastProcessRef.current < processInterval) {
      return;
    }

    lastProcessRef.current = now;
    await translationActions.processPendingTranslations(locale, namespace);
  }, [translationActions, locale, namespace, processInterval]);

  useEffect(() => {
    if (!autoProcess || !translationActions) return;

    const processQueued = () => {
      processPending();
    };

    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
    }

    processTimeoutRef.current = setTimeout(processQueued, processInterval);

    return () => {
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current);
      }
    };
  }, [autoProcess, translationActions, processPending, processInterval]);

  const isLoading = useMemo(() => {
    if (!translationActions) return false;
    const state = (translationActions as any).flux?.getState('translations');
    return state?.isQueueing || false;
  }, [translationActions]);

  const error = useMemo(() => {
    if (!translationActions) return null;
    const state = (translationActions as any).flux?.getState('translations');
    return state?.error || null;
  }, [translationActions]);

  return {
    t,
    hasTranslation,
    queueTranslation,
    processPending,
    isLoading,
    error
  };
};