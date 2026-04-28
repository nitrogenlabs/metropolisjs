/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {useFlux, useFluxState} from '@nlabs/arkhamjs-utils-react';
import i18n from 'i18next';
import {DateTime} from 'luxon';
import {useEffect, useMemo, useRef} from 'react';
import {I18nextProvider} from 'react-i18next';

import {createWebsocketActions} from './actions/websocketActions/websocketActions.js';
import {syncPersonaTagsToSession, syncPersonaToSession} from './actions/personaActions/personaActions.js';
import {resolveEnvironmentConfig} from './config/index.js';
import {
  app,
  events,
  images,
  locations,
  messages,
  notifications,
  NOTIFICATION_CONSTANTS,
  permissions,
  PERSONA_CONSTANTS,
  posts,
  subscriptions,
  TAG_CONSTANTS,
  tags,
  USER_CONSTANTS,
  users,
  video,
  websocket
} from './stores/index.js';
import {refreshSession} from './utils/api.js';
import {getConfigFromFlux} from './utils/configUtils.js';
import {initI18n} from './utils/i18n.js';
import {MetropolisContext} from './utils/MetropolisProvider.js';
import {getRefreshWindowMinutes, hydrateSessionFromStorage, parseJwtExpiryMs} from './utils/session.js';
import {createAction} from './utils/actionFactory.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {MetropolisConfiguration, MetropolisEnvironmentConfiguration} from './config/index.js';
import type {MetropolisAdapters} from './utils/MetropolisProvider.js';

export {MetropolisContext, MetropolisProvider} from './utils/MetropolisProvider.js';

export type {MetropolisConfiguration} from './config/index.js';
export type {MetropolisAdapters} from './utils/MetropolisProvider.js';

export const onInit = async (flux: FluxFramework) => {
  if(!flux.getState('app.metropolisInitialized')) {
    flux.addStores([
      app,
      events,
      images,
      locations,
      messages,
      notifications,
      permissions,
      posts,
      subscriptions,
      tags,
      users,
      video,
      websocket
    ]);
    flux.on(USER_CONSTANTS.SIGN_OUT_SUCCESS, () => {
      flux.dispatch({type: NOTIFICATION_CONSTANTS.CLEAR_ITEMS});
    });
    flux.on(PERSONA_CONSTANTS.ADD_ITEM_SUCCESS, async ({persona = {}}: {persona?: Record<string, unknown>}) => {
      syncPersonaToSession(flux, persona);

      if(persona?.personaId && !Array.isArray(persona?.tags)) {
        await syncPersonaTagsToSession(flux, String(persona.personaId));
      }
    });

    flux.on(PERSONA_CONSTANTS.UPDATE_ITEM_SUCCESS, async ({persona = {}}: {persona?: Record<string, unknown>}) => {
      syncPersonaToSession(flux, persona);

      if(persona?.personaId && !Array.isArray(persona?.tags)) {
        await syncPersonaTagsToSession(flux, String(persona.personaId));
      }
    });

    flux.on(TAG_CONSTANTS.ADD_PERSONA_SUCCESS, ({tag}: {tag?: {name?: string; tagId?: string}}) => {
      const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown> & {
        tags?: Array<{name?: string; tagId?: string}>;
      };
      const currentTags = Array.isArray(currentSession.tags) ? currentSession.tags : [];
      const nextTagId = String(tag?.tagId || '').trim();

      if(!nextTagId) {
        return;
      }

      const mergedTags = [...currentTags.filter((item) => String(item?.tagId || '').trim() !== nextTagId), tag as {name?: string; tagId?: string}]
        .sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')));
      const nextSession = {...currentSession, tags: mergedTags};

      void flux.setState('user.session', nextSession);
      flux.dispatch({type: USER_CONSTANTS.UPDATE_SESSION_SUCCESS, user: {tags: mergedTags}});
    });

    flux.on(TAG_CONSTANTS.REMOVE_PERSONA_SUCCESS, ({tag}: {tag?: {tagId?: string}}) => {
      const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown> & {
        tags?: Array<{name?: string; tagId?: string}>;
      };
      const currentTags = Array.isArray(currentSession.tags) ? currentSession.tags : [];
      const nextTagId = String(tag?.tagId || '').trim();

      if(!nextTagId) {
        return;
      }

      const nextTags = currentTags.filter((item) => String(item?.tagId || '').trim() !== nextTagId);
      const nextSession = {...currentSession, tags: nextTags};

      void flux.setState('user.session', nextSession);
      flux.dispatch({type: USER_CONSTANTS.UPDATE_SESSION_SUCCESS, user: {tags: nextTags}});
    });
    await Promise.resolve(flux.setState('app.metropolisInitialized', true));
  }

  const token = String(flux.getState('user.session.token') || '');

  if(token) {
    const session = (flux.getState('user.session', {}) || {}) as {expires?: number; issued?: number; token?: string};
    const config = getConfigFromFlux(flux);
    const tokenExpiresAt = parseJwtExpiryMs(token);
    const sessionLifetimeMinutes = Math.round((Number(session.expires || 0) - Number(session.issued || 0)) / (1000 * 60));
    const refreshWindowMinutes = getRefreshWindowMinutes(
      sessionLifetimeMinutes || 15,
      config.app?.session || {}
    );
    const refreshExpiresMinutes = Math.max(1, Number(config.app?.session?.maxMinutes || sessionLifetimeMinutes || 15));
    const expiresAt = Number(session.expires || 0);

    if(tokenExpiresAt > 0 && Date.now() >= tokenExpiresAt) {
      await refreshSession(flux, token, refreshExpiresMinutes);
    } else if(!expiresAt) {
      await refreshSession(flux, token, refreshExpiresMinutes);
    } else {
      const minutesUntilExpiry = Math.round(DateTime.fromMillis(expiresAt).diff(DateTime.local(), 'minutes').toObject().minutes || 0);

      if(minutesUntilExpiry <= 0 || minutesUntilExpiry <= refreshWindowMinutes) {
        await refreshSession(flux, token as string, refreshExpiresMinutes);
      }
    }
  }
};

