import {describe, expect, it, vi} from 'vitest';

import {appMutation} from '../../utils/api.js';
import {createVideoActions} from './videoActions.js';

import type {FluxFramework} from '@nlabs/arkhamjs';

vi.mock('../../utils/api.js', () => ({appMutation: vi.fn(), appQuery: vi.fn()}));
const flux = {dispatch: vi.fn(), setState: vi.fn()} as unknown as FluxFramework;

describe('video generation', () => {
  it('uses generic video GraphQL with an explicitly configured provider', async () => {
    vi.mocked(appMutation).mockResolvedValue({provider: 'higgsfield', requestId: 'job', status: 'queued'});
    await createVideoActions(flux, {provider: 'higgsfield'}).generateVideo({imageUrl: 'https://example.com/frame.png'});
    expect(appMutation).toHaveBeenLastCalledWith(flux, 'generateVideo', 'videos', {
      input: {type: 'VideoGenerationInput!', value: {imageUrl: 'https://example.com/frame.png', provider: 'higgsfield'}}
    }, ['cancelUrl', 'provider', 'requestId', 'status', 'statusUrl'], expect.objectContaining({queueOffline: false}));
    expect(flux.setState).toHaveBeenCalledWith('video.generation', expect.objectContaining({requestId: 'job'}));
  });

  it('normalizes the provider before calling an application transport', async () => {
    const transport = vi.fn().mockResolvedValue({requestId: 'job'});
    await createVideoActions(flux, {provider: 'higgsfield'}).generateVideo({prompt: 'Move'}, {transport});
    expect(transport).toHaveBeenCalledExactlyOnceWith({prompt: 'Move', provider: 'higgsfield'});
    await expect(createVideoActions(flux, {provider: 'unknown'}).generateVideo({prompt: 'Move'})).rejects.toThrow('Unsupported');
    await createVideoActions(flux, {provider: 'unknown'}).generateVideo({prompt: 'Move', provider: 'higgsfield'}, {transport});
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

it('rejects missing provider selection before transport', async () => {
  const transport = vi.fn();
  await expect(createVideoActions(flux).generateVideo({prompt: 'Move'}, {transport})).rejects.toThrow('provider is required');
  expect(transport).not.toHaveBeenCalled();
});
