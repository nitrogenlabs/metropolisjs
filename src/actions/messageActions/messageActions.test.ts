import {beforeEach, describe, expect, it, vi} from 'vitest';

const appMutationMock = vi.fn();
const appQueryMock = vi.fn();
const clearCachedRequestMock = vi.fn(async () => undefined);
const getCachedRequestMock = vi.fn(() => undefined);
const setCachedRequestMock = vi.fn(async (_flux, _key, _payload, data) => data);

vi.mock('../../utils/api.js', () => ({
  appMutation: appMutationMock,
  appQuery: appQueryMock
}));

vi.mock('../../utils/requestCache.js', () => ({
  clearCachedRequest: clearCachedRequestMock,
  getCachedRequest: getCachedRequestMock,
  setCachedRequest: setCachedRequestMock
}));

const {createMessageActions} = await import('./messageActions.js');

type StateValue = Record<string, unknown>;

const getStateAtPath = (state: StateValue, path: string) =>
  path.split('.').reduce<unknown>((result, key) => {
    if(result && typeof result === 'object') {
      return (result as StateValue)[key];
    }

    return undefined;
  }, state);

const createMockFlux = (personaId = '', userId = '') => {
  const state: StateValue = {
    app: {
      config: {
        app: {
          api: {
            public: 'http://localhost:3000/public',
            url: 'http://localhost:3000/app'
          }
        },
        environment: 'test',
        isAuth: () => true
      }
    },
    user: {
      session: {
        personaId,
        userId
      }
    }
  };

  return {
    dispatch: vi.fn(async (payload) => payload),
    getState: vi.fn((key?: string, fallback?: unknown) => {
      if(!key) {
        return state;
      }

      const result = getStateAtPath(state, key);
      return result === undefined ? fallback : result;
    }),
    setState: vi.fn(async () => undefined),
    state
  };
};

