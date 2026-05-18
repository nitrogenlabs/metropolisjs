import {formatTagOutput, parseTag, parseTagLegacy, TagValidationError, validateTagInput} from './tagAdapter';

describe('tagAdapter', () => {
  describe('validateTagInput', () => {
    it('should validate valid tag input', () => {
      const validTag = {
        tagId: 'tag1',
        name: 'Technology',
        description: 'Tech related content',
        category: 'tech',
        color: '#FF0000'
      };

      const result = validateTagInput(validTag);
      expect(result).toEqual(validTag);
    });

    it('should handle minimal tag input', () => {
      const minimalTag = {
        tagId: 'tag1',
        name: 'Technology'
      };

      const result = validateTagInput(minimalTag);
      expect(result).toEqual(minimalTag);
    });

    it('should throw TagValidationError for invalid input', () => {
      const invalidTag = {
        name: 123,
        tagId: 456
      } as unknown;

      expect(() => validateTagInput(invalidTag)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const tagWithExtra = {
        tagId: 'tag1',
        name: 'Technology',
        customField: 'value'
      };

      const result = validateTagInput(tagWithExtra);
      expect(result).toEqual(tagWithExtra);
    });
  });

  describe('parseTag', () => {
    it('should parse tag with all fields', () => {
      const tag = {
        _id: 'tags/tag1',
        _key: 'tag1',
        tagId: 'tag1',
        name: 'Technology',
        description: 'Tech related content',
        category: 'tech',
        color: '#007bff',
        active: true,
        featured: false,
        count: 100,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseTag(tag);
      expect(result.tagId).toBe('tag1');
      expect(result.name).toBe('Technology');
      expect(result.description).toBe('Tech related content');
      expect(result.category).toBe('tech');
      expect(result.color).toBe('#007bff');
      expect(result.active).toBe(true);
      expect(result.featured).toBe(false);
      expect(result.count).toBe(100);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle tag with minimal fields', () => {
      const minimalTag = {
        tagId: 'tag1',
        name: 'Technology'
      };

      const result = parseTag(minimalTag);
      expect(result.tagId).toBe('tag1');
      expect(result.name).toBe('Technology');
      expect(result.description).toBeUndefined();
      expect(result.category).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const tag = {
        _id: 'tags/tag1',
        _key: 'tag1',
        tagId: 'tag1',
        name: 'Technology'
      };

      const result = parseTag(tag);
      expect(result.id).toBe('tags/tag1');
      expect(result.tagId).toBe('tag1');
    });

    it('should handle boolean fields', () => {
      const tag = {
        tagId: 'tag1',
        name: 'Technology',
        active: true,
        featured: false
      };

      const result = parseTag(tag);
      expect(result.active).toBe(true);
      expect(result.featured).toBe(false);
    });

    it('should handle numeric fields', () => {
      const tag = {
        tagId: 'tag1',
        name: 'Technology',
        count: 100,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseTag(tag);
      expect(result.count).toBe(100);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('parses ids, tag ownership, user ownership, and legacy output', () => {
      const tag = {
        id: 'tags/tag-1',
        tagBy: 'personas/persona-1',
        tagId: 'tag-1',
        userId: 'users/user-1'
      };
      const result = parseTag(tag);

      expect(result).toEqual(expect.objectContaining({
        _id: 'tags/tag-1',
        _key: 'tag-1',
        id: 'tags/tag1',
        tagBy: 'personaspersona1',
        tagId: 'tag1',
        userId: 'usersuser1'
      }));
      expect(formatTagOutput(result)).toBe(result);
      expect(parseTagLegacy(tag).tagId).toBe('tag1');
    });

    it('preserves canonical id fields when parsed ids are unavailable', () => {
      expect(parseTag({id: 'tags/tag-2'})).toEqual(expect.objectContaining({
        _id: 'tags/tag-2',
        id: 'tags/tag2'
      }));
      expect(parseTag({tagId: 'tag-2'})).toEqual(expect.objectContaining({
        _key: 'tag-2',
        tagId: 'tag2'
      }));
    });
  });

  describe('TagValidationError', () => {
    it('should create error with message', () => {
      const error = new TagValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TagValidationError');
    });

    it('should create error with field', () => {
      const error = new TagValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
