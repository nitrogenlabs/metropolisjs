/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface VideoType extends BaseDocument, ExtensibleFields {
  base64?: string;
  description?: string;
  duration?: number;
  externalId?: string;
  externalUrl?: string;
  fileType?: string;
  format?: string;
  height?: number;
  itemId?: string;
  itemType?: string;
  mimeType?: string;
  name?: string;
  provider?: string;
  size?: number;
  thumbUrl?: string;
  type?: string;
  url?: string;
  userId?: string;
  videoId?: string;
  width?: number;
}
