import {formatImageOutput, ImageValidationError, parseImage, validateImageInput} from './imageAdapter';

describe('imageAdapter', () => {
  describe('validateImageInput', () => {
    it('should validate valid image input', () => {
      const validImage = {
        imageId: 'image1',
        name: 'test-image.jpg',
        url: 'https://example.com/image.jpg',
        width: 1920,
        height: 1080,
        fileType: 'image/jpeg',
        size: 1024000
      };

      const result = validateImageInput(validImage);
      expect(result).toEqual(validImage);
    });

    it('should handle minimal image input', () => {
      const minimalImage = {
        imageId: 'image1',
        name: 'test-image.jpg'
      };

      const result = validateImageInput(minimalImage);
      expect(result).toEqual(minimalImage);
    });

    it('should throw ImageValidationError for invalid input', () => {
      const invalidImage = {
        imageId: 'image1',
        width: 'invalid'
      } as unknown;

      expect(() => validateImageInput(invalidImage)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const imageWithExtra = {
        imageId: 'image1',
        name: 'test-image.jpg',
        customField: 'value'
      };

      const result = validateImageInput(imageWithExtra);
      expect(result).toEqual(imageWithExtra);
    });
  });

  describe('parseImage', () => {
    it('should parse image with all fields', () => {
      const image = {
        _id: 'images/image1',
        _key: 'image1',
        imageId: 'image1',
        name: 'test-image.jpg',
        url: 'https://example.com/image.jpg',
        thumb: 'https://example.com/thumb.jpg',
        width: 1920,
        height: 1080,
        size: 1024000,
        format: 'jpeg',
        iso: 100,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseImage(image);
      expect(result.imageId).toBe('image1');
      expect(result.name).toBe('test-image.jpg');
      expect(result.url).toBe('https://example.com/image.jpg');
      expect(result.thumb).toBe('https://example.com/thumb.jpg');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.size).toBe(1024000);
      expect(result.format).toBe('jpeg');
      expect(result.iso).toBe(100);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle image with minimal fields', () => {
      const minimalImage = {
        imageId: 'image1',
        name: 'test-image.jpg'
      };

      const result = parseImage(minimalImage);
      expect(result.imageId).toBe('image1');
      expect(result.name).toBe('test-image.jpg');
      expect(result.url).toBeUndefined();
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
      expect(result.size).toBeUndefined();
      expect(result.format).toBeUndefined();
      expect(result.iso).toBeUndefined();
      expect(result.cached).toBeUndefined();
      expect(result.modified).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const image = {
        _id: 'images/image1',
        _key: 'image1',
        imageId: 'image1',
        name: 'test-image.jpg'
      };

      const result = parseImage(image);
      expect(result.id).toBe('images/image1');
      expect(result.imageId).toBe('image1');
    });

    it('should handle numeric fields', () => {
      const image = {
        imageId: 'image1',
        name: 'test-image.jpg',
        width: 1920,
        height: 1080,
        size: 1024000,
        iso: 100,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseImage(image);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.size).toBe(1024000);
      expect(result.iso).toBe(100);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('formats image output and parses media metadata', () => {
      const file = new File(['image'], 'image.jpg', {type: 'image/jpeg'});
      const image = {
        base64: 'base64',
        bucket: 'images',
        color: '#fff',
        description: 'A sample image',
        file,
        imageId: 'image-1',
        itemId: 'posts/post-1',
        itemType: 'posts',
        make: 'Canon',
        model: 'EOS',
        privacy: 'public',
        s3Options: {acl: 'public-read'},
        taken: 1234567890,
        type: 'image',
        fileType: 'image/jpeg'
      };
      const result = parseImage(image);

      expect(formatImageOutput(result)).toBe(result);
      expect(result).toEqual(expect.objectContaining({
        base64: 'base64',
        bucket: 'images',
        color: '#fff',
        description: 'A sample image',
        file,
        imageId: 'image1',
        itemId: 'postspost1',
        itemType: 'posts',
        make: 'Canon',
        model: 'EOS',
        privacy: 'public',
        s3Options: {acl: 'public-read'},
        taken: 1234567890,
        type: 'image',
        fileType: 'image/jpeg'
      }));
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parseImage(null as any)).toThrow(ImageValidationError);
    });
  });

  describe('ImageValidationError', () => {
    it('should create error with message', () => {
      const error = new ImageValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ImageValidationError');
    });

    it('should create error with field', () => {
      const error = new ImageValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
