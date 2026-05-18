import {describe, expect, it} from 'vitest';

import {AppValidationError, parseApp, validateAppInput} from './appAdapter.js';

describe('appAdapter', () => {
  it('validates and parses app input', () => {
    const app = validateAppInput({
      _key: 'app-1',
      apiKey: 'api-key',
      appId: 'app-1',
      description: 'Description',
      imageUrl: 'https://example.com/app.png',
      isActive: true,
      name: 'Demo App',
      settings: {theme: 'dark'},
      url: 'https://example.com',
      userId: 'user-1'
    });
    const parsed = parseApp(app);

    expect(parsed.appId).toBe('app1');
    expect(parsed.id).toBe('apps/app1');
    expect(parsed.name).toBe('Demo App');
    expect(parsed.settings).toEqual({theme: 'dark'});
    expect(() => validateAppInput({settings: 'bad'})).toThrow(AppValidationError);
    expect(parseApp({appId: '../bad'} as any).appId).toBe('bad');
  });
});
