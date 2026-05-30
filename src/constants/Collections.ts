/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export const COLLECTIONS = {
  APPS: 'apps',
  CONVERSATIONS: 'conversations',
  CUSTOMER_NOTIFICATIONS: 'customerNotifications',
  CUSTOMER_ORDERS: 'customerOrders',
  FILES: 'files',
  GROUPS: 'groups',
  IMAGES: 'images',
  MAILING_LISTS: 'mailingLists',
  MESSAGES: 'messages',
  POSTS: 'posts',
  PERSONAS: 'personas',
  SHOPIFY_PRODUCTS: 'shopifyProducts',
  SHOPIFY_WEBHOOK_EVENTS: 'shopifyWebhookEvents',
  SUPPORT_TICKET_EVENTS: 'supportTicketEvents',
  SUPPORT_TICKET_MESSAGES: 'supportTicketMessages',
  SUPPORT_TICKETS: 'supportTickets',
  TAGS: 'tags',
  USERS: 'users',
  VIDEOS: 'videos'
} as const;

export type CollectionType = typeof COLLECTIONS[keyof typeof COLLECTIONS];

export const EDGES = {
  HAS_CONNECTION: 'hasConnection',
  HAS_CONVERSATION: 'hasConversation',
  HAS_CUSTOMER_NOTIFICATION: 'hasCustomerNotification',
  HAS_CUSTOMER_ORDER: 'hasCustomerOrder',
  HAS_FILE: 'hasFile',
  HAS_MEDIA: 'hasMedia',
  HAS_MAILING_LIST: 'hasMailingList',
  HAS_PERSONA: 'hasPersona',
  HAS_PURCHASED_PRODUCT: 'hasPurchasedProduct',
  HAS_REACTION: 'hasReaction',
  HAS_SUPPORT_TICKET: 'hasSupportTicket',
  HAS_SUPPORT_TICKET_EVENT: 'hasSupportTicketEvent',
  HAS_SUPPORT_TICKET_MESSAGE: 'hasSupportTicketMessage',
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
