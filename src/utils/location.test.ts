import {describe, expect, it, vi} from 'vitest';

const apiMocks = vi.hoisted(() => ({
  appQuery: vi.fn()
}));

vi.mock('./api.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api.js')>()),
  appQuery: apiMocks.appQuery
}));

describe('location utilities', () => {
  it('searches locations and handles empty/error responses', async () => {
    const {autoCompleteLocation, searchLocations} = await import('./location.js');
    const flux = {};

    expect(await searchLocations(flux as any, '')).toEqual([]);
    await expect(autoCompleteLocation(flux as any, '')).resolves.toEqual([]);

    apiMocks.appQuery.mockResolvedValueOnce({
      autoCompleteLocation: [{address: '123 Main', latitude: 1, longitude: 2}]
    });
    const customParser = vi.fn((location) => ({...location, parsed: true}));
    await expect(searchLocations(flux as any, '123 Main', 1, 2, ['id'], customParser as any)).resolves.toEqual([
      {address: '123 Main', latitude: 1, longitude: 2, parsed: true}
    ]);
    expect(customParser).toHaveBeenCalled();

    apiMocks.appQuery.mockRejectedValueOnce(new Error('network'));
    await expect(searchLocations(flux as any, 'broken')).resolves.toEqual([]);

    apiMocks.appQuery.mockResolvedValueOnce({
      autoCompleteLocation: [{address: '456 State'}]
    });
    await expect(autoCompleteLocation(flux as any, '456 State', undefined, undefined, [], customParser as any)).resolves.toEqual([
      {address: '456 State', parsed: true}
    ]);

    apiMocks.appQuery.mockRejectedValueOnce(new Error('network'));
    await expect(autoCompleteLocation(flux as any, 'broken')).resolves.toEqual([]);
  });
});
