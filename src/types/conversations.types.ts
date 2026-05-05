/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface ConversationType extends BaseDocument, ExtensibleFields {
  readonly conversationId?: string;
  readonly isGroup?: boolean;
  readonly lastMessageAt?: number;
  readonly memberCount?: number;
  readonly members?: string[];
  readonly name?: string;
  readonly ownerId?: string;
  readonly settings?: Record<string, any>;
  readonly userId?: string;
}
