import {useContext, useMemo} from 'react';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {MetropolisEnvironmentConfiguration} from '../config/index.js';
import {createActions} from '../utils/actionFactory.js';
import type {MetropolisAdapters} from './MetropolisContext.js';
import {MetropolisContext} from './MetropolisContext.js';
import type {ActionOptions, ActionType} from '../utils/actionFactory.js';

/**
 * Builds action options from adapters in a type-safe way.
 */
const buildActionOptions = (
  adapters?: MetropolisAdapters,
  config?: MetropolisEnvironmentConfiguration
): Partial<Record<ActionType, ActionOptions>> => {
  const awsRumOptions = config?.app?.rum || config?.app?.name
    ? {
      ...config?.app?.rum,
      analyticsId: config?.app?.rum?.analyticsId || config?.app?.name
    }
    : undefined;

  if (!adapters) {
    return awsRumOptions ? {awsRum: awsRumOptions} : {};
  }

  const options: Partial<Record<ActionType, ActionOptions>> = {};

  if(awsRumOptions) {
    options.awsRum = awsRumOptions;
  }

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
  if (adapters.Permission) {
    options.permission = {permissionAdapter: adapters.Permission};
  }
  if (adapters.Post) {
    options.post = {postAdapter: adapters.Post};
  }
  if (adapters.Persona) {
    options.persona = {personaAdapter: adapters.Persona};
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
  if (adapters.Video) {
    options.video = {videoAdapter: adapters.Video};
  }

  return options;
};

/**
 * Maps action type keys to their action names for return object.
 */
const mapActionsToReturnKeys = (actions: Record<string, any>): Record<string, any> => {
  const mapped: Record<string, any> = {};

  if(actions.awsRum) {
    mapped.awsRum = actions.awsRum;
  }

  if (actions.content) {
    mapped.contentActions = actions.content;
  }
  if (actions.crm) {
    mapped.crmActions = actions.crm;
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
  if (actions.permission) {
    mapped.permissionActions = actions.permission;
  }
  if (actions.post) {
    mapped.postActions = actions.post;
  }
  if (actions.persona) {
    mapped.personaActions = actions.persona;
  }
  if (actions.reaction) {
    mapped.reactionActions = actions.reaction;
  }
  if (actions.rest) {
    mapped.restActions = actions.rest;
  }
  if (actions.subscription) {
    mapped.subscriptionActions = actions.subscription;
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
  if (actions.video) {
    mapped.videoActions = actions.video;
  }
  if (actions.websocket) {
    mapped.websocketActions = actions.websocket;
  }

  return mapped;
};

/**
 * Main hook to access Metropolis actions.
 *
 * @param actionTypes - Action types to create.
 * @returns Object containing the requested actions
 *
 * @example
 * ```tsx
 * const {userActions} = useMetropolis(['user']);
 * const {userActions, postActions} = useMetropolis(['user', 'post']);
 * ```
 */
export const useMetropolis = <T extends ActionType[]>(actionTypes: T) => {
  const context = useContext(MetropolisContext);

  if(!context) {
    throw new Error('useMetropolis must be used within a Metropolis component.');
  }

  const {adapters, config, flux} = context;
  const actionOptions = useMemo(() => buildActionOptions(adapters, config), [adapters, config]);

  return useMemo(() => {
    const actions = createActions(actionTypes, flux, actionOptions);
    return mapActionsToReturnKeys(actions);
  }, [flux, actionOptions, actionTypes.join(',')]);
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

  if(!context) {
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

  if(!context) {
    throw new Error('useMetropolisFlux must be used within a Metropolis component.');
  }

  return context.flux;
};

/**
 * Specialized hooks for individual action types.
 * These hooks only create the specific action type, improving performance.
 */

export const useContentActions = () => {
  const {contentActions} = useMetropolis(['content']);
  return contentActions;
};

export const useAwsRum = () => {
  const {awsRum} = useMetropolis(['awsRum']);
  return awsRum;
};

export const useCrmActions = () => {
  const {crmActions} = useMetropolis(['crm']);
  return crmActions;
};

export const useEventActions = () => {
  const {eventActions} = useMetropolis(['event']);
  return eventActions;
};

export const useGroupActions = () => {
  const {groupActions} = useMetropolis(['group']);
  return groupActions;
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

export const useSubscriptionActions = () => {
  const {subscriptionActions} = useMetropolis(['subscription']);
  return subscriptionActions;
};

export const usePermissionActions = () => {
  const {permissionActions} = useMetropolis(['permission']);
  return permissionActions;
};

export const usePostActions = () => {
  const {postActions} = useMetropolis(['post']);
  return postActions;
};

export const usePersonaActions = () => {
  const {personaActions} = useMetropolis(['persona']);
  return personaActions;
};

export const useReactionActions = () => {
  const {reactionActions} = useMetropolis(['reaction']);
  return reactionActions;
};

export const useRestActions = () => {
  const {restActions} = useMetropolis(['rest']);
  return restActions;
};

export const useTagActions = () => {
  const {tagActions} = useMetropolis(['tag']);
  return tagActions;
};

export const useVideoActions = () => {
  const {videoActions} = useMetropolis(['video']);
  return videoActions;
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
