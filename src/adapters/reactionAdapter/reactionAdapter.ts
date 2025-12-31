import { parseArangoId, parseId, parseVarChar } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';

export interface ReactionType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  id?: string;
  name?: string;
  reactionId?: string;
  value?: string;
  [key: string]: any;
}

export class ReactionValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ReactionValidationError';
  }
}

const ReactionInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional(),
  id: z.string().optional(),
  name: z.string().max(32).optional(),
  reactionId: z.string().optional(),
  type: z.string(),
  value: z.string().max(32).optional()
}).loose();

export const validateReactionInput = (reaction: unknown): ReactionType => {
  try {
    const validated = ReactionInputSchema.parse(reaction);
    return validated as ReactionType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ReactionValidationError(`Reaction validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatReactionOutput = (reaction: ReactionType): ReactionType => reaction;

export const parseReaction = (reaction: ReactionType): ReactionType => {
  try {
    const parsed = performReactionTransformation(reaction);
    return parsed;
  } catch(error) {
    if(error instanceof ReactionValidationError) {
      throw error;
    }
    throw new ReactionValidationError(`Reaction parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performReactionTransformation = (reaction: ReactionType): ReactionType => {
  const {
    _id,
    _key,
    id,
    name,
    reactionId,
    value
  } = reaction;

  const transformed = removeEmptyKeys({
    ...parseDocument(reaction),
    ...((_id || id || _key || reactionId) && {id: parseArangoId(_id || id || `reactions/${_key || reactionId}`)}),
    ...(name && {name: parseVarChar(name, 32)}),
    ...((_key || reactionId) && {reactionId: parseId(_key || reactionId || '')}),
    ...(value && {value: parseVarChar(value, 32)})
  });

  return transformed;
};