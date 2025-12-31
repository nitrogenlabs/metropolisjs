/**
 * Copyright (c) 2021-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { createContext } from 'react';

import { parseContent } from '../adapters/contentAdapter/contentAdapter.js';
import { parseEvent } from '../adapters/eventAdapter/eventAdapter.js';
import { parseImage } from '../adapters/imageAdapter/imageAdapter.js';
import { parseLocation } from '../adapters/locationAdapter/locationAdapter.js';
import { parseMessage } from '../adapters/messageAdapter/messageAdapter.js';
import { parsePost } from '../adapters/postAdapter/postAdapter.js';
import { parseProfile } from '../adapters/profileAdapter/profileAdapter.js';
import { parseReaction } from '../adapters/reactionAdapter/reactionAdapter.js';
import { parseTag } from '../adapters/tagAdapter/tagAdapter.js';
import { parseTranslation } from '../adapters/translationAdapter/translationAdapter.js';
import { parseUser } from '../adapters/userAdapter/userAdapter.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { MessageType } from '../adapters/index.js';
import type { MetropolisEnvironmentConfiguration } from '../config/index.js';
import type { SessionType } from './api.js';

export interface MetropolisAdapters {
  readonly Content?: typeof parseContent;
  readonly Event?: typeof parseEvent;
  readonly Image?: typeof parseImage;
  readonly Location?: typeof parseLocation;
  readonly Message?: typeof parseMessage;
  readonly Post?: typeof parsePost;
  readonly Profile?: typeof parseProfile;
  readonly Reaction?: typeof parseReaction;
  readonly Tag?: typeof parseTag;
  readonly Translation?: typeof parseTranslation;
  readonly User?: typeof parseUser;
}

export interface MetropolisProviderProps {
  readonly children?: React.ReactElement | React.ReactElement[];
  readonly adapters?: MetropolisAdapters;
  readonly isAuth?: () => boolean;
  readonly messages?: MessageType[];
  readonly notifications?: Notification[];
  readonly session?: SessionType;
  readonly updateMessage: (message: MessageType) => void;
  readonly updateNotification: (notification: Notification) => void;
}

export interface MetropolisContextValue {
  readonly adapters?: MetropolisAdapters;
  readonly config?: MetropolisEnvironmentConfiguration;
  readonly flux?: FluxFramework;
  readonly isAuth: () => boolean;
  readonly messages: MessageType[];
  readonly notifications: Notification[];
  readonly session: SessionType;
  readonly updateMessage: (message: MessageType) => void;
  readonly updateNotification: (notification: Notification) => void;
}

const defaultContext: MetropolisContextValue = {
  adapters: undefined,
  config: undefined,
  flux: undefined,
  isAuth: () => true,
  messages: [],
  notifications: [],
  session: {},
  updateMessage: (message: MessageType) => message,
  updateNotification: (notification: Notification) => notification
};

export const MetropolisContext = createContext<MetropolisContextValue>(defaultContext);

export const MetropolisProvider = ({
  adapters,
  children,
  isAuth,
  messages,
  notifications,
  session,
  updateMessage,
  updateNotification
}: MetropolisProviderProps) => (
  <MetropolisContext.Provider
    value={{
      adapters,
      isAuth: isAuth || (() => true),
      messages: messages || [],
      notifications: notifications || [],
      session: session || {},
      updateMessage,
      updateNotification
    }}>
    {children}
  </MetropolisContext.Provider>
);
