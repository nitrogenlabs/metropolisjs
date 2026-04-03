import {describe, expect, it} from 'vitest';

import {
  ReaktorValidationError,
  parseReaktorContent,
  parseReaktorDate,
  parseReaktorItemId,
  parseReaktorName,
  parseReaktorType,
  parseReaktorUrl,
  validateReaktorContent,
  validateReaktorDate,
  validateReaktorItemId,
  validateReaktorName,
  validateReaktorType,
  validateReaktorUrl
} from './reaktorAdapter';

describe('reaktorAdapter', () => {
  describe('parseReaktorContent', () => {
    it('should parse valid content', () => {
      const content = 'This is valid content';
      const result = parseReaktorContent(content);

      expect(result).toBe(content);
    });

    it('should parse content with custom length', () => {
      const content = 'Short content';
      const result = parseReaktorContent(content, 100);

      expect(result).toBe(content);
    });

    it('should return undefined for empty content', () => {
      const result = parseReaktorContent('');

      expect(result).toBeUndefined();
    });

    it('should return undefined for null content', () => {
      const result = parseReaktorContent(null as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined content', () => {
      const result = parseReaktorContent(undefined);

      expect(result).toBeUndefined();
    });

    it('should truncate long content', () => {
      const longContent = 'a'.repeat(600);
      const result = parseReaktorContent(longContent, 500);

      expect(result).toBe(longContent.substring(0, 500));
    });
  });

  describe('parseReaktorDate', () => {
    it('should parse valid date', () => {
      const date = 1640995200000;
      const result = parseReaktorDate(date);

      expect(result).toBe(date);
    });

    it('should return undefined for zero date', () => {
      const result = parseReaktorDate(0);

      expect(result).toBeUndefined();
    });

    it('should return undefined for null date', () => {
      const result = parseReaktorDate(null as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined date', () => {
      const result = parseReaktorDate(undefined);

      expect(result).toBeUndefined();
    });

    it('should handle string date', () => {
      const date = '1640995200000';
      const result = parseReaktorDate(date as any);

      expect(result).toBe(1640995200000);
    });
  });

  describe('parseReaktorItemId', () => {
    it('should parse valid item ID', () => {
      const itemId = 'item-123';
      const result = parseReaktorItemId(itemId);

      expect(result).toBe('item123'); // parseId removes hyphens
    });

    it('should return undefined for empty item ID', () => {
      const result = parseReaktorItemId('');

      expect(result).toBeUndefined();
    });

    it('should return undefined for null item ID', () => {
      const result = parseReaktorItemId(null as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined item ID', () => {
      const result = parseReaktorItemId(undefined);

      expect(result).toBeUndefined();
    });

    it('should handle numeric item ID', () => {
      const itemId = '123';
      const result = parseReaktorItemId(itemId);

      expect(result).toBe(itemId);
    });
  });

  describe('parseReaktorName', () => {
    it('should parse valid name', () => {
      const name = 'John Doe';
      const result = parseReaktorName(name);

      expect(result).toBe(name);
    });

    it('should return undefined for empty name', () => {
      const result = parseReaktorName('');

      expect(result).toBeUndefined();
    });

    it('should return undefined for null name', () => {
      const result = parseReaktorName(null as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined name', () => {
      const result = parseReaktorName(undefined);

      expect(result).toBeUndefined();
    });

    it('should truncate long name', () => {
      const longName = 'a'.repeat(200);
      const result = parseReaktorName(longName);

      expect(result).toBe(longName.substring(0, 160));
    });
  });

  describe('parseReaktorType', () => {
    it('should parse valid type', () => {
      const type = 'post';
      const result = parseReaktorType(type);

      expect(result).toBe(type);
    });

    it('should return undefined for empty type', () => {
      const result = parseReaktorType('');

      expect(result).toBeUndefined();
    });

    it('should return undefined for null type', () => {
      const result = parseReaktorType(null as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined type', () => {
      const result = parseReaktorType(undefined);

      expect(result).toBeUndefined();
    });

    it('should truncate long type', () => {
      const longType = 'a'.repeat(200);
      const result = parseReaktorType(longType);

      expect(result).toBe(longType.substring(0, 160));
    });
  });

  describe('parseReaktorUrl', () => {
    it('should parse valid URL', () => {
      const url = 'https://example.com';
      const result = parseReaktorUrl(url);

      expect(result).toBe(url);
    });

    it('should return undefined for empty URL', () => {
      const result = parseReaktorUrl('');

      expect(result).toBeUndefined();
    });

    it('should return undefined for null URL', () => {
      const result = parseReaktorUrl(null as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined URL', () => {
      const result = parseReaktorUrl(undefined);

      expect(result).toBeUndefined();
    });

    it('should handle HTTP URL', () => {
      const url = 'http://example.com';
      const result = parseReaktorUrl(url);

      expect(result).toBe(url);
    });

    it('should handle URL with path', () => {
      const url = 'https://example.com/path/to/resource';
      const result = parseReaktorUrl(url);

      expect(result).toBe(url);
    });
  });

  describe('validateReaktorContent', () => {
    it('should validate valid content', () => {
      const content = 'This is valid content';
      const result = validateReaktorContent(content);

      expect(result).toBe(content);
    });

    it('should validate content with custom length', () => {
      const content = 'Short content';
      const result = validateReaktorContent(content, 100);

      expect(result).toBe(content);
    });

    it('should return undefined for empty content', () => {
      const result = validateReaktorContent('');

      expect(result).toBeUndefined();
    });

    it('should handle long content by truncating', () => {
      const invalidContent = 'a'.repeat(600);
      const result = validateReaktorContent(invalidContent, 500);

      expect(result).toBe(invalidContent.substring(0, 500));
    });
  });

  describe('validateReaktorDate', () => {
    it('should validate valid date', () => {
      const date = 1640995200000;
      const result = validateReaktorDate(date);

      expect(result).toBe(date);
    });

    it('should return undefined for zero date', () => {
      const result = validateReaktorDate(0);

      expect(result).toBeUndefined();
    });

    it('should handle string date input', () => {
      const date = '1640995200000';
      const result = validateReaktorDate(date as any);

      expect(result).toBe(1640995200000);
    });
  });

  describe('validateReaktorItemId', () => {
    it('should validate valid item ID', () => {
      const itemId = 'item-123';
      const result = validateReaktorItemId(itemId);

      expect(result).toBe('item123'); // parseId removes hyphens
    });

    it('should return undefined for empty item ID', () => {
      const result = validateReaktorItemId('');

      expect(result).toBeUndefined();
    });

    it('should handle long item ID by truncating', () => {
      const invalidItemId = 'a'.repeat(200);
      const result = validateReaktorItemId(invalidItemId);

      expect(result).toBeDefined();
      expect(result!.length).toBeLessThanOrEqual(32);
    });
  });

  describe('validateReaktorName', () => {
    it('should validate valid name', () => {
      const name = 'John Doe';
      const result = validateReaktorName(name);

      expect(result).toBe(name);
    });

    it('should return undefined for empty name', () => {
      const result = validateReaktorName('');

      expect(result).toBeUndefined();
    });

    it('should handle long name by truncating', () => {
      const invalidName = 'a'.repeat(200);
      const result = validateReaktorName(invalidName);

      expect(result).toBeDefined();
      expect(result!.length).toBeLessThanOrEqual(160);
    });
  });

  describe('validateReaktorType', () => {
    it('should validate valid type', () => {
      const type = 'post';
      const result = validateReaktorType(type);

      expect(result).toBe(type);
    });

    it('should return undefined for empty type', () => {
      const result = validateReaktorType('');

      expect(result).toBeUndefined();
    });

    it('should handle long type by truncating', () => {
      const invalidType = 'a'.repeat(200);
      const result = validateReaktorType(invalidType);

      expect(result).toBeDefined();
      expect(result!.length).toBeLessThanOrEqual(160);
    });
  });

  describe('validateReaktorUrl', () => {
    it('should validate valid URL', () => {
      const url = 'https://example.com';
      const result = validateReaktorUrl(url);

      expect(result).toBe(url);
    });

    it('should return undefined for empty URL', () => {
      const result = validateReaktorUrl('');

      expect(result).toBeUndefined();
    });

    it('should handle invalid URL gracefully', () => {
      const invalidUrl = 'not-a-valid-url';
      const result = validateReaktorUrl(invalidUrl);

      expect(result).toBeDefined();
    });
  });

  describe('ReaktorValidationError', () => {
    it('should create ReaktorValidationError with message', () => {
      const error = new ReaktorValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ReaktorValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ReaktorValidationError');
    });

    it('should create ReaktorValidationError with message and field', () => {
      const error = new ReaktorValidationError('Test error', 'content');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('content');
    });
  });
});
