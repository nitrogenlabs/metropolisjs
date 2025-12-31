/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { getDefaultConfig } from '../config/index.js';
import type { FluxFramework } from '@nlabs/arkhamjs';
import type { MetropolisEnvironmentConfiguration } from '../config/index.js';

/**
 * Gets configuration from flux state.
 * Falls back to default config if not found in flux state.
 *
 * @param flux - The Flux framework instance
 * @returns The resolved environment configuration
 */
export const getConfigFromFlux = (flux: FluxFramework): MetropolisEnvironmentConfiguration => {
  const config = flux.getState('app.config') as MetropolisEnvironmentConfiguration | undefined;

  if (config) {
    return config;
  }

  // Fallback to default config
  return getDefaultConfig();
};
