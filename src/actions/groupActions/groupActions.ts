/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId, parseNum } from '@nlabs/utils';

import { validateGroupInput } from '../../adapters/groupAdapter/groupAdapter.js';
import { GROUP_CONSTANTS } from '../../stores/groupStore.js';
import { appMutation, appQuery } from '../../utils/api.js';
import { createBaseActions } from '../../utils/baseActionFactory.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { GroupType } from '../../types/groups.types.js';
import type { ReaktorDbCollection } from '../../utils/api.js';
import type { BaseAdapterOptions } from '../../utils/validatorFactory.js';

const DATA_TYPE: ReaktorDbCollection = 'groups';

export interface GroupAdapterOptions extends BaseAdapterOptions {
}

export interface GroupActionsOptions {
  groupAdapter?: (input: unknown, options?: GroupAdapterOptions) => any;
  groupAdapterOptions?: GroupAdapterOptions;
}

export type GroupApiResultsType = {
  groups: {
    addGroup: GroupType;
    getGroup: GroupType;
    getGroupsByLatest: GroupType[];
    deleteGroup: GroupType;
    updateGroup: GroupType;
  };
};

export interface GroupActions {
  add: (groupData: Partial<GroupType>, groupProps?: string[]) => Promise<GroupType>;
  itemById: (groupId: string, groupProps?: string[]) => Promise<GroupType>;
  listByLatest: (from?: number, to?: number, groupProps?: string[]) => Promise<GroupType[]>;
  delete: (groupId: string, groupProps?: string[]) => Promise<GroupType>;
  update: (group: Partial<GroupType>, groupProps?: string[]) => Promise<GroupType>;
  updateGroupAdapter: (adapter: (input: unknown, options?: GroupAdapterOptions) => any) => void;
  updateGroupAdapterOptions: (options: GroupAdapterOptions) => void;
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

  const add = async (groupData: Partial<GroupType>, groupProps: string[] = []): Promise<GroupType> => {
    try {
      const queryVariables = {
        group: {
          type: 'GroupInput!',
          value: groupBase.validator(groupData)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {addGroup = {}}} = data;
        return flux.dispatch({group: addGroup, type: GROUP_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<GroupType>(flux, 'addGroup', DATA_TYPE, queryVariables, ['groupId', ...groupProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const itemById = async (groupId: string, groupProps: string[] = []): Promise<GroupType> => {
    try {
      const queryVariables = {
        groupId: {
          type: 'ID!',
          value: parseId(groupId)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {getGroup: group = {}}} = data;
        return flux.dispatch({group, type: GROUP_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<GroupType>(
        flux,
        'group',
        DATA_TYPE,
        queryVariables,
        [
          'description',
          'groupId',
          'imageUrl',
          'isPrivate',
          'memberCount',
          'name',
          'ownerId',
          'settings',
          'tags {name, tagId}',
          'thumbUrl',
          'type',
          ...groupProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const listByLatest = async (
    from: number = 0,
    to: number = 0,
    groupProps: string[] = []
  ): Promise<GroupType[]> => {
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
        const {groups: {getGroupsByLatest: groupsByLatest = []}} = data;
        return flux.dispatch({
          list: groupsByLatest,
          type: GROUP_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<GroupType[]>(
        flux,
        'groupsByLatest',
        DATA_TYPE,
        queryVariables,
        [
          'description',
          'groupId',
          'imageUrl',
          'isPrivate',
          'memberCount',
          'name',
          'ownerId',
          'settings',
          'tags {name, tagId}',
          'thumbUrl',
          'type',
          ...groupProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteGroup = async (groupId: string, groupProps: string[] = []): Promise<GroupType> => {
    try {
      const queryVariables = {
        groupId: {
          type: 'ID!',
          value: parseId(groupId)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {deleteGroup = {}}} = data;
        return flux.dispatch({group: deleteGroup, type: GROUP_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<GroupType>(flux, 'deleteGroup', DATA_TYPE, queryVariables, ['groupId', ...groupProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  const update = async (group: Partial<GroupType>, groupProps: string[] = []): Promise<GroupType> => {
    try {
      const queryVariables = {
        group: {
          type: 'GroupUpdateInput!',
          value: groupBase.validator(group)
        }
      };

      const onSuccess = (data: GroupApiResultsType) => {
        const {groups: {updateGroup = {}}} = data;
        return flux.dispatch({group: updateGroup, type: GROUP_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<GroupType>(flux, 'updateGroup', DATA_TYPE, queryVariables, ['groupId', ...groupProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: GROUP_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    }
  };

  return {
    add,
    itemById,
    listByLatest,
    delete: deleteGroup,
    update,
    updateGroupAdapter: groupBase.updateAdapter,
    updateGroupAdapterOptions: groupBase.updateOptions
  };
};
