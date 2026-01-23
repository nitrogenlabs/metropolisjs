/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface AppType extends BaseDocument, ExtensibleFields {
  apiKey?: string;
  appId?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  name?: string;
  settings?: Record<string, any>;
  url?: string;
  userId?: string;
}
