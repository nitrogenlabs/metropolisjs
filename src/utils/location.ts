/**
 * Copyright (c) 2012-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { FluxFramework } from '@nlabs/arkhamjs';
import { isEmpty } from '@nlabs/utils';
import pDebounce from 'p-debounce';

import { parseLocation } from '../adapters/locationAdapter/locationAdapter.js';
import { appQuery, type ReaktorDbCollection } from '../utils/api.js';

import type { LocationType } from '../adapters/locationAdapter/locationAdapter.js';

const DATA_TYPE: ReaktorDbCollection = 'locations';

export const autoCompleteLocation = pDebounce(async (
  flux: FluxFramework,
  address: string,
  latitude?: number,
  longitude?: number,
  locationProps: string[] = [],
  CustomClass: typeof parseLocation = parseLocation
): Promise<LocationType[]> => {
  if(isEmpty(address)) {
    return [];
  }

  try {
    const queryVariables = {
      address: {
        type: 'String',
        value: address
      },
      latitude: {
        type: 'Float',
        value: latitude
      },
      longitude: {
        type: 'Float',
        value: longitude
      }
    };

    const {autoCompleteLocation = []} = await appQuery(flux, 'autoCompleteLocation', DATA_TYPE, queryVariables, [
      'address',
      'latitude',
      'longitude',
      ...locationProps
    ]) as {autoCompleteLocation: Record<string, unknown>[]};
    return autoCompleteLocation.map((item) => CustomClass(item));
  } catch(_error) {
    return [];
  }
}, 500);

export const searchLocations = async (
  flux: FluxFramework,
  address: string,
  latitude?: number,
  longitude?: number,
  locationProps: string[] = [],
  CustomClass: typeof parseLocation = parseLocation
): Promise<LocationType[]> => {
  if(isEmpty(address)) {
    return [];
  }

  try {
    const queryVariables = {
      address: {
        type: 'String',
        value: address
      },
      latitude: {
        type: 'Float',
        value: latitude
      },
      longitude: {
        type: 'Float',
        value: longitude
      }
    };

    const {autoCompleteLocation = []} = await appQuery(flux, 'autoCompleteLocation', DATA_TYPE, queryVariables, [
      'address',
      'latitude',
      'longitude',
      ...locationProps
    ]) as {autoCompleteLocation: Record<string, unknown>[]};
    return autoCompleteLocation.map((item) => CustomClass(item));
  } catch(_error) {
    return [];
  }
};
