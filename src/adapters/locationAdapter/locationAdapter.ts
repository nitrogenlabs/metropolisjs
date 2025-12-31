import { parseArangoId, parseChar, parseId, parseNum, parseString, parseVarChar } from '@nlabs/utils';
import { z } from 'zod';

import { parseDocument, removeEmptyKeys } from '../arangoAdapter/arangoAdapter.js';

export interface LocationType {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  _from?: string;
  _to?: string;
  address?: string;
  city?: string;
  country?: string;
  id?: string;
  latitude?: number;
  location?: string;
  locationId?: string;
  longitude?: number;
  state?: string;
  street?: string;
  zip?: string;
  [key: string]: any;
}

export class LocationValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'LocationValidationError';
  }
}

const LocationInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  _from: z.string().optional(),
  _to: z.string().optional(),
  address: z.string().max(128).optional(),
  city: z.string().max(32).optional(),
  country: z.string().max(2).optional(),
  id: z.string().optional(),
  latitude: z.number().optional(),
  location: z.string().optional(),
  locationId: z.string().optional(),
  longitude: z.number().optional(),
  state: z.string().max(2).optional(),
  street: z.string().max(32).optional(),
  zip: z.string().max(16).optional()
}).loose();

export const validateLocationInput = (location: unknown): LocationType => {
  try {
    const validated = LocationInputSchema.parse(location);
    return validated as LocationType;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new LocationValidationError(`Location validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatLocationOutput = (location: LocationType): LocationType => location;

export const parseLocation = (location: LocationType): LocationType => {
  try {
    const parsed = performLocationTransformation(location);
    return parsed;
  } catch(error) {
    if(error instanceof LocationValidationError) {
      throw error;
    }
    throw new LocationValidationError(`Location parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performLocationTransformation = (location: LocationType): LocationType => {
  const {
    _id,
    _key,
    address,
    city,
    country,
    id,
    latitude,
    location: locationStr,
    locationId,
    longitude,
    state,
    street,
    zip
  } = location;

  const transformed = removeEmptyKeys({
    ...parseDocument(location),
    ...((_id || id || _key || locationId) && {id: parseArangoId(_id || id || `locations/${_key || locationId}`)}),
    ...((_key || locationId) && {locationId: parseId(_key || locationId || '')}),
    ...(address && {address: parseString(address, 128)}),
    ...(city && {city: parseString(city, 32)}),
    ...(country && {country: parseChar(country, 2)}),
    ...(latitude !== undefined && {latitude: parseNum(latitude, 15)}),
    ...(locationStr && {location: parseString(locationStr, 128)}),
    ...(longitude !== undefined && {longitude: parseNum(longitude, 15)}),
    ...(state && {state: parseChar(state, 2)}),
    ...(street && {street: parseString(street, 32)}),
    ...(zip && {zip: parseVarChar(zip, 16)})
  });

  return transformed;
};