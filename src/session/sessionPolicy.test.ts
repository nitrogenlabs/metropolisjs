import {afterEach, describe, expect, it, vi} from 'vitest';

import {getMinutesUntil, getRefreshWindowMinutes, getSessionRefreshDecision, isValidSession, normalizeSession, parseJwtExpiryMs, parseJwtIssuedMs, shouldRefreshSession} from './sessionPolicy.js';

const now = Date.parse('2026-10-03T12:00:00Z');
const makeToken = (exp: number, iat = now - 60_000) => `header.${Buffer.from(JSON.stringify({exp: exp / 1000, iat: iat / 1000})).toString('base64url')}.sig`;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('session refresh decisions', () => {
  it('accepts the legacy autoRefresh config without changing foreground policy', () => {
    expect(getRefreshWindowMinutes(180, {autoRefresh: false, minMinutes: 5})).toBe(5);
    expect(shouldRefreshSession({expires: now + 60_000, token: 'opaque'}, {autoRefresh: false}, now)).toBe(true);
  });

  it.each([
    [false, null, 'inactive'], [true, null, 'missing-expiry'],
    [true, undefined, 'missing-expiry'], [true, NaN, 'invalid-expiry'],
    [true, Infinity, 'invalid-expiry'], [true, 0, 'expired'],
    [true, now, 'expired'], [true, now - 1, 'expired'],
    [true, now + 600_000, 'refresh-due'], [true, now + 600_001, 'healthy'],
    [true, now + 599_999, 'refresh-due']
  ] as const)('classifies active=%s expiry=%s as %s', (active, expiresAt, expected) => {
    expect(getSessionRefreshDecision({active, expiresAt, mode: 'milliseconds', now, refreshWindowMs: 600_000})).toBe(expected);
  });

  it('preserves rounded minutes separately from exact native thresholds', () => {
    expect(getMinutesUntil(now + 329_999, now)).toBe(5);
    expect(getMinutesUntil(now + 330_000, now)).toBe(6);
    expect(getSessionRefreshDecision({active: true, expiresAt: now + 329_999, mode: 'roundedMinutes', now, refreshWindowMs: 300_000})).toBe('refresh-due');
    expect(getSessionRefreshDecision({active: true, expiresAt: now + 330_000, mode: 'roundedMinutes', now, refreshWindowMs: 300_000})).toBe('healthy');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(getMinutesUntil(now + 60_000)).toBe(1);
  });

  it('uses configured ratio and minimum refresh windows', () => {
    expect(getRefreshWindowMinutes(180, {refreshAfterRatio: 2 / 3})).toBe(60);
    expect(getRefreshWindowMinutes(180, {minMinutes: 15})).toBe(15);
    expect(getRefreshWindowMinutes(0)).toBe(5);
    expect(getRefreshWindowMinutes(1, {refreshAfterRatio: 0.99})).toBe(1);
    expect(getRefreshWindowMinutes(180, {refreshAfterRatio: 1})).toBe(5);
  });

  it('normalizes wrapped tokens and seconds without losing existing token fields', () => {
    const token = makeToken(now + 3_600_000);
    const normalized = normalizeSession({accessToken: {jwtToken: token, scope: 'read'}, expires: (now + 3_600_000) / 1000, issued: (now - 60_000) / 1000});

    expect(normalized).toMatchObject({accessToken: {jwtToken: token, scope: 'read'}, expires: now + 3_600_000, issued: now - 60_000, token});
    expect(normalizeSession({idToken: {jwtToken: token}})).toMatchObject({expires: now + 3_600_000, token});
    expect(normalizeSession()).toEqual({});
    expect(parseJwtExpiryMs(token)).toBe(now + 3_600_000);
    expect(parseJwtIssuedMs(token)).toBe(now - 60_000);
  });

  it('uses the earlier JWT expiry for validity but stored expiry for refresh scheduling', () => {
    const session = {expires: now + (120 * 60_000), issued: now - (60 * 60_000), token: makeToken(now + 60_000)};

    expect(isValidSession(session, now)).toBe(true);
    expect(shouldRefreshSession(session, {refreshAfterRatio: 2 / 3}, now)).toBe(false);
    expect(isValidSession(session, now + 60_000)).toBe(false);
    expect(shouldRefreshSession(session, {}, now + 60_000)).toBe(true);
  });

  it('retains foreground policy for no token, missing expiry, expired and due sessions', () => {
    expect(shouldRefreshSession({}, {}, now)).toBe(false);
    expect(shouldRefreshSession({token: makeToken(now + 3_600_000)}, {}, now)).toBe(true);
    expect(shouldRefreshSession({token: 'opaque'}, {}, now)).toBe(true);
    expect(shouldRefreshSession({expires: now + 60_000, token: makeToken(now + 60_000)}, {}, now)).toBe(true);
    expect(isValidSession({}, now)).toBe(false);
    expect(isValidSession({token: 'opaque'}, now)).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(isValidSession({expires: now + 60_000, token: 'opaque'})).toBe(true);
    expect(shouldRefreshSession({expires: now + 60_000, token: 'opaque'})).toBe(true);
  });

  it.each(['', 'opaque', 'header.bad!!.sig', `header.${Buffer.from('{}').toString('base64url')}.sig`])('handles unparseable token %s', (token) => {
    expect(parseJwtExpiryMs(token)).toBe(0);
    expect(parseJwtIssuedMs(token)).toBe(0);
  });

  it('works without a native base64 decoder and accepts millisecond JWT timestamps', () => {
    const token = `header.${Buffer.from(JSON.stringify({exp: now + 60_000, iat: 12})).toString('base64url')}.sig`;

    expect(parseJwtExpiryMs(token)).toBe(now + 60_000);
    expect(parseJwtIssuedMs(token)).toBe(0);

    vi.stubGlobal('atob', undefined);

    expect(parseJwtExpiryMs(token)).toBe(0);
  });
});
