/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import Sockette from 'sockette';

import {MESSAGE_CONSTANTS} from '../../stores/messageStore.js';
import {NOTIFICATION_CONSTANTS} from '../../stores/notificationStore.js';
import {WEBSOCKET_CONSTANTS} from '../../stores/websocketStore.js';
import {getConfigFromFlux} from '../../utils/configUtils.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {MessageTypingStatus} from '../../stores/messageStore.js';
import type {NotificationType} from '../../stores/notificationStore.js';

export interface WebSocketMessage {
  readonly action: string;
  readonly data?: Record<string, unknown>;
}

export interface WebsocketActions {
  readonly sendNotification: (notification: NotificationType) => NotificationType | null;
  readonly sendTyping: (
    conversationId: string,
    isTyping: boolean,
    options?: {
      readonly name?: string;
      readonly personaId?: string;
      readonly userId?: string;
      readonly username?: string;
      readonly users?: Array<Record<string, unknown>>;
    }
  ) => void;
  readonly wsSend: (message: WebSocketMessage) => void;
  readonly wsClose: () => void;
  readonly onReceive: (event: any) => void;
  readonly onClose: (event: any) => void;
  readonly onError: (event: any) => void;
  readonly onOpen: (event: any) => void;
  readonly wsInit: (token?: string, personaId?: string) => Sockette | null;
}


