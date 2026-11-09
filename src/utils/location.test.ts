// @vitest-environment node
import {FluxFramework} from '@nlabs/arkhamjs';
import {afterEach, beforeEach, describe, expect, it} from '@nlabs/lex/test-vitest';

import {autoCompleteLocation, searchLocations} from './location.js';

import type {parseLocation} from '../adapters/locationAdapter/locationAdapter.js';

let flux: FluxFramework;
const apiMocks = vi.hoisted(() => ({appQuery: vi.fn()}));
vi.mock('./api.js', () => ({appQuery: apiMocks.appQuery}));

beforeEach(() => {
  flux = new FluxFramework();
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('location utilities', () => {
  it('does not query an empty search', async () => {
    expect(await searchLocations(flux, '')).toEqual([]);
    expect(apiMocks.appQuery).not.toHaveBeenCalled();
  });

  it('does not query empty autocomplete after its debounce', async () => {
    const pending = autoCompleteLocation(flux, '');

    expect(apiMocks.appQuery).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toEqual([]);
    expect(apiMocks.appQuery).not.toHaveBeenCalled();
  });

  it('maps search results through the supplied parser', async () => {
    apiMocks.appQuery.mockResolvedValue({autoCompleteLocation: [{address: '123 Main', latitude: 1, longitude: 2}]});
    const customParser = vi.fn<typeof parseLocation>((location) => ({...location, parsed: true}));

    await expect(searchLocations(flux, '123 Main', 1, 2, ['id'], customParser)).resolves.toEqual([
      {address: '123 Main', latitude: 1, longitude: 2, parsed: true}
    ]);
    expect(customParser).toHaveBeenCalled();
  });

  it('returns no search results when the query rejects', async () => {
    apiMocks.appQuery.mockRejectedValue(new Error('network'));

    await expect(searchLocations(flux, 'broken')).resolves.toEqual([]);
  });

  it('maps autocomplete results through the supplied parser after its debounce', async () => {
    apiMocks.appQuery.mockResolvedValue({autoCompleteLocation: [{address: '456 State'}]});
    const customParser = vi.fn<typeof parseLocation>((location) => ({...location, parsed: true}));
    const pending = autoCompleteLocation(flux, '456 State', undefined, undefined, [], customParser);

    expect(apiMocks.appQuery).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toEqual([{address: '456 State', parsed: true}]);
    expect(customParser).toHaveBeenCalled();
  });

  it('returns no autocomplete results when the debounced query rejects', async () => {
    apiMocks.appQuery.mockRejectedValue(new Error('network'));
    const pending = autoCompleteLocation(flux, 'broken');

    expect(apiMocks.appQuery).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toEqual([]);
  });
});
