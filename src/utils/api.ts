import {ApiError, graphqlQuery, post} from '@nlabs/rip-hunter';
import {camelCase, isEmpty, upperFirst} from '@nlabs/utils';

import {APP_CONSTANTS} from '../stores/appStore.js';
import {USER_CONSTANTS} from '../stores/userStore.js';
import {getConfigFromFlux} from './configUtils.js';
import {clearPersistedSession, getRefreshWindowMinutes, hydrateSessionFromStorage, parseJwtExpiryMs, storeSession} from './session.js';

import type {FluxAction, FluxFramework} from '@nlabs/arkhamjs';
import type {HunterOptionsType, HunterQueryType} from '@nlabs/rip-hunter';

export interface ApiOptions {
  readonly onSuccess?: (data: any) => Promise<FluxAction>;
  readonly variables?: Record<string, unknown>;
}

export type ReaktorDbCollection =
  'apps' |
  'connections' |
  'contents' |
  'conversations' |
  'events' |
  'files' |
  'groups' |
  'images' |
  'locations' |
  'messages' |
  'notifications' |
  'payments' |
  'permissions' |
  'posts' |
  'personas' |
  'reactions' |
  'subscriptions' |
  'tags' |
  'translations' |
  'users' |
  'videos';

export interface ApiQueryVariableType {
  readonly type: string;
  readonly value: unknown;
}

export interface ApiQueryVariables {
  readonly [key: string]: ApiQueryVariableType;
}

export interface ApiResultsType {
  readonly [key: string]: unknown;
}

export interface RetryType {
  readonly query: HunterQueryType | HunterQueryType[];
  readonly responseMethod: (results: ApiResultsType) => void;
}

export interface SessionType {
  readonly expires?: number;
  readonly issued?: number;
  readonly token?: string;
  readonly userId?: string;
  readonly username?: string;
}

const DEFAULT_REFRESH_WINDOW_MINUTES = 5;
const DEFAULT_SESSION_MAX_MINUTES = 15;

const getMinutesUntil = (expiresAt: number): number =>
  Math.round((expiresAt - Date.now()) / (1000 * 60));

const clearInvalidSessionState = async (flux: FluxFramework): Promise<void> => {
  await clearPersistedSession(flux);
  await flux.clearAppData();
  await flux.dispatch({session: {}, type: USER_CONSTANTS.SIGN_OUT_SUCCESS});
};

export const getGraphql = async (
  flux: FluxFramework,
  url: string,
  authenticate: boolean,
  query: HunterQueryType | HunterQueryType[],
  options: ApiOptions
): Promise<ApiResultsType> => {
  try {
    const {onSuccess} = options;
    const retry: RetryType = {query, responseMethod: onSuccess || (() => {})};
    const networkType: string = flux.getState('app.networkType') as string;

    if(networkType === 'none') {
      return flux.dispatch({retry, type: APP_CONSTANTS.API_NETWORK_ERROR});
    }

    const stateSession: SessionType = (flux.getState('user.session') || {}) as SessionType;
    let token: string | undefined;

    if(authenticate) {
      const hydratedSession: SessionType = stateSession.token ? stateSession : await hydrateSessionFromStorage(flux);
      const {
        expires: authExpires = 0,
        issued: authIssued = 0,
        token: hydratedToken
      }: SessionType = hydratedSession || {};
      token = hydratedToken || stateSession.token;

      if(!token) {
        throw new ApiError(['invalid_session'], 'invalid_session');
      }

      const tokenExpiresAt = parseJwtExpiryMs(token);

      if(tokenExpiresAt > 0 && Date.now() >= tokenExpiresAt) {
        throw new ApiError(['expired_session'], 'expired_session');
      }

      const config = getConfigFromFlux(flux);
      const minutesUntilExpiry = getMinutesUntil(Number(authExpires || 0));
      const sessionLifetimeMinutes = Math.round((authExpires - authIssued) / (1000 * 60));
      const refreshWindowMinutes = getRefreshWindowMinutes(
        sessionLifetimeMinutes || DEFAULT_SESSION_MAX_MINUTES,
        config.app?.session || {}
      );
      const refreshExpiresMinutes = Math.max(
        1,
        Number(config.app?.session?.maxMinutes || sessionLifetimeMinutes || DEFAULT_SESSION_MAX_MINUTES)
      );

      if(minutesUntilExpiry > 0 && minutesUntilExpiry <= refreshWindowMinutes) {
        const {
          session: updatedSession = {}
        }: ApiResultsType = (await refreshSession(flux, token, refreshExpiresMinutes)) || {};
        const {token: newToken}: SessionType = (updatedSession || {});

        if(!newToken) {
          throw new ApiError(['invalid_session'], 'invalid_session');
        }

        token = newToken;
      }
    }

    return graphqlQuery(url, query, {token: token || ''})
      .then(async (results) => {
        await flux.dispatch({type: APP_CONSTANTS.API_NETWORK_SUCCESS});

        return results;
      })
      .then((data) => (onSuccess ? onSuccess(data) : data))
      .catch(async (error) => {
        const {errors = []} = error;

        if(onSuccess && errors.includes('network_error')) {
          await flux.dispatch({retry, type: APP_CONSTANTS.API_NETWORK_ERROR});
          return Promise.reject(error);
        } else if(errors.includes('invalid_session') || errors.includes('expired_session')) {
          await clearInvalidSessionState(flux);
          return Promise.resolve({});
        }

        return Promise.reject(error);
      });
  } catch(error) {
    const errors = error instanceof ApiError ? error.errors : [];
    const message = error instanceof Error ? error.message : '';

    if(errors.includes('invalid_session') || errors.includes('expired_session') || message === 'invalid_session' || message === 'expired_session') {
      await clearInvalidSessionState(flux);
      return {};
    }

    throw error;
  }
};

