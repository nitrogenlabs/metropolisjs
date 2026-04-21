/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId, parseNum } from '@nlabs/utils';

import { validateEventInput } from '../../adapters/eventAdapter/eventAdapter.js';
import { EVENT_CONSTANTS } from '../../stores/eventStore.js';
import { appMutation, appQuery } from '../../utils/api.js';
import { clearCachedRequest, getCachedRequest, setCachedRequest } from '../../utils/requestCache.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { EventType } from '../../adapters/eventAdapter/eventAdapter.js';
import type { ActionRequestOptions } from '../../utils/requestCache.js';

const DATA_TYPE = 'posts';

const DEFAULT_EVENT_PROPS = [
  'added',
  'content',
  'endDate',
  'hasRsvp',
  'location',
  'latitude',
  'longitude',
  'modified',
  'name',
  'postId',
  'startDate',
  'rsvpCount',
  'tags {name, tagId}',
  'user { imageUrl, userId, username }',
  'viewCount'
];

type EventApiResultsType = {
  posts?: {
    addPost?: EventType;
    deletePost?: EventType;
    getPostById?: EventType;
    getPostListByReaction?: EventType[];
    getPostListByTags?: EventType[];
    updatePost?: EventType;
  };
};

export interface EventAdapterOptions {
  readonly strict?: boolean;
  readonly allowPartial?: boolean;
  readonly environment?: 'development' | 'production' | 'test';
  readonly customValidation?: (input: unknown) => unknown;
}

export interface EventActionsOptions {
  readonly eventAdapter?: (input: unknown, options?: EventAdapterOptions) => any;
  readonly eventAdapterOptions?: EventAdapterOptions;
}

export interface EventActions {
  readonly addEvent: (eventData: Partial<EventType>, eventProps?: string[], requestOptions?: ActionRequestOptions) => Promise<EventType>;
  readonly getEvent: (eventId: string, eventProps?: string[], requestOptions?: ActionRequestOptions) => Promise<EventType>;
  readonly getEventsByTags: (tags: string[], latitude: number, longitude: number, eventProps?: string[], requestOptions?: ActionRequestOptions) => Promise<EventType[]>;
  readonly getEventsByReactions: (reactions: string[], latitude: number, longitude: number, eventProps?: string[], requestOptions?: ActionRequestOptions) => Promise<EventType[]>;
  readonly deleteEvent: (eventId: string, eventProps?: string[], requestOptions?: ActionRequestOptions) => Promise<EventType>;
  readonly updateEvent: (event: Partial<EventType>, eventProps?: string[], requestOptions?: ActionRequestOptions) => Promise<EventType>;
  readonly updateEventAdapter: (adapter: (input: unknown, options?: EventAdapterOptions) => any) => void;
  readonly updateEventAdapterOptions: (options: EventAdapterOptions) => void;
}

// Default validation function
const defaultEventValidator = (input: unknown, options?: EventAdapterOptions) => validateEventInput(input);

// Enhanced validation function that merges custom logic with defaults
const createEventValidator = (
  customAdapter?: (input: unknown, options?: EventAdapterOptions) => any,
  options?: EventAdapterOptions
) => (input: unknown, validatorOptions?: EventAdapterOptions) => {
  const mergedOptions = {...options, ...validatorOptions};

  // Start with default validation
  let validated = defaultEventValidator(input, mergedOptions);

  // Apply custom validation if provided
  if(customAdapter) {
    validated = customAdapter(validated, mergedOptions);
  }

  // Apply custom validation from options if provided
  if(mergedOptions?.customValidation) {
    validated = mergedOptions.customValidation(validated) as EventType;
  }

  return validated;
};

/**
 * Factory function to create EventActions with enhanced adapter injection capabilities.
 * Custom adapters are merged with default behavior, allowing partial overrides.
 *
 * @example
 * // Basic usage with default adapters
 * const eventActions = createEventActions(flux);
 *
 * @example
 * // Custom adapter that extends default behavior
 * const customEventAdapter = (input: unknown, options?: EventAdapterOptions) => {
 *   // input is already validated by default adapter
 *   if (input.startDate && input.endDate && input.startDate > input.endDate) {
 *     throw new Error('Start date must be before end date');
 *   }
 *   return input;
 * };
 *
 * const eventActions = createEventActions(flux, {
 *   eventAdapter: customEventAdapter
 * });
 */
