/**
 * Copyright (c) 2021-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {createContext} from 'react';

import {parseContent} from '../adapters/contentAdapter/contentAdapter';
import {parseEvent} from '../adapters/eventAdapter/eventAdapter';
import {parseImage} from '../adapters/imageAdapter/imageAdapter';
import {parseLocation} from '../adapters/locationAdapter/locationAdapter';
import {parseMessage} from '../adapters/messageAdapter/messageAdapter';
import {parsePost} from '../adapters/postAdapter/postAdapter';
import {parseProfile} from '../adapters/profileAdapter/profileAdapter';
import {parseReaction} from '../adapters/reactionAdapter/reactionAdapter';
import {parseTag} from '../adapters/tagAdapter/tagAdapter';
import {parseTranslation} from '../adapters/translationAdapter/translationAdapter';
import {parseUser} from '../adapters/userAdapter/userAdapter';

import type {MessageType} from '../adapters';
import type {SessionType} from './api';

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

const defaultContext: {
  adapters: MetropolisAdapters | undefined;
  isAuth: () => boolean;
  messages: MessageType[];
  notifications: Notification[];
  session: SessionType;
  updateMessage: (message: MessageType) => void;
  updateNotification: (notification: Notification) => void;
} = {
  adapters: undefined,
  isAuth: () => true,
  messages: [],
  notifications: [],
  session: {},
  updateMessage: (message: MessageType) => message,
  updateNotification: (notification: Notification) => notification
};

export const MetropolisContext = createContext(defaultContext);

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
