import {describe, expect, it} from 'vitest';

import {
  HiggsfieldValidationError,
  validateMarketingStudioImageInput,
  validateSeedanceReferenceVideoInput,
  validateSeedanceVideoInput,
  validateSoulImageInput
} from './higgsfieldAdapter.js';

describe('higgsfieldAdapter', () => {
  it('validates a soul image input', () => {
    expect(validateSoulImageInput({prompt: 'a portrait', seed: 42})).toEqual(
      expect.objectContaining({prompt: 'a portrait', seed: 42})
    );
  });

  it('rejects a soul image input without a prompt', () => {
    expect(() => validateSoulImageInput({})).toThrow(HiggsfieldValidationError);
  });

  it('validates a seedance video input', () => {
    expect(validateSeedanceVideoInput({imageUrl: 'https://example.com/frame.jpg'})).toEqual(
      expect.objectContaining({imageUrl: 'https://example.com/frame.jpg'})
    );
  });

  it('rejects a seedance video input without an image URL', () => {
    expect(() => validateSeedanceVideoInput({prompt: 'a scene'})).toThrow(HiggsfieldValidationError);
  });

  it('validates a seedance reference video input', () => {
    expect(validateSeedanceReferenceVideoInput({
      aspectRatio: '16:9',
      imageUrls: ['https://example.com/a.jpg']
    })).toEqual(expect.objectContaining({aspectRatio: '16:9'}));
  });

  it('rejects a seedance reference video input without an aspect ratio', () => {
    expect(() => validateSeedanceReferenceVideoInput({imageUrls: ['https://example.com/a.jpg']}))
      .toThrow(HiggsfieldValidationError);
  });

  it('validates a marketing studio image input', () => {
    expect(validateMarketingStudioImageInput({prompt: 'hero shot'})).toEqual(
      expect.objectContaining({prompt: 'hero shot'})
    );
  });
});
