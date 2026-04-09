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
});
