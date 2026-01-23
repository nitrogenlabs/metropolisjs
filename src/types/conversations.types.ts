/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface ConversationType extends BaseDocument, ExtensibleFields {
  conversationId?: string;
  isGroup?: boolean;
  lastMessageAt?: number;
  memberCount?: number;
  members?: string[];
  name?: string;
  ownerId?: string;
  settings?: Record<string, any>;
  userId?: string;
}
