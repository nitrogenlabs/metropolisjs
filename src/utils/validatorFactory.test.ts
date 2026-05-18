import {describe, expect, it, vi} from 'vitest';

import {createValidatorFactory, createValidatorManager} from './validatorFactory.js';

describe('validatorFactory', () => {
  it('composes default, custom, and option-level validation', () => {
    const defaultValidator = vi.fn((input: any, options: any) => ({...input, strict: options.strict}));
    const customAdapter = vi.fn((input: any) => ({...input, custom: true}));
    const customValidation = vi.fn((input: any) => ({...input, checked: true}));
    const validator = createValidatorFactory(defaultValidator, customAdapter, {
      customValidation,
      strict: true
    });

    expect(validator({name: 'Demo'})).toEqual({
      checked: true,
      custom: true,
      name: 'Demo',
      strict: true
    });
  });

  it('updates validator manager adapter and options', () => {
    const manager = createValidatorManager((input: any, options: any) => ({
      ...input,
      env: options.environment
    }), {environment: 'test'});

    expect(manager.validator({name: 'Demo'})).toEqual({env: 'test', name: 'Demo'});

    const adapter = vi.fn((input: any) => ({...input, adapted: true}));
    manager.updateAdapter(adapter);
    manager.updateOptions({environment: 'production'});

    expect(manager.getCustomAdapter()).toBe(adapter);
    expect(manager.getOptions()).toEqual({environment: 'production'});
    expect(manager.validator({name: 'Demo'})).toEqual({
      adapted: true,
      env: 'production',
      name: 'Demo'
    });
  });
});
