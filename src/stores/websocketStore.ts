/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {withCacheIngestion} from '../utils/cacheIngestion.js';

export const WEBSOCKET_CONSTANTS = {
  CLOSE: 'WEBSOCKET_CLOSE',
  ERROR: 'WEBSOCKET_ERROR',
  MESSAGE: 'WEBSOCKET_MESSAGE',
  OPEN: 'WEBSOCKET_OPEN'
} as const;

interface WebSocketState {
  isOpen: boolean;
  data?: unknown;
  timestamp?: number;
}

export const defaultValues: WebSocketState = {
  isOpen: false
};

export const websocketStore = (type: string, data: Partial<WebSocketState>, state = defaultValues): WebSocketState => {
  switch(type) {
    case WEBSOCKET_CONSTANTS.CLOSE: {
      return {...state, isOpen: false};
    }
    case WEBSOCKET_CONSTANTS.OPEN: {
      return {...state, isOpen: true};
    }
    case WEBSOCKET_CONSTANTS.MESSAGE: {
      return {...state, ...data};
    }
    default: {
      return {...state, ...data};
    }
  }
};

export const websocket = {
  action: withCacheIngestion('websocket', websocketStore, defaultValues),
  initialState: defaultValues,
  name: 'websocket'
};