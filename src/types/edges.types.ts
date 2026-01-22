/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';
import type {CollectionType, ConnectionType, EdgeType, ReactionType} from '../constants/Collections.js';

export interface EdgeDocument extends BaseDocument, ExtensibleFields {
  _from?: string;
  _to?: string;
  fromType?: CollectionType;
  fromId?: string;
  toType?: CollectionType;
  toId?: string;
}

export interface ConnectionEdge extends EdgeDocument {
  connectionType?: ConnectionType;
  status?: string;
  metadata?: Record<string, any>;
}

export interface ReactionEdge extends EdgeDocument {
  reactionType?: ReactionType;
  value?: string | number;
}

export interface TagEdge extends EdgeDocument {
  tagId?: string;
  tagName?: string;
}

export interface ConversationEdge extends EdgeDocument {
  conversationId?: string;
  role?: string;
  lastRead?: number;
}

export interface FileEdge extends EdgeDocument {
  fileId?: string;
  fileType?: string;
  order?: number;
}
