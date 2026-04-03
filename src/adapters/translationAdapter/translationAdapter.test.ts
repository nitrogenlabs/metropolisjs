import {describe, expect, it} from 'vitest';

import {
  TranslationInputType,
  TranslationType,
  TranslationValidationError,
  parseTranslation,
  parseTranslationInput,
  validateTranslationInput
} from './translationAdapter';

describe('translationAdapter', () => {
  describe('parseTranslation', () => {
    it('should parse valid translation', () => {
      const translation: TranslationType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!'
      };

      const result = parseTranslation(translation);

      expect(result).toEqual(translation);
    });

    it('should parse translation with all fields', () => {
      const translation: TranslationType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!',
        namespace: 'common',
        timestamp: 1640995200000
      };

      const result = parseTranslation(translation);

      expect(result).toEqual(translation);
    });

    it('should throw TranslationValidationError for missing key', () => {
      const invalidTranslation = {
        locale: 'en',
        value: 'Welcome to our application!'
      } as TranslationType;

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for empty key', () => {
      const invalidTranslation: TranslationType = {
        key: '',
        locale: 'en',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for missing locale', () => {
      const invalidTranslation = {
        key: 'welcome_message',
        value: 'Welcome to our application!'
      } as TranslationType;

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for empty locale', () => {
      const invalidTranslation: TranslationType = {
        key: 'welcome_message',
        locale: '',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for locale too short', () => {
      const invalidTranslation: TranslationType = {
        key: 'welcome_message',
        locale: 'e',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for locale too long', () => {
      const invalidTranslation: TranslationType = {
        key: 'welcome_message',
        locale: 'en-US-CA',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for missing value', () => {
      const invalidTranslation = {
        key: 'welcome_message',
        locale: 'en'
      } as TranslationType;

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for empty value', () => {
      const invalidTranslation: TranslationType = {
        key: 'welcome_message',
        locale: 'en',
        value: ''
      };

      expect(() => parseTranslation(invalidTranslation)).toThrow(TranslationValidationError);
    });

    it('should validate various locale formats', () => {
      const locales = ['en', 'es', 'fr', 'de', 'pt', 'it', 'en-US', 'es-MX', 'fr-CA'];

      locales.forEach((locale) => {
        const translation: TranslationType = {
          key: 'welcome_message',
          locale,
          value: 'Welcome to our application!'
        };

        const result = parseTranslation(translation);

        expect(result.locale).toBe(locale);
      });
    });

    it('should handle optional namespace', () => {
      const translation: TranslationType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!',
        namespace: 'common'
      };

      const result = parseTranslation(translation);

      expect(result.namespace).toBe('common');
    });

    it('should handle optional timestamp', () => {
      const translation: TranslationType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!',
        timestamp: 1640995200000
      };

      const result = parseTranslation(translation);

      expect(result.timestamp).toBe(1640995200000);
    });
  });

  describe('parseTranslationInput', () => {
    it('should parse valid translation input', () => {
      const translationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!'
      };

      const result = parseTranslationInput(translationInput);

      expect(result).toEqual(translationInput);
    });

    it('should parse translation input with all fields', () => {
      const translationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!',
        namespace: 'common'
      };

      const result = parseTranslationInput(translationInput);

      expect(result).toEqual(translationInput);
    });

    it('should throw TranslationValidationError for missing key', () => {
      const invalidTranslationInput = {
        locale: 'en',
        value: 'Welcome to our application!'
      } as TranslationInputType;

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for empty key', () => {
      const invalidTranslationInput: TranslationInputType = {
        key: '',
        locale: 'en',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for missing locale', () => {
      const invalidTranslationInput = {
        key: 'welcome_message',
        value: 'Welcome to our application!'
      } as TranslationInputType;

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for empty locale', () => {
      const invalidTranslationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: '',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for locale too short', () => {
      const invalidTranslationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'e',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for locale too long', () => {
      const invalidTranslationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'en-US-CA',
        value: 'Welcome to our application!'
      };

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for missing value', () => {
      const invalidTranslationInput = {
        key: 'welcome_message',
        locale: 'en'
      } as TranslationInputType;

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should throw TranslationValidationError for empty value', () => {
      const invalidTranslationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'en',
        value: ''
      };

      expect(() => parseTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should handle optional namespace', () => {
      const translationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!',
        namespace: 'common'
      };

      const result = parseTranslationInput(translationInput);

      expect(result.namespace).toBe('common');
    });
  });

  describe('validateTranslationInput', () => {
    it('should validate valid translation input', () => {
      const translationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!'
      };

      const result = validateTranslationInput(translationInput);

      expect(result).toEqual(translationInput);
    });

    it('should validate translation input with namespace', () => {
      const translationInput: TranslationInputType = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!',
        namespace: 'common'
      };

      const result = validateTranslationInput(translationInput);

      expect(result).toEqual(translationInput);
    });

    it('should throw TranslationValidationError for invalid input', () => {
      const invalidTranslationInput = {
        key: '',
        locale: 'en',
        value: 'Welcome to our application!'
      };

      expect(() => validateTranslationInput(invalidTranslationInput)).toThrow(TranslationValidationError);
    });

    it('should handle unknown input type', () => {
      const unknownInput = {
        key: 'welcome_message',
        locale: 'en',
        value: 'Welcome to our application!',
        extraField: 'should be ignored'
      };

      const result = validateTranslationInput(unknownInput as any);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('locale');
      expect(result).toHaveProperty('value');
      expect(result).not.toHaveProperty('extraField');
    });
  });

  describe('TranslationValidationError', () => {
    it('should create TranslationValidationError with message', () => {
      const error = new TranslationValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TranslationValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TranslationValidationError');
    });

    it('should create TranslationValidationError with message and field', () => {
      const error = new TranslationValidationError('Test error', 'key');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('key');
    });
  });
});
