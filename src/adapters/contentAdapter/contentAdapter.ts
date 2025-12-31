/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseArangoId, parseId, parseString } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';

export interface ContentType {
  _id?: string;
  _key?: string;
  contentId?: string;
  id?: string;
  key: string;
  locale: 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it';
  content: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  userId?: string;
  [key: string]: any;
}

export interface ContentInputType {
  contentId?: string;
  key: string;
  locale?: 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it';
  content: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  [key: string]: any;
}

export class ContentValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

const contentSchema = z.object({
  contentId: z.string().optional(),
  key: z.string().min(1, 'Key is required').max(200, 'Key must be less than 200 characters'),
  locale: z.enum(['en', 'es', 'fr', 'de', 'pt', 'it'], {
    message: 'Locale must be one of: en, es, fr, de, pt, it'
  }),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be less than 10000 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  isActive: z.boolean().optional(),
  userId: z.string().optional()
});

const contentInputSchema = z.object({
  contentId: z.string().optional(),
  key: z.string().min(1, 'Key is required').max(200, 'Key must be less than 200 characters'),
  locale: z.enum(['en', 'es', 'fr', 'de', 'pt', 'it'], {
    message: 'Locale must be one of: en, es, fr, de, pt, it'
  }).optional(),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be less than 10000 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  isActive: z.boolean().optional()
});

export const parseContent = (content: ContentType): ContentType => {
  try {
    const validated = contentSchema.parse(content);
    return validated as ContentType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const field = error.issues[0]?.path.join('.');
      const message = error.issues[0]?.message || 'Validation failed';
      throw new ContentValidationError(message, field);
    }
    throw error;
  }
};

export const parseContentInput = (content: ContentInputType): ContentInputType => {
  try {
    const validated = contentInputSchema.parse(content);
    return validated as ContentInputType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const field = error.issues[0]?.path.join('.');
      const message = error.issues[0]?.message || 'Validation failed';
      throw new ContentValidationError(message, field);
    }
    throw error;
  }
};

const performContentTransformation = (content: ContentType): ContentType => {
  const {
    _id,
    _key,
    contentId,
    id,
    key,
    locale,
    content: contentText,
    description,
    category,
    isActive,
    userId
  } = content;

  const transformed = {
    ...parseDocument(content),
    ...((_key || contentId) && {contentId: parseId(_key || contentId || '')}),
    ...((_id || id || _key || contentId) && {id: parseArangoId(_id || id || `content/${_key || contentId}`)}),
    key: parseString(key, 200),
    locale,
    content: parseString(contentText, 10000),
    ...(description && {description: parseString(description, 500)}),
    ...(category && {category: parseString(category, 100)}),
    ...(isActive !== undefined && {isActive}),
    ...(userId && {userId: parseId(userId)})
  };

  return removeEmptyKeys(transformed) as ContentType;
};

export const parseContentFromDb = (content: ContentType): ContentType => performContentTransformation(content);