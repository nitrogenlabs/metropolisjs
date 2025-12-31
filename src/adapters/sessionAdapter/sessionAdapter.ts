import { parseArangoId, parseId, parseUsername } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';
import { parseReaktorDate } from '../reaktorAdapter/reaktorAdapter.js';

export interface SessionType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  expires?: number;
  id?: string;
  issued?: number;
  sessionId?: string;
  token?: string;
  userId?: string;
  username?: string;
  [key: string]: any;
}

export class SessionValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'SessionValidationError';
  }
}

const SessionInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional(),
  expires: z.number().optional(),
  id: z.string().optional(),
  issued: z.number().optional(),
  sessionId: z.string().optional(),
  token: z.string().optional(),
  userId: z.string().optional(),
  username: z.string().optional()
}).loose();

export const validateSessionInput = (session: unknown): SessionType => {
  try {
    const validated = SessionInputSchema.parse(session);
    return validated as SessionType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new SessionValidationError(`Session validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatSessionOutput = (session: SessionType): SessionType => session;

export const parseSession = (session: SessionType): SessionType => {
  try {
    const parsed = performSessionTransformation(session);
    return parsed;
  } catch(error) {
    if(error instanceof SessionValidationError) {
      throw error;
    }
    throw new SessionValidationError(`Session parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performSessionTransformation = (session: SessionType): SessionType => {
  const {
    _id,
    _key,
    expires,
    id,
    issued,
    sessionId,
    token,
    userId,
    username
  } = session;

  const transformed = removeEmptyKeys({
    ...parseDocument(session),
    ...(expires !== undefined && {expires: parseReaktorDate(expires)}),
    ...((_id || id || _key || sessionId) && {id: parseArangoId(_id || id || `sessions/${_key || sessionId}`)}),
    ...(issued !== undefined && {issued: parseReaktorDate(issued)}),
    ...((_key || sessionId) && {sessionId: parseId(_key || sessionId || '')}),
    ...(token && {token}),
    ...(userId && {userId: parseId(userId)}),
    ...(username && {username: parseUsername(username)})
  });

  return transformed;
};