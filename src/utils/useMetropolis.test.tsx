// @vitest-environment jsdom
import {renderHook} from '@nlabs/lex/test-react';
import {describe, expect, it, vi} from '@nlabs/lex/test-vitest';

import {MetropolisContext} from './MetropolisContext.js';

import type {ReactNode} from 'react';

const flux = {
  dispatch: vi.fn(),
  getState: vi.fn((path: string, fallback?: unknown) => fallback),
  on: vi.fn(),
  setState: vi.fn()
};

// These public adapter keys are part of MetropolisAdapters.
/* eslint-disable @typescript-eslint/naming-convention */
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
      config: {app: {name: 'Metropolis', rum: {analyticsId: 'metropolis'}}, environment: 'test'},
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

/* eslint-enable @typescript-eslint/naming-convention */

describe('useMetropolis', () => {
  it('creates requested action groups with adapter options', async () => {
    const {useMetropolis} = await import('./useMetropolis.js');
    const useRequestedActions = () => useMetropolis([
      'awsRum',
      'content',
      'crm',
      'event',
      'group',
      'image',
      'location',
      'message',
      'permission',
      'persona',
      'post',
      'reaction',
      'rest',
      'subscription',
      'tag',
      'translation',
      'user',
      'video',
      'websocket'
    ]);
    const {result} = renderHook(useRequestedActions, {wrapper});

    expect(result.current.contentActions).toBeDefined();
    expect(result.current.awsRum).toBeDefined();
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
    expect(renderHook(() => hooks.useAwsRum(), {wrapper}).result.current).toBeDefined();
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
    const {useMetropolis, useMetropolisConfig, useMetropolisFlux} = await import('./useMetropolis.js');

    const useConfig = () => useMetropolisConfig();
    const useFlux = () => useMetropolisFlux();
    const useActions = () => useMetropolis(['user']);

    expect(() => renderHook(useConfig)).toThrow('useMetropolisConfig must be used');
    expect(() => renderHook(useFlux)).toThrow('useMetropolisFlux must be used');
    expect(() => renderHook(useActions)).toThrow('useMetropolis must be used');
  });

  it('uses shared action defaults with no adapters and enforces cookie hook binding', async () => {
    const hooks = await import('./useMetropolis.js');
    const sparseWrapper = ({children}: {children: ReactNode}) => (
      <MetropolisContext.Provider value={{adapters: {}, config: {}, flux: flux as any, isAuth: () => false,
        messages: [], notifications: [], session: {}, updateMessage: () => {}, updateNotification: () => {}}}>
        {children}
      </MetropolisContext.Provider>
    );
    const {result} = renderHook(() => hooks.useMetropolis(['user', 'higgsfield']), {wrapper: sparseWrapper});

    expect(result.current.userActions).toBeDefined();
    expect(result.current.higgsfieldActions).toBeDefined();
    expect(renderHook(() => hooks.useHiggsfieldActions(), {wrapper: sparseWrapper}).result.current).toBeDefined();
    expect(() => renderHook(() => hooks.useWebSessionActions(), {wrapper: sparseWrapper})).toThrow('requires Metropolis webSession');
    expect(() => renderHook(() => hooks.useWebSessionActions())).toThrow('requires Metropolis webSession');
  });
});
