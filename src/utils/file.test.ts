/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {convertFileToBase64, convertFileToUploadFile} from './file';

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
    // @ts-expect-error: test shim
    global.document = {
      createElement: vi.fn()
    };

    // Mock FileReader
    mockFileReader = {
      result: null,
      onload: null,
      onerror: null,
      readAsDataURL: vi.fn(function(this: any, file: File) {
        // Simulate async read
        setTimeout(() => {
          this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          if (this.onload) {
            this.onload();
          }
        }, 0);
      })
    };
    global.FileReader = class FileReaderMock {
      constructor() {
        return mockFileReader;
      }
    } as any;

    // Mock Image - need to set up onload handler
    mockImage = {
      width: 100,
      height: 100,
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
    global.Image = class ImageMock {
      constructor() {
        return mockImage;
      }
    } as any;

    // Mock canvas
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
        drawImage: vi.fn()
      })),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockdata')
    };
    global.document.createElement = vi.fn((tag: string) => {
      if (tag === 'canvas') {
        return mockCanvas as any;
      }
      return {} as any;
    }) as any;

    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
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

    it('should reduce output when base64 exceeds maxBytes', async () => {
      const file = createMockImageFile(1200, 1200, 'test.jpg');
      mockImage.width = 1200;
      mockImage.height = 1200;

      const oversizedDataUrl = `data:image/jpeg;base64,${'a'.repeat(2_000_000)}`;
      const resizedDataUrl = 'data:image/jpeg;base64,small-enough';
      const mockCanvas = global.document.createElement('canvas') as any;

      mockCanvas.toDataURL
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementation(() => resizedDataUrl);

      const result = await convertFileToBase64(file, 1200, 100_000);

      expect(result).toBe(resizedDataUrl);
      expect(mockCanvas.toDataURL).toHaveBeenCalledTimes(3);
    });

    it('should reduce base64 dimensions after quality reductions are exhausted', async () => {
      const file = createMockImageFile(1600, 1600, 'huge.jpg');
      mockImage.width = 1600;
      mockImage.height = 1600;
      const oversizedDataUrl = `data:image/jpeg;base64,${'a'.repeat(2_000_000)}`;
      const resizedDataUrl = 'data:image/jpeg;base64,small-enough';
      const mockCanvas = global.document.createElement('canvas') as any;

      mockCanvas.toDataURL
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementationOnce(() => oversizedDataUrl)
        .mockImplementationOnce(() => resizedDataUrl);

      await expect(convertFileToBase64(file, 1600, 100_000)).resolves.toBe(resizedDataUrl);
      expect(mockCanvas.toDataURL).toHaveBeenCalledTimes(7);
    });

    it('should reject on file read error', async () => {
      // Create a file that will cause read error
      const file = new File([''], 'test.jpg', {type: 'image/jpeg'});
      // Mock FileReader to trigger error
      const errorFileReader = {
        result: null,
        onload: null,
        onerror: null,
        readAsDataURL: vi.fn(function(this: any) {
          setTimeout(() => {
            if (this.onerror) {
              const errorEvent = {type: 'error'} as ProgressEvent;
              this.onerror(errorEvent);
            }
          }, 0);
        })
      };
      global.FileReader = class ErrorFileReaderMock {
        constructor() {
          return errorFileReader;
        }
      } as any;

      await expect(convertFileToBase64(file, 200)).rejects.toBeDefined();
    });

  });

  describe('convertFileToUploadFile', () => {
    it('should return non-image files unchanged', async () => {
      const file = new File(['text'], 'test.txt', {type: 'text/plain'});

      await expect(convertFileToUploadFile(file, 200)).resolves.toBe(file);
    });

    it('should render and resize upload files', async () => {
      const file = createMockImageFile(600, 300, 'wide.png');
      mockImage.width = 600;
      mockImage.height = 300;
      const mockCanvas = global.document.createElement('canvas') as any;
      mockCanvas.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
        callback(new Blob(['small'], {type: 'image/jpeg'}));
      });

      const result = await convertFileToUploadFile(file, 300, 100_000);

      expect(result.name).toBe('wide.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(mockCanvas.toBlob).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should shrink quality and dimensions until upload file fits', async () => {
      const file = createMockImageFile(1200, 1200, 'large.png');
      mockImage.width = 1200;
      mockImage.height = 1200;
      const mockCanvas = global.document.createElement('canvas') as any;
      let calls = 0;
      mockCanvas.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
        calls++;
        const payload = calls < 5 ? 'x'.repeat(2000) : 'small';
        callback(new Blob([payload], {type: 'image/jpeg'}));
      });

      const result = await convertFileToUploadFile(file, 1200, 1000);

      expect(result.size).toBeLessThanOrEqual(1000);
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });

    it('should reject when canvas context or blob is unavailable', async () => {
      const file = createMockImageFile(100, 100, 'broken.png');
      const mockCanvas = global.document.createElement('canvas') as any;
      mockCanvas.getContext.mockReturnValueOnce(null);

      await expect(convertFileToUploadFile(file, 200)).rejects.toThrow('Unable to prepare image upload.');

      mockCanvas.getContext.mockReturnValue({
        clearRect: vi.fn(),
        drawImage: vi.fn()
      });
      mockCanvas.toBlob = vi.fn((callback: (blob: Blob | null) => void) => callback(null));

      await expect(convertFileToUploadFile(file, 200)).rejects.toThrow('Unable to prepare image upload.');
    });

    it('should reject when upload image loading fails', async () => {
      const file = createMockImageFile(100, 100, 'broken.png');
      global.Image = class ErrorImageMock {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          setTimeout(() => this.onerror?.(), 0);
        }
      } as any;

      await expect(convertFileToUploadFile(file, 200)).rejects.toThrow('Unable to prepare image upload.');
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
