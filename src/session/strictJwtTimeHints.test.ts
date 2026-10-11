import {afterEach, describe, expect, it, vi} from 'vitest';

import {parseJwtExpiryMs, parseJwtIssuedMs, parseStrictJwtTimeHints} from './sessionPolicy.js';

const issued = 1800000000;
const expires = issued + 900;
const token = (payload: unknown): string => `header.${btoa(JSON.stringify(payload))}.signature`;

afterEach(() => vi.unstubAllGlobals());

describe('strict hosted JWT hints', () => {
  it('uses the shared decoder and returns integer seconds converted to milliseconds', () => {
    expect(parseStrictJwtTimeHints(token({
      exp: expires,
      iat: issued
    }))).toEqual({
      expires: expires * 1000,
      issued: issued * 1000
    });
  });

  it.each([null, [], {}, {
    exp: expires
  }, {
    iat: issued
  }, {
    exp: String(expires),
    iat: String(issued)
  }, {
    exp: expires * 1000,
    iat: issued * 1000
  }, {
    exp: expires + 0.25,
    iat: issued + 0.25
  }, {
    exp: expires,
    iat: 0
  }, {
    exp: 0,
    iat: issued
  }, {
    exp: -1,
    iat: issued
  }, {
    exp: expires,
    iat: -1
  }, {
    exp: Number.MAX_SAFE_INTEGER,
    iat: issued
  }, {
    exp: expires,
    iat: Number.MAX_SAFE_INTEGER
  }, {
    exp: false,
    iat: issued
  }, {
    exp: expires,
    iat: null
  }])('rejects malformed raw claims %j', (payload) => {
    expect(parseStrictJwtTimeHints(token(payload))).toBeUndefined();
  });

  it.each([[{
    exp: String(expires),
    iat: String(issued)
  }, expires * 1000, issued * 1000], [{
    exp: expires * 1000,
    iat: issued * 1000
  }, expires * 1000, issued * 1000], [{
    exp: expires + 0.25,
    iat: issued + 0.25
  }, (expires + 0.25) * 1000, (issued + 0.25) * 1000]] as const)('preserves legacy reader acceptance %j', (payload, expiryMs, issuedMs) => {
    expect(parseJwtExpiryMs(token(payload))).toBe(expiryMs);
    expect(parseJwtIssuedMs(token(payload))).toBe(issuedMs);
  });

  it('fails closed without the native decoder', () => {
    const value = token({
      exp: expires,
      iat: issued
    });
    vi.stubGlobal('atob', undefined);

    expect(parseStrictJwtTimeHints(value)).toBeUndefined();
  });
});
