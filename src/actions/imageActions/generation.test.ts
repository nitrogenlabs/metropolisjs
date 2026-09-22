import {beforeEach, describe, expect, it, vi} from 'vitest';

import {appMutation} from '../../utils/api.js';
import {createVideoActions} from '../videoActions/videoActions.js';
import {createImageActions} from './imageActions.js';

vi.mock('../../utils/api.js', () => ({appMutation: vi.fn(), appQuery: vi.fn(), uploadImage: vi.fn()}));
const flux = {dispatch: vi.fn(), getState: vi.fn(), setState: vi.fn()};

describe('generic media generation', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses existing image GraphQL namespace with no offline replay', async () => {
    const result = {provider: 'openai', requestId: 'one', status: 'completed'};
    vi.mocked(appMutation).mockResolvedValue(result);
    await expect(createImageActions(flux as never).generateImage({prompt: 'moon', provider: 'openai'})).resolves.toEqual(result);
    expect(appMutation).toHaveBeenCalledWith(flux, 'generateImage', 'images', expect.any(Object), expect.any(Array), expect.objectContaining({queueOffline: false}));
    expect(flux.setState.mock.invocationCallOrder[0]).toBeLessThan(flux.dispatch.mock.invocationCallOrder[0]!);
  });
  it('preserves app job inputs and updates state before notifying listeners', async () => {
    const transport = vi.fn().mockResolvedValue({id: 'job'});
    const input = {idempotencyKey: 'intent', projectId: 'project', provider: 'higgsfield'};
    await expect(createImageActions(flux as never).generateImage(input, {transport})).resolves.toEqual({id: 'job'});
    expect(transport).toHaveBeenCalledWith(input);
    expect(appMutation).not.toHaveBeenCalled();
  });
  it('surfaces uncertain failures without resubmission or success state', async () => {
    const transport = vi.fn().mockRejectedValue(new Error('lost response'));
    await expect(createVideoActions(flux as never).generateVideo({provider: 'higgsfield'}, {transport})).rejects.toThrow('lost response');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(flux.setState).not.toHaveBeenCalled();
    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'VIDEO_GENERATE_ERROR'}));
  });
});

it('does not infer an image provider', async () => {
  const transport = vi.fn();
  await expect(createImageActions(flux as never).generateImage({prompt: 'Moon'} as never, {transport})).rejects.toThrow('Choose an image provider');
  expect(transport).not.toHaveBeenCalled();
});

it.each(['image', 'video'])('routes Gemini %s through generic actions and Arkham state', async (kind) => {
  vi.clearAllMocks();
  const result = {provider: 'gemini', requestId: 'one', status: kind === 'image' ? 'completed' : 'queued'};
  vi.mocked(appMutation).mockResolvedValue(result);
  if(kind === 'image') {
    await createImageActions(flux as never).generateImage({prompt: 'Moon', provider: 'gemini'});
  } else {
    await createVideoActions(flux as never).generateVideo({duration: 8, prompt: 'Moon', provider: 'gemini'});
  }
  expect(appMutation).toHaveBeenCalledWith(flux, kind === 'image' ? 'generateImage' : 'generateVideo', `${kind}s`, expect.objectContaining({input: expect.objectContaining({value: expect.objectContaining({provider: 'gemini'})})}), expect.any(Array), expect.objectContaining({queueOffline: false}));
  expect(flux.setState).toHaveBeenCalledWith(`${kind}.generation`, result);
  expect(flux.setState.mock.invocationCallOrder[0]).toBeLessThan(flux.dispatch.mock.invocationCallOrder[0]!);
});
