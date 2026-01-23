/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {useFlux} from '@nlabs/arkhamjs-utils-react';
import i18n from 'i18next';
import {useEffect, useMemo} from 'react';
import {I18nextProvider} from 'react-i18next';

import {createWebsocketActions} from './actions/websocketActions/websocketActions.js';
import {resolveEnvironmentConfig} from './config/index.js';
import {
  app,
  events,
  images,
  locations,
  messages,
  permissions,
  posts,
  tags,
  users,
  websocket
} from './stores/index.js';
import {refreshSession} from './utils/api.js';
import {initI18n} from './utils/i18n.js';
import {MetropolisContext} from './utils/MetropolisProvider.js';

import type {FluxFramework} from '@nlabs/arkhamjs';

import type {MetropolisConfiguration, MetropolisEnvironmentConfiguration} from './config/index.js';
import type {MetropolisAdapters} from './utils/MetropolisProvider.js';

export {MetropolisContext, MetropolisProvider} from './utils/MetropolisProvider.js';

export type {MetropolisConfiguration} from './config/index.js';
export type {MetropolisAdapters} from './utils/MetropolisProvider.js';

export const onInit = (flux: FluxFramework) => {
  try {
    flux.addStores([
      app,
      events,
      images,
      locations,
      messages,
      permissions,
      posts,
      tags,
      users,
      websocket
    ]);
    const token = flux.getState('user.session.token');
    console.log({token});

    if(token) {
      refreshSession(flux, token as string);
    }
  } catch(error) {
    throw error;
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

// Translation type definitions
export type SimpleTranslations = Record<string, string>;

export interface ComplexTranslation {
  readonly value: string;
  readonly locale: string;
  readonly namespace?: string;
}

export type ComplexTranslations = Record<string, ComplexTranslation>;

export const Metropolis = ({adapters, children, config = {}, translations = {}}: MetropolisProps) => {
  const flux = useFlux();

  // Resolve environment-specific configuration
  const resolvedConfig = useMemo<MetropolisEnvironmentConfiguration>(() => {
    return resolveEnvironmentConfig(config);
  }, [config]);

  // Merge adapters from config with prop adapters (prop takes precedence)
  const mergedAdapters = useMemo(() => {
    return {...resolvedConfig.adapters, ...adapters};
  }, [resolvedConfig.adapters, adapters]);

  const websockets = createWebsocketActions(flux);
  // const [messages, setMessages] = useState<MessageType[]>([]);
  // const [notifications, setNotifications] = useState<any[]>([]);
  // const [session, setSession] = useState<SessionType>({});

  const messages = [];
  const notifications = [];
  const session = {};

  useEffect(() => {
    initI18n(translations);
  }, [translations]);

  // Save config to app
  // const {isAuth: configAuth} = config;

  // const onUpdateMessages = useCallback(() => {
  //   const cachedSession = Flux.getState('user.session', {});
  //   setMessages(cachedSession);
  // }, []);
  // const onUpdateNotifications = useCallback(() => {
  //   const cachedSession = Flux.getState('user.session', {});
  //   setNotifications(cachedSession);
  // }, []);
  // const onUpdateSession = useCallback(() => {
  //   const cachedSession = Flux.getState('user.session', {});
  //   setSession(cachedSession);
  // }, []);
  // const onSignOut = useCallback(() => {
  //   Flux.setState('user.session', {});
  //   setSession({});
  // }, []);
  // const isAuth = useCallback(() => {
  //   if(configAuth) {
  //     return configAuth();
  //   }

  //   const {userActive} = Flux.getState('user.session', {});
  //   return userActive;
  // }, []);
  // const updateMessage = useCallback((message) => {
  //   API.graphql(graphqlOperation(UPDATE_MESSAGES, {message}));
  // }, []);
  // const updateNotification = useCallback((notification) => {
  //   API.graphql(graphqlOperation(UPDATE_NOTIFICATIONS, {notification}));
  // }, []);

  // useFluxListener(ArkhamConstants.INIT, onUpdateSession);
  // useFluxListener(SIGNOUT, onSignOut);
  // useFluxListener(UPDATE_MESSAGES, onUpdateMessages);
  // useFluxListener(UPDATE_NOTIFICATIONS, onUpdateNotifications);
  // useFluxListener(UPDATE_SESSION, onUpdateSession);

  useEffect(() => {
    // Store config in flux state for access by actions
    flux.setState('app.config', resolvedConfig);

    // Initialize
    onInit(flux);
    websockets.wsInit();

    // const messageSubscription = API.graphql(graphqlOperation(MessageSubscription))
    //   // @ts-ignore
    //   .subscribe({
    //     next: ({provider, value: messages}) => {
    //       console.log({provider, messages});
    //       Flux.dispatch({type: UPDATE_MESSAGES, messages});
    //     },
    //     error: (error) => console.warn(error)
    //   });
    // const notificationSubscription = API.graphql(graphqlOperation(NotificationSubscription))
    //   // @ts-ignore
    //   .subscribe({
    //     next: ({provider, value: notifications}) => {
    //       console.log({provider, notifications});
    //       Flux.dispatch({type: UPDATE_NOTIFICATIONS, notifications});
    //     },
    //     error: (error) => console.warn(error)
    //   });
    // const sessionSubscription = API.graphql(graphqlOperation(SessionSubscription))
    //   // @ts-ignore
    //   .subscribe({
    //     next: ({provider, value: session}) => {
    //       console.log({provider, session});
    //       Flux.dispatch({type: UPDATE_SESSION, session});
    //     },
    //     error: (error) => console.warn(error)
    //   });

    // return () => {
    //   sessionSubscription.unsubscribe();
    //   messageSubscription.unsubscribe();
    //   notificationSubscription.unsubscribe();
    // };
  }, [flux, resolvedConfig]);

  // Compute isAuth function from config or default
  const isAuth = useMemo(() => {
    return resolvedConfig.isAuth || (() => {
      const sessionState = flux.getState('user.session', {});
      return !!sessionState.userActive;
    });
  }, [resolvedConfig.isAuth, flux]);

  return (
    <MetropolisContext.Provider
      value={{
        adapters: mergedAdapters,
        config: resolvedConfig,
        flux,
        isAuth,
        messages,
        notifications,
        session,
        updateMessage: () => { },
        updateNotification: () => { }
      }}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </MetropolisContext.Provider>
  );
};

export default Metropolis;

export {
  useContentActions,
  useEventActions,
  useGroupActions,
  useImageActions,
  useLocationActions,
  useMessageActions, useMetropolis,
  useMetropolisConfig,
  useMetropolisFlux, usePostActions,
  useProfileActions,
  useReactionActions,
  useTagActions,
  useTranslationActions,
  useUserActions,
  useWebsocketActions
} from './utils/useMetropolis.js';
export {
  createAction,
  createActions,
  createAllActions
} from './utils/actionFactory.js';
export {
  createValidatorFactory,
  createValidatorManager
} from './utils/validatorFactory.js';
export {createBaseActions} from './utils/baseActionFactory.js';
export * from './adapters/index.js';
export * from './stores/index.js';
export * from './utils/app.js';
export * from './utils/dateUtils.js';
export * from './utils/file.js';
export * from './utils/location.js';
export * from './constants/MetropolisConstants.js';
export * from './graphql/message.js';
export * from './graphql/notification.js';
export {useTranslation} from 'react-i18next';

export type {BaseAdapterOptions} from './utils/validatorFactory.js';
export type {
  ActionOptions,
  ActionReturnType,
  ActionType,
  ActionTypes
} from './utils/actionFactory.js';
export type {BaseActionOptions} from './utils/baseActionFactory.js';

export * from './constants/Collections.js';
export * from './types/index.js';
export * from './actions/connectionActions/connectionActions.js';
export * from './actions/conversationActions/conversationActions.js';
export * from './actions/videoActions/videoActions.js';
export * from './actions/appActions/appActions.js';
