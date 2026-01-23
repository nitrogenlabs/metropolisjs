/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export const COLLECTIONS = {
  APPS: 'apps',
  CONVERSATIONS: 'conversations',
  FILES: 'files',
  GROUPS: 'groups',
  IMAGES: 'images',
  MESSAGES: 'messages',
  POSTS: 'posts',
  PROFILES: 'profiles',
  TAGS: 'tags',
  USERS: 'users',
  VIDEOS: 'videos'
} as const;

export type CollectionType = typeof COLLECTIONS[keyof typeof COLLECTIONS];

export const EDGES = {
  HAS_CONNECTION: 'hasConnection',
  HAS_CONVERSATION: 'hasConversation',
  HAS_FILE: 'hasFile',
  HAS_REACTION: 'hasReaction',
  IS_TAGGED: 'isTagged'
} as const;

export type EdgeType = typeof EDGES[keyof typeof EDGES];

export const CONNECTION_TYPES = {
  ADMIN: 'admin',
  BLOCKED: 'blocked',
  FOLLOWER: 'follower',
  FOLLOWING: 'following',
  MEMBER: 'member'
} as const;

export type ConnectionType = typeof CONNECTION_TYPES[keyof typeof CONNECTION_TYPES];

export const REACTION_TYPES = {
  DISLIKE: 'dislike',
  LIKE: 'like',
  PIN: 'pin',
  RSVP: 'rsvp',
  VIEW: 'view'
} as const;

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];
