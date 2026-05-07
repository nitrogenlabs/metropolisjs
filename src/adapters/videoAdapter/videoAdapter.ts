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
  base64: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  externalId: z.string().optional(),
  externalUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  format: z.string().optional(),
  height: z.number().optional(),
  hlsUrl: z.string().optional(),
  itemId: z.string().optional(),
  itemType: z.string().optional(),
  mediaConvertJobId: z.string().optional(),
  mimeType: z.string().optional(),
  name: z.string().optional(),
  playbackFileType: z.string().optional(),
  playbackUrl: z.string().optional(),
  privacy: z.string().optional(),
  provider: z.string().optional(),
  processingError: z.string().optional(),
  processingStatus: z.string().optional(),
  size: z.number().optional(),
  sourceKey: z.string().optional(),
  streamType: z.string().optional(),
  thumbBase64: z.string().optional(),
  thumbFileType: z.string().optional(),
  thumbUrl: z.string().optional(),
  type: z.string().optional(),
  uploadId: z.string().optional(),
  uploadKey: z.string().optional(),
  uploadStatus: z.string().optional(),
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
    base64,
    description,
    duration,
    externalId,
    externalUrl,
    fileName,
    fileSize,
    fileType,
    format,
    height,
    hlsUrl,
    itemId,
    itemType,
    mediaConvertJobId,
    mimeType,
    name,
    playbackFileType,
    playbackUrl,
    privacy,
    provider,
    processingError,
    processingStatus,
    size,
    sourceKey,
    streamType,
    thumbBase64,
    thumbFileType,
    thumbUrl,
    url,
    uploadId,
    uploadKey,
    uploadStatus,
    userId,
    videoId,
    width
  } = video;

  const transformed = removeEmptyKeys({
    ...parseDocument(video),
    ...(base64 && {base64: parseString(base64, 100000000)}),
    ...(description && {description: parseString(description, 1000)}),
    ...(duration !== undefined && {duration: parseNum(duration)}),
    ...(externalId && {externalId: parseString(externalId, 255)}),
    ...(externalUrl && {externalUrl: parseString(externalUrl, 500)}),
    ...(fileName && {fileName: parseString(fileName, 255)}),
    ...(fileSize !== undefined && {fileSize: parseNum(fileSize)}),
    ...(fileType && {fileType: parseString(fileType, 100)}),
    ...(format && {format: parseString(format, 50)}),
    ...(height !== undefined && {height: parseNum(height)}),
    ...(hlsUrl && {hlsUrl: parseString(hlsUrl, 4096)}),
    ...((_id || _key || videoId) && {id: parseArangoId(_id || `videos/${_key || videoId}`)}),
    ...(itemId && {itemId: parseReaktorItemId(itemId)}),
    ...(itemType && {itemType: parseString(itemType, 32)}),
    ...(mediaConvertJobId && {mediaConvertJobId: parseString(mediaConvertJobId, 128)}),
    ...(mimeType && {mimeType: parseString(mimeType, 100)}),
    ...(name && {name: parseString(name, 255)}),
    ...(playbackFileType && {playbackFileType: parseString(playbackFileType, 100)}),
    ...(playbackUrl && {playbackUrl: parseString(playbackUrl, 4096)}),
    ...(privacy && {privacy: parseString(privacy, 32)}),
    ...(provider && {provider: parseString(provider, 50)}),
    ...(processingError && {processingError: parseString(processingError, 1000)}),
    ...(processingStatus && {processingStatus: parseString(processingStatus, 64)}),
    ...(size !== undefined && {size: parseNum(size)}),
    ...(sourceKey && {sourceKey: parseString(sourceKey, 2000)}),
    ...(streamType && {streamType: parseString(streamType, 64)}),
    ...(thumbBase64 && {thumbBase64: parseString(thumbBase64, 10000000)}),
    ...(thumbFileType && {thumbFileType: parseString(thumbFileType, 100)}),
    ...(thumbUrl && {thumbUrl: parseString(thumbUrl, 4096)}),
    ...(url && {url: parseString(url, 4096)}),
    ...(uploadId && {uploadId: parseString(uploadId, 2048)}),
    ...(uploadKey && {uploadKey: parseString(uploadKey, 2000)}),
    ...(uploadStatus && {uploadStatus: parseString(uploadStatus, 64)}),
    ...(userId && {userId: parseId(userId)}),
    ...((_key || videoId) && {videoId: parseId(_key || videoId || '')}),
    ...(width !== undefined && {width: parseNum(width)})
  });

  return transformed;
};