export const createQuery = (
  name: string,
  dataType: ReaktorDbCollection,
  variables: ApiQueryVariables = {},
  returnProperties: string[] = [],
  type = 'query'
) => {
  const queryVariables = {...variables || {}};
  const variableKeys = Object.keys(queryVariables);
  const queryName = name.replace(/ /g, '');
  let query: string;

  if(type === 'mutation') {
    const mutationName = upperFirst(camelCase(dataType)) + upperFirst(camelCase(queryName));
    query = `${type} ${mutationName}${
      variableKeys.length
        ? `(${variableKeys.map((key) => `$${key}: ${queryVariables[key].type}`).join(', ')})`
        : ''
    } {
      ${dataType} {
        ${camelCase(queryName)}${
          variableKeys.length
            ? `(${variableKeys.map((key) => `${key}: $${key}`).join(', ')})`
            : ''
        }
        ${returnProperties?.length ? `{${returnProperties.join(', ')}}` : ''}
      }
    }`;
  } else {
    query = `${type} ${queryName}${
      variableKeys.length
        ? `(${variableKeys.map((key) => `$${key}: ${queryVariables[key].type}`).join(', ')})`
        : ''
    } {
      ${dataType} {
        ${camelCase(queryName)}${
          variableKeys.length
            ? `(${variableKeys.map((key) => `${key}: $${key}`).join(', ')})`
            : ''
        }
        ${returnProperties?.length ? `{${returnProperties.join(', ')}}` : ''}
      }
    }`;
  }

  const updatedVariables: Record<string, unknown> = variableKeys.reduce((queryData, key) => {
    queryData[key] = queryVariables[key].value;
    return queryData;
  }, {});

  return {query, variables: updatedVariables};
};

export const createMutation = (
  name: string,
  dataType: ReaktorDbCollection,
  variables: ApiQueryVariables = {},
  returnProperties: string[] = []
) => createQuery(name, dataType, variables, returnProperties, 'mutation');

export const appQuery = <T>(
  flux: FluxFramework,
  name: string,
  dataType: ReaktorDbCollection,
  queryVariables: ApiQueryVariables,
  returnProperties: string[],
  options: ApiOptions = {}
): Promise<T> => {
  const query = createQuery(name, dataType, queryVariables, returnProperties);
  const config = getConfigFromFlux(flux);
  const appUrl: string = config.app?.api?.url || '';
  return getGraphql(flux, appUrl, true, query, options) as Promise<T>;
};

export const appMutation = <T>(
  flux: FluxFramework,
  name: string,
  dataType: ReaktorDbCollection,
  queryVariables: ApiQueryVariables,
  returnProperties: string[],
  options: ApiOptions = {}
): Promise<T> => {
  const query = createMutation(name, dataType, queryVariables, returnProperties);
  const config = getConfigFromFlux(flux);
  const appUrl: string = config.app?.api?.url || '';
  return getGraphql(flux, appUrl, true, query, options) as Promise<T>;
};

