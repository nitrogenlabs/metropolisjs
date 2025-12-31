import { parseArangoId, parseId, parseString } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';
import { parseUser } from '../userAdapter/userAdapter.js';

export interface ConversationType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  added?: number;
  conversationId?: string;
  id?: string;
  isDirect?: boolean;
  modified?: number;
  name?: string;
  users?: any[];
  [key: string]: any;
}

export class ConversationValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConversationValidationError';
  }
}

const ConversationInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional(),
  added: z.number().optional(),
  conversationId: z.string().optional(),
  id: z.string().optional(),
  isDirect: z.boolean().optional(),
  modified: z.number().optional(),
  name: z.string().max(160).optional(),
  type: z.string(),
  users: z.array(z.any()).optional()
}).loose();

export const validateConversationInput = (conversation: unknown): ConversationType => {
  try {
    const validated = ConversationInputSchema.parse(conversation);
    return validated as ConversationType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ConversationValidationError(`Conversation validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatConversationOutput = (conversation: ConversationType): ConversationType => conversation;

export const parseConversation = (conversation: ConversationType): ConversationType => {
  try {
    const parsed = performConversationTransformation(conversation);
    return parsed;
  } catch(error) {
    if(error instanceof ConversationValidationError) {
      throw error;
    }
    throw new ConversationValidationError(`Conversation parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performConversationTransformation = (conversation: ConversationType): ConversationType => {
  const {
    _id,
    _key,
    conversationId,
    id,
    isDirect,
    name,
    users
  } = conversation;

  const transformed = removeEmptyKeys({
    ...parseDocument(conversation),
    ...((_id || id || _key || conversationId) && {id: parseArangoId(_id || id || `conversations/${_key || conversationId}`)}),
    ...((_key || conversationId) && {conversationId: parseId(_key || conversationId || '')}),
    ...(isDirect !== undefined && {isDirect: !!isDirect}),
    ...(name && {name: parseString(name, 160)}),
    ...(users?.length && {users: users.map((user) => parseUser(user))})
  });

  return transformed;
};