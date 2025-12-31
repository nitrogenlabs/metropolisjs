import { parseArangoId, parseId, parseNum, parseString } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';
import { parseImage } from '../imageAdapter/imageAdapter.js';
import { parseReaktorContent, parseReaktorDate, parseReaktorType } from '../reaktorAdapter/reaktorAdapter.js';
import { parseTag } from '../tagAdapter/tagAdapter.js';
import { parseUser } from '../userAdapter/userAdapter.js';

export interface EventType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  address?: string;
  cached?: number;
  content?: string;
  endDate?: number;
  eventId?: string;
  groupId?: string;
  id?: string;
  images?: any[];
  isGoing?: boolean;
  latitude?: number;
  location?: string | {address: string; latitude: number; longitude: number};
  longitude?: number;
  mentions?: any[];
  modified?: number;
  name?: string;
  postId?: string;
  reactions?: string[];
  rsvpCount?: number;
  startDate?: number;
  tags?: any[];
  type?: string;
  user?: any;
  viewCount?: number;
  [key: string]: any;
}

export class EventValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'EventValidationError';
  }
}

const EventInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional(),
  address: z.string().optional(),
  cached: z.number().optional(),
  content: z.string().optional(),
  endDate: z.number().optional(),
  eventId: z.string().optional(),
  groupId: z.string().optional(),
  id: z.string().optional(),
  images: z.array(z.any()).optional(),
  isGoing: z.boolean().optional(),
  latitude: z.number().optional(),
  location: z.union([z.string(), z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number()
  })]).optional(),
  longitude: z.number().optional(),
  mentions: z.array(z.any()).optional(),
  modified: z.number().optional(),
  name: z.string().optional(),
  postId: z.string().optional(),
  reactions: z.array(z.string()).optional(),
  rsvpCount: z.number().optional(),
  startDate: z.number().optional(),
  tags: z.array(z.any()).optional(),
  type: z.string().optional(),
  user: z.any().optional(),
  viewCount: z.number().optional()
}).loose();

export const validateEventInput = (event: unknown): EventType => {
  try {
    const validated = EventInputSchema.parse(event);
    return validated as EventType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new EventValidationError(`Event validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatEventOutput = (event: EventType): EventType => event;

export const parseEvent = (event: EventType): EventType => {
  try {
    const parsed = performEventTransformation(event);
    return parsed;
  } catch(error) {
    if(error instanceof EventValidationError) {
      throw error;
    }
    throw new EventValidationError(`Event parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performEventTransformation = (event: EventType): EventType => {
  const {
    _id,
    _key,
    address,
    cached,
    content,
    endDate,
    eventId,
    groupId,
    id,
    images,
    isGoing,
    latitude,
    location,
    longitude,
    mentions,
    name,
    postId,
    reactions,
    rsvpCount,
    startDate,
    tags,
    type,
    user,
    viewCount
  } = event;

  const transformed = removeEmptyKeys({
    ...parseDocument(event),
    ...(address && {address: parseString(address, 160)}),
    ...(cached !== undefined && {cached: parseNum(cached)}),
    ...(content && {content: parseReaktorContent(content)}),
    ...(endDate !== undefined && {endDate: parseReaktorDate(endDate)}),
    ...((_id || id || _key || eventId) && {id: parseArangoId(_id || id || `events/${_key || eventId}`)}),
    ...((_key || eventId) && {eventId: parseId(_key || eventId || '')}),
    ...(groupId && {groupId: parseId(groupId)}),
    ...(images?.length && {images: images.map((image) => parseImage(image))}),
    ...(isGoing !== undefined && {isGoing: !!isGoing}),
    ...(latitude !== undefined && {latitude: parseNum(latitude, 15)}),
    ...(longitude !== undefined && {longitude: parseNum(longitude, 15)}),
    ...(mentions?.length && {mentions: mentions.map((mention) => parseUser(mention))}),
    ...(name && {name: parseString(name, 160)}),
    ...(postId && {postId: parseId(postId)}),
    ...(reactions?.length && {reactions}),
    ...(rsvpCount !== undefined && {rsvpCount: parseNum(rsvpCount)}),
    ...(startDate !== undefined && {startDate: parseReaktorDate(startDate)}),
    ...(tags?.length && {tags: tags.map((tag) => parseTag(tag))}),
    ...(type && {type: parseReaktorType(type)}),
    ...(user && {user: parseUser(user)}),
    ...(viewCount !== undefined && {viewCount: parseNum(viewCount)})
  });

  // Handle location object
  if(location && typeof location === 'object') {
    transformed.address = parseString(location.address, 160);
    transformed.latitude = parseNum(location.latitude, 15);
    transformed.longitude = parseNum(location.longitude, 15);
  }

  return transformed;
};