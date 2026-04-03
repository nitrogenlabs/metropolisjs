/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validatePermissionInput} from '../../adapters/permissionAdapter/permissionAdapter.js';
import {PERMISSION_CONSTANTS} from '../../stores/permissionStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';
import type {FluxFramework} from '@nlabs/arkhamjs';
import type {Permission} from '../../adapters/permissionAdapter/permissionAdapter.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

const DATA_TYPE = 'permissions';

export interface PermissionAdapterOptions extends BaseAdapterOptions {}

export interface PermissionActionsOptions {
  permissionAdapter?: (input: unknown, options?: PermissionAdapterOptions) => any;
  permissionAdapterOptions?: PermissionAdapterOptions;
}

export type PermissionApiResultsType = {
  permissions: {
    add?: Permission;
    check?: boolean;
    itemById?: Permission;
    list?: Permission[];
    listByUser?: Permission[];
    remove?: Permission;
    update?: Permission;
  };
};

export interface PermissionActions {
  add: (permissionData: Partial<Permission>, permissionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<Permission>;
  check: (userId: string, resource: string, requiredLevel: number, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  itemById: (permissionId: string, permissionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<Permission>;
  list: (from?: number, to?: number, permissionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<Permission[]>;
  listByUser: (userId: string, permissionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<Permission[]>;
  remove: (permissionId: string, requestOptions?: ActionRequestOptions) => Promise<Permission>;
  update: (permission: Partial<Permission>, permissionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<Permission>;
  updatePermissionAdapter: (adapter: (input: unknown, options?: PermissionAdapterOptions) => any) => void;
  updatePermissionAdapterOptions: (options: PermissionAdapterOptions) => void;
}

const defaultPermissionValidator = (input: unknown, options?: PermissionAdapterOptions) =>
  validatePermissionInput(input);

export const createPermissionActions = (
  flux: FluxFramework,
  options?: PermissionActionsOptions
): PermissionActions => {
  const permissionBase = createBaseActions(flux, defaultPermissionValidator, {
    adapter: options?.permissionAdapter,
    adapterOptions: options?.permissionAdapterOptions
  });

  const add = async (
    permissionData: Partial<Permission>,
    permissionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<Permission> => {
    try {
      const queryVariables = {
        permission: {
          type: 'PermissionInput!',
          value: permissionBase.validator(permissionData)
        }
      };

      const onSuccess = (data: PermissionApiResultsType) => {
        const {
          permissions: {add: permission = {}}
        } = data;
        return flux.dispatch({permission, type: PERMISSION_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<Permission>(
        flux,
        'add',
        DATA_TYPE,
        queryVariables,
        ['permissionId', 'name', 'level', 'resource', 'userId', ...permissionProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: PERMISSION_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'permission.list');
    }
  };

  const check = async (
    userId: string,
    resource: string,
    requiredLevel: number,
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    try {
      const cachedResult = getCachedRequest<boolean>(
        flux,
        `permission.check:${userId}:${resource}:${requiredLevel}`,
        {requiredLevel, resource, userId},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        userId: {
          type: 'ID!',
          value: parseId(userId)
        },
        resource: {
          type: 'String!',
          value: resource
        },
        requiredLevel: {
          type: 'Int!',
          value: parseNum(requiredLevel)
        }
      };

      const onSuccess = (data: PermissionApiResultsType) => {
        const {
          permissions: {check: hasPermission = false}
        } = data;
        return flux.dispatch({hasPermission, type: PERMISSION_CONSTANTS.CHECK_PERMISSION_SUCCESS});
      };

      const result = await appQuery<boolean>(flux, 'check', DATA_TYPE, queryVariables, [], {onSuccess});
      return await setCachedRequest(
        flux,
        `permission.check:${userId}:${resource}:${requiredLevel}`,
        {requiredLevel, resource, userId},
        result,
        requestOptions
      );
    } catch(error) {
      flux.dispatch({error, type: PERMISSION_CONSTANTS.CHECK_PERMISSION_ERROR});
      throw error;
    }
  };

  const itemById = async (
    permissionId: string,
    permissionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<Permission> => {
    try {
      const cachedResult = getCachedRequest<Permission>(
        flux,
        `permission.itemById:${permissionId}`,
        {permissionId, permissionProps},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        permissionId: {
          type: 'ID!',
          value: parseId(permissionId)
        }
      };

      const onSuccess = (data: PermissionApiResultsType) => {
        const {
          permissions: {itemById: permission = {}}
        } = data;
        return flux.dispatch({permission, type: PERMISSION_CONSTANTS.GET_ITEM_SUCCESS});
      };

      const result = await appQuery<Permission>(
        flux,
        'itemById',
        DATA_TYPE,
        queryVariables,
        [
          'permissionId',
          'name',
          'description',
          'level',
          'resource',
          'userId',
          'roleId',
          'type',
          'added',
          'updated',
          ...permissionProps
        ],
        {onSuccess}
      );

      return await setCachedRequest(flux, `permission.itemById:${permissionId}`, {permissionId, permissionProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: PERMISSION_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const list = async (
    from: number = 0,
    to: number = 0,
    permissionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<Permission[]> => {
    try {
      const cachedResult = getCachedRequest<Permission[]>(flux, 'permission.list', {from, to, permissionProps}, requestOptions);

      if(cachedResult) {
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

      const onSuccess = (data: PermissionApiResultsType) => {
        const {
          permissions: {list: permissionsList = []}
        } = data;
        return flux.dispatch({
          list: permissionsList,
          type: PERMISSION_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<Permission[]>(
        flux,
        'list',
        DATA_TYPE,
        queryVariables,
        [
          'permissionId',
          'name',
          'description',
          'level',
          'resource',
          'userId',
          'roleId',
          'type',
          ...permissionProps
        ],
        {onSuccess}
      );

      return await setCachedRequest(flux, 'permission.list', {from, to, permissionProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: PERMISSION_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByUser = async (
    userId: string,
    permissionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<Permission[]> => {
    try {
      const cachedResult = getCachedRequest<Permission[]>(
        flux,
        `permission.listByUser:${userId}`,
        {permissionProps, userId},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        userId: {
          type: 'ID!',
          value: parseId(userId)
        }
      };

      const onSuccess = (data: PermissionApiResultsType) => {
        const {
          permissions: {listByUser: permissionsList = []}
        } = data;
        return flux.dispatch({
          list: permissionsList,
          userId,
          type: PERMISSION_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<Permission[]>(
        flux,
        'listByUser',
        DATA_TYPE,
        queryVariables,
        [
          'permissionId',
          'name',
          'description',
          'level',
          'resource',
          'userId',
          'roleId',
          'type',
          ...permissionProps
        ],
        {onSuccess}
      );

      return await setCachedRequest(flux, `permission.listByUser:${userId}`, {permissionProps, userId}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: PERMISSION_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const remove = async (permissionId: string, requestOptions: ActionRequestOptions = {}): Promise<Permission> => {
    try {
      const queryVariables = {
        permissionId: {
          type: 'ID!',
          value: parseId(permissionId)
        }
      };

      const onSuccess = (data: PermissionApiResultsType) => {
        const {
          permissions: {remove: permission = {}}
        } = data;
        return flux.dispatch({permission, type: PERMISSION_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<Permission>(flux, 'remove', DATA_TYPE, queryVariables, ['permissionId'], {
        onSuccess
      });
    } catch(error) {
      flux.dispatch({error, type: PERMISSION_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `permission.itemById:${permissionId}`);
      await clearCachedRequest(flux, 'permission.list');
    }
  };

  const update = async (
    permission: Partial<Permission>,
    permissionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<Permission> => {
    try {
      const queryVariables = {
        permission: {
          type: 'PermissionInput!',
          value: permissionBase.validator(permission)
        }
      };

      const onSuccess = (data: PermissionApiResultsType) => {
        const {
          permissions: {update: updatedPermission = {}}
        } = data;
        return flux.dispatch({permission: updatedPermission, type: PERMISSION_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<Permission>(
        flux,
        'update',
        DATA_TYPE,
        queryVariables,
        ['permissionId', 'name', 'level', 'resource', 'description', ...permissionProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: PERMISSION_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `permission.itemById:${String(permission?.permissionId || '')}`);
      await clearCachedRequest(flux, 'permission.list');
      await clearCachedRequest(flux, `permission.listByUser:${String(permission?.userId || '')}`);
    }
  };

  return {
    add,
    check,
    itemById,
    list,
    listByUser,
    remove,
    update,
    updatePermissionAdapter: permissionBase.updateAdapter,
    updatePermissionAdapterOptions: permissionBase.updateAdapterOptions || permissionBase.updateOptions
  };
};
