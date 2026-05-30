// @vitest-environment jsdom
import {renderHook} from '@testing-library/react';
import type {ReactNode} from 'react';
import {describe, expect, it, vi} from 'vitest';

import {MetropolisContext} from './MetropolisProvider.js';

const flux = {
  dispatch: vi.fn(),
  getState: vi.fn((path: string, fallback?: unknown) => fallback),
  on: vi.fn(),
  setState: vi.fn()
};

vi.mock('@nlabs/arkhamjs-utils-react', () => ({
  useFlux: () => flux
}));

const wrapper = ({children}: {children: ReactNode}) => (
  <MetropolisContext.Provider
    value={{
      adapters: {
        Content: (input: unknown) => input as any,
        Event: (input: unknown) => input as any,
        Image: (input: unknown) => input as any,
        Location: (input: unknown) => input as any,
        Message: (input: unknown) => input as any,
        Permission: (input: unknown) => input as any,
        Persona: (input: unknown) => input as any,
        Post: (input: unknown) => input as any,
        Reaction: (input: unknown) => input as any,
        Tag: (input: unknown) => input as any,
        Translation: (input: unknown) => input as any,
        User: (input: unknown) => input as any,
        Video: (input: unknown) => input as any
      },
      config: {app: {name: 'Metropolis'}, environment: 'test'},
      flux: flux as any,
      isAuth: () => true,
      messages: [],
      notifications: [],
      session: {},
      updateMessage: vi.fn(),
      updateNotification: vi.fn()
    }}>
    {children}
  </MetropolisContext.Provider>
);

describe('useMetropolis', () => {
  it('creates all mapped action groups with adapter options', async () => {
    const {useMetropolis} = await import('./useMetropolis.js');
    const {result} = renderHook(() => useMetropolis(), {wrapper});

    expect(result.current.contentActions).toBeDefined();
    expect(result.current.crmActions).toBeDefined();
    expect(result.current.eventActions).toBeDefined();
    expect(result.current.groupActions).toBeDefined();
    expect(result.current.imageActions).toBeDefined();
    expect(result.current.locationActions).toBeDefined();
    expect(result.current.messageActions).toBeDefined();
    expect(result.current.permissionActions).toBeDefined();
    expect(result.current.postActions).toBeDefined();
    expect(result.current.personaActions).toBeDefined();
    expect(result.current.reactionActions).toBeDefined();
    expect(result.current.restActions).toBeDefined();
    expect(result.current.subscriptionActions).toBeDefined();
    expect(result.current.tagActions).toBeDefined();
    expect(result.current.translationActions).toBeDefined();
    expect(result.current.userActions).toBeDefined();
    expect(result.current.videoActions).toBeDefined();
    expect(result.current.websocketActions).toBeDefined();
  });

  it('creates selected action hooks and returns context config/flux', async () => {
    const hooks = await import('./useMetropolis.js');
    const {result: selected} = renderHook(() => hooks.useMetropolis(['user', 'post', 'rest']), {wrapper});

    expect(selected.current.userActions).toBeDefined();
    expect(selected.current.postActions).toBeDefined();
    expect(selected.current.restActions).toBeDefined();
    expect(selected.current.contentActions).toBeUndefined();

    expect(renderHook(() => hooks.useMetropolisConfig(), {wrapper}).result.current.environment).toBe('test');
    expect(renderHook(() => hooks.useMetropolisFlux(), {wrapper}).result.current).toBe(flux);
    expect(renderHook(() => hooks.useContentActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useCrmActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useEventActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useGroupActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useImageActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useLocationActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useMessageActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useSubscriptionActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.usePermissionActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.usePostActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.usePersonaActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useReactionActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useRestActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useTagActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useVideoActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useTranslationActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useUserActions(), {wrapper}).result.current).toBeDefined();
    expect(renderHook(() => hooks.useWebsocketActions(), {wrapper}).result.current).toBeDefined();
  });

  it('throws when config is requested without provider config', async () => {
    const {useMetropolisConfig} = await import('./useMetropolis.js');

    expect(() => renderHook(() => useMetropolisConfig())).toThrow('useMetropolisConfig must be used');
  });
});
