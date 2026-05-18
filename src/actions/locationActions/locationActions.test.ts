import {beforeEach, describe, expect, it, vi} from 'vitest';

import {resetActionScenarioMocks, runLocationActionsScenario} from '../../tests/actionTestScenarios.js';
import {createLocationActions} from './locationActions.js';

describe('createLocationActions', () => {
  beforeEach(resetActionScenarioMocks);

  it('exercises location action methods', runLocationActionsScenario);

  it('uses browser geolocation when available', async () => {
    const flux = {
      dispatch: vi.fn(async (payload) => payload),
      getState: vi.fn(() => ({}))
    };
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success({coords: {latitude: 1, longitude: 2}}))
      }
    });

    const actions = createLocationActions(flux as any);
    const setLocation = vi.fn();

    await expect(actions.getCurrentLocation(setLocation)).resolves.toEqual({
      latitude: 1,
      location: 'Current Location',
      longitude: 2
    });
    expect(setLocation).toHaveBeenCalled();
    expect(flux.dispatch).toHaveBeenCalledWith({
      current: {latitude: 1, location: 'Current Location', longitude: 2},
      type: 'LOCATION_SET_CURRENT'
    });
  });

  it('falls back to the persona location when geolocation fails', async () => {
    const flux = {
      dispatch: vi.fn(async (payload) => payload),
      getState: vi.fn((path: any, fallback?: unknown) => {
        if(path === 'user.session') {
          return {userId: 'user-1'};
        }
        if(Array.isArray(path)) {
          return {city: 'Austin', country: 'US', latitude: 3, longitude: 4, state: 'TX'};
        }
        return fallback;
      })
    };
    const error = new Error('denied');
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_success, fail) => fail(error))
      }
    });

    const actions = createLocationActions(flux as any);
    const setLocation = vi.fn();

    await expect(actions.getCurrentLocation(setLocation)).rejects.toThrow('denied');
    expect(setLocation).toHaveBeenCalledWith({
      latitude: 3,
      location: 'Austin, TX, US',
      longitude: 4
    });
  });

  it('covers mutation success, cache, and error branches with mocked APIs', async () => {
    vi.resetModules();
    const location = {address: '123 Main', latitude: 1, locationId: 'location-1', longitude: 2};
    const appMutation = vi.fn(async (_flux, operation, _type, _variables, _props, options) => {
      const response = {
        addLocation: location,
        deleteLocation: location,
        getLocation: location,
        locationsByItem: [location],
        updateLocation: location
      };
      await options?.onSuccess?.(response);
      return response[operation] ?? location;
    });
    vi.doMock('../../utils/api.js', () => ({appMutation}));
    vi.doMock('../../utils/location.js', () => ({
      autoCompleteLocation: vi.fn(async () => [location])
    }));
    const {createLocationActions: createMockedLocationActions} = await import('./locationActions.js');
    const state = new Map<string, unknown>();
    const flux = {
      dispatch: vi.fn(async (payload) => payload),
      getState: vi.fn((path: string, fallback?: unknown) => state.get(path) ?? fallback),
      setState: vi.fn(async (path: string, value: unknown) => {
        state.set(path, value);
        return value;
      })
    };
    const actions = createMockedLocationActions(flux as any);

    await expect(actions.autocompleteLocation('123 Main', 1, 2, [], {cacheTimeout: 5})).resolves.toEqual([location]);
    await expect(actions.autocompleteLocation('123 Main', 1, 2, [], {cacheTimeout: 5})).resolves.toEqual([location]);
    await expect(actions.add(location)).resolves.toEqual(location);
    await expect(actions.getGoogleLocation('123 Main')).resolves.toEqual({latitude: 1, location: '', longitude: 2});
    await expect(actions.getLocation(location, [], {cacheTimeout: 5})).resolves.toEqual(location);
    await expect(actions.getLocation(location, [], {cacheTimeout: 5})).resolves.toEqual(location);
    await expect(actions.listByItem('post-1', [], {cacheTimeout: 5})).resolves.toEqual([location]);
    await expect(actions.update(location)).resolves.toEqual(location);
    await expect(actions.delete('location-1')).resolves.toEqual(location);

    appMutation.mockRejectedValueOnce(new Error('location failed'));
    await expect(actions.listByItem('post-1')).rejects.toThrow('location failed');
    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'LOCATION_GET_LIST_ERROR'}));
  });
});
