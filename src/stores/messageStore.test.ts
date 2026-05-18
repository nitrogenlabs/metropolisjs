/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {defaultValues, MESSAGE_CONSTANTS, messageStore} from './messageStore';

describe('messageStore', () => {
  it('should listen for default', () => {
    const updatedState = messageStore('', {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('should listen for GET_CONVO_LIST_SUCCESS', () => {
    const updatedState = messageStore(MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS, {}, defaultValues);
    return expect(updatedState).toBe(defaultValues);
  });

  it('handles message list, add, and typing updates', () => {
    let state = messageStore(MESSAGE_CONSTANTS.GET_CONVO_LIST_SUCCESS, {
      conversationId: 'conversation-1',
      list: [{messageId: 'message-1', conversationId: 'conversation-1'} as any]
    });
    state = messageStore(MESSAGE_CONSTANTS.ADD_ITEM_SUCCESS, {
      message: {messageId: 'message-2', conversationId: 'conversation-1'} as any
    }, state);
    state = messageStore(MESSAGE_CONSTANTS.ADD_ITEM_SUCCESS, {
      message: {messageId: 'message-2', conversationId: 'conversation-1'} as any
    }, state);
    expect(state.conversations['conversation-1']).toHaveLength(2);

    state = messageStore(MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE, {
      typing: {conversationId: 'conversation-1', personaId: 'persona-1', isTyping: true}
    }, state);
    expect(state.typingByConversation['conversation-1']['persona-1']).toBeDefined();

    state = messageStore(MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE, {
      typing: {conversationId: 'conversation-1', personaId: 'persona-2', isTyping: true}
    }, state);
    state = messageStore(MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE, {
      typing: {conversationId: 'conversation-1', personaId: 'persona-1', isTyping: false}
    }, state);
    expect(state.typingByConversation['conversation-1']['persona-1']).toBeUndefined();
    expect(state.typingByConversation['conversation-1']['persona-2']).toBeDefined();

    state = messageStore(MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE, {
      typing: {conversationId: 'conversation-1', personaId: 'persona-2', isTyping: false}
    }, state);
    expect(state.typingByConversation['conversation-1']).toBeUndefined();
    expect(messageStore(MESSAGE_CONSTANTS.TYPING_STATUS_UPDATE, {typing: {isTyping: true}}, state)).toBe(state);
  });

  it('keeps state when list or add actions are missing required data', () => {
    let state = messageStore(MESSAGE_CONSTANTS.GET_LIST_SUCCESS, {}, defaultValues);
    expect(state).toBe(defaultValues);

    state = messageStore(MESSAGE_CONSTANTS.ADD_ITEM_SUCCESS, {}, defaultValues);
    expect(state).toBe(defaultValues);
  });
});
