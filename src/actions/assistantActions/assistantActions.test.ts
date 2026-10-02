import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {FluxFramework} from '@nlabs/arkhamjs';
const api = vi.hoisted(() => ({publicMutation: vi.fn(), publicQuery: vi.fn()}));
vi.mock('../../utils/api.js', () => api);
import {createAssistantActions} from './assistantActions.js';
import {createAction} from '../../utils/actionFactory.js';
import {assistantStore, ASSISTANT_CONSTANTS, defaultValues} from '../../stores/assistantStore.js';

describe('assistant actions', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns chat results after updating scoped state and notifying listeners', async () => {
    let state = defaultValues;
    const result = {answer: 'Hello', sources: []};
    const dispatch = vi.fn(async (event) => {state = assistantStore(event.type, event, state);});
    const flux = {dispatch} as unknown as FluxFramework;
    api.publicMutation.mockResolvedValue({assistant: {chat: result}});
    const actions = createAction('assistant', flux, {instanceId: 'docs'});
    await expect(actions.chat({context: 'alfred', question: 'Hello'})).resolves.toEqual(result);
    expect(api.publicMutation).toHaveBeenCalledWith(flux, 'chat', 'assistant', {
      input: {type: 'JSONObject!', value: {context: 'alfred', question: 'Hello'}}
    }, [], {queueOffline: false});
    expect(state.instances.docs.chat).toEqual(result);
    expect(dispatch).toHaveBeenCalledWith({instanceId: 'docs', result, type: ASSISTANT_CONSTANTS.CHAT_SUCCESS});
  });
  it('queries FAQs and submits support with the original idempotency key', async () => {
    const flux = {dispatch: vi.fn()} as unknown as FluxFramework;
    const actions = createAssistantActions(flux);
    api.publicQuery.mockResolvedValue({assistant: {faqs: {items: []}}});
    expect(await actions.faqs({context: 'shop'})).toEqual({items: []});
    expect(api.publicQuery).toHaveBeenCalledWith(flux, 'faqs', 'assistant', expect.any(Object), [], {queueOffline: false});
    api.publicMutation.mockResolvedValue({assistant: {submitSupport: {queued: true}}});
    const input = {confirmed: true, context: 'shop', email: 'a@example.com', message: 'Help', requestId: 'same-key'};
    expect(await actions.submitSupport(input)).toEqual({queued: true});
    expect(api.publicMutation.mock.calls[0][3].input.value).toEqual(input);
    expect(flux.dispatch).toHaveBeenCalledWith({instanceId: 'shop', result: {queued: true}, type: ASSISTANT_CONSTANTS.SUPPORT_SUCCESS});
  });
  it.each([
    [{errors: ['Try later']}, 'Try later'],
    [{errors: [{message: 'Usage limit'}]}, 'Usage limit'],
    [new Error('Offline'), 'Offline'],
    [{}, 'Please try again or contact support.']
  ])('dispatches readable failures and rejects without queuing', async (failure, message) => {
    const flux = {dispatch: vi.fn()} as unknown as FluxFramework;
    api.publicMutation.mockRejectedValue(failure);
    await expect(createAssistantActions(flux).chat({question: 'Hi'})).rejects.toThrow(message);
    expect(flux.dispatch).toHaveBeenCalledWith({error: expect.any(Error), instanceId: 'default', type: ASSISTANT_CONSTANTS.CHAT_ERROR});
  });
  it('rejects malformed responses instead of reporting success', async () => {
    const flux = {dispatch: vi.fn()} as unknown as FluxFramework;
    api.publicQuery.mockResolvedValue({});
    await expect(createAssistantActions(flux).faqs({})).rejects.toThrow('invalid response');
    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: ASSISTANT_CONSTANTS.FAQS_ERROR}));
    api.publicMutation.mockRejectedValue(new Error('Support unavailable'));
    await expect(createAssistantActions(flux).submitSupport({confirmed: true, message: 'Help', requestId: 'key'})).rejects.toThrow('Support unavailable');
    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: ASSISTANT_CONSTANTS.SUPPORT_ERROR}));
  });
});
