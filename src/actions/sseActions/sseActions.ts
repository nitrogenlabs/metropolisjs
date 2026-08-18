/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import type {FluxFramework} from '@nlabs/arkhamjs';

export interface SSEEvent {
  readonly data: string;
  readonly event?: string;
  readonly id?: string;
  readonly retry?: number;
}

export interface SSEConnectionOptions {
  readonly headers?: Record<string, string>;
  readonly maxRetries?: number;
  readonly retryInterval?: number;
  readonly timeout?: number;
  readonly url: string;
  readonly withCredentials?: boolean;
}

export interface SSEActionsOptions {
  readonly onClose?: (event: CloseEvent) => void;
  readonly onError?: (error: Event) => void;
  readonly onMessage?: (event: SSEEvent) => void;
  readonly onOpen?: (event: Event) => void;
  readonly sseOptions?: SSEConnectionOptions;
}

export interface SSEActions {
  readonly connect: (options?: SSEConnectionOptions) => Promise<void>;
  readonly disconnect: () => void;
  readonly reconnect: () => Promise<void>;
  readonly isConnected: () => boolean;
  readonly sendMessage: (data: string, eventType?: string) => void;
  readonly addEventListener: (eventType: string, handler: (event: SSEEvent) => void) => void;
  readonly removeEventListener: (eventType: string, handler: (event: SSEEvent) => void) => void;
  readonly updateSSEOptions: (options: SSEActionsOptions) => void;
}

export const createSSEActions = (
  flux: FluxFramework,
  options?: SSEActionsOptions
): SSEActions => {
  let eventSource: EventSource | null = null;
  let retryCount = 0;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let eventHandlers = new Map<string, Set<(event: SSEEvent) => void>>();

  const defaultOptions: SSEConnectionOptions = {
    url: '',
    withCredentials: false,
    retryInterval: 5000,
    maxRetries: 5,
    timeout: 30000,
    ...options?.sseOptions
  };

  const handleMessage = (event: MessageEvent) => {
    const sseEvent: SSEEvent = {
      id: event.lastEventId,
      event: event.type,
      data: event.data
    };

    // Call global message handler
    options?.onMessage?.(sseEvent);

    // Call specific event handlers
    const handlers = eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(sseEvent));
    }

    // Dispatch to flux store
    flux.dispatch({
      type: 'SSE_MESSAGE_RECEIVED',
      event: sseEvent
    });
  };

  const handleError = (error: Event) => {
    options?.onError?.(error);

    flux.dispatch({
      type: 'SSE_CONNECTION_ERROR',
      error
    });

    // Auto-reconnect if not manually disconnected
    if (eventSource && retryCount < (defaultOptions.maxRetries || 5)) {
      retryCount++;
      setTimeout(() => reconnect(), defaultOptions.retryInterval);
    }
  };

  const handleOpen = (event: Event) => {
    retryCount = 0;
    options?.onOpen?.(event);

    flux.dispatch({
      type: 'SSE_CONNECTION_OPEN',
      event
    });
  };

  // const handleClose = (event: CloseEvent) => {
  //   options?.onClose?.(event);

  //   flux.dispatch({
  //     type: 'SSE_CONNECTION_CLOSED',
  //     event
  //   });
  // };

  const connect = async (connectionOptions?: SSEConnectionOptions): Promise<void> => {
    const opts = { ...defaultOptions, ...connectionOptions };

    if (!opts.url) {
      throw new Error('SSE URL is required');
    }

    disconnect();

    try {
      eventSource = new EventSource(opts.url, {
        withCredentials: opts.withCredentials
      });

      eventSource.onmessage = handleMessage;
      eventSource.onerror = handleError;
      eventSource.onopen = handleOpen;

      // Set timeout
      if (opts.timeout) {
        setTimeout(() => {
          if (eventSource && eventSource.readyState === EventSource.CONNECTING) {
            eventSource.close();
            handleError(new Event('timeout'));
          }
        }, opts.timeout);
      }

    } catch (error) {
      handleError(error as Event);
      throw error;
    }
  };

  const disconnect = (): void => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  };

  const reconnect = async (): Promise<void> => {
    disconnect();
    await connect();
  };

  const isConnected = (): boolean => {
    return eventSource?.readyState === EventSource.OPEN;
  };

  const sendMessage = (data: string, eventType?: string): void => {
    if (!isConnected()) {
      throw new Error('SSE connection not established');
    }

    // Note: SSE is one-way, but we can dispatch to flux for logging
    flux.dispatch({
      type: 'SSE_MESSAGE_SENT',
      data,
      eventType
    });
  };

  const addEventListener = (eventType: string, handler: (event: SSEEvent) => void): void => {
    if (!eventHandlers.has(eventType)) {
      eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)!.add(handler);
  };

  const removeEventListener = (eventType: string, handler: (event: SSEEvent) => void): void => {
    const handlers = eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  };

  const updateSSEOptions = (newOptions: SSEActionsOptions): void => {
    Object.assign(defaultOptions, newOptions.sseOptions);
  };

  return {
    connect,
    disconnect,
    reconnect,
    isConnected,
    sendMessage,
    addEventListener,
    removeEventListener,
    updateSSEOptions
  };
};
