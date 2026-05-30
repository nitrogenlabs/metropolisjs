import {describe, expect, it} from 'vitest';

import {COLLECTIONS, CONNECTION_TYPES, EDGES, REACTION_TYPES} from './Collections.js';

describe('Collections constants', () => {
  it('exports canonical collection, edge, connection, and reaction names', () => {
    expect(COLLECTIONS.POSTS).toBe('posts');
    expect(COLLECTIONS.SUPPORT_TICKETS).toBe('supportTickets');
    expect(EDGES.HAS_REACTION).toBe('hasReaction');
    expect(EDGES.HAS_SUPPORT_TICKET).toBe('hasSupportTicket');
    expect(CONNECTION_TYPES.FOLLOWING).toBe('following');
    expect(REACTION_TYPES.LIKE).toBe('like');
  });
});
