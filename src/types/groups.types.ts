/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface GroupType extends BaseDocument, ExtensibleFields {
  readonly description?: string;
  readonly groupId?: string;
  readonly imageUrl?: string;
  readonly isPrivate?: boolean;
  readonly memberCount?: number;
  readonly name?: string;
  readonly ownerId?: string;
  readonly settings?: Record<string, any>;
  readonly tags?: any[];
  readonly thumbUrl?: string;
  readonly userId?: string;
}
