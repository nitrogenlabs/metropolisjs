/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface GroupType extends BaseDocument, ExtensibleFields {
  description?: string;
  groupId?: string;
  imageUrl?: string;
  isPrivate?: boolean;
  memberCount?: number;
  name?: string;
  ownerId?: string;
  settings?: Record<string, any>;
  tags?: any[];
  thumbUrl?: string;
  userId?: string;
}
