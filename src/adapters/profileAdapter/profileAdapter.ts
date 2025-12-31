import { parseArangoId, parseBoolean, parseChar, parseId, parseNum, parseString } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';
import { parseImage } from '../imageAdapter/imageAdapter.js';
import { parseTag } from '../tagAdapter/tagAdapter.js';

export interface ProfileType {
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
  profileId?: string;
  tags?: any[];
  thumbUrl?: string;
  userId?: string;
  viewCount?: number;
  [key: string]: any;
}

export class ProfileValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

const ProfileInputSchema = z.object({
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
  profileId: z.string().optional(),
  tags: z.array(z.any()).optional(),
  thumbUrl: z.string().optional(),
  userId: z.string().optional(),
  viewCount: z.number().optional()
}).loose();

export const validateProfileInput = (profile: unknown): ProfileType => {
  try {
    const validated = ProfileInputSchema.parse(profile);
    return validated as ProfileType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ProfileValidationError(`Profile validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatProfileOutput = (profile: ProfileType): ProfileType => profile;

export const parseProfile = (profile: ProfileType): ProfileType => {
  try {
    const parsed = performProfileTransformation(profile);
    return parsed;
  } catch(error) {
    if(error instanceof ProfileValidationError) {
      throw error;
    }
    throw new ProfileValidationError(`Profile parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performProfileTransformation = (profile: ProfileType): ProfileType => {
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
    profileId,
    tags,
    thumbUrl,
    userId,
    viewCount
  } = profile;

  const transformed = removeEmptyKeys({
    ...parseDocument(profile),
    ...(active !== undefined && {active: parseBoolean(active)}),
    ...(gender && {gender: parseChar(gender, 1)}),
    ...(hasLike !== undefined && {hasLike: parseBoolean(hasLike)}),
    ...(hasView !== undefined && {hasView: parseBoolean(hasView)}),
    ...((_id || id || _key || profileId) && {id: parseArangoId(_id || id || `profiles/${_key || profileId}`)}),
    ...(images?.length && {images: images.map((image) => parseImage(image))}),
    ...(imageCount !== undefined && {imageCount: parseNum(imageCount)}),
    ...(imageId && {imageId: parseId(imageId)}),
    ...(imageUrl && {imageUrl}),
    ...(likeCount !== undefined && {likeCount: parseNum(likeCount)}),
    ...(name && {name: parseString(name, 64)}),
    ...((_key || profileId) && {profileId: parseId(_key || profileId || '')}),
    ...(tags?.length && {tags: tags.map((tag) => parseTag(tag))}),
    ...(thumbUrl && {thumbUrl}),
    ...(userId && {userId: parseId(userId)}),
    ...(viewCount !== undefined && {viewCount: parseNum(viewCount)})
  });

  return transformed as ProfileType;
};