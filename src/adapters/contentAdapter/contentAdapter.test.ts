import {describe, expect, it} from 'vitest';

import {
  ContentInputType,
  ContentType,
  ContentValidationError,
  parseContent,
  parseContentFromDb,
  parseContentInput
} from './contentAdapter';

describe('contentAdapter', () => {
  describe('parseContent', () => {
    it('should parse valid content', () => {
      const content: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!'
      };

      const result = parseContent(content);

      expect(result).toEqual(content);
    });

    it('should parse content with all fields', () => {
      const content: ContentType = {
        _id: 'content/123',
        _key: '123',
        contentId: 'content-123',
        id: 'content-123',
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        description: 'Welcome message for new users',
        category: 'messages',
        isActive: true,
        userId: 'user-123'
      };

      const result = parseContent(content);

      // parseContent only validates, it doesn't transform the content
      // The validation removes the ArangoDB fields (_id, _key) and the id field
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('locale');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('contentId');
    });

    it('should throw ContentValidationError for missing key', () => {
      const invalidContent = {
        locale: 'en',
        content: 'Welcome to our application!'
      } as ContentType;

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for empty key', () => {
      const invalidContent: ContentType = {
        key: '',
        locale: 'en',
        content: 'Welcome to our application!'
      };

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for key too long', () => {
      const invalidContent: ContentType = {
        key: 'a'.repeat(201),
        locale: 'en',
        content: 'Welcome to our application!'
      };

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for invalid locale', () => {
      const invalidContent = {
        key: 'welcome_message',
        locale: 'invalid',
        content: 'Welcome to our application!'
      } as ContentType;

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for missing content', () => {
      const invalidContent = {
        key: 'welcome_message',
        locale: 'en'
      } as ContentType;

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for empty content', () => {
      const invalidContent: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: ''
      };

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for content too long', () => {
      const invalidContent: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'a'.repeat(10001)
      };

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for description too long', () => {
      const invalidContent: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        description: 'a'.repeat(501)
      };

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for category too long', () => {
      const invalidContent: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        category: 'a'.repeat(101)
      };

      expect(() => parseContent(invalidContent)).toThrow(ContentValidationError);
    });

    it('should validate all supported locales', () => {
      const locales = ['en', 'es', 'fr', 'de', 'pt', 'it'] as const;

      locales.forEach((locale) => {
        const content: ContentType = {
          key: 'welcome_message',
          locale,
          content: 'Welcome to our application!'
        };

        const result = parseContent(content);

        expect(result.locale).toBe(locale);
      });
    });
  });

  describe('parseContentInput', () => {
    it('should parse valid content input', () => {
      const contentInput: ContentInputType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!'
      };

      const result = parseContentInput(contentInput);

      expect(result).toEqual(contentInput);
    });

    it('should parse content input with all fields', () => {
      const contentInput: ContentInputType = {
        contentId: 'content-123',
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        description: 'Welcome message for new users',
        category: 'messages',
        isActive: true
      };

      const result = parseContentInput(contentInput);

      expect(result).toEqual(contentInput);
    });

    it('should parse content input without locale', () => {
      const contentInput: ContentInputType = {
        key: 'welcome_message',
        content: 'Welcome to our application!'
      };

      const result = parseContentInput(contentInput);

      expect(result).toEqual(contentInput);
    });

    it('should throw ContentValidationError for missing key', () => {
      const invalidContentInput = {
        locale: 'en',
        content: 'Welcome to our application!'
      } as ContentInputType;

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for empty key', () => {
      const invalidContentInput: ContentInputType = {
        key: '',
        locale: 'en',
        content: 'Welcome to our application!'
      };

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for key too long', () => {
      const invalidContentInput: ContentInputType = {
        key: 'a'.repeat(201),
        locale: 'en',
        content: 'Welcome to our application!'
      };

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for invalid locale', () => {
      const invalidContentInput = {
        key: 'welcome_message',
        locale: 'invalid',
        content: 'Welcome to our application!'
      } as ContentInputType;

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for missing content', () => {
      const invalidContentInput = {
        key: 'welcome_message',
        locale: 'en'
      } as ContentInputType;

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for empty content', () => {
      const invalidContentInput: ContentInputType = {
        key: 'welcome_message',
        locale: 'en',
        content: ''
      };

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for content too long', () => {
      const invalidContentInput: ContentInputType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'a'.repeat(10001)
      };

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for description too long', () => {
      const invalidContentInput: ContentInputType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        description: 'a'.repeat(501)
      };

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });

    it('should throw ContentValidationError for category too long', () => {
      const invalidContentInput: ContentInputType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        category: 'a'.repeat(101)
      };

      expect(() => parseContentInput(invalidContentInput)).toThrow(ContentValidationError);
    });
  });

  describe('parseContentFromDb', () => {
    it('should parse content from database with all fields', () => {
      const content: ContentType = {
        _id: 'content/123',
        _key: '123',
        contentId: 'content-123',
        id: 'content-123',
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        description: 'Welcome message for new users',
        category: 'messages',
        isActive: true,
        userId: 'user-123'
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('contentId');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('locale');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('userId');
    });

    it('should parse content from database with minimal fields', () => {
      const content: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!'
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('locale');
      expect(result).toHaveProperty('content');
      expect(result.key).toBe('welcome_message');
      expect(result.locale).toBe('en');
      expect(result.content).toBe('Welcome to our application!');
    });

    it('should handle content with only ID fields', () => {
      const content: ContentType = {
        _id: 'content/123',
        _key: '123',
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!'
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('contentId');
    });

    it('should handle long key', () => {
      const longKey = 'a'.repeat(250);
      const content: ContentType = {
        key: longKey,
        locale: 'en',
        content: 'Welcome to our application!'
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('key');
      expect(result.key.length).toBeLessThanOrEqual(200);
    });

    it('should handle long content', () => {
      const longContent = 'a'.repeat(12000);
      const content: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: longContent
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('content');
      expect(result.content.length).toBeLessThanOrEqual(10000);
    });

    it('should handle long description', () => {
      const longDescription = 'a'.repeat(600);
      const content: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        description: longDescription
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('description');
      expect(result.description!.length).toBeLessThanOrEqual(500);
    });

    it('should handle long category', () => {
      const longCategory = 'a'.repeat(150);
      const content: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        category: longCategory
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('category');
      expect(result.category!.length).toBeLessThanOrEqual(100);
    });

    it('should handle content with empty values', () => {
      const content: ContentType = {
        key: 'welcome_message',
        locale: 'en',
        content: 'Welcome to our application!',
        isActive: false
      };

      const result = parseContentFromDb(content);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isActive');
    });
  });

  describe('ContentValidationError', () => {
    it('should create ContentValidationError with message', () => {
      const error = new ContentValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ContentValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ContentValidationError');
    });

    it('should create ContentValidationError with message and field', () => {
      const error = new ContentValidationError('Test error', 'key');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('key');
    });
  });
});
