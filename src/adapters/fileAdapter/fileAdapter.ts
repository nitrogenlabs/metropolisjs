import { parseArangoId, parseId, parseNum, parseString, parseUrl } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument } from '../arangoAdapter/arangoAdapter.js';
import { parseReaktorContent, parseReaktorType } from '../reaktorAdapter/reaktorAdapter.js';

export interface FileType {
  _from?: string;
  _id?: string;
  _key?: string;
  _oldRev?: string;
  _rev?: string;
  _to?: string;
  base64?: string;
  buffer?: any;
  description?: string;
  fileId?: string;
  fileSize?: number;
  fileType?: string;
  id?: string;
  itemId?: string;
  itemType?: string;
  name?: string;
  url?: string;
  userId?: string;
  [key: string]: any;
}

export class FileValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

const FileInputSchema = z.object({
  _from: z.string().optional(),
  _id: z.string().optional(),
  _key: z.string().optional(),
  _oldRev: z.string().optional(),
  _rev: z.string().optional(),
  _to: z.string().optional(),
  base64: z.string().optional(),
  buffer: z.any().optional(),
  description: z.string().optional(),
  fileId: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  itemId: z.string().optional(),
  itemType: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(),
  userId: z.string().optional()
}).loose();

export const validateFileInput = (file: unknown): FileType => {
  try {
    const validated = FileInputSchema.parse(file);
    return validated as FileType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new FileValidationError(`File validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatFileOutput = (file: FileType): FileType => file;

export const getFileType = (file: FileType): string => {
  const {fileType, name} = file;

  if(fileType) {
    return parseString(fileType, 16);
  }

  const nameArr: string[] = name?.split('.') || [];
  const ext = nameArr.length > 0 ? nameArr[nameArr.length - 1] : '';

  switch(ext) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'zip':
      return 'application/zip';
    default:
      return '';
  }
};

export const parseFile = (file: FileType): FileType => {
  try {
    const parsed = performFileTransformation(file);
    return parsed;
  } catch(error) {
    if(error instanceof FileValidationError) {
      throw error;
    }
    throw new FileValidationError(`File parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performFileTransformation = (file: FileType): FileType => {
  const {
    _id,
    _key,
    base64,
    buffer,
    description,
    fileId,
    fileSize,
    fileType,
    id,
    itemId,
    itemType,
    name,
    url,
    userId
  } = file;

  const transformed = {
    ...parseDocument(file),
    ...(base64 && {base64}),
    ...(buffer && {buffer}),
    ...(description && {description: parseReaktorContent(description)}),
    ...((_key || fileId) && {fileId: parseId(_key || fileId || '')}),
    ...((_id || id || _key || fileId) && {id: parseArangoId(_id || id || `files/${_key || fileId}`)}),
    ...(fileSize !== undefined && {fileSize: parseNum(fileSize)}),
    ...(fileType && {fileType: getFileType(file)}),
    ...(itemId && {itemId: parseId(itemId)}),
    ...(itemType && {itemType: parseReaktorType(itemType)}),
    ...(name && {name: parseString(name, 160)}),
    ...(url && {url: parseUrl(url)}),
    ...(userId && {userId: parseId(userId)})
  };

  return transformed;
};