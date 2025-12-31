import { parseArangoId, parseId, parseNum, parseString, parseUrl } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';

export interface ImageType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  bucket?: string;
  color?: string;
  id?: string;
  imageId?: string;
  height?: number;
  model?: string;
  make?: string;
  s3Options?: any;
  taken?: number;
  thumb?: string;
  fileType?: string;
  type?: string;
  url?: string;
  width?: number;
  name?: string;
  [key: string]: any;
}

export class ImageValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

const ImageInputSchema = z.object({
  bucket: z.string().optional(),
  color: z.string().optional(),
  imageId: z.string().optional(),
  height: z.number().optional(),
  model: z.string().optional(),
  make: z.string().optional(),
  s3Options: z.any().optional(),
  taken: z.number().optional(),
  thumb: z.string().optional(),
  fileType: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  width: z.number().optional(),
  name: z.string().optional(),
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional()
}).loose();

export const validateImageInput = (image: unknown): ImageType => {
  try {
    const validated = ImageInputSchema.parse(image);
    return validated as ImageType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ImageValidationError(`Image validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatImageOutput = (image: ImageType): ImageType => image;

export const parseImage = (image: ImageType): ImageType => {
  try {
    const parsed = performImageTransformation(image);
    return parsed;
  } catch(error) {
    if(error instanceof ImageValidationError) {
      throw error;
    }
    throw new ImageValidationError(`Image parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performImageTransformation = (image: ImageType): ImageType => {
  const {
    _id,
    _key,
    bucket,
    color,
    id,
    imageId,
    height,
    model,
    make,
    s3Options,
    taken,
    thumb,
    fileType,
    type,
    url,
    width,
    name
  } = image;

  const transformed = removeEmptyKeys({
    ...parseDocument(image),
    ...((_key || imageId) && {imageId: parseId(_key || imageId || '')}),
    ...((_id || id || _key || imageId) && {id: parseArangoId(_id || id || `images/${_key || imageId}`)}),
    ...(bucket && {bucket}),
    ...(color && {color}),
    ...(height !== undefined && {height: parseNum(height)}),
    ...(model && {model: parseString(model, 160)}),
    ...(make && {make: parseString(make, 160)}),
    ...(s3Options && {s3Options}),
    ...(taken !== undefined && {taken: parseNum(taken)}),
    ...(thumb && {thumb}),
    ...(fileType && {fileType: parseString(fileType, 16)}),
    ...(type && {type: parseString(type, 16)}),
    ...(url && {url: parseUrl(url)}),
    ...(width !== undefined && {width: parseNum(width)}),
    ...(name && {name: parseString(name, 160)})
  });

  return transformed;
};