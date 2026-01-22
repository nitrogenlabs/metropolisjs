import type {Permission} from '../adapters/permissionAdapter/permissionAdapter.js';

export const PERMISSION_CONSTANTS = {
  ADD_ITEM_ERROR: 'PERMISSION_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'PERMISSION_ADD_ITEM_SUCCESS',
  CHECK_PERMISSION_ERROR: 'PERMISSION_CHECK_PERMISSION_ERROR',
  CHECK_PERMISSION_SUCCESS: 'PERMISSION_CHECK_PERMISSION_SUCCESS',
  GET_ITEM_ERROR: 'PERMISSION_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'PERMISSION_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'PERMISSION_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'PERMISSION_GET_LIST_SUCCESS',
  REMOVE_ITEM_ERROR: 'PERMISSION_REMOVE_ITEM_ERROR',
  REMOVE_ITEM_SUCCESS: 'PERMISSION_REMOVE_ITEM_SUCCESS',
  UPDATE_ITEM_ERROR: 'PERMISSION_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'PERMISSION_UPDATE_ITEM_SUCCESS'
} as const;

export type PermissionConstantsType = typeof PERMISSION_CONSTANTS[keyof typeof PERMISSION_CONSTANTS];

interface PermissionState {
  error?: Error;
  lists: Record<string, unknown>;
  permissions: Record<string, Partial<Permission>>;
  userPermissions: Record<string, Permission[]>;
}

export const defaultValues: PermissionState = {
  lists: {},
  permissions: {},
  userPermissions: {}
};

interface PermissionData {
  readonly error?: Error;
  readonly list?: Permission[];
  readonly permission?: Permission;
  readonly userId?: string;
}

export const permissionStore = (
  type: string,
  data: PermissionData,
  state = defaultValues
): PermissionState => {
  switch (type) {
    case PERMISSION_CONSTANTS.ADD_ITEM_SUCCESS: {
      const {permission} = data;

      if (!permission?.id) {
        return state;
      }

      return {
        ...state,
        permissions: {
          ...state.permissions,
          [permission.id]: permission
        }
      };
    }

    case PERMISSION_CONSTANTS.GET_ITEM_SUCCESS: {
      const {permission} = data;

      if (!permission?.id) {
        return state;
      }

      return {
        ...state,
        permissions: {
          ...state.permissions,
          [permission.id]: permission
        }
      };
    }

    case PERMISSION_CONSTANTS.GET_LIST_SUCCESS: {
      const {list, userId} = data;

      if (!list || !userId) {
        return state;
      }

      return {
        ...state,
        userPermissions: {
          ...state.userPermissions,
          [userId]: list
        }
      };
    }

    case PERMISSION_CONSTANTS.UPDATE_ITEM_SUCCESS: {
      const {permission} = data;

      if (!permission?.id) {
        return state;
      }

      return {
        ...state,
        permissions: {
          ...state.permissions,
          [permission.id]: {
            ...state.permissions[permission.id],
            ...permission
          }
        }
      };
    }

    case PERMISSION_CONSTANTS.REMOVE_ITEM_SUCCESS: {
      const {permission} = data;

      if (!permission?.id) {
        return state;
      }

      const {[permission.id]: removed, ...remainingPermissions} = state.permissions;

      return {
        ...state,
        permissions: remainingPermissions
      };
    }

    case PERMISSION_CONSTANTS.ADD_ITEM_ERROR:
    case PERMISSION_CONSTANTS.GET_ITEM_ERROR:
    case PERMISSION_CONSTANTS.GET_LIST_ERROR:
    case PERMISSION_CONSTANTS.UPDATE_ITEM_ERROR:
    case PERMISSION_CONSTANTS.REMOVE_ITEM_ERROR:
    case PERMISSION_CONSTANTS.CHECK_PERMISSION_ERROR: {
      return {
        ...state,
        error: data.error
      };
    }

    default: {
      return state;
    }
  }
};

export const permissions = {
  action: permissionStore,
  initialState: defaultValues,
  name: 'permission'
};
