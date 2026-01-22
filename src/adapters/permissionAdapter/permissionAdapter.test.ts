import {
  getPermissionLevelName,
  hasPermission,
  isAdmin,
  isGuest,
  isModerator,
  isSuperAdmin,
  isUser,
  parsePermission,
  PermissionLevel,
  PermissionValidationError,
  validatePermissionInput
} from './permissionAdapter';

describe('permissionAdapter', () => {
  describe('validatePermissionInput', () => {
    it('should validate valid permission input', () => {
      const validPermission = {
        permissionId: 'perm1',
        name: 'Read Posts',
        level: 1,
        resource: 'posts',
        userId: 'user1'
      };

      const result = validatePermissionInput(validPermission);
      expect(result).toEqual(validPermission);
    });

    it('should handle minimal permission input', () => {
      const minimalPermission = {
        permissionId: 'perm1',
        level: 0
      };

      const result = validatePermissionInput(minimalPermission);
      expect(result).toEqual(minimalPermission);
    });

    it('should throw PermissionValidationError for invalid level', () => {
      const invalidPermission = {
        permissionId: 'perm1',
        level: 10
      };

      expect(() => validatePermissionInput(invalidPermission)).toThrow();
    });

    it('should handle additional properties', () => {
      const permissionWithExtra = {
        permissionId: 'perm1',
        level: 2,
        customField: 'value'
      };

      const result = validatePermissionInput(permissionWithExtra);
      expect(result).toEqual(permissionWithExtra);
    });
  });

  describe('parsePermission', () => {
    it('should parse permission with all fields', () => {
      const permission = {
        _id: 'permissions/perm1',
        _key: 'perm1',
        permissionId: 'perm1',
        name: 'Admin Access',
        level: 3,
        resource: 'users',
        userId: 'user1',
        roleId: 'role1',
        description: 'Full admin access',
        type: 'role',
        added: 1234567890,
        updated: 1234567890
      };

      const result = parsePermission(permission);
      expect(result.permissionId).toBe('perm1');
      expect(result.name).toBe('Admin Access');
      expect(result.level).toBe(3);
      expect(result.resource).toBe('users');
      expect(result.userId).toBe('user1');
      expect(result.roleId).toBe('role1');
    });

    it('should handle permission with minimal fields', () => {
      const minimalPermission = {
        permissionId: 'perm1',
        level: 0
      };

      const result = parsePermission(minimalPermission);
      expect(result.permissionId).toBe('perm1');
      expect(result.level).toBe(0);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user level meets requirement', () => {
      expect(hasPermission(3, PermissionLevel.USER)).toBe(true);
      expect(hasPermission(2, PermissionLevel.MODERATOR)).toBe(true);
      expect(hasPermission(4, PermissionLevel.SUPER_ADMIN)).toBe(true);
    });

    it('should return false when user level is below requirement', () => {
      expect(hasPermission(0, PermissionLevel.USER)).toBe(false);
      expect(hasPermission(1, PermissionLevel.MODERATOR)).toBe(false);
      expect(hasPermission(2, PermissionLevel.SUPER_ADMIN)).toBe(false);
    });
  });

  describe('permission level helpers', () => {
    it('isGuest should identify guest level', () => {
      expect(isGuest(0)).toBe(true);
      expect(isGuest(1)).toBe(false);
    });

    it('isUser should identify user level and above', () => {
      expect(isUser(0)).toBe(false);
      expect(isUser(1)).toBe(true);
      expect(isUser(2)).toBe(true);
    });

    it('isModerator should identify moderator level and above', () => {
      expect(isModerator(1)).toBe(false);
      expect(isModerator(2)).toBe(true);
      expect(isModerator(3)).toBe(true);
    });

    it('isAdmin should identify admin level and above', () => {
      expect(isAdmin(2)).toBe(false);
      expect(isAdmin(3)).toBe(true);
      expect(isAdmin(4)).toBe(true);
    });

    it('isSuperAdmin should identify super admin level only', () => {
      expect(isSuperAdmin(3)).toBe(false);
      expect(isSuperAdmin(4)).toBe(true);
    });
  });

  describe('getPermissionLevelName', () => {
    it('should return correct names for each level', () => {
      expect(getPermissionLevelName(0)).toBe('Guest');
      expect(getPermissionLevelName(1)).toBe('User');
      expect(getPermissionLevelName(2)).toBe('Moderator');
      expect(getPermissionLevelName(3)).toBe('Admin');
      expect(getPermissionLevelName(4)).toBe('Super Admin');
    });

    it('should return Unknown for invalid levels', () => {
      expect(getPermissionLevelName(10)).toBe('Unknown');
      expect(getPermissionLevelName(-1)).toBe('Unknown');
    });
  });
});
