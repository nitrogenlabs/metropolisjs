import {beforeEach, describe, expect, it, vi} from 'vitest';

const restRequestMock = vi.fn();

vi.mock('../../utils/api.js', () => ({
  restRequest: restRequestMock
}));

const {createRestActions, REST_CONSTANTS} = await import('./restActions.js');

const createFlux = () => ({
  dispatch: vi.fn(async (payload) => payload)
});

describe('restActions', () => {
  beforeEach(() => {
    restRequestMock.mockReset();
  });

  it('creates a REST action surface backed by restRequest', async () => {
    const flux = createFlux();
    const actions = createRestActions(flux as any, {
      authenticate: true,
      requestOptions: {timeout: 5000}
    });
    restRequestMock.mockResolvedValue({ok: true});

    await expect(actions.get('profile', {userId: 'user-1'}, {cache: true})).resolves.toEqual({ok: true});

    expect(restRequestMock).toHaveBeenCalledWith(
      flux,
      'profile',
      'GET',
      {userId: 'user-1'},
      expect.objectContaining({
        authenticate: true,
        cache: true,
        timeout: 5000
      })
    );
    expect(flux.dispatch).toHaveBeenCalledWith({
      result: {ok: true},
      type: REST_CONSTANTS.REQUEST_SUCCESS
    });
  });

  it('dispatches REST request failures', async () => {
    const flux = createFlux();
    const actions = createRestActions(flux as any);
    const error = new Error('request failed');
    restRequestMock.mockRejectedValue(error);

    await expect(actions.post('profile', {name: 'Ada'})).rejects.toThrow('request failed');

    expect(flux.dispatch).toHaveBeenCalledWith({
      error,
      type: REST_CONSTANTS.REQUEST_ERROR
    });
  });

  it('supports PUT, DELETE, and custom request methods', async () => {
    const flux = createFlux();
    const actions = createRestActions(flux as any);
    restRequestMock.mockResolvedValue({});

    await actions.put('profile', {name: 'Ada'});
    await actions.delete('profile', {userId: 'user-1'});
    await actions.request('profile', 'PATCH', {name: 'Grace'});

    expect(restRequestMock).toHaveBeenNthCalledWith(1, flux, 'profile', 'PUT', {name: 'Ada'}, expect.any(Object));
    expect(restRequestMock).toHaveBeenNthCalledWith(2, flux, 'profile', 'DELETE', {userId: 'user-1'}, expect.any(Object));
    expect(restRequestMock).toHaveBeenNthCalledWith(3, flux, 'profile', 'PATCH', {name: 'Grace'}, expect.any(Object));
  });
});
