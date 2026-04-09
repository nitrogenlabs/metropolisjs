import type {FluxFramework} from '@nlabs/arkhamjs';
import type {SessionType} from './api.js';
import type {ConfigAppSessionType} from '../config/index.js';

const parseJwtExpiryMs = (token: string): number => {
  try {
    if(!token) {
      return 0;
    }

    const tokenParts = token.split('.');
    if(tokenParts.length < 2 || typeof atob !== 'function') {
      return 0;
    }

    const payloadBase64 = tokenParts[1]?.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = payloadBase64?.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(normalized || ''));
    const expSeconds = Number(payload?.exp || 0);
    return expSeconds > 0 ? expSeconds * 1000 : 0;
  } catch(error) {
    return 0;
  }
};

const parseJwtIssuedMs = (token: string): number => {
  try {
    if(!token) {
      return 0;
    }

    const tokenParts = token.split('.');
    if(tokenParts.length < 2 || typeof atob !== 'function') {
      return 0;
    }

    const payloadBase64 = tokenParts[1]?.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = payloadBase64?.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(normalized || ''));
    const iatSeconds = Number(payload?.iat || 0);
    return iatSeconds > 0 ? iatSeconds * 1000 : 0;
  } catch(error) {
    return 0;
  }
};

export const normalizeSession = (session: Record<string, unknown> = {}): Record<string, unknown> => {
  const token = String(
    session?.token ||
    (session?.idToken as {jwtToken?: string})?.jwtToken ||
    (session?.accessToken as {jwtToken?: string})?.jwtToken ||
    ''
  );

  if(!token) {
    return {};
  }

  const tokenExpires = parseJwtExpiryMs(token);
  const tokenIssued = parseJwtIssuedMs(token);
  const sessionExpires = Number(session?.expires || 0);
  const sessionIssued = Number(session?.issued || 0);

  return {
    ...session,
    accessToken: session?.accessToken || {jwtToken: token},
    expires: sessionExpires > 0 ? sessionExpires : tokenExpires,
    idToken: session?.idToken || {jwtToken: token},
    issued: sessionIssued > 0 ? sessionIssued : tokenIssued,
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
  session: Record<string, unknown> = {},
  _storageKey?: string
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

export const readStoredSession = async (flux: FluxFramework, _storageKey?: string): Promise<SessionType> =>
  normalizeSession((flux.getState('user.session', {}) || {}) as Record<string, unknown>) as SessionType;

export const clearPersistedSession = async (flux: FluxFramework, _storageKey?: string): Promise<void> => {
  await Promise.resolve(flux.setState('user.session', {}));
};

export const hydrateSessionFromStorage = async (flux: FluxFramework, storageKey?: string): Promise<SessionType> => {
  const currentSession = await readStoredSession(flux, storageKey);

  if(isValidSession(currentSession as Record<string, unknown>)) {
    await storeSession(flux, currentSession as unknown as Record<string, unknown>, storageKey);
    return currentSession;
  }

  await clearPersistedSession(flux, storageKey);
  return {} as SessionType;
};

export const isLoggedIn = (flux: FluxFramework, storageKey?: string): boolean => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;

  return isValidSession(currentSession);
};
