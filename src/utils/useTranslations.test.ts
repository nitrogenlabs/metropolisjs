// @vitest-environment jsdom
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const hookMocks = vi.hoisted(() => ({
  translationActions: {
    flux: {
      getState: vi.fn(() => ({error: null, isQueueing: false}))
    },
    getTranslation: vi.fn((key: string) => key === 'known' ? 'Known value' : null),
    hasTranslation: vi.fn((key: string) => key === 'known'),
    processPendingTranslations: vi.fn(async () => undefined),
    queueTranslationKey: vi.fn()
  }
}));

vi.mock('./useMetropolis.js', () => ({
  useMetropolis: () => ({translationActions: hookMocks.translationActions})
}));

describe('useTranslations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('translates, queues missing keys, and processes pending translations', async () => {
    const {useTranslations} = await import('./useTranslations.js');
    const {result, unmount} = renderHook(() => useTranslations({
      locale: 'en',
      namespace: 'common',
      processInterval: 100
    }));

    expect(result.current.t('known')).toBe('Known value');
    expect(result.current.t('missing', 'Fallback')).toBe('Fallback');
    expect(result.current.hasTranslation('known')).toBe(true);

    act(() => {
      result.current.queueTranslation('queued');
      vi.advanceTimersByTime(100);
    });

    await act(async () => {
      await result.current.processPending();
    });

    expect(hookMocks.translationActions.queueTranslationKey).toHaveBeenCalled();
    expect(hookMocks.translationActions.processPendingTranslations).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);

    unmount();
  });

  it('handles translation hooks without actions', async () => {
    hookMocks.translationActions.getTranslation.mockReturnValueOnce(null);
    const {useTranslations} = await import('./useTranslations.js');
    const {result} = renderHook(() => useTranslations({autoProcess: false}));

    expect(result.current.t('plain')).toBe('plain');
    expect(result.current.hasTranslation('plain')).toBe(false);
  });
});
