import {useFlux} from '@nlabs/arkhamjs-utils-react';
import {useContext, useMemo} from 'react';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {MetropolisEnvironmentConfiguration} from '../config/index.js';
import {createActions, createAllActions, type ActionOptions, type ActionType} from '../utils/actionFactory.js';
import type {MetropolisAdapters} from './MetropolisProvider.js';
import {MetropolisContext} from './MetropolisProvider.js';

/**
 * Builds action options from adapters in a type-safe way.
 */
const buildActionOptions = (
  adapters?: MetropolisAdapters
): Partial<Record<ActionType, ActionOptions>> => {
  if (!adapters) {
    return {};
  }

  const options: Partial<Record<ActionType, ActionOptions>> = {};

  if (adapters.Content) {
    options.content = {contentAdapter: adapters.Content};
  }
  if (adapters.Event) {
    options.event = {eventAdapter: adapters.Event};
  }
  if (adapters.Image) {
    options.image = {imageAdapter: adapters.Image};
  }
  if (adapters.Location) {
    options.location = {locationAdapter: adapters.Location};
  }
  if (adapters.Message) {
    options.message = {messageAdapter: adapters.Message};
  }
  if (adapters.Post) {
    options.post = {postAdapter: adapters.Post};
  }
  if (adapters.Profile) {
    options.profile = {profileAdapter: adapters.Profile};
  }
  if (adapters.Reaction) {
    options.reaction = {reactionAdapter: adapters.Reaction};
  }
  if (adapters.Tag) {
    options.tag = {tagAdapter: adapters.Tag};
  }
  if (adapters.Translation) {
    options.translation = {translationAdapter: adapters.Translation};
  }
  if (adapters.User) {
    options.user = {userAdapter: adapters.User};
  }

  return options;
};

/**
 * Maps action type keys to their action names for return object.
 */
const mapActionsToReturnKeys = (actions: Record<string, any>): Record<string, any> => {
  const mapped: Record<string, any> = {};

  if (actions.content) {
    mapped.contentActions = actions.content;
  }
  if (actions.event) {
    mapped.eventActions = actions.event;
  }
  if (actions.group) {
    mapped.groupActions = actions.group;
  }
  if (actions.image) {
    mapped.imageActions = actions.image;
  }
  if (actions.location) {
    mapped.locationActions = actions.location;
  }
  if (actions.message) {
    mapped.messageActions = actions.message;
  }
  if (actions.post) {
    mapped.postActions = actions.post;
  }
  if (actions.profile) {
    mapped.profileActions = actions.profile;
  }
  if (actions.reaction) {
    mapped.reactionActions = actions.reaction;
  }
  if (actions.tag) {
    mapped.tagActions = actions.tag;
  }
  if (actions.translation) {
    mapped.translationActions = actions.translation;
  }
  if (actions.user) {
    mapped.userActions = actions.user;
  }
  if (actions.websocket) {
    mapped.websocketActions = actions.websocket;
  }

  return mapped;
};

/**
 * Main hook to access Metropolis actions.
 *
 * @param actionTypes - Optional array of action types to create. If not provided, creates all actions.
 * @returns Object containing the requested actions
 *
 * @example
 * ```tsx
 * // Get all actions (default behavior)
 * const {userActions, postActions} = useMetropolis();
 *
 * // Get only specific actions (more performant)
 * const {userActions} = useMetropolis(['user']);
 * const {userActions, postActions} = useMetropolis(['user', 'post']);
 * ```
 */
export const useMetropolis = <T extends ActionType[] = ActionType[]>(
  actionTypes?: T
) => {
  const context = useContext(MetropolisContext);
  // Use flux from context if available, otherwise fall back to useFlux() for backward compatibility
  const contextFlux = context?.flux;
  const hookFlux = useFlux();
  const flux = contextFlux || hookFlux;

  const {adapters} = context;
  const actionOptions = useMemo(() => buildActionOptions(adapters), [adapters]);

  return useMemo(() => {
    let actions: Record<string, any>;

    if (actionTypes && actionTypes.length > 0) {
      // Create only requested actions
      actions = createActions(actionTypes, flux, actionOptions);
    } else {
      // Create all actions (default behavior for backward compatibility)
      const allActions = createAllActions(flux, actionOptions);
      actions = allActions;
    }

    // Map to return keys (contentActions, userActions, etc.)
    return mapActionsToReturnKeys(actions);
  }, [flux, actionOptions, actionTypes?.join(',')]);
};

/**
 * Hook to access the Metropolis configuration from context.
 *
 * @returns The resolved environment-specific configuration
 * @throws Error if used outside of Metropolis component
 *
 * @example
 * ```tsx
 * const config = useMetropolisConfig();
 * const apiUrl = config.app?.api?.url;
 * ```
 */
export const useMetropolisConfig = (): MetropolisEnvironmentConfiguration => {
  const context = useContext(MetropolisContext);

  if (!context?.config) {
    throw new Error(
      'useMetropolisConfig must be used within a Metropolis component. ' +
      'Make sure your component is wrapped with <Metropolis> provider.'
    );
  }

  return context.config;
};

/**
 * Hook to access the Flux framework instance from context.
 *
 * @returns The Flux framework instance
 * @throws Error if used outside of Metropolis component and no Flux available
 *
 * @example
 * ```tsx
 * const flux = useMetropolisFlux();
 * const state = flux.getState('user.session');
 * ```
 */
export const useMetropolisFlux = (): FluxFramework => {
  const context = useContext(MetropolisContext);
  const hookFlux = useFlux();

  // Use flux from context if available, otherwise fall back to useFlux() for backward compatibility
  return context?.flux || hookFlux;
};

/**
 * Specialized hooks for individual action types.
 * These hooks only create the specific action type, improving performance.
 */

export const useContentActions = () => {
  const {contentActions} = useMetropolis(['content']);
  return contentActions;
};

export const useEventActions = () => {
  const {eventActions} = useMetropolis(['event']);
  return eventActions;
};

export const useImageActions = () => {
  const {imageActions} = useMetropolis(['image']);
  return imageActions;
};

export const useLocationActions = () => {
  const {locationActions} = useMetropolis(['location']);
  return locationActions;
};

export const useMessageActions = () => {
  const {messageActions} = useMetropolis(['message']);
  return messageActions;
};

export const usePostActions = () => {
  const {postActions} = useMetropolis(['post']);
  return postActions;
};

export const useProfileActions = () => {
  const {profileActions} = useMetropolis(['profile']);
  return profileActions;
};

export const useReactionActions = () => {
  const {reactionActions} = useMetropolis(['reaction']);
  return reactionActions;
};

export const useTagActions = () => {
  const {tagActions} = useMetropolis(['tag']);
  return tagActions;
};

export const useTranslationActions = () => {
  const {translationActions} = useMetropolis(['translation']);
  return translationActions;
};

export const useUserActions = () => {
  const {userActions} = useMetropolis(['user']);
  return userActions;
};

export const useWebsocketActions = () => {
  const {websocketActions} = useMetropolis(['websocket']);
  return websocketActions;
};