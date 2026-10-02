import {describe, expect, it} from 'vitest';
import {assistant, assistantStore, ASSISTANT_CONSTANTS} from './assistantStore.js';
describe('assistant store', () => {
  it('keeps assistant instances isolated and clears errors after success', () => {
    const error = new Error('Offline');
    let state = assistant.action(ASSISTANT_CONSTANTS.CHAT_ERROR, {error, instanceId: 'one'});
    state = assistantStore(ASSISTANT_CONSTANTS.FAQS_SUCCESS, {instanceId: 'two', result: {items: []}}, state);
    state = assistantStore(ASSISTANT_CONSTANTS.SUPPORT_SUCCESS, {instanceId: 'two', result: {ticketNumber: '1'}}, state);
    expect(state.instances.one.error).toBe(error);
    expect(state.instances.two).toEqual({error: undefined, faqs: {items: []}, support: {ticketNumber: '1'}});
    state = assistantStore(ASSISTANT_CONSTANTS.CHAT_SUCCESS, {instanceId: 'one', result: {answer: 'Hi'}}, state);
    expect(state.instances.one).toEqual({chat: {answer: 'Hi'}, error: undefined});
    expect(assistantStore('UNRELATED', {}, state)).toBe(state);
    expect(assistantStore(ASSISTANT_CONSTANTS.FAQS_ERROR, {error}).instances.default.error).toBe(error);
    expect(assistant.initialState).toEqual({instances: {}});
    expect(assistant.name).toBe('assistant');
  });
});
