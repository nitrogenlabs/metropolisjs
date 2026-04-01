/**
 * Copyright (c) 2023-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId} from '@nlabs/utils';

import type {PersonaType} from '../adapters/personaAdapter/personaAdapter.js';

export const PERSONA_CONSTANTS = {
  ADD_ITEM_ERROR: 'PERSONA_ADD_ITEM_ERROR',
  ADD_ITEM_SUCCESS: 'PERSONA_ADD_ITEM_SUCCESS',
  DELETE_ITEM_ERROR: 'PERSONA_DELETE_ITEM_ERROR',
  DELETE_ITEM_SUCCESS: 'PERSONA_DELETE_ITEM_SUCCESS',
  GET_ITEM_ERROR: 'PERSONA_GET_ITEM_ERROR',
  GET_ITEM_SUCCESS: 'PERSONA_GET_ITEM_SUCCESS',
  GET_LIST_ERROR: 'PERSONA_GET_LIST_ERROR',
  GET_LIST_SUCCESS: 'PERSONA_GET_LIST_SUCCESS',
  UPDATE_ITEM_ERROR: 'PERSONA_UPDATE_ITEM_ERROR',
  UPDATE_ITEM_SUCCESS: 'PERSONA_UPDATE_ITEM_SUCCESS'
};

export interface PersonaState {
  readonly error?: Error;
  readonly list: PersonaType[];
  readonly listMap: Record<string, PersonaType>;
}

export const initialPersonaState: PersonaState = {
  error: undefined,
  list: [],
  listMap: {}
};

export const personaStore = (state = initialPersonaState, action = {}, _next = {}): PersonaState => {
  const {error, persona, personas, type = ''} = action as {
    error?: Error;
    persona?: PersonaType;
    personas?: PersonaType[];
    type: string;
  };

  switch(type) {
    case PERSONA_CONSTANTS.ADD_ITEM_SUCCESS:
    case PERSONA_CONSTANTS.UPDATE_ITEM_SUCCESS:
    case PERSONA_CONSTANTS.GET_ITEM_SUCCESS:
      if(persona) {
        const personaId = parseId(persona.personaId ?? '');
        const list = [...state.list];
        const listMap = {...state.listMap};
        const index = list.findIndex((item) => parseId(item.personaId ?? '') === personaId);

        if(index >= 0) {
          list[index] = {...list[index], ...persona};
        } else {
          list.push(persona);
        }

        listMap[personaId] = persona;

        return {...state, error: undefined, list, listMap};
      }
      return state;

    case PERSONA_CONSTANTS.DELETE_ITEM_SUCCESS:
      if(persona) {
        const personaId = parseId(persona.personaId ?? '');
        const list = state.list.filter((item) => parseId(item.personaId ?? '') !== personaId);
        const listMap = {...state.listMap};
        delete listMap[personaId];

        return {...state, error: undefined, list, listMap};
      }
      return state;

    case PERSONA_CONSTANTS.GET_LIST_SUCCESS:
      if(personas?.length) {
        const list = [...state.list];
        const listMap = {...state.listMap};

        personas.forEach((persona) => {
          const personaId = parseId(persona.personaId ?? '');
          const index = list.findIndex((item) => parseId(item.personaId ?? '') === personaId);

          if(index >= 0) {
            list[index] = {...list[index], ...persona};
          } else {
            list.push(persona);
          }

          listMap[personaId] = persona;
        });

        return {...state, error: undefined, list, listMap};
      }
      return state;

    case PERSONA_CONSTANTS.ADD_ITEM_ERROR:
    case PERSONA_CONSTANTS.DELETE_ITEM_ERROR:
    case PERSONA_CONSTANTS.GET_ITEM_ERROR:
    case PERSONA_CONSTANTS.GET_LIST_ERROR:
    case PERSONA_CONSTANTS.UPDATE_ITEM_ERROR:
      return {...state, error};

    default:
      return state;
  }
};

export const personas = {
  action: personaStore,
  initialState: initialPersonaState,
  name: 'persona'
};
