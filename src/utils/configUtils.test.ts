/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {getConfigFromFlux} from './configUtils';

describe('configUtils', () => {
  describe('getConfigFromFlux', () => {
    let mockFlux;
    let consoleWarnSpy;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should get config from flux state', () => {
      const config = {
        environment: 'test',
        app: {
          api: {
            url: 'https://test.example.com'
          }
        }
      };

      mockFlux = {
        getState: vi.fn((key) => {
          if(key === 'app.config') {
            return config;
          }
          return undefined;
        })
      };

      const result = getConfigFromFlux(mockFlux);

      expect(result).toEqual(config);
      expect(result.app?.api?.url).toBe('https://test.example.com');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should fallback to default config when config not in flux state', () => {
      mockFlux = {
        getState: vi.fn(() => undefined)
      };

      const result = getConfigFromFlux(mockFlux);

      expect(result).toBeDefined();
      expect(result.app?.api?.url).toBeDefined();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default config when flux state is empty', () => {
      mockFlux = {
        getState: vi.fn(() => undefined)
      };

      const result = getConfigFromFlux(mockFlux);

      expect(result).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.app).toBeDefined();
    });
  });
});
