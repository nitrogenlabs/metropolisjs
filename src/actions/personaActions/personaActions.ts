/**
 * Copyright (c) 2023-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId } from '@nlabs/utils';

import { validatePersonaInput } from '../../adapters/personaAdapter/personaAdapter.js';
import { PERSONA_CONSTANTS } from '../../stores/personaStore.js';
import { USER_CONSTANTS } from '../../stores/userStore.js';
import { appMutation, appQuery } from '../../utils/api.js';
import { createBaseActions } from '../../utils/baseActionFactory.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { PersonaType } from '../../adapters/personaAdapter/personaAdapter.js';
import type { ActionRequestOptions } from '../../utils/requestCache.js';

// Define the collection name for personas
const DATA_TYPE = 'personas';
const PERSONA_TAG_SESSION_FIELDS = ['personaId', 'tags {name, tagId}'];
const DEFAULT_PERSONA_PROPS = [
  'imageId',
  'imageUrl',
  'name',
  'personaId',
  'tags {name, tagId}',
  'thumbUrl',
  'userId'
];

export interface PersonaAdapterOptions {
  readonly strict?: boolean;
  readonly allowPartial?: boolean;
  readonly environment?: 'development' | 'production' | 'test';
  readonly customValidation?: (input: unknown) => unknown;
}

export interface PersonaActionsOptions {
  readonly personaAdapter?: (input: unknown, options?: PersonaAdapterOptions) => any;
  readonly personaAdapterOptions?: PersonaAdapterOptions;
}

export interface PersonaApiResultsType {
  readonly personas: {
    readonly addConnection?: boolean;
    readonly addPersona?: PersonaType;
    readonly deleteConnection?: boolean;
    readonly deletePersona?: PersonaType;
    readonly getPersonaById?: PersonaType;
    readonly getPersonaListByIds?: PersonaType[];
    readonly listByTags?: PersonaType[];
    readonly updatePersona?: PersonaType;
  };
}

export interface PersonaActions {
  readonly blockPersona: (targetPersonaId: string) => Promise<boolean>;
  readonly followPersona: (targetPersonaId: string) => Promise<boolean>;
  readonly addPersona: (personaData: Partial<PersonaType>, personaProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PersonaType>;
  readonly getPersonaById: (personaId: string, personaProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PersonaType>;
  readonly getPersonaListByIds: (personaIds: string[], personaProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PersonaType[]>;
  readonly listByTags: (
    username: string,
    tags: string[],
    from?: number,
    to?: number,
    personaProps?: string[],
    filters?: Record<string, unknown>,
    requestOptions?: ActionRequestOptions
  ) => Promise<PersonaType[]>;
  readonly unfollowPersona: (targetPersonaId: string) => Promise<boolean>;
  readonly unblockPersona: (targetPersonaId: string) => Promise<boolean>;
  readonly deletePersona: (personaId: string, personaProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PersonaType>;
  readonly updatePersona: (persona: Partial<PersonaType>, personaProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PersonaType>;
  readonly updatePersonaAdapter: (adapter: (input: unknown, options?: PersonaAdapterOptions) => any) => void;
  readonly updatePersonaAdapterOptions: (options: PersonaAdapterOptions) => void;
}

// Default validation function
const defaultPersonaValidator = (input: unknown, options?: PersonaAdapterOptions) => validatePersonaInput(input);

export const syncPersonaToSession = (flux: FluxFramework, persona: Partial<PersonaType> = {}) => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  const sessionPersonaId = parseId(String(currentSession?.personaId || ''));
  const fetchedPersonaId = parseId(String(persona?.personaId || ''));
  const sessionUserId = parseId(String(currentSession?.userId || ''));
  const fetchedUserId = parseId(String(persona?.userId || ''));

  if(!fetchedPersonaId) {
    return;
  }

  if(sessionPersonaId && sessionPersonaId !== fetchedPersonaId) {
    return;
  }

  if(sessionUserId && fetchedUserId && sessionUserId !== fetchedUserId) {
    return;
  }

  const nextSession = {
    ...currentSession,
    ...persona,
    ...(Array.isArray(persona?.tags) ? {tags: persona.tags} : {})
  };

  void flux.setState('user.session', nextSession);
  flux.dispatch({type: USER_CONSTANTS.UPDATE_SESSION_SUCCESS, user: persona as any});
};

export const syncPersonaTagsToSession = async (
  flux: FluxFramework,
  personaId: string = ''
): Promise<Record<string, unknown>> => {
  const normalizedPersonaId = parseId(String(personaId || ''));

  if(!normalizedPersonaId) {
    return (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  }

  const queryVariables = {
    personaId: {
      type: 'ID!',
      value: normalizedPersonaId
    }
  };

  try {
    const data = await appQuery(
      flux,
      'getPersonaById',
      DATA_TYPE,
      queryVariables,
      PERSONA_TAG_SESSION_FIELDS
    ) as unknown as {
      personas?: {getPersonaById?: Partial<PersonaType>};
    };
    const persona = data?.personas?.getPersonaById || {};

    syncPersonaToSession(flux, {
      ...(persona?.personaId ? {personaId: persona.personaId} : {personaId: normalizedPersonaId}),
      ...(Array.isArray(persona?.tags) ? {tags: persona.tags} : {})
    });

    return (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  } catch(error) {
    return (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  }
};

/**
 * Factory function to create PersonaActions with enhanced adapter injection capabilities.
 * Custom adapters are merged with default behavior, allowing partial overrides.
 *
 * @example
 * // Basic usage with default adapters
 * const personaActions = createPersonaActions(flux);
 *
 * @example
 * // Custom adapter that extends default behavior
 * const customPersonaAdapter = (input: unknown, options?: PersonaAdapterOptions) => {
 *   // input is already validated by default adapter
 *   return input;
 * };
 *
 * const personaActions = createPersonaActions(flux, {
 *   personaAdapter: customPersonaAdapter
 * });
 */
