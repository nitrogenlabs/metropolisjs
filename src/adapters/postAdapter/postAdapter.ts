import { parseArangoId, parseId, parseNum, parseString, parseVarChar } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';
import { parseFile } from '../fileAdapter/fileAdapter.js';
import {
    parseReaktorContent,
    parseReaktorDate,
    parseReaktorType
} from '../reaktorAdapter/reaktorAdapter.js';
import { parseTag } from '../tagAdapter/tagAdapter.js';

const MAX_CONTENT_LENGTH: number = 100000;

export interface PostType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  content?: string;
  endDate?: number;
  files?: any[];
  groupId?: string;
  id?: string;
  latitude?: number;
  location?: string;
  longitude?: number;
  name?: string;
  parentId?: string;
  postId?: string;
  privacy?: string;
  startDate?: number;
  tags?: any[];
  type?: string;
  userId?: string;
  [key: string]: any;
}

export class PostValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'PostValidationError';
  }
}

const PostInputSchema = z.object({
  content: z.string().optional(),
  endDate: z.number().optional(),
  files: z.array(z.any()).optional(),
  groupId: z.string().optional(),
  postId: z.string().optional(),
  latitude: z.number().optional(),
  location: z.string().optional(),
  longitude: z.number().optional(),
  name: z.string().optional(),
  parentId: z.string().optional(),
  privacy: z.string().optional(),
  startDate: z.number().optional(),
  tags: z.array(z.any()).optional(),
  type: z.string().optional(),
  userId: z.string().optional(),
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional()
}).loose();

export const validatePostInput = (post: unknown): PostType => {
  try {
    const validated = PostInputSchema.parse(post);
    return validated as PostType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new PostValidationError(`Post validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatPostOutput = (post: PostType): PostType => post;

export const parsePost = (post: PostType): PostType => {
  try {
    const parsed = performPostTransformation(post);
    return parsed;
  } catch(error) {
    if(error instanceof PostValidationError) {
      throw error;
    }
    throw new PostValidationError(`Post parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performPostTransformation = (post: PostType): PostType => {
  const {
    _id,
    _key,
    content,
    endDate,
    files,
    groupId,
    id,
    latitude,
    location,
    longitude,
    name,
    parentId,
    postId,
    privacy,
    tags,
    type,
    userId
  } = post;

  const transformed = removeEmptyKeys({
    ...parseDocument(post),
    ...(content && {content: parseReaktorContent(content, MAX_CONTENT_LENGTH)}),
    ...(endDate !== undefined && {endDate: parseReaktorDate(endDate)}),
    ...(files?.length && {files: files.map((file) => parseFile(file))}),
    ...(groupId && {groupId: parseId(groupId)}),
    ...(latitude !== undefined && {latitude: parseNum(latitude, 15)}),
    ...(location && {location: parseString(location, 160)}),
    ...(longitude !== undefined && {longitude: parseNum(longitude, 15)}),
    ...(name && {name: parseString(name, 160)}),
    ...(parentId && {parentId: parseId(parentId)}),
    ...((_id || id || _key || postId) && {id: parseArangoId(_id || id || `posts/${_key || postId}`)}),
    ...((_key || postId) && {postId: parseId(_key || postId || '')}),
    ...(privacy && {privacy: parseVarChar(privacy, 16)}),
    ...(tags?.length && {tags: tags.map((tag) => parseTag(tag))}),
    ...(type && {type: parseReaktorType(type)}),
    ...(userId && {userId: parseId(userId)})
  });

  return transformed;
};