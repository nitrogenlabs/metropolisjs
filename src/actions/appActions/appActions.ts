/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validateAppInput, type AppType} from '../../adapters/appAdapter/appAdapter.js';
import {appMutation, appQuery, type ReaktorDbCollection} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';

const DATA_TYPE: ReaktorDbCollection = 'apps';

export interface AppAdapterOptions extends BaseAdapterOptions {
}

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
  add: (appData: Partial<AppType>, appProps?: string[]) => Promise<AppType>;
  delete: (appId: string, appProps?: string[]) => Promise<AppType>;
  itemById: (appId: string, appProps?: string[]) => Promise<AppType>;
  list: (from?: number, to?: number, appProps?: string[]) => Promise<AppType[]>;
  update: (app: Partial<AppType>, appProps?: string[]) => Promise<AppType>;
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
    appProps: string[] = []
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
    }
  };

  const itemById = async (appId: string, appProps: string[] = []): Promise<AppType> => {
    try {
      const queryVariables = {
        appId: {
          type: 'ID!',
          value: parseId(appId)
        }
      };

      return await appQuery<AppType>(
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
    } catch(error) {
      throw error;
    }
  };

  const list = async (
    from: number = 0,
    to: number = 10,
    appProps: string[] = []
  ): Promise<AppType[]> => {
    try {
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

      return await appQuery<AppType[]>(
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
    } catch(error) {
      throw error;
    }
  };

  const deleteApp = async (
    appId: string,
    appProps: string[] = []
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
    }
  };

  const update = async (
    app: Partial<AppType>,
    appProps: string[] = []
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
