/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { GroupValidationError, parseGroup, validateGroupInput } from './groupAdapter.js';

describe('groupAdapter', () => {
  describe('validateGroupInput', () => {
    it('should validate valid group input', () => {
      const input = {
        name: 'Test Group',
        description: 'A test group',
        ownerId: 'user123'
      };

      const result = validateGroupInput(input);
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Group');
      expect(result.description).toBe('A test group');
      expect(result.ownerId).toBe('user123');
    });

    it('should accept partial group input', () => {
      const input = {
        name: 'Minimal Group'
      };

      const result = validateGroupInput(input);
      expect(result).toBeDefined();
      expect(result.name).toBe('Minimal Group');
    });

    it('should accept empty object', () => {
      const result = validateGroupInput({});
      expect(result).toBeDefined();
    });

    it('should allow extra properties (loose mode)', () => {
      const input = {
        name: 'Test Group',
        customField: 'custom value'
      };

      const result = validateGroupInput(input);
      expect(result).toBeDefined();
      expect((result as any).customField).toBe('custom value');
    });
  });

  describe('parseGroup', () => {
    it('should parse a complete group object', () => {
      const item = {
        groupId: 'group123',
        name: 'Test Group',
        description: 'A test group',
        ownerId: 'user123',
        privacy: 'public',
        created: 1234567890,
        updated: 1234567900,
        userCount: 10
      };

      const result = parseGroup(item);
      expect(result).toBeDefined();
      expect(result.groupId).toBe('group123');
      expect(result.name).toBe('Test Group');
      expect(result.ownerId).toBe('user123');
    });

    it('should parse group with tags', () => {
      const item = {
        groupId: 'group123',
        name: 'Test Group',
        tags: [
          {tagId: 'tag1', name: 'important'},
          {tagId: 'tag2', name: 'feature'}
        ]
      };

      const result = parseGroup(item);
      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should handle missing fields gracefully', () => {
      const item = {
        groupId: 'group123',
        name: 'Test Group'
      };

      const result = parseGroup(item);
      expect(result).toBeDefined();
      expect(result.groupId).toBe('group123');
    });

    it('parses optional identity, image, type, dates, and count fields', () => {
      const result = parseGroup({
        _id: 'groups/group-1',
        _key: 'group-1',
        added: 1000,
        groupId: 'group-1',
        imageId: 'images/image-1',
        modified: 2000,
        name: 'Group',
        ownerId: 'users/user-1',
        privacy: 'private',
        type: 'community',
        userCount: 12
      });

      expect(result).toEqual(expect.objectContaining({
        groupId: 'group1',
        imageId: 'imagesimage1',
        ownerId: 'usersuser1',
        type: 'community',
        userCount: 12
      }));
    });

    it('throws validation errors for invalid group input', () => {
      expect(() => validateGroupInput({tags: 'bad'} as any)).toThrow(GroupValidationError);
    });
  });

  describe('GroupValidationError', () => {
    it('should create validation error with message and field', () => {
      const error = new GroupValidationError('Invalid group name', 'name');
      expect(error.message).toBe('Invalid group name');
      expect(error.field).toBe('name');
      expect(error.name).toBe('GroupValidationError');
    });
  });
});
