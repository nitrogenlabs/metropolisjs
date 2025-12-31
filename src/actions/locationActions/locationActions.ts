/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { get as httpGet } from '@nlabs/rip-hunter';

import { validateLocationInput } from '../../adapters/locationAdapter/locationAdapter.js';
import { getConfigFromFlux } from '../../utils/configUtils.js';
import { LOCATION_CONSTANTS } from '../../stores/locationStore.js';
import { appMutation } from '../../utils/api.js';
import { autoCompleteLocation } from '../../utils/location.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { User } from '../../adapters/index.js';
import type { LocationType } from '../../adapters/locationAdapter/locationAdapter.js';
import type { ApiResultsType, ReaktorDbCollection } from '../../utils/api.js';

const DATA_TYPE: ReaktorDbCollection = 'locations';

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
  autocompleteLocation: (address: string, latitude?: number, longitude?: number, locationProps?: string[]) => Promise<LocationType[]>;
  add: (location: Partial<LocationType>, locationProps?: string[]) => Promise<LocationType>;
  delete: (locationId: string) => Promise<LocationType>;
  getCurrentLocation: (setLocation?: (location: LocationType) => void) => Promise<LocationType>;
  getGoogleLocation: (address: string) => Promise<{latitude: number; location: string; longitude: number}>;
  getLocation: (location: Partial<LocationType>, locationProps?: string[]) => Promise<LocationType>;
  listByItem: (itemId: string, locationProps?: string[]) => Promise<LocationType[]>;
  update: (location: Partial<LocationType>, locationProps?: string[]) => Promise<LocationType>;
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
  let locationAdapterOptions: LocationAdapterOptions = options?.locationAdapterOptions || {};
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
    locationProps: string[] = []
  ): Promise<LocationType[]> => autoCompleteLocation(flux, address, latitude, longitude, locationProps);

  const add = async (
    location: Partial<LocationType>,
    locationProps: string[] = []
  ): Promise<LocationType> => {
    try {
      const queryVariables = {
        location: {
          type: 'LocationInput!',
          value: validateLocation(location, locationAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {addLocation = {}} = data;
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
    }
  };

  const deleteLocation = async (locationId: string): Promise<LocationType> => {
    try {
      const queryVariables = {
        locationId: {
          type: 'ID!',
          value: locationId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {deleteLocation: location = {}} = data;
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
    }
  };

  const getCurrentLocation = async (setLocation?: (location: LocationType) => void): Promise<LocationType> => new Promise((resolve, reject) => {
    const {userId}: User = flux.getState('user.session', {});
    const {city, country, latitude, longitude, state}: User = flux.getState(['user', 'users', userId || ''], {});
    const locationStr: string = [city, state, country].join(', ');
    const profileLocation = {
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
          console.log('getCurrentLocation::profileLocation1', profileLocation);
          if(setLocation) {
            setLocation(profileLocation);
          }

          flux.dispatch({current: profileLocation, type: LOCATION_CONSTANTS.SET_CURRENT});
          reject(locationError);
        },
        {enableHighAccuracy: false, maximumAge: 0, timeout: 30000}
      );
    } else {
      console.log('getCurrentLocation::profileLocation2', profileLocation);
      if(setLocation) {
        setLocation(profileLocation);
      }

      flux.dispatch({current: profileLocation, type: LOCATION_CONSTANTS.SET_CURRENT});
      reject('Geolocation is not supported by this browser.');
    }
  });

  const getGoogleLocation = async (address: string): Promise<{latitude: number; location: string; longitude: number}> => {
    // Note: google.maps config is not part of standard MetropolisEnvironmentConfiguration
    // Uses empty object as default if not provided in config
    const config = getConfigFromFlux(flux);
    const googleMaps = (config as any).google?.maps || {};
    const {key: googleKey = '', url: googleUrl = ''} = googleMaps as {key?: string; url?: string};
    const formatAddress: string = encodeURI(address);
    const url: string = `${googleUrl}?address=${formatAddress}&key=${googleKey}`;

    if(url) {
      return {latitude: 0, location: '', longitude: 0};
    }
    return httpGet(url).then((data) => {
      const {results} = data;
      const locationData = results && results.length ? results[0] : {};
      const {
        formatted_address: location,
        geometry: {
          location: {lat: latitude, lng: longitude}
        }
      } = locationData;
      return {latitude, location, longitude};
    });
  };

  const getLocation = async (
    location: Partial<LocationType>,
    locationProps: string[] = []
  ): Promise<LocationType> => {
    try {
      const queryVariables = {
        location: {
          type: 'LocationInput!',
          value: validateLocation(location, locationAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {getLocation = {}} = data;
        return flux.dispatch({location: getLocation, type: LOCATION_CONSTANTS.GET_ITEM_SUCCESS});
      };

      return await appMutation<LocationType>(
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
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.GET_ITEM_ERROR});
      throw error;
    }
  };

  const listByItem = async (
    itemId: string,
    locationProps: string[] = []
  ): Promise<LocationType[]> => {
    try {
      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: itemId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {locationsByItem = []} = data as {locationsByItem: LocationType[]};
        return flux.dispatch({
          itemId,
          list: locationsByItem,
          type: LOCATION_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appMutation<LocationType[]>(
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
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const update = async (
    location: Partial<LocationType>,
    locationProps: string[] = []
  ): Promise<LocationType> => {
    try {
      const queryVariables = {
        location: {
          type: 'LocationUpdateInput!',
          value: validateLocation(location, locationAdapterOptions)
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {updateLocation = {}} = data;
        return flux.dispatch({location: updateLocation, type: LOCATION_CONSTANTS.UPDATE_ITEM_SUCCESS});
      };

      return await appMutation<LocationType>(
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
    } catch(error) {
      flux.dispatch({error, type: LOCATION_CONSTANTS.UPDATE_ITEM_ERROR});
      throw error;
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

