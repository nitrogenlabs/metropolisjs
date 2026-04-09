import {parseArangoId, parseId} from '@nlabs/utils';
import {z} from 'zod';

import {User} from '../../adapters/userAdapter/userAdapter.js';
import {parseDocument, removeEmptyKeys} from '../arangoAdapter/arangoAdapter.js';
import {parseFile} from '../fileAdapter/fileAdapter.js';
import {parseImage} from '../imageAdapter/imageAdapter.js';

export interface MessageType {
  readonly _id?: string;
  readonly _key?: string;
  readonly _rev?: string;
  readonly _oldRev?: string;
  readonly _from?: string;
  readonly _to?: string;
  readonly content?: string;
  readonly conversationId?: string;
  readonly files?: any[];
  readonly id?: string;
  readonly images?: any[];
  readonly itemId?: string;
  readonly itemType?: string;
  readonly messageId?: string;
  readonly personaId?: string;
  readonly read?: boolean;
  readonly saved?: boolean;
  readonly user?: User;
  readonly userId?: string;
  [key: string]: any;
}

export class MessageValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'MessageValidationError';
  }
}

const MessageInputSchema = z.object({
  content: z.string().optional(),
  conversationId: z.string().optional(),
  files: z.array(z.any()).optional(),
  images: z.array(z.any()).optional(),
  itemId: z.string().optional(),
  itemType: z.string().optional(),
  messageId: z.string().optional(),
  personaId: z.string().optional(),
  read: z.boolean().optional(),
  saved: z.boolean().optional(),
  userId: z.string().optional(),
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional()
}).loose();

export const validateMessageInput = (message: unknown): MessageType => {
  try {
    const validated = MessageInputSchema.parse(message);
    return validated as MessageType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new MessageValidationError(`Message validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatMessageOutput = (message: MessageType): MessageType => message;

export const parseMessage = (message: MessageType): MessageType => {
  try {
    const parsed = performMessageTransformation(message);
    return parsed;
  } catch(error) {
    if(error instanceof MessageValidationError) {
      throw error;
    }
    throw new MessageValidationError(`Message parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performMessageTransformation = (message: MessageType): MessageType => {
  const {
    _id,
    _key,
    content,
    files,
    id,
    images,
    messageId,
    saved
  } = message;

  const transformed = removeEmptyKeys({
    ...parseDocument(message),
    ...((_id || id || _key || messageId) && {id: parseArangoId(_id || id || `messages/${_key || messageId}`)}),
    ...((_key || messageId) && {messageId: parseId(_key || messageId || '')}),
    ...(content && {content}),
    ...(Array.isArray(files) && {files: files.map(parseFile)}),
    ...(Array.isArray(images) && {images: images.map(parseImage)}),
    ...(saved !== undefined && {saved: !!saved})
  });

  return transformed;
};
