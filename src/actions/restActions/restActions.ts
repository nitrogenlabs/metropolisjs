/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {restRequest} from '../../utils/api.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {RestApiOptions, RestMethod} from '../../utils/api.js';

export const REST_CONSTANTS = {
  REQUEST_ERROR: 'REST_REQUEST_ERROR',
  REQUEST_SUCCESS: 'REST_REQUEST_SUCCESS'
} as const;

export interface RestActionsOptions {
  readonly authenticate?: boolean;
  readonly requestOptions?: RestApiOptions;
}

export interface RestActions {
  delete: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) => Promise<T>;
  get: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) => Promise<T>;
  post: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) => Promise<T>;
  put: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) => Promise<T>;
  request: <T = unknown>(endpoint: string, method?: RestMethod, params?: unknown, requestOptions?: RestApiOptions) => Promise<T>;
}

export const createRestActions = (
  flux: FluxFramework,
  options: RestActionsOptions = {}
): RestActions => {
  const buildRequestOptions = (requestOptions: RestApiOptions = {}): RestApiOptions => ({
    ...options.requestOptions,
    ...requestOptions,
    authenticate: requestOptions.authenticate ?? options.authenticate ?? options.requestOptions?.authenticate
  });

  const request = async <T = unknown>(
    endpoint: string,
    method: RestMethod = 'GET',
    params?: unknown,
    requestOptions: RestApiOptions = {}
  ): Promise<T> => {
    try {
      const result = await restRequest<T>(flux, endpoint, method, params, buildRequestOptions(requestOptions));
      await flux.dispatch({result, type: REST_CONSTANTS.REQUEST_SUCCESS});
      return result;
    } catch(error) {
      await flux.dispatch({error, type: REST_CONSTANTS.REQUEST_ERROR});
      throw error;
    }
  };

  return {
    delete: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) =>
      request<T>(endpoint, 'DELETE', params, requestOptions),
    get: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) =>
      request<T>(endpoint, 'GET', params, requestOptions),
    post: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) =>
      request<T>(endpoint, 'POST', params, requestOptions),
    put: <T = unknown>(endpoint: string, params?: unknown, requestOptions?: RestApiOptions) =>
      request<T>(endpoint, 'PUT', params, requestOptions),
    request
  };
};
