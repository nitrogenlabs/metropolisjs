import type {FluxFramework} from '@nlabs/arkhamjs';
import type {SessionType} from './api.js';
import type {ConfigAppSessionType} from '../config/index.js';

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
  } catch(error) {
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
  currentToken && typeof currentToken === 'object'
    ? currentToken
    : {jwtToken: token};

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

export const isValidSession = (session: Record<string, unknown> = {}): boolean => {
  const normalized = normalizeSession(session);
  const token = String(normalized?.token || '');

  if(!token) {
    return false;
  }

  const sessionExpires = Number(normalized?.expires || 0);
  const tokenExpires = parseJwtExpiryMs(token);
  const expiresAt = sessionExpires > 0 ? sessionExpires : tokenExpires;

  return Boolean(expiresAt && Date.now() < expiresAt);
};

export const getRefreshWindowMinutes = (
  sessionLifetimeMinutes: number,
  sessionConfig: ConfigAppSessionType = {}
): number => {
  const lifetimeMinutes = Math.max(1, Number(sessionLifetimeMinutes || 0));
  const refreshAfterRatio = Number(sessionConfig.refreshAfterRatio || 0);

  if(refreshAfterRatio > 0 && refreshAfterRatio < 1) {
    return Math.max(1, Math.round(lifetimeMinutes * (1 - refreshAfterRatio)));
  }

  return Math.max(1, Number(sessionConfig.minMinutes || 5));
};

export const storeSession = (
  flux: FluxFramework,
  session: Record<string, unknown> = {}
): Promise<SessionType> => {
  return (async () => {
    const normalizedSession = normalizeSession(session) as SessionType;

    if(!Object.keys(normalizedSession as Record<string, unknown>).length) {
      await clearPersistedSession(flux);
      return {} as SessionType;
    }

    await Promise.resolve(flux.setState('user.session', normalizedSession));
    return normalizedSession;
  })();
};

export const readStoredSession = async (flux: FluxFramework): Promise<SessionType> =>
  normalizeSession((flux.getState('user.session', {}) || {}) as Record<string, unknown>) as SessionType;

export const clearPersistedSession = async (flux: FluxFramework): Promise<void> => {
  await Promise.resolve(flux.setState('user.session', {}));
};

export const hydrateSessionFromStorage = async (flux: FluxFramework): Promise<SessionType> => {
  const currentSession = await readStoredSession(flux);

  if(isValidSession(currentSession as Record<string, unknown>)) {
    await storeSession(flux, currentSession as unknown as Record<string, unknown>);
    return currentSession;
  }

  await clearPersistedSession(flux);
  return {} as SessionType;
};

export const isLoggedIn = (flux: FluxFramework): boolean => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;

  return isValidSession(currentSession);
};
