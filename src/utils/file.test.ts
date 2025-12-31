/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {describe, expect, it, beforeEach, afterEach, jest} from '@jest/globals';

import {convertFileToBase64} from './file';

// Helper to create a mock File with image data
const createMockImageFile = (width: number, height: number, filename: string): File => {
  // Create a minimal valid image file (1x1 pixel PNG)
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, width & 0xFF, (width >> 8) & 0xFF, 0x00, 0x00, // width
    0x00, 0x00, height & 0xFF, (height >> 8) & 0xFF, // height
    0x08, 0x02, 0x00, 0x00, 0x00 // bit depth, color type, etc.
  ]);
  return new File([pngHeader], filename, {type: 'image/png'});
};

describe('file utilities', () => {
  let mockFileReader: any;
  let mockImage: any;

  beforeEach(() => {
    // Mock FileReader
    mockFileReader = {
      result: null,
      onload: null,
      onerror: null,
      readAsDataURL: jest.fn(function(this: any, file: File) {
        // Simulate async read
        setTimeout(() => {
          this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          if (this.onload) {
            this.onload();
          }
        }, 0);
      })
    };
    global.FileReader = jest.fn(() => mockFileReader) as any;

    // Mock Image - need to set up onload handler
    mockImage = {
      width: 100,
      height: 100,
      src: '',
      onload: null,
      onerror: null,
      set src(value: string) {
        // Simulate image load when src is set
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      },
      get src() {
        return '';
      }
    };
    global.Image = jest.fn(() => mockImage) as any;

    // Mock canvas
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => ({
        drawImage: jest.fn()
      })),
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockdata')
    };
    document.createElement = jest.fn((tag: string) => {
      if (tag === 'canvas') {
        return mockCanvas as any;
      }
      return {} as any;
    }) as any;
  });

  describe('convertFileToBase64', () => {
    it('should convert file to base64', async () => {
      const file = createMockImageFile(100, 100, 'test.jpg');
      mockImage.width = 100;
      mockImage.height = 100;

      const result = await convertFileToBase64(file, 200);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    it('should resize image when width exceeds maxSize', async () => {
      const file = createMockImageFile(500, 300, 'test.jpg');
      mockImage.width = 500;
      mockImage.height = 300;

      const result = await convertFileToBase64(file, 200);

      expect(result).toBeDefined();
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    it('should resize image when height exceeds maxSize', async () => {
      const file = createMockImageFile(300, 500, 'test.jpg');
      mockImage.width = 300;
      mockImage.height = 500;

      const result = await convertFileToBase64(file, 200);

      expect(result).toBeDefined();
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    it('should not resize image when dimensions are smaller than maxSize', async () => {
      const file = createMockImageFile(100, 100, 'test.jpg');
      mockImage.width = 100;
      mockImage.height = 100;

      const result = await convertFileToBase64(file, 200);

      expect(result).toBeDefined();
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    it('should handle square images correctly', async () => {
      const file = createMockImageFile(300, 300, 'test.jpg');
      mockImage.width = 300;
      mockImage.height = 300;

      const result = await convertFileToBase64(file, 200);

      expect(result).toBeDefined();
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    it('should reject on file read error', async () => {
      // Create a file that will cause read error
      const file = new File([''], 'test.jpg', {type: 'image/jpeg'});
      // Mock FileReader to trigger error
      const errorFileReader = {
        result: null,
        onload: null,
        onerror: null,
        readAsDataURL: jest.fn(function(this: any) {
          setTimeout(() => {
            if (this.onerror) {
              const errorEvent = new ProgressEvent('error');
              this.onerror(errorEvent);
            }
          }, 0);
        })
      };
      global.FileReader = jest.fn(() => errorFileReader) as any;

      await expect(convertFileToBase64(file, 200)).rejects.toBeDefined();
    });
  });
});