export const publicQuery = <T>(
  flux: FluxFramework,
  name: string,
  dataType: ReaktorDbCollection,
  queryVariables: ApiQueryVariables,
  returnProperties: string[],
  options: ApiOptions = {}
): Promise<T> => {
  const query = createQuery(name, dataType, queryVariables, returnProperties);
  const config = getConfigFromFlux(flux);
  const publicUrl: string = config.app?.api?.public || '';
  return getGraphql(flux, publicUrl, false, query, options) as Promise<T>;
};

export const publicMutation = <T>(
  flux: FluxFramework,
  name: string,
  dataType: ReaktorDbCollection,
  queryVariables: ApiQueryVariables,
  returnProperties: string[],
  options: ApiOptions = {}
): Promise<T> => {
  const query = createMutation(name, dataType, queryVariables, returnProperties);
  const config = getConfigFromFlux(flux);
  const publicUrl: string = config.app?.api?.public || '';
  return getGraphql(flux, publicUrl, false, query, options) as Promise<T>;
};

export const uploadImage = (
  flux: FluxFramework,
  image,
  options: HunterOptionsType = {}
): Promise<ApiResultsType> => {
  const config = getConfigFromFlux(flux);
  const uploadImageUrl: string = config.app?.api?.uploadImage || '';
  const token = flux.getState('user.session.token');

  if(isEmpty(uploadImageUrl)) {
    return Promise.reject(new ApiError(['invalid_url'], 'upload_endpoint_not_configured'));
  }

  if(isEmpty(token)) {
    return Promise.reject(new ApiError(['invalid_session'], 'missing_auth_token'));
  }

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);

  if(typeof FormData !== 'undefined' && image instanceof FormData) {
    headers.set('Accept', 'application/json');

    return fetch(uploadImageUrl, {
      body: image,
      headers,
      method: 'POST'
    }).then(async (response) => {
      const responseType = response.headers.get('content-type') || '';
      const data = responseType.includes('application/json')
        ? await response.json()
        : await response.text();

      if(!response.ok) {
        const message = typeof data === 'object' && data && 'error' in data
          ? String((data as {error?: string}).error || response.statusText)
          : String(data || response.statusText);
        throw new ApiError(['upload_error'], message);
      }

      return data as ApiResultsType;
    });
  }

  return post(uploadImageUrl, image, {headers, ...options});
};

export const refreshSession = async (
  flux: FluxFramework,
  token?: string,
  expires?: number
): Promise<FluxAction | null> => {
  const refreshToken = isEmpty(token) ? flux.getState('user.session.token') : token;

  if(isEmpty(refreshToken)) {
    return null;
  }

  const tokenExpiresAt = parseJwtExpiryMs(String(refreshToken));

  if(tokenExpiresAt > 0 && Date.now() >= tokenExpiresAt) {
    const error = new Error('expired_session');
    await clearInvalidSessionState(flux);
    flux.dispatch({error, type: USER_CONSTANTS.GET_SESSION_ERROR});
    return null;
  }

  try {
    const config = getConfigFromFlux(flux);
    const requestedExpires = Math.max(
      1,
      Number(expires || config.app?.session?.maxMinutes || DEFAULT_SESSION_MAX_MINUTES)
    );
    const queryVariables = {
      expires: {
        type: 'Int',
        value: requestedExpires
      },
      token: {
        type: 'String!',
        value: refreshToken
      }
    };
    const onSuccess = async (data: ApiResultsType = {}): Promise<FluxAction> => {
      const rawSessionData = (data as {users?: {refreshSession?: Record<string, unknown>}})?.users?.refreshSession;
      const sessionData = rawSessionData && typeof rawSessionData === 'object'
        ? rawSessionData as Record<string, unknown>
        : {};
      const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
      const mergedSession = await storeSession(flux, {...currentSession, ...sessionData});
      return flux.dispatch({session: mergedSession, type: USER_CONSTANTS.UPDATE_SESSION_SUCCESS});
    };

    return await publicMutation(flux, 'refreshSession', 'users', queryVariables, ['expires', 'issued', 'token'], {
      onSuccess
    });
  } catch(error) {
    const errorMessage = error instanceof Error ? error.message : '';

    if(errorMessage === 'invalid_session' || errorMessage === 'expired_session') {
      await clearInvalidSessionState(flux);
    }

    flux.dispatch({error, type: USER_CONSTANTS.GET_SESSION_ERROR});
    return null;
  }
};
