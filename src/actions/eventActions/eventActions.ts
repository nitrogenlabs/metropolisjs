/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseId, parseNum } from '@nlabs/utils';

import { validateEventInput } from '../../adapters/eventAdapter/eventAdapter.js';
import { EVENT_CONSTANTS } from '../../stores/eventStore.js';
import { appMutation, appQuery } from '../../utils/api.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { EventType } from '../../adapters/eventAdapter/eventAdapter.js';
import type { ReaktorDbCollection } from '../../utils/api.js';
import type { PostApiResultsType } from '../postActions/postActions.js';

const DATA_TYPE: ReaktorDbCollection = 'posts';

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
  readonly addEvent: (eventData: Partial<EventType>, eventProps?: string[]) => Promise<EventType>;
  readonly getEvent: (eventId: string, eventProps?: string[]) => Promise<EventType>;
  readonly getEventsByTags: (tags: string[], latitude: number, longitude: number, eventProps?: string[]) => Promise<EventType[]>;
  readonly getEventsByReactions: (reactions: string[], latitude: number, longitude: number, eventProps?: string[]) => Promise<EventType[]>;
  readonly deleteEvent: (eventId: string, eventProps?: string[]) => Promise<EventType>;
  readonly updateEvent: (event: Partial<EventType>, eventProps?: string[]) => Promise<EventType>;
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
  let eventAdapterOptions: EventAdapterOptions = options?.eventAdapterOptions || {};
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
  const addEvent = async (eventData: Partial<EventType>, eventProps: string[] = []): Promise<EventType> => {
    try {
      const queryVariables = {
        event: {
          type: 'PostInput!',
          value: validateEvent(eventData, eventAdapterOptions)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {addPost = {}}} = data;
        return flux.dispatch({event: addPost, type: EVENT_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<EventType>(flux, 'addEvent', DATA_TYPE, queryVariables, ['eventId', ...eventProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const getEvent = async (eventId: string, eventProps: string[] = []): Promise<EventType> => {
    try {
      const queryVariables = {
        postId: {
          type: 'ID!',
          value: parseId(eventId)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPost: event = {}}} = data;
        return flux.dispatch({event, type: EVENT_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appQuery<EventType>(
        flux,
        'event',
        DATA_TYPE,
        queryVariables,
        [
          'address',
          'added',
          'content',
          'endDate',
          'hasRsvp',
          'images(from: 0 to: 10) { id, imageId, imageUrl, thumbUrl }',
          'modified',
          'name',
          'eventId',
          'startDate',
          'rsvpCount',
          'tags {name, tagId}',
          'user { imageUrl, userId, username }',
          'viewCount',
          ...eventProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const getEventsByTags = async (
    tags: string[],
    latitude: number,
    longitude: number,
    eventProps: string[] = []
  ): Promise<EventType[]> => {
    const formatTags: string[] = tags.map((tag: string) => tag.trim().toLowerCase());

    try {
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
          type: 'TagInput!',
          value: formatTags
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPostsByTags: eventsByTags = []}} = data;
        return flux.dispatch({
          list: eventsByTags,
          type: EVENT_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<EventType[]>(
        flux,
        'eventsByTags',
        DATA_TYPE,
        queryVariables,
        [
          'address',
          'added',
          'content',
          'endDate',
          'hasRsvp',
          'images(from: 0 to: 10) { id, imageId, imageUrl, thumbUrl }',
          'modified',
          'name',
          'eventId',
          'startDate',
          'rsvpCount',
          'tags {name, tagId}',
          'user { imageUrl, userId, username }',
          'viewCount',
          ...eventProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const getEventsByReactions = async (
    reactions: string[],
    latitude: number,
    longitude: number,
    eventProps: string[] = []
  ): Promise<EventType[]> => {
    try {
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
          type: 'ReactionInput!',
          value: reactions
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {getPostsByReactions: eventsByReactions = []}} = data;
        return flux.dispatch({
          list: eventsByReactions,
          type: EVENT_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<EventType[]>(
        flux,
        'eventsByReactions',
        DATA_TYPE,
        queryVariables,
        [
          'address',
          'added',
          'content',
          'endDate',
          'hasRsvp',
          'images(from: 0 to: 10) { id, imageId, imageUrl, thumbUrl }',
          'modified',
          'name',
          'eventId',
          'startDate',
          'rsvpCount',
          'tags {name, tagId}',
          'user { imageUrl, userId, username }',
          'viewCount',
          ...eventProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const deleteEvent = async (eventId: string, eventProps: string[] = []): Promise<EventType> => {
    try {
      const queryVariables = {
        postId: {
          type: 'ID!',
          value: parseId(eventId)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {deletePost: event = {}}} = data;
        return flux.dispatch({event, type: EVENT_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<EventType>(flux, 'deleteEvent', DATA_TYPE, queryVariables, ['eventId', ...eventProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  const updateEvent = async (event: Partial<EventType>, eventProps: string[] = []): Promise<EventType> => {
    try {
      const queryVariables = {
        event: {
          type: 'PostUpdateInput!',
          value: validateEvent(event, eventAdapterOptions)
        }
      };

      const onSuccess = (data: PostApiResultsType) => {
        const {posts: {updatePost: updatedEvent = {}}} = data;
        return flux.dispatch({event: updatedEvent, type: EVENT_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<EventType>(flux, 'updateEvent', DATA_TYPE, queryVariables, ['eventId', ...eventProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: EVENT_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
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