describe('messageActions', () => {
  beforeEach(() => {
    appMutationMock.mockReset();
    appQueryMock.mockReset();
    clearCachedRequestMock.mockReset();
    getCachedRequestMock.mockReset();
    setCachedRequestMock.mockReset();
    clearCachedRequestMock.mockResolvedValue(undefined);
    getCachedRequestMock.mockReturnValue(undefined);
    setCachedRequestMock.mockImplementation(async (_flux, _key, _payload, data) => data);
  });

  it('sends the active session userId and personaId with new messages by default', async () => {
    const flux = createMockFlux('persona-session-1', 'user-session-1');
    const messageActions = createMessageActions(flux as any);

    appMutationMock.mockResolvedValue({
      messages: {
        addMessage: {
          content: 'Hello',
          conversationId: 'conversation-1',
          messageId: 'message-1'
        }
      }
    });

    await messageActions.sendMessage({
      content: 'Hello',
      conversationId: 'conversation-1'
    });

    expect(appMutationMock).toHaveBeenCalledTimes(1);
    expect(appMutationMock.mock.calls[0][3]).toEqual({
      message: {
        type: 'MessageInput!',
        value: expect.objectContaining({
          content: 'Hello',
          conversationId: 'conversation-1',
          personaId: 'personasession1',
          userId: 'usersession1'
        })
      }
    });
  });

  it('preserves explicit userId and personaId when provided', async () => {
    const flux = createMockFlux('persona-session-1', 'user-session-1');
    const messageActions = createMessageActions(flux as any);

    appMutationMock.mockResolvedValue({
      messages: {
        addMessage: {
          content: 'Hello',
          conversationId: 'conversation-1',
          messageId: 'message-1'
        }
      }
    });

    await messageActions.sendMessage({
      content: 'Hello',
      conversationId: 'conversation-1',
      personaId: 'persona-explicit-2',
      userId: 'user-explicit-2'
    });

    expect(appMutationMock.mock.calls[0][3]).toEqual({
      message: {
        type: 'MessageInput!',
        value: expect.objectContaining({
          content: 'Hello',
          conversationId: 'conversation-1',
          personaId: 'personaexplicit2',
          userId: 'userexplicit2'
        })
      }
    });
  });

  it('fetches direct conversations, messages, and conversation lists with caching support', async () => {
    const flux = createMockFlux('persona-1', 'user-1');
    const messageActions = createMessageActions(flux as any);
    const conversation = {conversationId: 'conversation-1', name: 'Direct'};
    const message = {content: 'Hello', conversationId: 'conversation-1', messageId: 'message-1'};

    appQueryMock.mockImplementation(async (_flux, operation, _type, _variables, _props, options) => {
      const response = {
        messages: {
          directConversation: conversation,
          getConversations: [conversation],
          getMessages: [message]
        }
      };
      await options?.onSuccess?.(response);
      return response;
    });

    await expect(messageActions.getDirectConversation('user-2', {cacheTimeout: 5})).resolves.toEqual(conversation);
    await expect(messageActions.getMessages('conversation-1', ['custom'], {cacheTimeout: 5})).resolves.toEqual([message]);
    await expect(messageActions.getMessages('conversation-1', ['custom'], {cacheTimeout: 5})).resolves.toEqual([message]);
    await expect(messageActions.getConversations(0, 5, {cacheTimeout: 5})).resolves.toEqual([conversation]);
    await expect(messageActions.getConversations(0, 5, {cacheTimeout: 5})).resolves.toEqual([conversation]);

    expect(flux.dispatch).toHaveBeenCalledWith({conversation, type: 'MESSAGE_GET_CONVO_LIST_SUCCESS'});
    expect(flux.dispatch).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      list: [message],
      type: 'MESSAGE_GET_LIST_SUCCESS'
    });
    expect(flux.dispatch).toHaveBeenCalledWith({conversations: [conversation], type: 'MESSAGE_GET_CONVO_LIST_SUCCESS'});
    expect(setCachedRequestMock).toHaveBeenCalledTimes(5);
  });

  it('dispatches message action failures', async () => {
    const flux = createMockFlux('persona-1', 'user-1');
    const messageActions = createMessageActions(flux as any);
    const error = new Error('messages failed');

    appQueryMock.mockRejectedValueOnce(error);
    await expect(messageActions.getMessages('conversation-1')).rejects.toThrow('messages failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'MESSAGE_GET_LIST_ERROR'});

    appMutationMock.mockRejectedValueOnce(error);
    await expect(messageActions.sendMessage({content: 'Hello', conversationId: 'conversation-1'})).rejects.toThrow('messages failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'MESSAGE_ADD_ITEM_ERROR'});

    appQueryMock.mockRejectedValueOnce(error);
    await expect(messageActions.getConversations()).rejects.toThrow('messages failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'MESSAGE_GET_CONVO_LIST_ERROR'});

    appQueryMock.mockRejectedValueOnce(error);
    await expect(messageActions.getDirectConversation('user-2')).rejects.toThrow('messages failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'MESSAGE_GET_CONVO_LIST_ERROR'});
  });

  it('returns cached message queries without hitting the API', async () => {
    const flux = createMockFlux('persona-1', 'user-1');
    const messageActions = createMessageActions(flux as any);
    const conversation = {conversationId: 'conversation-1'};
    const messages = [{messageId: 'message-1', conversationId: 'conversation-1'}];
    const conversations = [conversation];

    getCachedRequestMock
      .mockReturnValueOnce(conversation)
      .mockReturnValueOnce(messages)
      .mockReturnValueOnce(conversations);

    await expect(messageActions.getDirectConversation('user-2')).resolves.toBe(conversation);
    await expect(messageActions.getMessages('conversation-1')).resolves.toBe(messages);
    await expect(messageActions.getConversations()).resolves.toBe(conversations);
    expect(appQueryMock).not.toHaveBeenCalled();
  });
});