export const createWebsocketActions = (flux: FluxFramework): WebsocketActions => {
  let ws: Sockette | null = null;
  let activeToken = '';
  let activePersonaId = '';
  let socketIsOpen = false;
  let socketIsConnecting = false;
  let closeRequested = false;
  const pendingMessages: WebSocketMessage[] = [];
  const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const createNotificationId = () => `notification-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const getTypingIdentity = (typing?: MessageTypingStatus | Record<string, unknown>) => String((typing as any)?.personaId || (typing as any)?.userId || '');

  const flushPendingMessages = () => {
    if(!ws || !pendingMessages.length) {
      return;
    }

    const queuedMessages = pendingMessages.splice(0, pendingMessages.length);

    queuedMessages.forEach((message) => {
      ws?.json(message);
    });
  };

  const clearTypingTimeout = (conversationId: string, typingId: string) => {
    const typingKey = `${conversationId}:${typingId}`;
    const timeoutId = typingTimeouts.get(typingKey);

    if(timeoutId) {
      clearTimeout(timeoutId);
      typingTimeouts.delete(typingKey);
    }
  };

  const scheduleTypingClear = (typing: MessageTypingStatus) => {
    const conversationId = String(typing?.conversationId || '');
    const typingId = getTypingIdentity(typing);

    if(!conversationId || !typingId) {
      return;
    }

    clearTypingTimeout(conversationId, typingId);

    const timeoutId = setTimeout(() => {
      flux.dispatch({
        type: MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE,
        typing: {
          conversationId,
          isTyping: false,
          personaId: String(typing?.personaId || ''),
          userId: String(typing?.userId || '')
        }
      });
      typingTimeouts.delete(`${conversationId}:${typingId}`);
    }, 60000);

    typingTimeouts.set(`${conversationId}:${typingId}`, timeoutId);
  };

  const wsSend = (message: WebSocketMessage) => {
    console.log('websockets::onOpen::message', {ws, message});
    if(ws && socketIsOpen) {
      ws.json(message);
      return;
    }

    pendingMessages.push(message);

    const sessionToken = String(activeToken || flux.getState('user.session.token') || '');

    if(sessionToken && !ws && !socketIsConnecting) {
      wsInit(sessionToken);
    }
  };

  const wsClose = () => {
    for(const timeoutId of typingTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    typingTimeouts.clear();
    pendingMessages.length = 0;
    socketIsOpen = false;
    socketIsConnecting = false;

    if(ws) {
      const previousSocket = ws;

      closeRequested = true;
      ws = null;
      activePersonaId = '';
      activeToken = '';
      previousSocket.close(1000, 'metropolis_close');
    }
  };

  const sendTyping = (
    conversationId: string,
    isTyping: boolean,
    options: {
      readonly name?: string;
      readonly personaId?: string;
      readonly userId?: string;
      readonly username?: string;
      readonly users?: Array<Record<string, unknown>>;
    } = {}
  ) => {
    if(!conversationId) {
      return;
    }

    wsSend({
      action: 'messageTyping',
      data: {
        conversationId,
        isTyping,
        name: String(options?.name || ''),
        personaId: String(options?.personaId || ''),
        userId: String(options?.userId || ''),
        username: String(options?.username || ''),
        users: Array.isArray(options?.users) ? options.users : []
      }
    });
  };

  const sendNotification = (notification: NotificationType): NotificationType | null => {
    if(!notification || typeof notification !== 'object') {
      return null;
    }

    const nextNotification: NotificationType = {
      ...notification,
      added: Number(notification?.added || Date.now()),
      modified: Number(notification?.modified || Date.now()),
      notificationId: String(notification?.notificationId || createNotificationId())
    };

    flux.dispatch({notification: nextNotification, type: NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS});
    wsSend({
      action: 'notification.created',
      data: {
        notification: nextNotification
      }
    });

    return nextNotification;
  };

  const onReceive = (event: any) => {
    const {data: eventData, timeStamp: timestamp} = event;
    const rawData = typeof eventData === 'string' ? eventData.trim() : '';

    if(!rawData) {
      return;
    }

    let data;

    try {
      data = JSON.parse(rawData);
    } catch(parseError) {
      console.warn('websockets::onReceive::invalidJson', rawData, parseError);
      return;
    }

    console.log('websockets::onRecieve::data', data);
    flux.dispatch({data, timestamp, type: WEBSOCKET_CONSTANTS.MESSAGE});

    if(String(data?.action || '') === 'message.created') {
      const message = data?.data?.message;
      const conversation = data?.data?.conversation || (message?.conversationId
        ? {
          added: Number(message?.added || Date.now()),
          content: String(message?.content || ''),
          conversationId: String(message?.conversationId || ''),
          lastMessage: {
            content: String(message?.content || '')
          },
          modified: Number(message?.modified || message?.added || Date.now())
        }
        : undefined);

      if(message?.conversationId) {
        if(conversation) {
          flux.dispatch({conversation, type: MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS});
        }

        flux.dispatch({message, type: MESSAGE_CONSTANTS.ADD_ITEM_SUCCESS});

        const typingPersonaId = String(message?.user?.personaId || '');
        const typingUserId = String(message?.userId || '');
        const typingId = typingPersonaId || typingUserId;

        if(typingId) {
          clearTypingTimeout(String(message.conversationId || ''), typingId);
          flux.dispatch({
            type: MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE,
            typing: {
              conversationId: String(message.conversationId || ''),
              isTyping: false,
              personaId: typingPersonaId,
              userId: typingUserId
            }
          });
        }
      }
    }

    if(String(data?.action || '') === 'message.typing') {
      const typing = data?.data?.typing;

      if(typing?.conversationId && getTypingIdentity(typing)) {
        flux.dispatch({type: MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE, typing});

        if(typing?.isTyping) {
          scheduleTypingClear(typing);
        } else {
          clearTypingTimeout(String(typing.conversationId || ''), getTypingIdentity(typing));
        }
      }
    }

    if(String(data?.action || '') === 'notification.created') {
      const notification = data?.data?.notification;

      if(notification && typeof notification === 'object') {
        flux.dispatch({
          notification: notification as NotificationType,
          type: NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS
        });
      }
    }
  };

  const onClose = (event: any) => {
    console.log('websockets::onOpen::message', event);
    const {timeStamp: timestamp} = event;
    socketIsOpen = false;
    socketIsConnecting = Boolean(activeToken) && !closeRequested;
    closeRequested = false;
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.CLOSE});
  };

  const onError = (event: any) => {
    const {timeStamp: timestamp} = event;
    socketIsOpen = false;
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.ERROR});
  };

  const onOpen = (event: any) => {
    console.log('websockets::onOpen::event', event);
    const {timeStamp: timestamp} = event;
    socketIsOpen = true;
    socketIsConnecting = false;
    closeRequested = false;
    flushPendingMessages();
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.OPEN});
  };

  const wsInit = (token?: string, personaId?: string): Sockette | null => {
    const config = getConfigFromFlux(flux);
    const websocketUrl = config.app?.urls?.websocket || '';
    const sessionToken = String(token || flux.getState('user.session.token') || '');
    const sessionPersonaId = String(personaId || flux.getState('user.session.personaId') || '');

    if(!sessionToken || !websocketUrl) {
      console.log('websockets::wsInit::skipped', {
        hasPersonaId: Boolean(sessionPersonaId),
        hasToken: Boolean(sessionToken),
        websocketUrl
      });
      return null;
    }

    if(ws && activeToken === sessionToken && activePersonaId === sessionPersonaId) {
      console.log('websockets::wsInit::reuse', {
        activePersonaId,
        activeToken,
        sessionPersonaId
      });
      return ws;
    }

    if(ws && (activeToken !== sessionToken || activePersonaId !== sessionPersonaId)) {
      console.log('websockets::wsInit::reconnect', {
        activePersonaId,
        activeToken,
        sessionPersonaId
      });
      wsClose();
    }

    activeToken = sessionToken;
    activePersonaId = sessionPersonaId;
    socketIsOpen = false;
    socketIsConnecting = true;
    closeRequested = false;
    const websocketParams = new URLSearchParams({token: sessionToken});

    if(sessionPersonaId) {
      websocketParams.set('personaId', sessionPersonaId);
    }

    console.log('websockets::wsInit::connect', {
      sessionPersonaId,
      sessionToken,
      url: `${websocketUrl}?${websocketParams.toString()}`
    });

    ws = new Sockette(`${websocketUrl}?${websocketParams.toString()}`, {
      maxAttempts: 5,
      onclose: onClose,
      onerror: onError,
      onmessage: onReceive,
      onopen: onOpen,
      timeout: 60000
    });

    return ws;
  };

  return {
    onClose,
    onError,
    onOpen,
    onReceive,
    sendNotification,
    sendTyping,
    wsClose,
    wsInit,
    wsSend
  };
};