export const createPersonaActions = (
  flux: FluxFramework,
  options?: PersonaActionsOptions
): PersonaActions => {
  const personaBase = createBaseActions(flux, defaultPersonaValidator, {
    ...(options?.personaAdapter && {adapter: options.personaAdapter}),
    ...(options?.personaAdapterOptions && {adapterOptions: options.personaAdapterOptions})
  });

  const getActivePersonaId = (): string => parseId(String(flux.getState('user.session.personaId') || ''));

  const clearPersonaRelationshipCache = async (personaId: string): Promise<void> => {
    await clearCachedRequest(flux, `persona.getPersonaById:${personaId}`);
    await clearCachedRequest(flux, `persona.getPersonaById:${getActivePersonaId()}`);
    await clearCachedRequest(flux, 'persona.getPersonaListByIds');
    await clearCachedRequest(flux, 'persona.listByTags');
  };

  // Action implementations
  const addPersona = async (personaData: Partial<PersonaType>, personaProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<PersonaType> => {
    try {
      const queryVariables = {
        persona: {
          type: 'PersonaInput!',
          value: personaBase.validator(personaData)
        }
      };

      const onSuccess = async (data: PersonaApiResultsType) => {
        const addPersona = data?.personas?.addPersona || {};
        return flux.dispatch({persona: addPersona, type: PERSONA_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<PersonaType>(
        flux,
        'addPersona',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_PERSONA_PROPS, ...personaProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: PERSONA_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'persona.getPersonaListByIds');
      await clearCachedRequest(flux, 'persona.listByTags');
    }
  };

  const getPersonaById = async (personaId: string, personaProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<PersonaType> => {
    try {
      const cachedResult = getCachedRequest<PersonaType>(flux, `persona.getPersonaById:${personaId}`, {personaId, personaProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        personaId: {
          type: 'ID!',
          value: parseId(personaId)
        }
      };

      const onSuccess = (data: PersonaApiResultsType) => {
        const persona = data?.personas?.getPersonaById || {};
        syncPersonaToSession(flux, persona);
        return flux.dispatch({persona, type: PERSONA_CONSTANTS.GET_ITEM_SUCCESS});
      };

      const result = await appQuery<PersonaType>(
        flux,
        'getPersonaById',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_PERSONA_PROPS, ...personaProps],
        {onSuccess}
      );
      return await setCachedRequest(flux, `persona.getPersonaById:${personaId}`, {personaId, personaProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: PERSONA_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const getPersonaListByIds = async (personaIds: string[], personaProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<PersonaType[]> => {
    try {
      const cachedResult = getCachedRequest<PersonaType[]>(flux, 'persona.getPersonaListByIds', {personaIds, personaProps}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        personaIds: {
          type: '[ID!]!',
          value: personaIds.map(parseId)
        }
      };

      const onSuccess = (data: PersonaApiResultsType) => {
        const personas = data?.personas?.getPersonaListByIds || [];
        return flux.dispatch({personas, type: PERSONA_CONSTANTS.GET_LIST_SUCCESS});
      };

      const result = await appQuery<PersonaType[]>(
        flux,
        'getPersonaListByIds',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_PERSONA_PROPS, ...personaProps],
        {onSuccess}
      );
      return await setCachedRequest(flux, 'persona.getPersonaListByIds', {personaIds, personaProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: PERSONA_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByTags = async (
    username: string,
    tags: string[],
    from: number = 0,
    to: number = 10,
    personaProps: string[] = [],
    filters: Record<string, unknown> = {},
    requestOptions: ActionRequestOptions = {}
  ): Promise<PersonaType[]> => {
    try {
      const cachedResult = getCachedRequest<PersonaType[]>(
        flux,
        'persona.listByTags',
        {username, tags, from, to, personaProps, filters},
        requestOptions
      );

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        filters: {
          type: 'PersonaListFiltersInput',
          value: filters
        },
        from: {
          type: 'Int',
          value: from
        },
        tags: {
          type: '[String!]',
          value: Array.isArray(tags) ? tags : []
        },
        to: {
          type: 'Int',
          value: to
        },
        username: {
          type: 'String',
          value: username
        }
      };

      const onSuccess = (data: PersonaApiResultsType) => {
        const personas = data?.personas?.listByTags || [];
        return flux.dispatch({personas, type: PERSONA_CONSTANTS.GET_LIST_SUCCESS});
      };

      const result = await appQuery<PersonaType[]>(
        flux,
        'listByTags',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_PERSONA_PROPS, ...personaProps],
        {onSuccess}
      );
      return await setCachedRequest(flux, 'persona.listByTags', {username, tags, from, to, personaProps, filters}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: PERSONA_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deletePersona = async (personaId: string, personaProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<PersonaType> => {
    try {
      const queryVariables = {
        personaId: {
          type: 'ID!',
          value: parseId(personaId)
        }
      };

      const onSuccess = (data: PersonaApiResultsType) => {
        const persona = data?.personas?.deletePersona || {};
        return flux.dispatch({persona, type: PERSONA_CONSTANTS.DELETE_ITEM_SUCCESS});
      };

      return await appMutation<PersonaType>(flux, 'deletePersona', DATA_TYPE, queryVariables, ['personaId', ...personaProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: PERSONA_CONSTANTS.DELETE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `persona.getPersonaById:${personaId}`);
      await clearCachedRequest(flux, 'persona.getPersonaListByIds');
      await clearCachedRequest(flux, 'persona.listByTags');
    }
  };

  const updatePersona = async (persona: Partial<PersonaType>, personaProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<PersonaType> => {
    try {
      const queryVariables = {
        persona: {
          type: 'PersonaInput!',
          value: personaBase.validator(persona)
        }
      };

      const onSuccess = async (data: PersonaApiResultsType) => {
        const persona = data?.personas?.updatePersona || {};
        syncPersonaToSession(flux, persona);
        return flux.dispatch({persona, type: PERSONA_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<PersonaType>(
        flux,
        'updatePersona',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_PERSONA_PROPS, ...personaProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: PERSONA_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `persona.getPersonaById:${String(persona?.personaId || '')}`);
      await clearCachedRequest(flux, 'persona.getPersonaListByIds');
      await clearCachedRequest(flux, 'persona.listByTags');
    }
  };

  const followPersona = async (targetPersonaId: string): Promise<boolean> => {
    const personaId = getActivePersonaId();

    if(!personaId) {
      throw new Error('A current persona is required before following.');
    }

    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: parseId(targetPersonaId)
        },
        itemType: {
          type: 'String!',
          value: DATA_TYPE
        },
        personaId: {
          type: 'ID!',
          value: personaId
        },
        type: {
          type: 'String',
          value: 'follow'
        }
      };

      const result = await appMutation<boolean>(
        flux,
        'addConnection',
        DATA_TYPE,
        queryVariables,
        [],
        {}
      );

      return Boolean((result as unknown as PersonaApiResultsType)?.personas?.addConnection ?? result);
    } finally {
      await clearPersonaRelationshipCache(parseId(targetPersonaId));
    }
  };

  const unfollowPersona = async (targetPersonaId: string): Promise<boolean> => {
    const personaId = getActivePersonaId();

    if(!personaId) {
      throw new Error('A current persona is required before unfollowing.');
    }

    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: parseId(targetPersonaId)
        },
        itemType: {
          type: 'String!',
          value: DATA_TYPE
        },
        personaId: {
          type: 'ID!',
          value: personaId
        },
        type: {
          type: 'String',
          value: 'follow'
        }
      };

      const result = await appMutation<boolean>(
        flux,
        'deleteConnection',
        DATA_TYPE,
        queryVariables,
        [],
        {}
      );

      return Boolean((result as unknown as PersonaApiResultsType)?.personas?.deleteConnection ?? result);
    } finally {
      await clearPersonaRelationshipCache(parseId(targetPersonaId));
    }
  };

  const blockPersona = async (targetPersonaId: string): Promise<boolean> => {
    const personaId = getActivePersonaId();

    if(!personaId) {
      throw new Error('A current persona is required before blocking.');
    }

    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: parseId(targetPersonaId)
        },
        itemType: {
          type: 'String!',
          value: DATA_TYPE
        },
        personaId: {
          type: 'ID!',
          value: personaId
        },
        type: {
          type: 'String',
          value: 'block'
        }
      };

      const result = await appMutation<boolean>(
        flux,
        'addConnection',
        DATA_TYPE,
        queryVariables,
        [],
        {}
      );

      return Boolean((result as unknown as PersonaApiResultsType)?.personas?.addConnection ?? result);
    } finally {
      await clearPersonaRelationshipCache(parseId(targetPersonaId));
    }
  };

  const unblockPersona = async (targetPersonaId: string): Promise<boolean> => {
    const personaId = getActivePersonaId();

    if(!personaId) {
      throw new Error('A current persona is required before unblocking.');
    }

    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: parseId(targetPersonaId)
        },
        itemType: {
          type: 'String!',
          value: DATA_TYPE
        },
        personaId: {
          type: 'ID!',
          value: personaId
        },
        type: {
          type: 'String',
          value: 'block'
        }
      };

      const result = await appMutation<boolean>(
        flux,
        'deleteConnection',
        DATA_TYPE,
        queryVariables,
        [],
        {}
      );

      return Boolean((result as unknown as PersonaApiResultsType)?.personas?.deleteConnection ?? result);
    } finally {
      await clearPersonaRelationshipCache(parseId(targetPersonaId));
    }
  };

  return {
    blockPersona,
    followPersona,
    addPersona,
    getPersonaById,
    getPersonaListByIds,
    listByTags,
    unfollowPersona,
    unblockPersona,
    deletePersona,
    updatePersona,
    updatePersonaAdapter: personaBase.updateAdapter,
    updatePersonaAdapterOptions: personaBase.updateOptions
  };
};
