import {describe, expect, it} from 'vitest';

import {
  PersonaValidationError,
  formatPersonaOutput,
  parsePersona,
  validatePersonaInput
} from './personaAdapter';

describe('personaAdapter', () => {
  describe('validatePersonaInput', () => {
    it('should validate valid persona input', () => {
      const validPersona = {
        active: true,
        gender: 'M',
        name: 'John Doe',
        userId: 'user-123'
      };

      const result = validatePersonaInput(validPersona);

      expect(result).toEqual(validPersona);
    });

    it('should validate persona with minimal input', () => {
      const minimalPersona = {
        name: 'Jane Doe'
      };

      const result = validatePersonaInput(minimalPersona);

      expect(result).toEqual(minimalPersona);
    });

    it('should validate persona with all fields', () => {
      const fullPersona = {
        _from: 'users/456',
        _id: 'personas/123',
        _key: '123',
        _oldRev: 'old-rev',
        _rev: 'new-rev',
        _to: 'posts/789',
        active: true,
        gender: 'F',
        hasLike: true,
        hasView: false,
        id: 'persona-123',
        imageCount: 5,
        imageId: 'image-123',
        imageUrl: 'https://example.com/persona.jpg',
        images: [{url: 'https://example.com/image.jpg'}],
        likeCount: 42,
        name: 'Jane Smith',
        personaId: 'persona-123',
        tags: [{name: 'developer'}],
        thumbUrl: 'https://example.com/thumb.jpg',
        userId: 'user-123',
        viewCount: 100
      };

      const result = validatePersonaInput(fullPersona);

      expect(result).toEqual(fullPersona);
    });

    it('should throw PersonaValidationError for invalid gender', () => {
      const invalidPersona = {
        gender: 'INVALID',
        name: 'John Doe'
      };

      expect(() => validatePersonaInput(invalidPersona)).toThrow(PersonaValidationError);
    });

    it('should throw PersonaValidationError for name too long', () => {
      const invalidPersona = {
        name: 'a'.repeat(65)
      };

      expect(() => validatePersonaInput(invalidPersona)).toThrow(PersonaValidationError);
    });

    it('should handle empty object', () => {
      const result = validatePersonaInput({});

      expect(result).toEqual({});
    });

    it('should handle null and undefined values', () => {
      const personaWithUndefined = {
        name: undefined,
        gender: undefined,
        active: undefined
      };

      const result = validatePersonaInput(personaWithUndefined);

      expect(result).toEqual(personaWithUndefined);
    });

    it('should validate boolean fields', () => {
      const persona = {
        active: false,
        hasLike: true,
        hasView: false
      };

      const result = validatePersonaInput(persona);

      expect(result).toEqual(persona);
    });

    it('should validate numeric fields', () => {
      const persona = {
        imageCount: 10,
        likeCount: 25,
        viewCount: 150
      };

      const result = validatePersonaInput(persona);

      expect(result).toEqual(persona);
    });

    it('should validate array fields', () => {
      const persona = {
        images: [{id: 'img1'}, {id: 'img2'}],
        tags: [{name: 'tag1'}, {name: 'tag2'}]
      };

      const result = validatePersonaInput(persona);

      expect(result).toEqual(persona);
    });
  });

  describe('formatPersonaOutput', () => {
    it('should return persona as-is', () => {
      const persona = {
        active: true,
        gender: 'M',
        name: 'John Doe'
      };

      const result = formatPersonaOutput(persona);

      expect(result).toBe(persona);
    });

    it('should handle empty persona', () => {
      const result = formatPersonaOutput({});

      expect(result).toEqual({});
    });
  });

  describe('parsePersona', () => {
    it('should parse persona with all fields', () => {
      const persona = {
        _id: 'personas/123',
        _key: '123',
        active: true,
        gender: 'M',
        hasLike: true,
        hasView: false,
        imageCount: 5,
        imageId: 'image-123',
        imageUrl: 'https://example.com/persona.jpg',
        images: [{url: 'https://example.com/image.jpg'}],
        likeCount: 42,
        name: 'John Doe',
        personaId: 'persona-123',
        tags: [{name: 'developer'}],
        thumbUrl: 'https://example.com/thumb.jpg',
        userId: 'user-123',
        viewCount: 100
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('personaId');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('gender');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('hasLike');
      expect(result).toHaveProperty('hasView');
      expect(result).toHaveProperty('imageCount');
      expect(result).toHaveProperty('likeCount');
      expect(result).toHaveProperty('viewCount');
      expect(result).toHaveProperty('userId');
    });

    it('should parse persona with minimal fields', () => {
      const persona = {
        name: 'Jane Doe'
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Jane Doe');
    });

    it('should handle persona with only ID fields', () => {
      const persona = {
        _id: 'personas/123',
        _key: '123'
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('personaId');
    });

    it('should handle boolean fields', () => {
      const persona = {
        active: 'true',
        hasLike: 'false',
        hasView: 'true',
        name: 'John Doe'
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('hasLike');
      expect(result).toHaveProperty('hasView');
      expect(typeof result.active).toBe('boolean');
      expect(typeof result.hasLike).toBe('boolean');
      expect(typeof result.hasView).toBe('boolean');
    });

    it('should handle numeric fields', () => {
      const persona = {
        imageCount: '10',
        likeCount: '25',
        name: 'John Doe',
        viewCount: '150'
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('imageCount');
      expect(result).toHaveProperty('likeCount');
      expect(result).toHaveProperty('viewCount');
      expect(typeof result.imageCount).toBe('number');
      expect(typeof result.likeCount).toBe('number');
      expect(typeof result.viewCount).toBe('number');
    });

    it('should handle long name', () => {
      const longName = 'a'.repeat(100);
      const persona = {
        name: longName
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('name');
      expect(result.name.length).toBeLessThanOrEqual(64);
    });

    it('should handle long gender', () => {
      const persona = {
        gender: 'MALE',
        name: 'John Doe'
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('gender');
      expect(result.gender.length).toBeLessThanOrEqual(1);
    });

    it('should handle images array', () => {
      const persona = {
        images: [
          {url: 'https://example.com/img1.jpg'},
          {url: 'https://example.com/img2.jpg'}
        ],
        name: 'John Doe'
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('images');
      expect(Array.isArray(result.images)).toBe(true);
    });

    it('should handle tags array', () => {
      const persona = {
        name: 'John Doe',
        tags: [
          {name: 'developer'},
          {name: 'designer'}
        ]
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('tags');
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should handle empty arrays', () => {
      const persona = {
        images: [],
        name: 'John Doe',
        tags: []
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('name');
      expect(result.name).toBe('John Doe');
    });

    it('should handle persona with empty values', () => {
      const persona = {
        name: 'John Doe',
        gender: 'M',
        active: false,
        imageCount: 0,
        likeCount: 0,
        viewCount: 0
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('imageCount');
      expect(result).toHaveProperty('likeCount');
      expect(result).toHaveProperty('viewCount');
    });

    it('should preserve URL fields', () => {
      const persona = {
        imageUrl: 'https://example.com/persona.jpg',
        name: 'John Doe',
        thumbUrl: 'https://example.com/thumb.jpg'
      };

      const result = parsePersona(persona);

      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('thumbUrl');
      expect(result.imageUrl).toBe(persona.imageUrl);
      expect(result.thumbUrl).toBe(persona.thumbUrl);
    });

    it('parses relationship and count fields', () => {
      const result = parsePersona({
        afterglow: 2,
        birthdate: 123456,
        followerCount: 3,
        followingCount: 4,
        id: 'personas/persona-1',
        isBlocked: 0 as any,
        isFollowedBy: 1 as any,
        isFollowing: 1 as any,
        isFriend: 0 as any,
        latitude: 30.25,
        location: 'Austin',
        longitude: -97.75,
        personaId: 'persona-1'
      });

      expect(result).toEqual(expect.objectContaining({
        afterglow: 2,
        birthdate: 123456,
        followerCount: 3,
        followingCount: 4,
        id: 'personas/persona1',
        isBlocked: false,
        isFollowedBy: true,
        isFollowing: true,
        isFriend: false,
        latitude: 30.25,
        location: 'Austin',
        longitude: -97.75,
        personaId: 'persona1'
      }));
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parsePersona(null as any)).toThrow(PersonaValidationError);
    });
  });

  describe('PersonaValidationError', () => {
    it('should create PersonaValidationError with message', () => {
      const error = new PersonaValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PersonaValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('PersonaValidationError');
    });

    it('should create PersonaValidationError with message and field', () => {
      const error = new PersonaValidationError('Test error', 'name');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('name');
    });
  });
});
