/**
 * Copyright (c) 2018-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {merge} from '@nlabs/utils';

import type {MetropolisAdapters} from '../utils/MetropolisContext.js';

export interface ConfigAppSessionType {
  readonly maxMinutes?: number;
  readonly minMinutes?: number;
  readonly refreshAfterRatio?: number;
}

export interface ConfigAppUrls {
  readonly websocket?: string;
}

export interface ConfigAppApiType {
  readonly endpoints?: Record<string, string>;
  readonly public?: string;
  readonly rum?: string;
  readonly url?: string;
  readonly uploadImage?: string;
}

export interface ConfigAppType {
  readonly api?: ConfigAppApiType;
  readonly name?: string;
  readonly rum?: {
    readonly analyticsId?: string;
    readonly debounceMs?: number;
    readonly dedupeMs?: number;
    readonly enabled?: boolean;
    readonly respectPrivacySignals?: boolean;
    readonly throttleMs?: number;
  };
  readonly session?: ConfigAppSessionType;
  readonly urls?: ConfigAppUrls;
  readonly version?: string;
}

export interface MetropolisConfiguration {
  readonly [environment: string]: MetropolisEnvironmentConfiguration | undefined;
  readonly local?: MetropolisEnvironmentConfiguration;
  readonly development?: MetropolisEnvironmentConfiguration;
  readonly production?: MetropolisEnvironmentConfiguration;
  readonly test?: MetropolisEnvironmentConfiguration;
}

const getRuntimeEnvironment = (): string | undefined => {
  const runtimeProcess = (globalThis as {
    process?: {env?: Record<string, string | undefined>};
  }).process;
  return runtimeProcess?.env?.stage || runtimeProcess?.env?.NODE_ENV;
};

export interface MetropolisEnvironmentConfiguration {
  readonly adapters?: MetropolisAdapters;
  readonly app?: Partial<ConfigAppType>;
  readonly environment?: string;
  readonly isAuth?: () => boolean;
}

/**
 * Default configuration values for all environments.
 */
const DEFAULT_CONFIG: MetropolisConfiguration = {
  development: {
    app: {
      api: {
        public: 'http://localhost:3000/public',
        url: 'http://localhost:3000/app'
      },
      session: {
        maxMinutes: 15,
        minMinutes: 5
      }
    },
    environment: 'development',
    isAuth: () => true
  },
  local: {
    app: {
      api: {
        public: 'https://dev-api.torch.one/public',
        url: 'https://dev-api.torch.one/app'
      },
      session: {
        maxMinutes: 15,
        minMinutes: 5
      }
    },
    environment: 'local',
    isAuth: () => true
  },
  production: {
    app: {
      api: {
        public: 'https://api.torch.one/public',
        url: 'https://api.torch.one/app'
      },
      session: {
        maxMinutes: 15,
        minMinutes: 5
      }
    },
    environment: 'production',
    isAuth: () => true
  },
  test: {
    app: {
      api: {
        public: 'http://localhost:3000/public',
        url: 'http://localhost:3000/app'
      },
      session: {
        maxMinutes: 15,
        minMinutes: 5
      }
    },
    environment: 'test',
    isAuth: () => true
  }
};

/**
 * Gets the default configuration for a specific environment.
 */
export const getDefaultConfig = (environment?: string): MetropolisEnvironmentConfiguration => {
  const targetEnvironment = environment || getRuntimeEnvironment() || 'local';
  const envConfig = DEFAULT_CONFIG[targetEnvironment] || DEFAULT_CONFIG.local || {};
  const localConfig = DEFAULT_CONFIG.local || {};
  return merge({}, localConfig, envConfig);
};

/**
 * Resolves the environment-specific configuration from a MetropolisConfiguration object.
 * This function determines which environment to use based on process.env and merges
 * the appropriate configuration.
 */
export const resolveEnvironmentConfig = (
  config: MetropolisConfiguration,
  environment?: string
): MetropolisEnvironmentConfiguration => {
  const targetEnvironment = environment || getRuntimeEnvironment() || 'local';
  const baseConfig = DEFAULT_CONFIG;

  // Merge base config with provided config
  const mergedConfig = merge({}, baseConfig, config);

  // Get the target environment config
  const envConfig = mergedConfig[targetEnvironment] || mergedConfig.local || {};

  // Merge with local as fallback
  const localConfig = mergedConfig.local || {};
  const resolved = merge({}, localConfig, envConfig);

  // Ensure environment is set (create new object to avoid mutating readonly)
  if (!resolved.environment) {
    return {
      ...resolved,
      environment: targetEnvironment
    };
  }

  return resolved;
};
