import { parseArangoId, parseId } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';

export interface PersonaType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  id?: string;
  personaId?: string;
  [key: string]: any;
}

export class PersonaValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'PersonaValidationError';
  }
}

const PersonaInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional(),
  id: z.string().optional(),
  personaId: z.string().optional()
}).loose();

export const validatePersonaInput = (persona: unknown): PersonaType => {
  try {
    const validated = PersonaInputSchema.parse(persona);
    return validated as PersonaType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new PersonaValidationError(`Persona validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatPersonaOutput = (persona: PersonaType): PersonaType => persona;

export const parsePersona = (persona: PersonaType): PersonaType => {
  try {
    const parsed = performPersonaTransformation(persona);
    return parsed;
  } catch(error) {
    if(error instanceof PersonaValidationError) {
      throw error;
    }
    throw new PersonaValidationError(`Persona parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performPersonaTransformation = (persona: PersonaType): PersonaType => {
  const {
    _id,
    _key,
    id,
    personaId
  } = persona;

  const transformed = removeEmptyKeys({
    ...parseDocument(persona),
    ...((_id || id || _key || personaId) && {id: parseArangoId(_id || id || `personas/${_key || personaId}`)}),
    ...((_key || personaId) && {personaId: parseId(_key || personaId || '')})
  });

  return transformed;
};