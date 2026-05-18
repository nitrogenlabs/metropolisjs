import {describe, expect, it} from 'vitest';

import {COLLECTIONS, CONNECTION_TYPES, EDGES, REACTION_TYPES} from './Collections.js';

describe('Collections constants', () => {
  it('exports canonical collection, edge, connection, and reaction names', () => {
    expect(COLLECTIONS.POSTS).toBe('posts');
    expect(EDGES.HAS_REACTION).toBe('hasReaction');
    expect(CONNECTION_TYPES.FOLLOWING).toBe('following');
    expect(REACTION_TYPES.LIKE).toBe('like');
  });
});
