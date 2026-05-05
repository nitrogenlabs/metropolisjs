/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {CollectionType, ConnectionType, ReactionType} from '../constants/Collections.js';
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface EdgeDocument extends BaseDocument, ExtensibleFields {
  readonly _from?: string;
  readonly _to?: string;
  readonly fromType?: CollectionType;
  readonly fromId?: string;
  readonly toType?: CollectionType;
  readonly toId?: string;
}

export interface ConnectionEdge extends EdgeDocument {
  readonly connectionType?: ConnectionType;
  readonly status?: string;
  readonly metadata?: Record<string, any>;
}

export interface ReactionEdge extends EdgeDocument {
  readonly reactionType?: ReactionType;
  readonly value?: string | number;
}

export interface TagEdge extends EdgeDocument {
  readonly tagId?: string;
  readonly tagName?: string;
}

export interface ConversationEdge extends EdgeDocument {
  readonly conversationId?: string;
  readonly role?: string;
  readonly lastRead?: number;
}

export interface FileEdge extends EdgeDocument {
  readonly fileId?: string;
  readonly fileType?: string;
  readonly order?: number;
}
