import {describe, expect, it} from 'vitest';

import {getDefaultConfig, resolveEnvironmentConfig} from './index.js';

describe('config', () => {
  it('resolves default and environment config without mutating defaults', () => {
    expect(getDefaultConfig('production').environment).toBe('production');
    expect(getDefaultConfig('production').isAuth?.()).toBe(true);
    expect(getDefaultConfig('local').isAuth?.()).toBe(true);
    expect(getDefaultConfig('test').isAuth?.()).toBe(true);
    expect(getDefaultConfig('missing').environment).toBe('local');

    const resolved = resolveEnvironmentConfig({
      local: {app: {name: 'Local App'}},
      test: {app: {api: {url: 'https://test.example.com'}}}
    }, 'test');

    expect(resolved.environment).toBe('test');
    expect(resolved.app?.name).toBe('Local App');
    expect(resolved.app?.api?.url).toBe('https://test.example.com');

    const fallback = resolveEnvironmentConfig({local: {app: {version: '1'}}}, 'custom');
    expect(fallback.environment).toBe('local');
  });

  it('uses environment variables and fills missing environment names', () => {
    const previousStage = process.env.stage;
    const previousNodeEnv = process.env.NODE_ENV;

    process.env.stage = 'development';
    expect(getDefaultConfig().environment).toBe('development');
    expect(getDefaultConfig().isAuth?.()).toBe(true);

    delete process.env.stage;
    process.env.NODE_ENV = 'production';
    expect(resolveEnvironmentConfig({
      production: {
        app: {name: 'Prod'},
        environment: ''
      }
    }).environment).toBe('production');

    process.env.stage = previousStage;
    process.env.NODE_ENV = previousNodeEnv;
  });
});
