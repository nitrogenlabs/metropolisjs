/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {scheduleDeadline} from '@nlabs/rip-hunter/deadline';
import Sockette from 'sockette';

import {routeNativeNotificationIngress} from '../../nativeNotifications/ingress.js';
import {MESSAGE_CONSTANTS} from '../../stores/messageStore.js';
import {NOTIFICATION_CONSTANTS} from '../../stores/notificationStore.js';
import {VIDEO_CONSTANTS} from '../../stores/videoStore.js';
import {WEBSOCKET_CONSTANTS} from '../../stores/websocketStore.js';
import {getConfigFromFlux} from '../../utils/configUtils.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {MessageTypingStatus} from '../../stores/messageStore.js';
import type {NotificationType} from '../../stores/notificationStore.js';

export interface WebSocketMessage {
  readonly action: string;
  readonly data?: Record<string, unknown>;
}

export interface WebsocketActionsOptions {
  authentication?: 'query' | 'message' | 'none';
  authenticateMessage?: (token: string) => Record<string, unknown>;
  /** Absolute URL-resolution/open budget; zero disables it. Defaults to 5000 milliseconds. */
  connectTimeoutMs?: number;
  /** False prevents reuse of an issued URL after transport failure. Defaults to true. */
  reconnect?: boolean;
  /** False disables the session registration frame. Defaults to true. */
  register?: boolean;
  /** Resolve a fresh complete URL for each explicit connection, for example a cookie-authenticated ticket. */
  resolveUrl?: () => Promise<string | undefined>;
  url?: string;
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
  /** Single-flight connection that resolves on open, or null on failure, close or deadline. */
  readonly wsConnect: () => Promise<Sockette | null>;
  readonly onReceive: (event: any) => void;
  readonly onClose: (event: any) => void;
  readonly onError: (event: any) => void;
  readonly onOpen: (event: any) => void;
  readonly wsInit: (token?: string, personaId?: string) => Sockette | null;
}

