/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseArangoId, parseId, parseString} from '@nlabs/utils';
import {z} from 'zod';

import {parseDocument, removeEmptyKeys} from '../arangoAdapter/arangoAdapter.js';
import {parseReaktorItemId, parseReaktorName} from '../reaktorAdapter/reaktorAdapter.js';

import type {AppType} from '../../types/apps.types.js';

export class AppValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'AppValidationError';
  }
}

const AppInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  apiKey: z.string().optional(),
  appId: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  name: z.string().optional(),
  settings: z.record(z.any()).optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  userId: z.string().optional()
}).loose();

export const validateAppInput = (app: unknown): AppType => {
  try {
    const validated = AppInputSchema.parse(app);
    return validated as AppType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppValidationError(`App validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const parseApp = (app: AppType): AppType => {
  try {
    const parsed = performAppTransformation(app);
    return parsed;
  } catch(error) {
    if(error instanceof AppValidationError) {
      throw error;
    }
    throw new AppValidationError(`App parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performAppTransformation = (app: AppType): AppType => {
  const {
    _id,
    _key,
    apiKey,
    appId,
    description,
    imageUrl,
    isActive,
    name,
    settings,
    url,
    userId
  } = app;

  const transformed = removeEmptyKeys({
    ...parseDocument(app),
    ...(apiKey && {apiKey: parseString(apiKey, 255)}),
    ...((_id || _key || appId) && {id: parseArangoId(_id || `apps/${_key || appId}`)}),
    ...((_key || appId) && {appId: parseId(_key || appId || '')}),
    ...(description && {description: parseString(description, 1000)}),
    ...(imageUrl && {imageUrl: parseString(imageUrl, 500)}),
    ...(isActive !== undefined && {isActive: !!isActive}),
    ...(name && {name: parseReaktorName(name)}),
    ...(settings && {settings}),
    ...(url && {url: parseString(url, 500)}),
    ...(userId && {userId: parseId(userId)})
  });

  return transformed;
};
