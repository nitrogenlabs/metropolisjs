// @vitest-environment jsdom
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const hookMocks = vi.hoisted(() => ({
  websocketActions: {
    sendTyping: vi.fn()
  }
}));

vi.mock('./useMetropolis.js', () => ({
  useWebsocketActions: () => hookMocks.websocketActions
}));

describe('useConversationTyping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('debounces conversation typing and clears previous conversations', async () => {
    const {useConversationTyping} = await import('./useConversationTyping.js');
    const {result, unmount} = renderHook(() => useConversationTyping({
      debounceMs: 50,
      idleMs: 100
    }));

    act(() => {
      result.current.syncDraft('conversation-1', 'hello', {personaId: 'persona-1'});
      vi.advanceTimersByTime(50);
    });
    expect(hookMocks.websocketActions.sendTyping).toHaveBeenCalledWith('conversation-1', true, {personaId: 'persona-1'});

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(hookMocks.websocketActions.sendTyping).toHaveBeenCalledWith('conversation-1', false, {personaId: 'persona-1'});

    act(() => {
      result.current.syncDraft('conversation-1', 'hello again', {personaId: 'persona-1'});
      vi.advanceTimersByTime(50);
      result.current.setConversation('conversation-2', {personaId: 'persona-1'});
      result.current.stopTyping('conversation-2', {personaId: 'persona-1'});
      result.current.syncDraft('', 'ignored');
    });

    expect(hookMocks.websocketActions.sendTyping).toHaveBeenCalledWith('conversation-1', false, {personaId: 'persona-1'});
    unmount();
  });

  it('ignores repeated typing state and clears empty conversations', async () => {
    const {useConversationTyping} = await import('./useConversationTyping.js');
    const {result} = renderHook(() => useConversationTyping({
      debounceMs: 10,
      idleMs: 100
    }));

    act(() => {
      result.current.syncDraft('conversation-1', 'hello', {personaId: 'persona-1'});
      vi.advanceTimersByTime(10);
    });
    expect(hookMocks.websocketActions.sendTyping).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.syncDraft('conversation-1', 'still typing', {personaId: 'persona-1'});
      vi.advanceTimersByTime(10);
    });
    expect(hookMocks.websocketActions.sendTyping).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.syncDraft('conversation-1', '', {personaId: 'persona-1'});
    });
    expect(hookMocks.websocketActions.sendTyping).toHaveBeenLastCalledWith('conversation-1', false, {personaId: 'persona-1'});

    act(() => {
      result.current.setConversation('');
      result.current.stopTyping('');
    });
    expect(hookMocks.websocketActions.sendTyping).toHaveBeenCalledTimes(2);
  });
});
