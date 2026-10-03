/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

const MILLIS_THRESHOLD = 1_000_000_000_000;
const SECONDS_THRESHOLD = 1_000_000_000;

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  try {
    if(!token) {
      return {};
    }

    const tokenParts = token.split('.');
    if(tokenParts.length < 2 || typeof atob !== 'function') {
      return {};
    }

    const payloadBase64 = tokenParts[1]?.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = payloadBase64?.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=');

    return JSON.parse(atob(normalized || '')) as Record<string, unknown>;
  } catch{
    return {};
  }
};

const parseTimestampMs = (value: unknown): number => {
  const numericValue = Number(value || 0);

  if(numericValue > MILLIS_THRESHOLD) {
    return numericValue;
  }

  if(numericValue > SECONDS_THRESHOLD) {
    return numericValue * 1000;
  }

  return 0;
};

const getSessionToken = (session: Record<string, unknown>): string =>
  String(
    session.token
    || (session.idToken as {jwtToken?: string} | undefined)?.jwtToken
    || (session.accessToken as {jwtToken?: string} | undefined)?.jwtToken
    || ''
  );

const buildTokenValue = (token: string, currentToken?: unknown) =>
  (currentToken && typeof currentToken === 'object'
    ? {...currentToken, jwtToken: token}
    : {jwtToken: token});

const getNormalizedSessionTimestamps = (session: Record<string, unknown>, token: string) => {
  const payload = decodeJwtPayload(token);
  const expires = parseTimestampMs(session.expires) || parseTimestampMs(payload.exp);
  const issued = parseTimestampMs(session.issued) || parseTimestampMs(payload.iat);

  return {expires, issued};
};

export const parseJwtExpiryMs = (token: string): number =>
  parseTimestampMs(decodeJwtPayload(token).exp);

export const parseJwtIssuedMs = (token: string): number =>
  parseTimestampMs(decodeJwtPayload(token).iat);

export const normalizeSession = (session: Record<string, unknown> = {}): Record<string, unknown> => {
  const token = getSessionToken(session);

  if(!token) {
    return {};
  }

  const {expires, issued} = getNormalizedSessionTimestamps(session, token);

  return {
    ...session,
    accessToken: buildTokenValue(token, session.accessToken),
    expires,
    idToken: buildTokenValue(token, session.idToken),
    issued,
    token
  };
};

export const isValidSession = (session: Record<string, unknown> = {}, now = Date.now()): boolean => {
  const normalized = normalizeSession(session);
  const token = String(normalized?.token || '');

  if(!token) {
    return false;
  }

  const sessionExpires = Number(normalized?.expires || 0);
  const tokenExpires = parseJwtExpiryMs(token);
  const expiresAt = Math.min(...[sessionExpires, tokenExpires].filter((value) => value > 0));

  return Number.isFinite(expiresAt) && now < expiresAt;
};

export const getRefreshWindowMinutes = (
  sessionLifetimeMinutes: number,
  sessionConfig: SessionRefreshConfig = {}
): number => {
  const lifetimeMinutes = Math.max(1, Number(sessionLifetimeMinutes || 0));
  const refreshAfterRatio = Number(sessionConfig.refreshAfterRatio || 0);

  if(refreshAfterRatio > 0 && refreshAfterRatio < 1) {
    return Math.max(1, Math.round(lifetimeMinutes * (1 - refreshAfterRatio)));
  }

  return Math.max(1, Number(sessionConfig.minMinutes || 5));
};

export interface SessionRefreshConfig {
  autoRefresh?: boolean;
  readonly maxMinutes?: number;
  readonly minMinutes?: number;
  readonly refreshAfterRatio?: number;
}

export type SessionRefreshDecision = 'inactive' | 'missing-expiry' | 'invalid-expiry' | 'expired' | 'refresh-due' | 'healthy';

export interface SessionRefreshInput {
  readonly active: boolean;
  readonly expiresAt: number | null | undefined;
  readonly mode: 'milliseconds' | 'roundedMinutes';
  readonly now: number;
  readonly refreshWindowMs: number;
}

export const getMinutesUntil = (expiresAt: number, now = Date.now()): number =>
  Math.round((expiresAt - now) / 60_000);

export const getSessionRefreshDecision = (
  {active, expiresAt, mode, now, refreshWindowMs}: SessionRefreshInput
): SessionRefreshDecision => {
  if(!active) {
    return 'inactive';
  }
  if(expiresAt === null || expiresAt === undefined) {
    return 'missing-expiry';
  }
  if(!Number.isFinite(expiresAt)) {
    return 'invalid-expiry';
  }
  if(expiresAt <= now) {
    return 'expired';
  }
  const remaining = mode === 'roundedMinutes' ? getMinutesUntil(expiresAt, now) : expiresAt - now;
  const window = mode === 'roundedMinutes' ? refreshWindowMs / 60_000 : refreshWindowMs;
  return remaining <= window ? 'refresh-due' : 'healthy';
};

export const shouldRefreshSession = (
  session: Record<string, unknown>,
  sessionConfig: SessionRefreshConfig = {},
  now = Date.now()
): boolean => {
  const token = String(session?.token || '');
  if(!token) {
    return false;
  }
  const expiresAt = Number(session?.expires || 0);
  const issuedAt = Number(session?.issued || 0);
  const lifetime = Math.round((expiresAt - issuedAt) / 60_000);
  const window = getRefreshWindowMinutes(lifetime || Number(sessionConfig.maxMinutes || 15), sessionConfig);
  return !isValidSession(session, now)
    || !expiresAt
    || getMinutesUntil(expiresAt, now) <= window;
};