export const createEventActions = (
  flux: FluxFramework,
  options?: EventActionsOptions
): EventActions => {
  // Initialize adapter state
  let eventAdapterOptions = options?.eventAdapterOptions || {};
  let customEventAdapter = options?.eventAdapter;

  // Create validators that merge custom adapters with defaults
  let validateEvent = createEventValidator(customEventAdapter, eventAdapterOptions);

  // Update functions that recreate validators
  const updateEventAdapter = (adapter: (input: unknown, options?: EventAdapterOptions) => any): void => {
    customEventAdapter = adapter;
    validateEvent = createEventValidator(customEventAdapter, eventAdapterOptions);
  };

  const updateEventAdapterOptions = (options: EventAdapterOptions): void => {
    eventAdapterOptions = {...eventAdapterOptions, ...options};
    validateEvent = createEventValidator(customEventAdapter, eventAdapterOptions);
  };

  // Action implementations
  const addEvent = async (
    eventData: Partial<EventType>,
    eventProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<EventType> => {
    try {
      const queryVariables = {
        event: {
          type: 'PostInput!',
          value: validateEvent(eventData, eventAdapterOptions)
        }
      };

      const onSuccess = (data: EventApiResultsType) => {
        const addPost = data?.posts?.addPost || {};
        return flux.dispatch({event: addPost, type: EVENT_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<EventType>(flux, 'addPost', DATA_TYPE, queryVariables, ['postId', ...eventProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'event.getEventsByTags');
      await clearCachedRequest(flux, 'event.getEventsByReactions');
    }
  };

  const getEvent = async (
    eventId: string,
    eventProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<EventType> => {
    try {
      const cachedResult = getCachedRequest<EventType>(flux, `event.getEvent:${eventId}`, {eventId, eventProps}, requestOptions);

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        postId: {
          type: 'ID',
          value: parseId(eventId)
        }
      };

      const onSuccess = (data: EventApiResultsType) => {
        const event = data?.posts?.getPostById || {};
        return flux.dispatch({event, type: EVENT_CONSTANTS.GET_ITEM_SUCCESS});
      };

      const result = await appQuery<EventType>(
        flux,
        'getPostById',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_EVENT_PROPS, ...eventProps],
        {onSuccess}
      );

      return await setCachedRequest(flux, `event.getEvent:${eventId}`, {eventId, eventProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const getEventsByTags = async (
    tags: string[],
    latitude: number,
    longitude: number,
    eventProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<EventType[]> => {
    const formatTags = tags.map((tag) => tag.trim().toLowerCase());

    try {
      const cachedResult = getCachedRequest<EventType[]>(
        flux,
        'event.getEventsByTags',
        {eventProps, latitude, longitude, tags: formatTags},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        latitude: {
          type: 'Float',
          value: parseNum(latitude)
        },
        longitude: {
          type: 'Float',
          value: parseNum(longitude)
        },
        tags: {
          type: '[TagInput!]',
          value: formatTags.map((name) => ({name}))
        }
      };

      const onSuccess = (data: EventApiResultsType) => {
        const eventsByTags = data?.posts?.getPostListByTags || [];
        return flux.dispatch({
          list: eventsByTags,
          type: EVENT_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<EventType[]>(
        flux,
        'getPostListByTags',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_EVENT_PROPS, ...eventProps],
        {onSuccess}
      );

      return await setCachedRequest(flux, 'event.getEventsByTags', {eventProps, latitude, longitude, tags: formatTags}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const getEventsByReactions = async (
    reactions: string[],
    latitude: number,
    longitude: number,
    eventProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<EventType[]> => {
    try {
      const cachedResult = getCachedRequest<EventType[]>(
        flux,
        'event.getEventsByReactions',
        {eventProps, latitude, longitude, reactions},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        latitude: {
          type: 'Float',
          value: parseNum(latitude)
        },
        longitude: {
          type: 'Float',
          value: parseNum(longitude)
        },
        reactions: {
          type: '[ReactionInput!]',
          value: reactions.map((value) => ({value}))
        }
      };

      const onSuccess = (data: EventApiResultsType) => {
        const eventsByReactions = data?.posts?.getPostListByReaction || [];
        return flux.dispatch({
          list: eventsByReactions,
          type: EVENT_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<EventType[]>(
        flux,
        'getPostListByReaction',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_EVENT_PROPS, ...eventProps],
        {onSuccess}
      );

      return await setCachedRequest(flux, 'event.getEventsByReactions', {eventProps, latitude, longitude, reactions}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteEvent = async (
    eventId: string,
    eventProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<EventType> => {
    try {
      const queryVariables = {
        postId: {
          type: 'ID',
          value: parseId(eventId)
        }
      };

      const onSuccess = (data: EventApiResultsType) => {
        const event = data?.posts?.deletePost || {};
        return flux.dispatch({event, type: EVENT_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<EventType>(flux, 'deletePost', DATA_TYPE, queryVariables, ['postId', ...eventProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `event.getEvent:${eventId}`);
      await clearCachedRequest(flux, 'event.getEventsByTags');
      await clearCachedRequest(flux, 'event.getEventsByReactions');
    }
  };

  const updateEvent = async (
    event: Partial<EventType>,
    eventProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<EventType> => {
    try {
      const queryVariables = {
        event: {
          type: 'PostInput!',
          value: validateEvent(event, eventAdapterOptions)
        }
      };

      const onSuccess = (data: EventApiResultsType) => {
        const updatedEvent = data?.posts?.updatePost || {};
        return flux.dispatch({event: updatedEvent, type: EVENT_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<EventType>(flux, 'updatePost', DATA_TYPE, queryVariables, ['postId', ...eventProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `event.getEvent:${String(event?.eventId || '')}`);
      await clearCachedRequest(flux, 'event.getEventsByTags');
      await clearCachedRequest(flux, 'event.getEventsByReactions');
    }
  };

  // Return the actions object
  return {
    addEvent,
    getEvent,
    getEventsByTags,
    getEventsByReactions,
    deleteEvent,
    updateEvent,
    updateEventAdapter,
    updateEventAdapterOptions
  };
};
