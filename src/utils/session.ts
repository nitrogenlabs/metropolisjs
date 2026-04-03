import type {FluxFramework} from '@nlabs/arkhamjs';
import type {SessionType} from './api.js';

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

export const readStoredSession = async (flux: FluxFramework): Promise<SessionType> =>
  normalizeSession((flux.getState('user.session', {}) || {}) as Record<string, unknown>) as SessionType;

export const clearPersistedSession = async (flux: FluxFramework): Promise<void> => {
  await flux.setState('user.session', {});
};

export const hydrateSessionFromStorage = async (flux: FluxFramework): Promise<SessionType> => {
  const currentSession = normalizeSession((flux.getState('user.session', {}) || {}) as Record<string, unknown>) as SessionType;

  if(isValidSession(currentSession as Record<string, unknown>)) {
    return currentSession;
  }

  await clearPersistedSession(flux);
  return {};
};

export const isLoggedIn = (flux: FluxFramework): boolean => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  return isValidSession(currentSession);
};
