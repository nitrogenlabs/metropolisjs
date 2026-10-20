import {FluxFramework} from '@nlabs/arkhamjs';
import {afterEach, describe, expect, it, vi} from '@nlabs/lex/test-vitest';

import * as actions from './actions/index.js';
import * as root from './index.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shared durable chat and web session coexistence', () => {
  it('exposes both factories from root and actions before callers use either capability', () => {
    expect(root).toHaveProperty('createDurableChatActions', expect.any(Function));
    expect(actions).toHaveProperty('createDurableChatActions', expect.any(Function));
    expect(root).toHaveProperty('createWebSessionActions', expect.any(Function));
    expect(actions).toHaveProperty('createWebSessionActions', expect.any(Function));
  });

  it('projects a chat result while the same caller restores its web session', async () => {
    const flux = new FluxFramework();
    await flux.init();
    const identity = {idleExpiresAt: 3601000, observedAt: 1000, sid: 'session', userId: 'owner', username: 'alias'};
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(identity), {
      headers: {'Content-Type': 'application/json'}
    })));
    const session = actions.createWebSessionActions(flux, {
      endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
      scope: {appId: 'shared-contract', environment: 'test', ownerUserId: 'owner'}
    });
    const chat = root.createDurableChatActions({
      endpoint: '/chat',
      project: (_operation, value) => ({validated: value}),
      request: async (_endpoint, _body, context: FluxFramework) => ({
        data: {history: {owner: context.getState('webSession.identity.userId'), text: 'shared result'}}
      })
    });

    try {
      await expect(session.restore()).resolves.toEqual(identity);
      await expect(chat.request('history', {conversationId: 'room'}, flux)).resolves.toEqual({
        validated: {owner: 'owner', text: 'shared result'}
      });
      expect(root.createWebSessionActions(flux, {
        endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
        scope: {appId: 'shared-contract', environment: 'test', ownerUserId: 'owner'}
      })).toBe(session);
    } finally {
      session.dispose();
    }
  });
});
