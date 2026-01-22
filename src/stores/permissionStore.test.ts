import {PERMISSION_CONSTANTS, permissionStore, defaultValues} from './permissionStore';

describe('permissionStore', () => {
  describe('ADD_ITEM_SUCCESS', () => {
    it('should add permission to state', () => {
      const permission = {
        id: 'perm1',
        permissionId: 'perm1',
        name: 'Read Posts',
        level: 1
      };

      const newState = permissionStore(PERMISSION_CONSTANTS.ADD_ITEM_SUCCESS, {permission}, defaultValues);

      expect(newState.permissions.perm1).toEqual(permission);
    });

    it('should not add permission without id', () => {
      const permission = {
        name: 'Read Posts',
        level: 1
      };

      const newState = permissionStore(PERMISSION_CONSTANTS.ADD_ITEM_SUCCESS, {permission}, defaultValues);

      expect(newState).toEqual(defaultValues);
    });
  });

  describe('GET_ITEM_SUCCESS', () => {
    it('should add permission to state', () => {
      const permission = {
        id: 'perm2',
        permissionId: 'perm2',
        name: 'Admin Access',
        level: 3
      };

      const newState = permissionStore(PERMISSION_CONSTANTS.GET_ITEM_SUCCESS, {permission}, defaultValues);

      expect(newState.permissions.perm2).toEqual(permission);
    });
  });

  describe('GET_LIST_SUCCESS', () => {
    it('should store user permissions', () => {
      const list = [
        {id: 'perm1', name: 'Read', level: 1},
        {id: 'perm2', name: 'Write', level: 2}
      ];
      const userId = 'user1';

      const newState = permissionStore(PERMISSION_CONSTANTS.GET_LIST_SUCCESS, {list, userId}, defaultValues);

      expect(newState.userPermissions.user1).toEqual(list);
    });

    it('should not store if list or userId is missing', () => {
      const newState = permissionStore(PERMISSION_CONSTANTS.GET_LIST_SUCCESS, {list: []}, defaultValues);
      expect(newState).toEqual(defaultValues);
    });
  });

  describe('UPDATE_ITEM_SUCCESS', () => {
    it('should update existing permission', () => {
      const initialState = {
        ...defaultValues,
        permissions: {
          perm1: {id: 'perm1', name: 'Old Name', level: 1}
        }
      };

      const permission = {
        id: 'perm1',
        name: 'New Name',
        level: 2
      };

      const newState = permissionStore(PERMISSION_CONSTANTS.UPDATE_ITEM_SUCCESS, {permission}, initialState);

      expect(newState.permissions.perm1.name).toBe('New Name');
      expect(newState.permissions.perm1.level).toBe(2);
    });
  });

  describe('REMOVE_ITEM_SUCCESS', () => {
    it('should remove permission from state', () => {
      const initialState = {
        ...defaultValues,
        permissions: {
          perm1: {id: 'perm1', name: 'Test', level: 1},
          perm2: {id: 'perm2', name: 'Test2', level: 2}
        }
      };

      const permission = {id: 'perm1'};

      const newState = permissionStore(PERMISSION_CONSTANTS.REMOVE_ITEM_SUCCESS, {permission}, initialState);

      expect(newState.permissions.perm1).toBeUndefined();
      expect(newState.permissions.perm2).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should store error on ADD_ITEM_ERROR', () => {
      const error = new Error('Add failed');

      const newState = permissionStore(PERMISSION_CONSTANTS.ADD_ITEM_ERROR, {error}, defaultValues);

      expect(newState.error).toEqual(error);
    });

    it('should store error on GET_LIST_ERROR', () => {
      const error = new Error('List fetch failed');

      const newState = permissionStore(PERMISSION_CONSTANTS.GET_LIST_ERROR, {error}, defaultValues);

      expect(newState.error).toEqual(error);
    });
  });

  describe('default case', () => {
    it('should return unchanged state for unknown action', () => {
      const newState = permissionStore('UNKNOWN_ACTION', {}, defaultValues);

      expect(newState).toEqual(defaultValues);
    });
  });
});
