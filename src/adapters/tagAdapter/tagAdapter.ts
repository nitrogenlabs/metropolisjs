import { parseArangoId, parseId, parseString } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';
import { parseReaktorContent, parseReaktorType } from '../reaktorAdapter/reaktorAdapter.js';

export interface TagType {
  _id?: string;
  _key?: string;
  category?: string;
  description?: string;
  id?: string;
  name?: string;
  tagBy?: string;
  tagId?: string;
  userId?: string;
  [key: string]: any;
}

export class TagValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'TagValidationError';
  }
}

const TagInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  category: z.string().max(160).optional(),
  description: z.string().optional(),
  id: z.string().optional(),
  name: z.string().max(160).optional(),
  tagBy: z.string().optional(),
  tagId: z.string().optional(),
  userId: z.string().optional()
}).loose();

export const validateTagInput = (tag: unknown): TagType => {
  try {
    const validated = TagInputSchema.parse(tag);
    return validated as TagType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new TagValidationError(`Tag validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatTagOutput = (tag: TagType): TagType => tag;

export const parseTag = (tag: TagType): TagType => {
  try {
    const parsed = performTagTransformation(tag);
    return parsed;
  } catch(error) {
    if(error instanceof TagValidationError) {
      throw error;
    }
    throw new TagValidationError(`Tag parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performTagTransformation = (tag: TagType): TagType => {
  const {
    _id,
    _key,
    category,
    description,
    id,
    name,
    tagBy,
    tagId,
    userId
  } = tag;

  const transformed = {
    ...parseDocument(tag),
    ...(category && {category: parseReaktorType(category)}),
    ...(description && {description: parseReaktorContent(description)}),
    ...((_id || id) && {id: parseArangoId(_id || id || '')}),
    ...((_key || tagId) && {tagId: parseId(_key || tagId || '')}),
    ...(name && {name: parseString(name, 160)}),
    ...(tagBy && {tagBy: parseId(tagBy)}),
    ...(userId && {userId: parseId(userId)})
  };

  const result = removeEmptyKeys(transformed);

  if(tag._id) {
    result.id = tag._id;
    result._id = tag._id;
  } else if(tag.id && !result.id) {
    result.id = tag.id;
    result._id = tag.id;
  }

  if(tag._key) {
    result.tagId = tag._key;
    result._key = tag._key;
  } else if(tag.tagId && !result.tagId) {
    result.tagId = tag.tagId;
    result._key = tag.tagId;
  }

  if(tag.tagId && !result._key) {
    result._key = tag.tagId;
  }

  if(tag.id && !result._id) {
    result._id = tag.id;
  }

  return result;
};

export const parseTagLegacy = (tag: TagType): TagType => parseTag(tag);