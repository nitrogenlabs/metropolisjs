import {useCallback, useEffect, useRef} from 'react';

import {useWebsocketActions} from './useMetropolis.js';

type TypingUser = {
  readonly imageUrl?: string;
  readonly name?: string;
  readonly personaId?: string;
  readonly thumbUrl?: string;
  readonly userId?: string;
  readonly username?: string;
};

export type ConversationTypingOptions = {
  readonly name?: string;
  readonly personaId?: string;
  readonly userId?: string;
  readonly username?: string;
  readonly users?: TypingUser[];
};

export type UseConversationTypingOptions = {
  readonly debounceMs?: number;
  readonly idleMs?: number;
};

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_IDLE_MS = 60000;

export const useConversationTyping = ({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  idleMs = DEFAULT_IDLE_MS
}: UseConversationTypingOptions = {}) => {
  const websocketActions = useWebsocketActions();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingConversationIdRef = useRef('');
  const typingOptionsRef = useRef<ConversationTypingOptions>({});
  const typingStateRef = useRef(false);

  const clearTypingTimer = useCallback(() => {
    if(typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const clearTypingDebounce = useCallback(() => {
    if(typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
  }, []);

  const updateTypingState = useCallback((conversationId: string, isTyping: boolean, options: ConversationTypingOptions = {}) => {
    const previousConversationId = typingConversationIdRef.current;
    const typingOptions = Object.keys(options).length ? options : typingOptionsRef.current;
    typingOptionsRef.current = typingOptions;

    if(previousConversationId && previousConversationId !== conversationId && typingStateRef.current) {
      websocketActions.sendTyping(previousConversationId, false, typingOptions);
      typingStateRef.current = false;
    }

    if(!conversationId) {
      typingConversationIdRef.current = '';
      typingStateRef.current = false;
      return;
    }

    if(previousConversationId === conversationId && typingStateRef.current === isTyping) {
      return;
    }

    websocketActions.sendTyping(conversationId, isTyping, typingOptions);
    typingConversationIdRef.current = conversationId;
    typingStateRef.current = isTyping;
  }, [websocketActions]);

  const syncDraft = useCallback((conversationId: string, draft: string, options: ConversationTypingOptions = {}) => {
    typingOptionsRef.current = options;
    clearTypingDebounce();
    clearTypingTimer();

    if(!conversationId) {
      return;
    }

    if(draft.trim()) {
      if(!typingStateRef.current || typingConversationIdRef.current !== conversationId) {
        typingDebounceRef.current = setTimeout(() => {
          updateTypingState(conversationId, true, options);
          typingDebounceRef.current = null;
        }, debounceMs);
      }

      typingTimeoutRef.current = setTimeout(() => {
        updateTypingState(conversationId, false, options);
      }, idleMs);
      return;
    }

    updateTypingState(conversationId, false, options);
  }, [clearTypingDebounce, clearTypingTimer, debounceMs, idleMs, updateTypingState]);

  const setConversation = useCallback((conversationId: string, options: ConversationTypingOptions = {}) => {
    clearTypingDebounce();
    clearTypingTimer();
    typingOptionsRef.current = options;

    if(typingConversationIdRef.current && typingConversationIdRef.current !== conversationId && typingStateRef.current) {
      websocketActions.sendTyping(typingConversationIdRef.current, false, typingOptionsRef.current);
      typingStateRef.current = false;
    }

    typingConversationIdRef.current = conversationId;

    if(!conversationId) {
      typingStateRef.current = false;
    }
  }, [clearTypingDebounce, clearTypingTimer, websocketActions]);

  const stopTyping = useCallback((conversationId = typingConversationIdRef.current, options: ConversationTypingOptions = {}) => {
    clearTypingDebounce();
    clearTypingTimer();
    updateTypingState(conversationId, false, options);
  }, [clearTypingDebounce, clearTypingTimer, updateTypingState]);

  useEffect(() => {
    return () => {
      clearTypingDebounce();
      clearTypingTimer();
      updateTypingState(typingConversationIdRef.current, false, typingOptionsRef.current);
    };
  }, [clearTypingDebounce, clearTypingTimer, updateTypingState]);

  return {
    setConversation,
    stopTyping,
    syncDraft
  };
};
