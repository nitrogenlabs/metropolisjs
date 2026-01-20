/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum} from '@nlabs/utils';

import {validateGroupInput} from '../../adapters/groupAdapter/groupAdapter.js';
import {GROUP_CONSTANTS} from '../../stores/groupStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';

import type {Group} from '../../adapters/groupAdapter/groupAdapter.js';
import type {ReaktorDbCollection} from '../../utils/api.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';
import type {FluxFramework} from '@nlabs/arkhamjs';

const DATA_TYPE: ReaktorDbCollection = 'groups';

export type GroupAdapterOptions = BaseAdapterOptions;

export interface GroupActionsOptions {
  groupAdapter?: (input: unknown, options?: GroupAdapterOptions)=> any;
  groupAdapterOptions?: GroupAdapterOptions;
}

export type GroupApiResultsType = {
  groups: {
    add?: Group;
    getById?: Group;
    getListByApp?: Group[];
    getListByUser?: Group[];
    update?: Group;
    delete?: Group;
  };
};

export interface GroupActions {
  add: (groupData: Partial<Group>, groupProps?: string[])=> Promise<Group>;
  getById: (groupId: string, groupProps?: string[])=> Promise<Group>;
  getListByApp: (from?: number, to?: number, groupProps?: string[])=> Promise<Group[]>;
  getListByUser: (userId: string, from?: number, to?: number, groupProps?: string[])=> Promise<Group[]>;
  update: (group: Partial<Group>, groupProps?: string[])=> Promise<Group>;
  delete: (groupId: string, groupProps?: string[])=> Promise<Group>;
  updateGroupAdapter: (adapter: (input: unknown, options?: GroupAdapterOptions)=> any)=> void;
  updateGroupAdapterOptions: (options: GroupAdapterOptions)=> void;
}

const defaultGroupValidator = (input: unknown, options?: GroupAdapterOptions) => validateGroupInput(input);

export const createGroupActions = (
  flux: FluxFramework,
  options?: GroupActionsOptions
): GroupActions => {
  const groupBase = createBaseActions(flux, defaultGroupValidator, {
    adapter: options?.groupAdapter,
    adapterOptions: options?.groupAdapterOptions
  });

  const add = async (groupData: Partial<Group>, groupProps: string[] = []): Promise<Group> => {
    try {
      const queryVariables = {
        group: {
          type: 'GroupInput!',
          value: groupBase.validator(groupData)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {add: group = {}}} = data;
        return flux.dispatch({group, type: GROUP_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<Group>(
        flux,
        'addGroup',
        DATA_TYPE,
        queryVariables,
        ['groupId', ...groupProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const getById = async (groupId: string, groupProps: string[] = []): Promise<Group> => {
    try {
      const queryVariables = {
        groupId: {
          type: 'ID!',
          value: parseId(groupId)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {getById: group = {}}} = data;
        return flux.dispatch({group, type: GROUP_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<Group>(
        flux,
        'getById',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'description',
          'groupId',
          'imageId',
          'name',
          'ownerId',
          'privacy',
          'tags {name, tagId}',
          'type',
          'updated',
          'userCount',
          ...groupProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const getListByApp = async (
    from: number = 0,
    to: number = 0,
    groupProps: string[] = []
  ): Promise<Group[]> => {
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

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {getListByApp = []}} = data;
        return flux.dispatch({
          list: getListByApp,
          type: GROUP_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<Group[]>(
        flux,
        'getListByApp',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'description',
          'groupId',
          'imageId',
          'name',
          'ownerId',
          'privacy',
          'tags {name, tagId}',
          'type',
          'updated',
          'userCount',
          ...groupProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const getListByUser = async (
    userId: string,
    from: number = 0,
    to: number = 0,
    groupProps: string[] = []
  ): Promise<Group[]> => {
    try {
      const queryVariables = {
        from: {
          type: 'Int',
          value: parseNum(from)
        },
        to: {
          type: 'Int',
          value: parseNum(to)
        },
        userId: {
          type: 'ID!',
          value: parseId(userId)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {getListByUser = []}} = data;
        return flux.dispatch({
          list: getListByUser,
          type: GROUP_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<Group[]>(
        flux,
        'getListByUser',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'description',
          'groupId',
          'imageId',
          'name',
          'ownerId',
          'privacy',
          'tags {name, tagId}',
          'type',
          'updated',
          'userCount',
          ...groupProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const update = async (groupData: Partial<Group>, groupProps: string[] = []): Promise<Group> => {
    try {
      const queryVariables = {
        group: {
          type: 'GroupInput!',
          value: groupBase.validator(groupData)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {update: group = {}}} = data;
        return flux.dispatch({group, type: GROUP_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<Group>(
        flux,
        'updateGroup',
        DATA_TYPE,
        queryVariables,
        ['groupId', ...groupProps], {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  const deleteGroup = async (groupId: string, groupProps: string[] = []): Promise<Group> => {
    try {
      const queryVariables = {
        groupId: {
          type: 'ID!',
          value: parseId(groupId)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {delete: group = {}}} = data;
        return flux.dispatch({group, type: GROUP_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<Group>(
        flux,
        'deleteGroup',
        DATA_TYPE,
        queryVariables,
        ['groupId', ...groupProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  return {
    add,
    delete: deleteGroup,
    getById,
    getListByApp,
    getListByUser,
    update,
    updateGroupAdapter: groupBase.updateAdapter,
    updateGroupAdapterOptions: groupBase.updateOptions
  };
};
