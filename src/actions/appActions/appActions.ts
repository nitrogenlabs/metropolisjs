/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validateAppInput} from '../../adapters/appAdapter/appAdapter.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {AppType} from '../../types/apps.types.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

const DATA_TYPE = 'apps';

export type AppAdapterOptions = BaseAdapterOptions;

export interface AppActionsOptions {
  appAdapter?: (input: unknown, options?: AppAdapterOptions) => any;
  appAdapterOptions?: AppAdapterOptions;
}

export type AppApiResultsType = {
  apps: {
    add?: AppType;
    itemById?: AppType;
    list?: AppType[];
    remove?: AppType;
    update?: AppType;
  };
};

export interface AppActions {
  add: (appData: Partial<AppType>, appProps?: string[], requestOptions?: ActionRequestOptions) => Promise<AppType>;
  delete: (appId: string, appProps?: string[], requestOptions?: ActionRequestOptions) => Promise<AppType>;
  itemById: (appId: string, appProps?: string[], requestOptions?: ActionRequestOptions) => Promise<AppType>;
  list: (from?: number, to?: number, appProps?: string[], requestOptions?: ActionRequestOptions) => Promise<AppType[]>;
  update: (app: Partial<AppType>, appProps?: string[], requestOptions?: ActionRequestOptions) => Promise<AppType>;
  updateAppAdapter: (adapter: (input: unknown, options?: AppAdapterOptions) => any) => void;
  updateAppAdapterOptions: (options: AppAdapterOptions) => void;
}

const defaultAppValidator = (input: unknown, options?: AppAdapterOptions) =>
  validateAppInput(input);

export const createAppActions = (
  flux: FluxFramework,
  options?: AppActionsOptions
): AppActions => {
  const appBase = createBaseActions(flux, defaultAppValidator, {
    adapter: options?.appAdapter,
    adapterOptions: options?.appAdapterOptions
  });

  const add = async (
    appData: Partial<AppType>,
    appProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<AppType> => {
    try {
      const queryVariables = {
        app: {
          type: 'AppInput!',
          value: appBase.validator(appData)
        }
      };

      return await appMutation<AppType>(
        flux,
        'add',
        DATA_TYPE,
        queryVariables,
        ['appId', ...appProps]
      );
    } catch(error) {
      throw error;
    } finally {
      await clearCachedRequest(flux, 'app.list');
    }
  };

  const itemById = async (appId: string, appProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<AppType> => {
    try {
      const cachedResult = getCachedRequest<AppType>(flux, `app.itemById:${appId}`, {appId, appProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        appId: {
          type: 'ID!',
          value: parseId(appId)
        }
      };

      const result = await appQuery<AppType>(
        flux,
        'itemById',
        DATA_TYPE,
        queryVariables,
        [
          'apiKey',
          'appId',
          'description',
          'imageUrl',
          'isActive',
          'name',
          'settings',
          'url',
          'userId',
          ...appProps
        ]
      );
      return await setCachedRequest(flux, `app.itemById:${appId}`, {appId, appProps}, result, requestOptions);
    } catch(error) {
      throw error;
    }
  };

  const list = async (
    from: number = 0,
    to: number = 10,
    appProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<AppType[]> => {
    try {
      const cachedResult = getCachedRequest<AppType[]>(flux, 'app.list', {from, to, appProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        }
      };

      const result = await appQuery<AppType[]>(
        flux,
        'list',
        DATA_TYPE,
        queryVariables,
        [
          'apiKey',
          'appId',
          'description',
          'imageUrl',
          'isActive',
          'name',
          'settings',
          'url',
          'userId',
          ...appProps
        ]
      );
      return await setCachedRequest(flux, 'app.list', {from, to, appProps}, result, requestOptions);
    } catch(error) {
      throw error;
    }
  };

  const deleteApp = async (
    appId: string,
    appProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<AppType> => {
    try {
      const queryVariables = {
        appId: {
          type: 'ID!',
          value: parseId(appId)
        }
      };

      return await appMutation<AppType>(
        flux,
        'remove',
        DATA_TYPE,
        queryVariables,
        ['appId', ...appProps]
      );
    } catch(error) {
      throw error;
    } finally {
      await clearCachedRequest(flux, `app.itemById:${appId}`);
      await clearCachedRequest(flux, 'app.list');
    }
  };

  const update = async (
    app: Partial<AppType>,
    appProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<AppType> => {
    try {
      const queryVariables = {
        app: {
          type: 'AppUpdateInput!',
          value: appBase.validator(app)
        }
      };

      return await appMutation<AppType>(
        flux,
        'update',
        DATA_TYPE,
        queryVariables,
        ['appId', ...appProps]
      );
    } catch(error) {
      throw error;
    } finally {
      await clearCachedRequest(flux, `app.itemById:${String(app?.appId || '')}`);
      await clearCachedRequest(flux, 'app.list');
    }
  };

  return {
    add,
    delete: deleteApp,
    itemById,
    list,
    update,
    updateAppAdapter: appBase.updateAdapter,
    updateAppAdapterOptions: appBase.updateOptions
  };
};
