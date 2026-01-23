/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseArangoId, parseId, parseNum, parseString} from '@nlabs/utils';
import {z} from 'zod';

import {parseDocument, removeEmptyKeys} from '../arangoAdapter/arangoAdapter.js';
import {parseReaktorDate, parseReaktorItemId} from '../reaktorAdapter/reaktorAdapter.js';

import type {VideoType} from '../../types/videos.types.js';

export class VideoValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'VideoValidationError';
  }
}

const VideoInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  format: z.string().optional(),
  height: z.number().optional(),
  mimeType: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
  thumbUrl: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  userId: z.string().optional(),
  videoId: z.string().optional(),
  width: z.number().optional()
}).loose();

export const validateVideoInput = (video: unknown): VideoType => {
  try {
    const validated = VideoInputSchema.parse(video);
    return validated as VideoType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new VideoValidationError(`Video validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const parseVideo = (video: VideoType): VideoType => {
  try {
    const parsed = performVideoTransformation(video);
    return parsed;
  } catch(error) {
    if(error instanceof VideoValidationError) {
      throw error;
    }
    throw new VideoValidationError(`Video parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performVideoTransformation = (video: VideoType): VideoType => {
  const {
    _id,
    _key,
    description,
    duration,
    format,
    height,
    mimeType,
    name,
    size,
    thumbUrl,
    url,
    userId,
    videoId,
    width
  } = video;

  const transformed = removeEmptyKeys({
    ...parseDocument(video),
    ...(description && {description: parseString(description, 1000)}),
    ...(duration !== undefined && {duration: parseNum(duration)}),
    ...(format && {format: parseString(format, 50)}),
    ...(height !== undefined && {height: parseNum(height)}),
    ...((_id || _key || videoId) && {id: parseArangoId(_id || `videos/${_key || videoId}`)}),
    ...(mimeType && {mimeType: parseString(mimeType, 100)}),
    ...(name && {name: parseString(name, 255)}),
    ...(size !== undefined && {size: parseNum(size)}),
    ...(thumbUrl && {thumbUrl: parseString(thumbUrl, 500)}),
    ...(url && {url: parseString(url, 500)}),
    ...(userId && {userId: parseId(userId)}),
    ...((_key || videoId) && {videoId: parseId(_key || videoId || '')}),
    ...(width !== undefined && {width: parseNum(width)})
  });

  return transformed;
};
