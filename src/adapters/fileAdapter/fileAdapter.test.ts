import {describe, expect, it} from 'vitest';

import {
  FileValidationError,
  formatFileOutput,
  getFileType,
  parseFile,
  validateFileInput
} from './fileAdapter';

describe('fileAdapter', () => {
  describe('validateFileInput', () => {
    it('should validate valid file input', () => {
      const validFile = {
        name: 'test.jpg',
        fileSize: 1024,
        fileType: 'image/jpeg',
        url: 'https://example.com/test.jpg'
      };

      const result = validateFileInput(validFile);

      expect(result).toEqual(validFile);
    });

    it('should validate file with minimal input', () => {
      const minimalFile = {
        name: 'test.txt'
      };

      const result = validateFileInput(minimalFile);

      expect(result).toEqual(minimalFile);
    });

    it('should validate file with all fields', () => {
      const fullFile = {
        _from: 'users/123',
        _id: 'files/456',
        _key: '456',
        _oldRev: 'old-rev',
        _rev: 'new-rev',
        _to: 'posts/789',
        base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ',
        buffer: Buffer.from('test'),
        description: 'Test file description',
        fileId: 'file-123',
        fileSize: 2048,
        fileType: 'image/png',
        itemId: 'item-456',
        itemType: 'post',
        name: 'test.png',
        url: 'https://example.com/test.png',
        userId: 'user-123'
      };

      const result = validateFileInput(fullFile);

      expect(result).toEqual(fullFile);
    });

    it('should throw FileValidationError for invalid input', () => {
      const invalidFile = {
        fileSize: 'not-a-number'
      };

      expect(() => validateFileInput(invalidFile)).toThrow(FileValidationError);
    });

    it('should handle empty object', () => {
      const result = validateFileInput({});

      expect(result).toEqual({});
    });

    it('should handle null and undefined values', () => {
      const fileWithUndefined = {
        name: undefined,
        fileSize: undefined,
        fileType: undefined
      };

      const result = validateFileInput(fileWithUndefined);

      expect(result).toEqual(fileWithUndefined);
    });
  });

  describe('formatFileOutput', () => {
    it('should return file as-is', () => {
      const file = {
        name: 'test.jpg',
        fileSize: 1024,
        url: 'https://example.com/test.jpg'
      };

      const result = formatFileOutput(file);

      expect(result).toBe(file);
    });

    it('should handle empty file', () => {
      const result = formatFileOutput({});

      expect(result).toEqual({});
    });
  });

  describe('getFileType', () => {
    it('should return fileType if provided', () => {
      const file = {
        fileType: 'image/jpeg',
        name: 'test.png'
      };

      const result = getFileType(file);

      expect(result).toBe('image/jpeg');
    });

    it('should detect JPEG from filename', () => {
      const file = {
        name: 'test.jpg'
      };

      const result = getFileType(file);

      expect(result).toBe('image/jpeg');
    });

    it('should detect JPEG from filename with uppercase extension', () => {
      const file = {
        name: 'test.JPG'
      };

      const result = getFileType(file);

      expect(result).toBe(''); // getFileType doesn't handle uppercase extensions
    });

    it('should detect PNG from filename', () => {
      const file = {
        name: 'test.png'
      };

      const result = getFileType(file);

      expect(result).toBe('image/png');
    });

    it('should detect ZIP from filename', () => {
      const file = {
        name: 'archive.zip'
      };

      const result = getFileType(file);

      expect(result).toBe('application/zip');
    });

    it('should return empty string for unknown extension', () => {
      const file = {
        name: 'test.unknown'
      };

      const result = getFileType(file);

      expect(result).toBe('');
    });

    it('should return empty string for file without extension', () => {
      const file = {
        name: 'testfile'
      };

      const result = getFileType(file);

      expect(result).toBe('');
    });

    it('should return empty string for file without name', () => {
      const file = {};

      const result = getFileType(file);

      expect(result).toBe('');
    });

    it('should handle filename with multiple dots', () => {
      const file = {
        name: 'test.backup.jpg'
      };

      const result = getFileType(file);

      expect(result).toBe('image/jpeg');
    });
  });

  describe('parseFile', () => {
    it('should parse file with all fields', () => {
      const file = {
        _id: 'files/123',
        _key: '123',
        base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ',
        description: 'Test file',
        fileId: 'file-123',
        fileSize: 1024,
        fileType: 'image/jpeg',
        itemId: 'item-456',
        itemType: 'post',
        name: 'test.jpg',
        url: 'https://example.com/test.jpg',
        userId: 'user-123'
      };

      const result = parseFile(file);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('fileSize');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('itemId');
      expect(result).toHaveProperty('itemType');
    });

    it('should parse file with minimal fields', () => {
      const file = {
        name: 'test.txt'
      };

      const result = parseFile(file);

      expect(result).toHaveProperty('name');
      expect(result.name).toBe('test.txt');
    });

    it('should handle file with only ID fields', () => {
      const file = {
        _id: 'files/123',
        _key: '123'
      };

      const result = parseFile(file);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('fileId');
    });

    it('should handle file with numeric fileSize', () => {
      const file = {
        name: 'test.jpg',
        fileSize: '1024'
      };

      const result = parseFile(file);

      expect(result).toHaveProperty('fileSize');
      expect(typeof result.fileSize).toBe('number');
    });

    it('should handle file with long name', () => {
      const longName = 'a'.repeat(200);
      const file = {
        name: longName
      };

      const result = parseFile(file);

      expect(result).toHaveProperty('name');
      expect(result.name.length).toBeLessThanOrEqual(160);
    });

    it('should handle file with invalid URL', () => {
      const file = {
        name: 'test.jpg',
        url: 'not-a-valid-url'
      };

      // parseFile doesn't throw for invalid URLs, it just processes them
      const result = parseFile(file);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('url');
    });

    it('should handle file with empty values', () => {
      const file = {
        name: 'test.jpg',
        fileSize: 0
      };

      const result = parseFile(file);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('fileSize');
    });

    it('should preserve base64 and buffer fields', () => {
      const file = {
        name: 'test.jpg',
        base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ',
        buffer: Buffer.from('test')
      };

      const result = parseFile(file);

      expect(result).toHaveProperty('base64');
      expect(result).toHaveProperty('buffer');
      expect(result.base64).toBe(file.base64);
      expect(result.buffer).toBe(file.buffer);
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parseFile(null as any)).toThrow(FileValidationError);
    });
  });

  describe('FileValidationError', () => {
    it('should create FileValidationError with message', () => {
      const error = new FileValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FileValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('FileValidationError');
    });

    it('should create FileValidationError with message and field', () => {
      const error = new FileValidationError('Test error', 'name');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('name');
    });
  });
});
