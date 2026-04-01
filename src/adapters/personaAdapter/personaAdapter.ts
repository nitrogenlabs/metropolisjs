import { parseArangoId, parseBoolean, parseChar, parseId, parseNum, parseString } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';
import { parseImage } from '../imageAdapter/imageAdapter.js';
import { parseTag } from '../tagAdapter/tagAdapter.js';

export interface PersonaType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  active?: boolean;
  gender?: string;
  hasLike?: boolean;
  hasView?: boolean;
  id?: string;
  images?: any[];
  imageCount?: number;
  imageId?: string;
  imageUrl?: string;
  likeCount?: number;
  name?: string;
  personaId?: string;
  tags?: any[];
  thumbUrl?: string;
  userId?: string;
  viewCount?: number;
  [key: string]: any;
}

export class PersonaValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'PersonaValidationError';
  }
}

const PersonaInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional(),
  active: z.boolean().optional(),
  gender: z.string().max(1).optional(),
  hasLike: z.boolean().optional(),
  hasView: z.boolean().optional(),
  id: z.string().optional(),
  images: z.array(z.any()).optional(),
  imageCount: z.number().optional(),
  imageId: z.string().optional(),
  imageUrl: z.string().optional(),
  likeCount: z.number().optional(),
  name: z.string().max(64).optional(),
  personaId: z.string().optional(),
  tags: z.array(z.any()).optional(),
  thumbUrl: z.string().optional(),
  userId: z.string().optional(),
  viewCount: z.number().optional()
}).loose();

export const validatePersonaInput = (persona: unknown): PersonaType => {
  try {
    const validated = PersonaInputSchema.parse(persona);
    return validated as PersonaType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new PersonaValidationError(`Persona validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatPersonaOutput = (persona: PersonaType): PersonaType => persona;

export const parsePersona = (persona: PersonaType): PersonaType => {
  try {
    const parsed = performPersonaTransformation(persona);
    return parsed;
  } catch(error) {
    if(error instanceof PersonaValidationError) {
      throw error;
    }
    throw new PersonaValidationError(`Persona parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performPersonaTransformation = (persona: PersonaType): PersonaType => {
  const {
    _id,
    _key,
    active,
    gender,
    hasLike,
    hasView,
    id,
    images,
    imageCount,
    imageId,
    imageUrl,
    likeCount,
    name,
    personaId,
    tags,
    thumbUrl,
    userId,
    viewCount
  } = persona;

  const transformed = removeEmptyKeys({
    ...parseDocument(persona),
    ...(active !== undefined && {active: parseBoolean(active)}),
    ...(gender && {gender: parseChar(gender, 1)}),
    ...(hasLike !== undefined && {hasLike: parseBoolean(hasLike)}),
    ...(hasView !== undefined && {hasView: parseBoolean(hasView)}),
    ...((_id || id || _key || personaId) && {id: parseArangoId(_id || id || `personas/${_key || personaId}`)}),
    ...(images?.length && {images: images.map((image) => parseImage(image))}),
    ...(imageCount !== undefined && {imageCount: parseNum(imageCount)}),
    ...(imageId && {imageId: parseId(imageId)}),
    ...(imageUrl && {imageUrl}),
    ...(likeCount !== undefined && {likeCount: parseNum(likeCount)}),
    ...(name && {name: parseString(name, 64)}),
    ...((_key || personaId) && {personaId: parseId(_key || personaId || '')}),
    ...(tags?.length && {tags: tags.map((tag) => parseTag(tag))}),
    ...(thumbUrl && {thumbUrl}),
    ...(userId && {userId: parseId(userId)}),
    ...(viewCount !== undefined && {viewCount: parseNum(viewCount)})
  });

  return transformed as PersonaType;
};