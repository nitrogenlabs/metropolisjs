import {FluxFramework} from '@nlabs/arkhamjs';
import {describe, expect, it} from '@nlabs/lex/test-vitest';

import {app, posts, users} from './index.js';
import {webSession, webSessionSuppression} from './webSessionStore.js';

describe('web session state isolation', () => {
  it('nonsecret marker survives signout cache clear while account caches do not survive', async () => {
    const flux = new FluxFramework();
    await flux.init({stores: [app, posts, users, webSession, webSessionSuppression]});
    await flux.setState('webSessionSuppression', {suppressed: true});
    await flux.setState('post.viewed.private', {postId: 'private'});
    await flux.dispatch({session: {}, type: 'USER_SIGN_OUT_SUCCESS'});

    expect(flux.getState('webSessionSuppression')).toEqual({suppressed: true});
    expect(flux.getState('post.viewed')).toEqual({});
    expect(flux.getState('webSession.status')).toBe('anonymous');
    expect(flux.getState('app.sessionGeneration')).toBe(1);
  });
});
