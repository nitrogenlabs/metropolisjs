/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum, parseString} from '@nlabs/utils';
import {z} from 'zod';

import {parseDocument} from '../arangoAdapter/arangoAdapter.js';
import {
  parseReaktorDate,
  parseReaktorItemId,
  parseReaktorName,
  parseReaktorType
} from '../reaktorAdapter/reaktorAdapter.js';
import {parseTag} from '../tagAdapter/tagAdapter.js';

export interface Group {
  [key: string]: any;
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  added?: number;
  description?: string;
  groupId?: string;
  id?: string;
  imageId?: string;
  name?: string;
  ownerId?: string;
  privacy?: string;
  tags?: any[];
  type?: string;
  updated?: number;
  userCount?: number;
}

export class GroupValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'GroupValidationError';
  }
}

const GroupInputSchema = z.object({
  _from: z.string().optional(),
  _id: z.string().optional(),
  _key: z.string().optional(),
  _oldRev: z.string().optional(),
  _rev: z.string().optional(),
  _to: z.string().optional(),
  added: z.number().optional(),
  description: z.string().optional(),
  groupId: z.string().optional(),
  imageId: z.string().optional(),
  name: z.string().optional(),
  ownerId: z.string().optional(),
  privacy: z.string().optional(),
  tags: z.array(z.any()).optional(),
  type: z.string().optional(),
  updated: z.number().optional(),
  userCount: z.number().optional()
}).loose();

export const validateGroupInput = (group: unknown): Group => {
  try {
    const validated = GroupInputSchema.parse(group);
    return validated as Group;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new GroupValidationError(`Group validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const parseGroup = (item: any): Group => {
  const base = parseDocument(item);

  return {
    ...base,
    added: parseReaktorDate(item.added),
    description: parseString(item.description),
    groupId: parseReaktorItemId(item.groupId),
    id: parseReaktorItemId(item.id),
    imageId: parseId(item.imageId),
    modified: parseReaktorDate(item.modified),
    name: parseReaktorName(item.name),
    ownerId: parseId(item.ownerId),
    privacy: parseString(item.privacy),
    tags: Array.isArray(item.tags) ? item.tags.map(parseTag) : [],
    type: parseReaktorType(item.type),
    userCount: parseNum(item.userCount)
  };
};
