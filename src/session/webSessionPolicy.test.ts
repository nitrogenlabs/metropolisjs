import {afterEach, describe, expect, it, vi} from '@nlabs/lex/test-vitest';

import * as policy from './index.js';

type Policy = {
  observeWebSession: (value: unknown, owner: string, started: number, received: number,
    previous?: {identity: Identity; deadline: number}) => {identity: Identity; deadline: number};
  webSessionNeedsVerification: (deadline: number, now: number, resumed: boolean) => boolean;
};
interface Identity {
  idleExpiresAt: number;
  observedAt: number;
  sid: string;
  userId: string;
  username: string;
}
const subject = policy as unknown as Policy;
const identity: Identity = {idleExpiresAt: 3_601_000, observedAt: 1000, sid: 'session', userId: 'owner', username: 'alias'};

afterEach(() => vi.useRealTimers());

describe('database web-session observations', () => {
  it('database observedAt survives browser clock ±24h', () => {
    vi.useFakeTimers();
    for(const wallTime of [86_400_000, -86_400_000]) {
      vi.setSystemTime(wallTime);

      expect(subject.observeWebSession(identity, 'owner', 10, 110)).toEqual({deadline: 3_600_010, identity});
    }
  });

  it('RTT never extends idle budget', () => {
    expect(subject.observeWebSession({...identity, idleExpiresAt: 6000}, 'owner', 10, 2010).deadline).toBe(5010);
    expect(() => subject.observeWebSession({...identity, idleExpiresAt: 6000}, 'owner', 0, 5000)).toThrow('invalid_session');
  });

  it('exact3600000 boundary', () => {
    expect(subject.observeWebSession(identity, 'owner', 0, 0).deadline).toBe(3_600_000);
    expect(() => subject.observeWebSession({...identity, idleExpiresAt: 3_601_001}, 'owner', 0, 0)).toThrow('invalid_session');
  });

  it.each([
    null, {}, {...identity, observedAt: -1}, {...identity, observedAt: 1.5},
    {...identity, idleExpiresAt: Infinity}, {...identity, idleExpiresAt: 1000},
    {...identity, sid: ''}, {...identity, username: 'x'.repeat(257)}, {...identity, userId: 'other'},
    {...identity, observedAt: Number.MAX_SAFE_INTEGER + 1}
  ])('reject malformed/future-inconsistent timestamps: %j', (value) => {
    expect(() => subject.observeWebSession(value, 'owner', 0, 1)).toThrow('invalid_session');
  });

  it.each([[5, 4], [NaN, 4], [0, Infinity], [-1, 0]])('rejects invalid monotonic clocks %s %s', (start, end) => {
    expect(() => subject.observeWebSession(identity, 'owner', start, end)).toThrow('invalid_session');
  });

  it('suspend requires read-only verification', () => {
    expect(subject.webSessionNeedsVerification(100, 50, false)).toBe(false);
    expect(subject.webSessionNeedsVerification(100, 50, true)).toBe(true);
    expect(subject.webSessionNeedsVerification(100, 100, false)).toBe(true);
    expect(subject.webSessionNeedsVerification(100, NaN, false)).toBe(true);
  });

  it('stale observation cannot extend newer scope', () => {
    const previous = {deadline: 999, identity: {...identity, observedAt: 2000}};

    expect(() => subject.observeWebSession(identity, 'owner', 0, 0, previous)).toThrow('invalid_session');
    expect(() => subject.observeWebSession({...identity, observedAt: 2000, sid: 'replaced'}, 'owner', 0, 0, previous)).toThrow('invalid_session');
    expect(subject.observeWebSession({...identity, observedAt: 2000}, 'owner', 0, 0, previous).identity.sid).toBe('session');
  });
});
