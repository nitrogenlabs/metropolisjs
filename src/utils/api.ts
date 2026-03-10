import {ApiError, graphqlQuery, post} from '@nlabs/rip-hunter';
import {camelCase, isEmpty, upperFirst} from '@nlabs/utils';
import {DateTime} from 'luxon';

import {APP_CONSTANTS} from '../stores/appStore.js';
import {USER_CONSTANTS} from '../stores/userStore.js';
import {getConfigFromFlux} from './configUtils.js';
import {hydrateSessionFromStorage} from './session.js';

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
  'files' |
  'groups' |
  'images' |
  'locations' |
  'messages' |
  'notifications' |
  'payments' |
  'permissions' |
  'posts' |
  'profiles' |
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

export const getGraphql = async (
  flux: FluxFramework,
  url: string,
  authenticate: boolean,
  query: HunterQueryType | HunterQueryType[],
  options: ApiOptions
): Promise<ApiResultsType> => {
  const {onSuccess} = options;
  const retry: RetryType = {query, responseMethod: onSuccess || (() => {})};
  const networkType: string = flux.getState('app.networkType') as string;

  if(networkType === 'none') {
    return flux.dispatch({retry, type: APP_CONSTANTS.API_NETWORK_ERROR});
  }

  const now: number = Date.now();
  const stateSession: SessionType = (flux.getState('user.session') || {}) as SessionType;
  const {expires = now, issued = now, token: currentToken}: SessionType = stateSession;
  let token: string | undefined;

  if(authenticate) {
    const hydratedSession: SessionType = currentToken ? stateSession : hydrateSessionFromStorage(flux);
    const {
      expires: authExpires = expires,
      issued: authIssued = issued,
      token: hydratedToken
    }: SessionType = hydratedSession || {};
    token = hydratedToken || currentToken;

    if(!token) {
      throw new ApiError(['invalid_session'], 'invalid_session');
    }

    const config = getConfigFromFlux(flux);
    const nowDate: DateTime = DateTime.local();
    const expiresDate: DateTime = DateTime.fromMillis(authExpires);
    const minutesUntilExpiry = Math.round(expiresDate.diff(nowDate, 'minutes').toObject().minutes);
    const refreshWindowMinutes = Math.max(1, Number(config.app?.session?.minMinutes || DEFAULT_REFRESH_WINDOW_MINUTES));
    const sessionLifetimeMinutes = Math.round((authExpires - authIssued) / (1000 * 60));
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
      } else if(errors.includes('invalid_session')) {
        await flux.clearAppData();
        return Promise.resolve({});
      }

      return Promise.reject(error);
    });
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
  const token = flux.getState('user.session.token');
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  const config = getConfigFromFlux(flux);
  const uploadImageUrl: string = config.app?.api?.uploadImage || '';
  return post(uploadImageUrl, image, {headers, ...options});
};

export const refreshSession = async (
  flux: FluxFramework,
  token?: string,
  expires: number = 15
): Promise<FluxAction | null> => {
  const refreshToken = isEmpty(token) ? flux.getState('user.session.token') : token;

  if(isEmpty(refreshToken)) {
    return null;
  }

  try {
    const queryVariables = {
      expires: {
        type: 'Int',
        value: expires
      },
      token: {
        type: 'String!',
        value: refreshToken
      }
    };
    const onSuccess = (data: ApiResultsType = {}): Promise<FluxAction> => {
      const {refreshSession: sessionData = {}} = data;
      return flux.dispatch({session: sessionData, type: USER_CONSTANTS.UPDATE_SESSION_SUCCESS});
    };

    return await publicMutation(flux, 'refreshSession', 'users', queryVariables, ['expires', 'issued', 'token'], {
      onSuccess
    });
  } catch(error) {
    flux.dispatch({error, type: USER_CONSTANTS.GET_SESSION_ERROR});
    return null;
  }
};
