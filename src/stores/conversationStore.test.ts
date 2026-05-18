import {describe, expect, it} from 'vitest';

import {CONVERSATION_CONSTANTS, conversationStore} from './conversationStore.js';

describe('conversationStore', () => {
  it('handles collection success and error branches', () => {
    const conversation = {conversationId: 'conversation-1', name: 'A'};
    let state = conversationStore(CONVERSATION_CONSTANTS.ADD_ITEM_SUCCESS, {conversation});

    state = conversationStore(CONVERSATION_CONSTANTS.GET_ITEM_SUCCESS, {conversation}, state);
    expect(state.item).toBe(conversation);

    state = conversationStore(CONVERSATION_CONSTANTS.GET_LIST_SUCCESS, {list: [conversation]}, state);
    state = conversationStore(CONVERSATION_CONSTANTS.UPDATE_ITEM_SUCCESS, {
      conversation: {...conversation, name: 'B'}
    }, state);
    expect(state.conversations?.['conversation-1']?.name).toBe('B');

    state = conversationStore(CONVERSATION_CONSTANTS.REMOVE_ITEM_SUCCESS, {conversation}, state);
    expect(state.conversations?.['conversation-1']).toBeUndefined();
    expect(conversationStore(CONVERSATION_CONSTANTS.GET_ITEM_ERROR, {error: new Error('bad')}, state).error?.message).toBe('bad');
  });

  it('keeps default state for unhandled actions', () => {
    const state = conversationStore('UNKNOWN', {});

    expect(state.list).toEqual([]);
    expect(state.conversations).toEqual({});
  });
});