export * from './stores/index.js';

export {
  appMutation,
  appQuery,
  publicMutation,
  publicQuery,
  refreshSession,
  uploadImage,
  type ApiResultsType,
  type ReaktorDbCollection
} from './utils/api.js';

export {resolveEnvironmentConfig} from './config/index.js';
export {getConfigFromFlux} from './utils/configUtils.js';

export interface MetropolisProps {
  readonly adapters?: MetropolisAdapters;
  readonly children?: React.ReactElement | React.ReactElement[];
  readonly config?: MetropolisConfiguration;
  readonly translations?: SimpleTranslations | ComplexTranslations;
}

export type SimpleTranslations = Record<string, string>;

export interface ComplexTranslation {
  readonly value: string;
  readonly locale: string;
  readonly namespace?: string;
}

export type ComplexTranslations = Record<string, ComplexTranslation>;

export const Metropolis = ({adapters, children, config = {}, translations = {}}: MetropolisProps) => {
  const flux = useFlux();
  const resolvedConfig = useMemo<MetropolisEnvironmentConfiguration>(() => resolveEnvironmentConfig(config), [config]);
  const mergedAdapters = useMemo(() => ({...resolvedConfig.adapters, ...adapters}), [resolvedConfig.adapters, adapters]);
  const sessionPersonaId = String(useFluxState('user.session.personaId', '') || '');
  const sessionToken = String(useFluxState('user.session.token', '') || '');
  const sessionHydrated = Boolean(useFluxState('app.sessionHydrated', false));
  const session = useFluxState('user.session', {}) as Record<string, unknown>;
  const notificationList = useFluxState('notification.list', []) as Array<Record<string, unknown>>;
  const conversationMap = useFluxState('message.conversations', {}) as Record<string, Array<Record<string, unknown>>>;
  const messages = useMemo(() => Object.values(conversationMap).flat(), [conversationMap]);

  const websocketsRef = useRef<ReturnType<typeof createWebsocketActions> | null>(null);
  if(!websocketsRef.current) {
    websocketsRef.current = createAction('websocket', flux) as ReturnType<typeof createWebsocketActions>;
  }
  const websockets = websocketsRef.current;

  useEffect(() => {
    initI18n(translations);
  }, [translations]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      await Promise.resolve(flux.setState('app.config', resolvedConfig));
      await Promise.resolve(flux.setState('app.sessionHydrated', false));
      await hydrateSessionFromStorage(flux);

      if(!isActive) {
        return;
      }

      await onInit(flux);

      if(!isActive) {
        return;
      }

      await Promise.resolve(flux.setState('app.sessionHydrated', true));
    })();

    return () => {
      isActive = false;
    };
  }, [flux, resolvedConfig]);

  useEffect(() => {
    if(!sessionHydrated) {
      websockets.wsClose();
      return;
    }

    if(sessionToken) {
      websockets.wsInit(sessionToken, sessionPersonaId);
    } else {
      websockets.wsClose();
    }
  }, [sessionHydrated, sessionPersonaId, sessionToken, websockets]);

  useEffect(() => {
    return () => {
      websockets.wsClose();
    };
  }, [websockets]);

  const isAuth = useMemo(() => resolvedConfig.isAuth || (() => {
    const sessionState = flux.getState('user.session', {});
    return !!sessionState.userActive;
  }), [resolvedConfig.isAuth, flux]);

  return (
    <MetropolisContext.Provider
      value={{
        adapters: mergedAdapters,
        config: resolvedConfig,
        flux,
        isAuth,
        messages,
        notifications: notificationList,
        session,
        updateMessage: () => { },
        updateNotification: websockets.sendNotification
      }}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </MetropolisContext.Provider>
  );
};

export default Metropolis;

export {useTranslation} from 'react-i18next';
export * from './adapters/index.js';
export * from './constants/MetropolisConstants.js';
export * from './graphql/message.js';
export * from './graphql/notification.js';
export * from './stores/index.js';
export {
  createAction,
  createActions,
  createAllActions
} from './utils/actionFactory.js';
export * from './utils/app.js';
export {createBaseActions} from './utils/baseActionFactory.js';
export * from './utils/dateUtils.js';
export * from './utils/file.js';
export * from './utils/location.js';
export {
  useContentActions,
  useEventActions,
  useGroupActions,
  useImageActions,
  useLocationActions,
  useMessageActions, useMetropolis,
  useMetropolisConfig,
  useMetropolisFlux, usePostActions,
  usePersonaActions,
  useReactionActions,
  useTagActions,
  useTranslationActions,
  useUserActions,
  useWebsocketActions
} from './utils/useMetropolis.js';
export {useConversationTyping} from './utils/useConversationTyping.js';
export type {
  ConversationTypingOptions,
  UseConversationTypingOptions
} from './utils/useConversationTyping.js';
export {
  createValidatorFactory,
  createValidatorManager
} from './utils/validatorFactory.js';

export type {
  ActionOptions,
  ActionReturnType,
  ActionType,
  ActionTypes
} from './utils/actionFactory.js';
export type {BaseActionOptions} from './utils/baseActionFactory.js';
export type {BaseAdapterOptions} from './utils/validatorFactory.js';

export * from './actions/appActions/appActions.js';
export * from './actions/connectionActions/connectionActions.js';
export * from './actions/conversationActions/conversationActions.js';
export * from './actions/videoActions/videoActions.js';
export * from './constants/Collections.js';
export * from './types/index.js';