const WEBSOCKET_CLIENT_ID_KEY = 'metropolis.websocket.clientId';
const createWebsocketClientId = (): string => {
  if(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createWebsocketActions = (
  flux: FluxFramework, options: WebsocketActionsOptions = {}
): WebsocketActions => {
  const connectTimeoutMs = options.connectTimeoutMs ?? 5000;
  if(!Number.isFinite(connectTimeoutMs) || connectTimeoutMs < 0) {
    throw new Error('Invalid WebSocket connect timeout');
  }
  let ws: Sockette | null = null;
  let revision = 0;
  let resolvedUrl: string | undefined;
  let pendingConnection: Promise<Sockette | null> | undefined;
  let finishConnection: ((socket: Sockette | null) => void) | undefined;
  let activeClientId = '';
  let activeToken = '';
  let activePersonaId = '';
  let socketIsOpen = false;
  let socketIsConnecting = false;
  let closeRequested = false;
  const pendingMessages: WebSocketMessage[] = [];
  const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const createNotificationId = () => `notification-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const getTypingIdentity = (typing?: MessageTypingStatus | Record<string, unknown>) => String((typing as any)?.personaId || (typing as any)?.userId || '');
  const getClientId = (): string => {
    if(activeClientId) {
      return activeClientId;
    }

    if(typeof window === 'undefined') {
      activeClientId = createWebsocketClientId();
      return activeClientId;
    }

    try {
      const storedClientId = window.sessionStorage.getItem(WEBSOCKET_CLIENT_ID_KEY);

      if(storedClientId) {
        activeClientId = storedClientId;
        return activeClientId;
      }

      activeClientId = createWebsocketClientId();
      window.sessionStorage.setItem(WEBSOCKET_CLIENT_ID_KEY, activeClientId);
      return activeClientId;
    } catch{
      activeClientId = createWebsocketClientId();
      return activeClientId;
    }
  };
  const sendRegistration = () => {
    if(!ws || !socketIsOpen || options.register === false) {
      return;
    }

    if(options.authentication === 'message' && options.authenticateMessage) {
      ws.json(options.authenticateMessage(String(flux.getState('user.session.token') || activeToken)));
      return;
    }
    ws.json({
      action: 'websocketConnect',
      data: {
        clientId: getClientId(),
        personaId: String(activePersonaId || flux.getState('user.session.personaId') || ''),
        token: String(activeToken || flux.getState('user.session.token') || ''),
        userId: String(flux.getState('user.session.userId') || '')
      }
    });
  };

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

  const closeSocket = (announce: boolean) => {
    revision++;
    resolvedUrl = undefined;
    finishConnection?.(null);
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
      activeClientId = '';
      activePersonaId = '';
      activeToken = '';
      previousSocket.close(1000, 'metropolis_close');
      if(announce) {
        flux.dispatch({code: 1000, timestamp: performance.now(), type: WEBSOCKET_CONSTANTS.CLOSE});
      }
    }
  };
  const wsClose = () => closeSocket(true);

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
    } catch{
      return;
    }

    flux.dispatch({data, timestamp, type: WEBSOCKET_CONSTANTS.MESSAGE});

    if(String(data?.action || '') === 'message.created') {
      const message = data?.data?.message;
      const conversation = data?.data?.conversation || (message?.conversationId
        ? {
          added: Number(message?.added || Date.now()),
          content: String(message?.content || ''),
          conversationId: String(message?.conversationId || ''),
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
      if(data?.data?.envelope && routeNativeNotificationIngress(flux, data.data.envelope)) {
        return;
      }
      const notification = data?.data?.notification;

      if(notification && typeof notification === 'object') {
        flux.dispatch({
          notification: notification as NotificationType,
          type: NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS
        });
      }
    }

    if(String(data?.action || '') === 'video.processing.completed') {
      const video = data?.data?.video;

      if(video && typeof video === 'object') {
        flux.dispatch({type: VIDEO_CONSTANTS.UPDATE_ITEM_SUCCESS, video});
        flux.dispatch({type: VIDEO_CONSTANTS.PROCESSING_COMPLETE, video});
      }
    }
  };

  const onClose = (event: any) => {
    const {timeStamp: timestamp} = event;
    socketIsOpen = false;
    socketIsConnecting = Boolean(activeToken) && !closeRequested;
    closeRequested = false;
    if(event.code === 1008 || options.reconnect === false || pendingConnection) {
      // This native callback publishes its own CLOSE below; owner-initiated close publishes separately.
      closeSocket(false);
    }
    flux.dispatch({code: event.code, timestamp, type: WEBSOCKET_CONSTANTS.CLOSE});
  };

  const onError = (event: any) => {
    const {timeStamp: timestamp} = event;
    socketIsOpen = false;
    if(options.reconnect === false || pendingConnection) {
      wsClose();
    }
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.ERROR});
  };

  const onOpen = (event: any) => {
    const {timeStamp: timestamp} = event;
    socketIsOpen = true;
    socketIsConnecting = false;
    closeRequested = false;
    sendRegistration();
    flushPendingMessages();
    flux.dispatch({timestamp, type: WEBSOCKET_CONSTANTS.OPEN});
    finishConnection?.(ws);
  };

  const wsInit = (token?: string, personaId?: string): Sockette | null => {
    const config = getConfigFromFlux(flux);
    const websocketUrl = options.resolveUrl ? resolvedUrl : options.url || config.app?.urls?.websocket || '';
    const anonymous = options.authentication === 'none';
    const sessionClientId = anonymous ? '' : getClientId();
    const sessionToken = anonymous ? '' : String(token || flux.getState('user.session.token') || '');
    const sessionPersonaId = anonymous ? '' : String(personaId || flux.getState('user.session.personaId') || '');

    if((!anonymous && !sessionToken) || !websocketUrl) {
      return null;
    }

    if(ws && activeToken === sessionToken && activePersonaId === sessionPersonaId &&
      activeClientId === sessionClientId) {
      return ws;
    }

    if(ws && (activeToken !== sessionToken || activePersonaId !== sessionPersonaId ||
      activeClientId !== sessionClientId)) {
      wsClose();
    }

    activeClientId = sessionClientId;
    activeToken = sessionToken;
    activePersonaId = sessionPersonaId;
    socketIsOpen = false;
    socketIsConnecting = true;
    closeRequested = false;
    const websocketParams = new URLSearchParams({token: sessionToken});

    if(sessionPersonaId) {
      websocketParams.set('personaId', sessionPersonaId);
    }
    if(sessionClientId) {
      websocketParams.set('clientId', sessionClientId);
    }


    const connectionUrl = options.authentication === 'message' || anonymous
      ? websocketUrl
      : `${websocketUrl}${websocketUrl.includes('?') ? '&' : '?'}${websocketParams.toString()}`;
    const captured = revision;
    ws = new Sockette(connectionUrl, {
      // Sockette treats zero as Infinity. A negative bound permits no retry attempts.
      maxAttempts: options.reconnect === false ? -1 : 5,
      onclose: (event) => {
        if(captured === revision) {
          onClose(event);
        }
      },
      onerror: (event) => {
        if(captured === revision) {
          onError(event);
        }
      },
      onmessage: (event) => {
        if(captured === revision) {
          onReceive(event);
        }
      },
      onopen: (event) => {
        if(captured === revision) {
          onOpen(event);
        }
      },
      timeout: 60000
    });

    return ws;
  };

  const wsConnect = (): Promise<Sockette | null> => {
    if(pendingConnection) {
      return pendingConnection;
    }
    if(ws && socketIsOpen) {
      return Promise.resolve(ws);
    }
    const captured = revision;
    let resolveAttempt!: (socket: Sockette | null) => void;
    const attempt = new Promise<Sockette | null>((resolve) => {
      resolveAttempt = resolve;
    });
    pendingConnection = attempt;
    let cancelDeadline = () => {};
    finishConnection = (socket) => {
      if(pendingConnection !== attempt) {
        return;
      }
      cancelDeadline();
      finishConnection = undefined;
      pendingConnection = undefined;
      resolveAttempt(socket);
    };
    if(connectTimeoutMs > 0) {
      cancelDeadline = scheduleDeadline(connectTimeoutMs, () => {
        if(pendingConnection === attempt && captured === revision) {
          wsClose();
        }
      });
      // The deadline port can expire synchronously before returning its cancellation handle.
      if(pendingConnection !== attempt) {
        cancelDeadline();
        return attempt;
      }
    }
    void Promise.resolve().then(() => {
      if(pendingConnection === attempt && captured === revision) {
        return options.resolveUrl?.();
      }
      return undefined;
    }).then((url) => {
      if(pendingConnection !== attempt || captured !== revision) {
        return;
      }
      resolvedUrl = url;
      if(!wsInit()) {
        wsClose();
      }
    }).catch(() => {
      if(pendingConnection === attempt && captured === revision) {
        wsClose();
      }
    });
    return attempt;
  };

  return {
    onClose,
    onError,
    onOpen,
    onReceive,
    sendNotification,
    sendTyping,
    wsClose,
    wsConnect,
    wsInit,
    wsSend
  };
};
