/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { validateLocationInput } from '../../adapters/locationAdapter/locationAdapter.js';
import { LOCATION_CONSTANTS } from '../../stores/locationStore.js';
import { appMutation } from '../../utils/api.js';
import { autoCompleteLocation } from '../../utils/location.js';
import { clearCachedRequest, getCachedRequest, setCachedRequest } from '../../utils/requestCache.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { User } from '../../adapters/index.js';
import type { LocationType } from '../../adapters/locationAdapter/locationAdapter.js';
import type { ApiResultsType } from '../../utils/api.js';
import type { ActionRequestOptions } from '../../utils/requestCache.js';

const DATA_TYPE = 'locations';

export interface LocationAdapterOptions {
  strict?: boolean;
  allowPartial?: boolean;
  environment?: 'development' | 'production' | 'test';
  customValidation?: (input: unknown) => unknown;
}

export interface LocationActionsOptions {
  locationAdapter?: (input: unknown, options?: LocationAdapterOptions) => any;
  locationAdapterOptions?: LocationAdapterOptions;
}

export type LocationApiResultsType = {
  addLocation: LocationType;
  deleteLocation: LocationType;
  getLocation: LocationType;
  getLocationsByItem: LocationType[];
  updateLocation: LocationType;
};

export interface LocationActions {
  autocompleteLocation: (address: string, latitude?: number, longitude?: number, locationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<LocationType[]>;
  add: (location: Partial<LocationType>, locationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<LocationType>;
  delete: (locationId: string, requestOptions?: ActionRequestOptions) => Promise<LocationType>;
  getCurrentLocation: (setLocation?: (location: LocationType) => void, requestOptions?: ActionRequestOptions) => Promise<LocationType>;
  getGoogleLocation: (address: string, requestOptions?: ActionRequestOptions) => Promise<{latitude: number; location: string; longitude: number}>;
  getLocation: (location: Partial<LocationType>, locationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<LocationType>;
  listByItem: (itemId: string, locationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<LocationType[]>;
  update: (location: Partial<LocationType>, locationProps?: string[], requestOptions?: ActionRequestOptions) => Promise<LocationType>;
  updateLocationAdapter: (adapter: (input: unknown, options?: LocationAdapterOptions) => any) => void;
  updateLocationAdapterOptions: (options: LocationAdapterOptions) => void;
}

// Default validation function
const defaultLocationValidator = (input: unknown, options?: LocationAdapterOptions) => validateLocationInput(input);

// Enhanced validation function that merges custom logic with defaults
const createLocationValidator = (
  customAdapter?: (input: unknown, options?: LocationAdapterOptions) => any,
  options?: LocationAdapterOptions
) => (input: unknown, validatorOptions?: LocationAdapterOptions) => {
  const mergedOptions = {...options, ...validatorOptions};

  // Start with default validation
  let validated = defaultLocationValidator(input, mergedOptions);

  // Apply custom validation if provided
  if(customAdapter) {
    validated = customAdapter(validated, mergedOptions);
  }

  // Apply custom validation from options if provided
  if(mergedOptions?.customValidation) {
    validated = mergedOptions.customValidation(validated) as LocationType;
  }

  return validated;
};

/**
 * Factory function to create LocationActions with enhanced adapter injection capabilities.
 * Custom adapters are merged with default behavior, allowing partial overrides.
 *
 * @example
 * // Basic usage with default adapters
 * const locationActions = createLocationActions(flux);
 *
 * @example
 * // Custom adapter that extends default behavior
 * const customLocationAdapter = (input: unknown, options?: LocationAdapterOptions) => {
 *   // input is already validated by default adapter
 *   if (input.latitude && (input.latitude < -90 || input.latitude > 90)) {
 *     throw new Error('Invalid latitude');
 *   }
 *   return input;
 * };
 *
 * const locationActions = createLocationActions(flux, {
 *   locationAdapter: customLocationAdapter
 * });
 */
export const createLocationActions = (
  flux: FluxFramework,
  options?: LocationActionsOptions
): LocationActions => {
  // Initialize adapter state
  let locationAdapterOptions = options?.locationAdapterOptions || {};
  let customLocationAdapter = options?.locationAdapter;

  // Create validators that merge custom adapters with defaults
  let validateLocation = createLocationValidator(customLocationAdapter, locationAdapterOptions);

  // Update functions that recreate validators
  const updateLocationAdapter = (adapter: (input: unknown, options?: LocationAdapterOptions) => any): void => {
    customLocationAdapter = adapter;
    validateLocation = createLocationValidator(customLocationAdapter, locationAdapterOptions);
  };

  const updateLocationAdapterOptions = (options: LocationAdapterOptions): void => {
    locationAdapterOptions = {...locationAdapterOptions, ...options};
    validateLocation = createLocationValidator(customLocationAdapter, locationAdapterOptions);
  };

  // Action implementations
  const autocompleteLocation = async (
    address: string,
    latitude?: number,
    longitude?: number,
    locationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<LocationType[]> => {
    const cachedResult = getCachedRequest<LocationType[]>(
      flux,
      'location.autocompleteLocation',
      {address, latitude, locationProps, longitude},
      requestOptions
    );

    if(cachedResult) {
      return cachedResult;
    }

    const result = await autoCompleteLocation(flux, address, latitude, longitude, locationProps);
    return await setCachedRequest(flux, 'location.autocompleteLocation', {address, latitude, locationProps, longitude}, result, requestOptions);
  };

  const add = async (
    location: Partial<LocationType>,
    locationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<LocationType> => {
    try {
      const queryVariables = {
        location: {
          type: 'LocationInput!',
          value: validateLocation(location, locationAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const addLocation = data?.addLocation || {};
        return flux.dispatch({location: addLocation, type: LOCATION_CONSTANTS.ADD_ITEM_SUCCESS});
      };

      return await appMutation<LocationType>(
        flux,
        'addLocation',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'address',
          'city',
          'country',
          'id',
          'latitude',
          'longitude',
          'modified',
          'state',
          'street',
          'zip',
          ...locationProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'location.autocompleteLocation');
    }
  };

  const deleteLocation = async (locationId: string, requestOptions: ActionRequestOptions = {}): Promise<LocationType> => {
    try {
      const queryVariables = {
        locationId: {
          type: 'ID!',
          value: locationId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const location = data?.deleteLocation || {};
        return flux.dispatch({location, type: LOCATION_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<LocationType>(
        flux,
        'deleteLocation',
        DATA_TYPE,
        queryVariables,
        ['id'],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `location.listByItem:${locationId}`);
    }
  };

  const getCurrentLocation = async (
    setLocation?: (location: LocationType) => void,
    requestOptions: ActionRequestOptions = {}
  ): Promise<LocationType> => new Promise((resolve, reject) => {
    const {userId}: User = flux.getState('user.session', {});
    const {city, country, latitude, longitude, state}: User = flux.getState(['user', 'users', userId || ''], {});
    const locationStr = [city, state, country].join(', ');
    const personaLocation = {
      latitude,
      location: locationStr,
      longitude
    } as LocationType;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async ({coords}) => {
          const current = {
            latitude: coords.latitude,
            location: 'Current Location',
            longitude: coords.longitude
          } as LocationType;
          await flux.dispatch({current, type: LOCATION_CONSTANTS.SET_CURRENT});
          if(setLocation) {
            setLocation(current);
          }
          resolve(current);
        },
        (locationError) => {
          console.log('getCurrentLocation::locationError', locationError);
          console.log('getCurrentLocation::personaLocation1', personaLocation);
          if(setLocation) {
            setLocation(personaLocation);
          }

          flux.dispatch({current: personaLocation, type: LOCATION_CONSTANTS.SET_CURRENT});
          reject(locationError);
        },
        {enableHighAccuracy: false, maximumAge: 0, timeout: 30000}
      );
    } else {
      console.log('getCurrentLocation::personaLocation2', personaLocation);
      if(setLocation) {
        setLocation(personaLocation);
      }

      flux.dispatch({current: personaLocation, type: LOCATION_CONSTANTS.SET_CURRENT});
      reject('Geolocation is not supported by this browser.');
    }
  });

  const getGoogleLocation = async (
    address: string,
    requestOptions: ActionRequestOptions = {}
  ): Promise<{latitude: number; location: string; longitude: number}> => {
    const locations = await autocompleteLocation(address, undefined, undefined, [], requestOptions);
    const [firstLocation = {} as LocationType] = locations;

    return {
      latitude: firstLocation.latitude || 0,
      location: firstLocation.location || '',
      longitude: firstLocation.longitude || 0
    };
  };

  const getLocation = async (
    location: Partial<LocationType>,
    locationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<LocationType> => {
    try {
      const cachedResult = getCachedRequest<LocationType>(flux, 'location.getLocation', {location, locationProps}, requestOptions);

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        location: {
          type: 'LocationInput!',
          value: validateLocation(location, locationAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const getLocation = data?.getLocation || {};
        return flux.dispatch({location: getLocation, type: LOCATION_CONSTANTS.GET_ITEM_SUCCESS});
      };

      const result = await appMutation<LocationType>(
        flux,
        'getLocation',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'address',
          'city',
          'country',
          'id',
          'latitude',
          'longitude',
          'modified',
          'state',
          'street',
          'zip',
          ...locationProps
        ],
        {onSuccess}
      );

      return await setCachedRequest(flux, 'location.getLocation', {location, locationProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const listByItem = async (
    itemId: string,
    locationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<LocationType[]> => {
    try {
      const cachedResult = getCachedRequest<LocationType[]>(
        flux,
        `location.listByItem:${itemId}`,
        {itemId, locationProps},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: itemId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const locationsByItem = Array.isArray((data as {locationsByItem?: LocationType[]})?.locationsByItem)
          ? (data as {locationsByItem?: LocationType[]}).locationsByItem || []
          : [];
        return flux.dispatch({
          itemId,
          list: locationsByItem,
          type: LOCATION_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appMutation<LocationType[]>(
        flux,
        'locationsByItem',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'address',
          'city',
          'country',
          'id',
          'latitude',
          'longitude',
          'modified',
          'state',
          'street',
          'zip',
          ...locationProps
        ],
        {onSuccess}
      );

      return await setCachedRequest(flux, `location.listByItem:${itemId}`, {itemId, locationProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const update = async (
    location: Partial<LocationType>,
    locationProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<LocationType> => {
    try {
      const queryVariables = {
        location: {
          type: 'LocationUpdateInput!',
          value: validateLocation(location, locationAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const updateLocation = data?.updateLocation || {};
        return flux.dispatch({location: updateLocation, type: LOCATION_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      const result = await appMutation<LocationType>(
        flux,
        'updateLocation',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'address',
          'city',
          'country',
          'id',
          'latitude',
          'longitude',
          'modified',
          'state',
          'street',
          'zip',
          ...locationProps
        ],
        {onSuccess}
      );

      return result;
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'location.getLocation');
      await clearCachedRequest(flux, 'location.autocompleteLocation');
      await clearCachedRequest(flux, `location.listByItem:${String(location?.itemId || '')}`);
    }
  };

  // Return the actions object
  return {
    autocompleteLocation,
    add,
    delete: deleteLocation,
    getCurrentLocation,
    getGoogleLocation,
    getLocation,
    listByItem,
    update,
    updateLocationAdapter,
    updateLocationAdapterOptions
  };
};
