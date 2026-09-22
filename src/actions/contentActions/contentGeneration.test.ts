import {describe, expect, it, vi} from 'vitest';

import {appMutation, appQuery} from '../../utils/api.js';
import {CONTENT_GENERATION_CONSTANTS, createContentActions} from './contentActions.js';

import type {FluxFramework} from '@nlabs/arkhamjs';

vi.mock('../../utils/api.js', () => ({appMutation: vi.fn(), appQuery: vi.fn()}));
const createFlux = () => ({dispatch: vi.fn(), setState: vi.fn()}) as unknown as FluxFramework;

describe('content generation', () => {
  it('sends provider input through the existing GraphQL mutation and disables offline replay', async () => {
    const flux = createFlux();
    const result = {sources: [], text: 'A story'};
    vi.mocked(appMutation).mockResolvedValue(result);
    await expect(createContentActions(flux).generateContent({prompt: 'Write', provider: 'claude'})).resolves.toEqual(result);
    expect(appMutation).toHaveBeenLastCalledWith(flux, 'generateContent', 'contents', {
      input: {type: 'ContentGenerationInput!', value: {prompt: 'Write', provider: 'claude'}}
    }, ['text', 'sources {title url}'], expect.objectContaining({queueOffline: false}));
    expect(flux.setState).toHaveBeenCalledWith('content.generation', result);
    expect(flux.dispatch).toHaveBeenCalledWith({result, type: CONTENT_GENERATION_CONSTANTS.SUCCESS});
    expect(vi.mocked(flux.setState).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(flux.dispatch).mock.invocationCallOrder[0]!);
  });

  it('supports application-owned durable jobs without submitting twice', async () => {
    const flux = createFlux();
    const transport = vi.fn().mockResolvedValue({id: 'job'});
    const input = {idempotencyKey: 'one', instruction: 'Write', provider: 'openai'};
    vi.mocked(appMutation).mockClear();
    await expect(createContentActions(flux).generateContent(input, {transport})).resolves.toEqual({id: 'job'});
    expect(transport).toHaveBeenCalledExactlyOnceWith(input);
    expect(appMutation).not.toHaveBeenCalled();
  });

  it('emits errors without retrying unknown submissions', async () => {
    const flux = createFlux();
    const error = new Error('timeout');
    const transport = vi.fn().mockRejectedValue(error);
    await expect(createContentActions(flux).generateContent({provider: 'openai'}, {transport})).rejects.toBe(error);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(flux.setState).not.toHaveBeenCalled();
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: CONTENT_GENERATION_CONSTANTS.ERROR});
  });
});

it('does not confirm empty GraphQL output or missing providers', async () => {
  const flux = createFlux();
  vi.mocked(appMutation).mockResolvedValue(undefined);
  await expect(createContentActions(flux).generateContent({prompt: 'Write', provider: 'openai'})).rejects.toThrow('no confirmed result');
  await expect(createContentActions(flux).generateContent({provider: ''})).rejects.toThrow('provider is required');
  expect(flux.setState).not.toHaveBeenCalled();
});

it('extracts the contents result from the GraphQL response', async () => {
  const flux = createFlux();
  const result = {sources: [], text: 'A story'};
  vi.mocked(appMutation).mockImplementation(async (_flux, _name, _collection, _variables, _properties, options) =>
    options!.onSuccess!({contents: {generateContent: result}} as never));
  await expect(createContentActions(flux).generateContent({prompt: 'Write', provider: 'openai'})).resolves.toEqual(result);
});

it('keeps existing CRUD error events intact alongside generation', async () => {
  const flux = createFlux();
  const actions = createContentActions(flux);
  const error = new Error('API unavailable');
  vi.mocked(appQuery).mockRejectedValue(error);
  vi.mocked(appMutation).mockRejectedValue(error);
  await expect(actions.itemById('content')).rejects.toBe(error);
  await expect(actions.itemByKey('key')).rejects.toBe(error);
  await expect(actions.listByCategory('category')).rejects.toBe(error);
  await expect(actions.list()).rejects.toBe(error);
  await expect(actions.delete('content')).rejects.toBe(error);
  await expect(actions.update({content: 'Body', contentId: 'content', key: 'key', locale: 'en'})).rejects.toBe(error);
  expect(flux.dispatch).toHaveBeenCalledTimes(6);
});
