import { parseArangoId, parseId, parseNum } from '@nlabs/utils';
import { z } from 'zod';

export interface DocumentType {
  _from?: string;
  _id?: string;
  _key?: string;
  _oldRev?: string;
  _rev?: string;
  _to?: string;
  added?: number;
  id?: string;
  modified?: number;
  [key: string]: any;
}

export class ArangoValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ArangoValidationError';
  }
}

const DocumentInputSchema = z.object({
  _from: z.string().optional(),
  _id: z.string().optional(),
  _key: z.string().optional(),
  _oldRev: z.string().optional(),
  _rev: z.string().optional(),
  _to: z.string().optional(),
  added: z.number().optional(),
  id: z.string().optional(),
  modified: z.number().optional()
}).loose();

export const validateDocumentInput = (doc: unknown): DocumentType => {
  try {
    const validated = DocumentInputSchema.parse(doc);
    return validated as DocumentType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ArangoValidationError(`Document validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatDocumentOutput = (doc: DocumentType): DocumentType => doc;

export const parseDocument = (doc: DocumentType): DocumentType => {
  try {
    const parsed = performDocumentTransformation(doc);
    return parsed;
  } catch(error) {
    if(error instanceof ArangoValidationError) {
      throw error;
    }
    throw new ArangoValidationError(`Document parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performDocumentTransformation = (doc: DocumentType): DocumentType => {
  const {
    _id,
    _key,
    added,
    id,
    modified
  } = doc;

  const transformed = removeEmptyKeys({
    ...doc,
    ...((_id || id) && {id: parseArangoId(_id || id || '')}),
    ...(_key && {_key: parseId(_key || '')}),
    ...(added !== undefined && {added: parseNum(added, 13)}),
    ...(modified !== undefined && {modified: parseNum(modified, 13)})
  });

  return transformed;
};

// Utility function to remove empty keys from objects
export const removeEmptyKeys = <T extends Record<string, any>>(obj: T): T => {
  const result = {} as T;
  for(const [key, value] of Object.entries(obj)) {
    if(value !== undefined && value !== null && value !== '') {
      result[key as keyof T] = value;
    }
  }
  return result;
};