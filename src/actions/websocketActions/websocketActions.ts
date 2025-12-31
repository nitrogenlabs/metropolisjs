/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import Sockette from 'sockette';

import { getConfigFromFlux } from '../../utils/configUtils.js';
import { WEBSOCKET_CONSTANTS } from '../../stores/websocketStore.js';

import type { FluxFramework } from '@nlabs/arkhamjs';

interface WebSocketMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export interface WebsocketActions {
  wsSend: (message: WebSocketMessage) => void;
  onReceive: (event: any) => void;
  onClose: (event: any) => void;
  onError: (event: any) => void;
  onOpen: (event: any) => void;
  wsInit: (token?: string) => Sockette | null;
}


export const createWebsocketActions = (flux: FluxFramework): WebsocketActions => {
  let ws: Sockette;

  const wsSend = (message: WebSocketMessage) => {
    console.log('websockets::onOpen::message', {ws, message});
    if(ws) {
      ws.json(message);
    }
  };

  const onReceive = (event: any) => {
    const {data: eventData, timeStamp: timestamp} = event;
    const data = JSON.parse(eventData);
    console.log('websockets::onRecieve::data', data);
    flux.dispatch({data, timestamp, type: WEBSOCKET_CONSTANTS.MESSAGE});
  };

  const onClose = (event: any) => {
    console.log('websockets::onOpen::message', event);
    const {timeStamp: timestamp} = event;
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.CLOSE});
  };

  const onError = (event: any) => {
    const {timeStamp: timestamp} = event;
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.ERROR});
  };

  const onOpen = (event: any) => {
    console.log('websockets::onOpen::event', event);
    const {timeStamp: timestamp} = event;
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.OPEN});
  };

  const wsInit = (token?: string): Sockette | null => {
    if(ws) {
      return ws;
    }

    const config = getConfigFromFlux(flux);
    const websocketUrl: string = config.app?.urls?.websocket || '';
    const sessionToken: string = token || flux.getState('user.session.token');

    if(sessionToken) {
      const url: string = `${websocketUrl}?token=${sessionToken}`;

      ws = new Sockette(url, {
        maxAttempts: 5,
        onclose: onClose,
        onerror: onError,
        onmessage: onReceive,
        onopen: onOpen,
        timeout: 60000
      });

      return ws;
    }

    return null;
  };

  return {
    wsSend,
    onReceive,
    onClose,
    onError,
    onOpen,
    wsInit
  };
};

