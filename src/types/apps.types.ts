/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface AppType extends BaseDocument, ExtensibleFields {
  readonly apiKey?: string;
  readonly appId?: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly isActive?: boolean;
  readonly name?: string;
  readonly settings?: Record<string, any>;
  readonly url?: string;
  readonly userId?: string;
}
