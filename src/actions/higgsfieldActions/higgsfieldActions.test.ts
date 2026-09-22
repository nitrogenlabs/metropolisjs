import {beforeEach, describe, expect, it, vi} from 'vitest';

const appMutationMock = vi.fn();
const appQueryMock = vi.fn();

vi.mock('../../utils/api.js', () => ({
  appMutation: appMutationMock,
  appQuery: appQueryMock
}));

const {createHiggsfieldActions, HIGGSFIELD_CONSTANTS} = await import('./higgsfieldActions.js');

const createFlux = () => ({
  dispatch: vi.fn(async (payload) => payload)
});

describe('higgsfieldActions', () => {
  beforeEach(() => {
    appMutationMock.mockReset();
    appQueryMock.mockReset();
  });

  it('generates a soul image and dispatches success', async () => {
    const flux = createFlux();
    const actions = createHiggsfieldActions(flux as any);
    appMutationMock.mockImplementation(async (_flux, _name, _dataType, _vars, _props, {onSuccess}) =>
      onSuccess({higgsfield: {generateSoulImage: {requestId: 'req-1', status: 'queued'}}}));

    const result = await actions.generateSoulImage({prompt: 'a portrait'});

    expect(result).toEqual({requestId: 'req-1', status: 'queued'});
    expect(appMutationMock).toHaveBeenCalledWith(
      flux,
      'generateSoulImage',
      'higgsfield',
      expect.objectContaining({input: {type: 'HiggsfieldSoulImageInput!', value: expect.objectContaining({prompt: 'a portrait'})}}),
      expect.any(Array),
      expect.any(Object)
    );
    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: HIGGSFIELD_CONSTANTS.GENERATE_SUCCESS}));
  });

  it('rejects invalid input before calling the network', async () => {
    const flux = createFlux();
    const actions = createHiggsfieldActions(flux as any);

    await expect(actions.generateSeedanceVideo({} as any)).rejects.toThrow();
    expect(appMutationMock).not.toHaveBeenCalled();
    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: HIGGSFIELD_CONSTANTS.GENERATE_ERROR}));
  });

  it('fetches request status', async () => {
    const flux = createFlux();
    const actions = createHiggsfieldActions(flux as any);
    appQueryMock.mockImplementation(async (_flux, _name, _dataType, _vars, _props, {onSuccess}) =>
      onSuccess({higgsfield: {getHiggsfieldRequestStatus: {requestId: 'req-2', status: 'completed'}}}));

    const result = await actions.getRequestStatus('req-2');

    expect(result).toEqual({requestId: 'req-2', status: 'completed'});
  });

  it('cancels a request', async () => {
    const flux = createFlux();
    const actions = createHiggsfieldActions(flux as any);
    appMutationMock.mockImplementation(async (_flux, _name, _dataType, _vars, _props, {onSuccess}) =>
      onSuccess({higgsfield: {cancelHiggsfieldRequest: true}}));

    expect(await actions.cancelRequest('req-3')).toBe(true);
  });
});
