/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface VideoType extends BaseDocument, ExtensibleFields {
  description?: string;
  duration?: number;
  format?: string;
  height?: number;
  mimeType?: string;
  name?: string;
  size?: number;
  thumbUrl?: string;
  url?: string;
  userId?: string;
  videoId?: string;
  width?: number;
}
