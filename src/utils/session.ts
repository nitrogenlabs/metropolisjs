import {getConfigFromFlux} from './configUtils.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {SessionType} from './api.js';

const DEFAULT_SESSION_STORAGE_KEY = 'metropolis.user.session';

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

export const getSessionStorageKey = (flux: FluxFramework, key?: string): string => {
  if(key) {
    return key;
  }

  const config = getConfigFromFlux(flux);
  const appName = String(config?.app?.name || '').trim();
  return appName ? `${appName}.user.session` : DEFAULT_SESSION_STORAGE_KEY;
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

  return {
    ...session,
    accessToken: session?.accessToken || {jwtToken: token},
    idToken: session?.idToken || {jwtToken: token},
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

export const readStoredSession = (flux: FluxFramework, key?: string): SessionType => {
  try {
    if(typeof window === 'undefined') {
      return {};
    }

    const storageKey = getSessionStorageKey(flux, key);
    const raw = window.sessionStorage.getItem(storageKey);

    if(!raw) {
      return {};
    }

    return normalizeSession(JSON.parse(raw)) as SessionType;
  } catch(error) {
    return {};
  }
};

export const persistSession = (
  flux: FluxFramework,
  session: Record<string, unknown> = {},
  key?: string
): SessionType => {
  const normalized = normalizeSession(session) as SessionType;

  try {
    if(typeof window !== 'undefined') {
      const storageKey = getSessionStorageKey(flux, key);

      if(Object.keys(normalized).length > 0) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(normalized));
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
    }
  } catch(error) {
    // noop
  }

  return normalized;
};

export const clearPersistedSession = (flux: FluxFramework, key?: string) => {
  try {
    if(typeof window !== 'undefined') {
      const storageKey = getSessionStorageKey(flux, key);
      window.sessionStorage.removeItem(storageKey);
    }
  } catch(error) {
    // noop
  }
};

export const hydrateSessionFromStorage = (flux: FluxFramework, key?: string): SessionType => {
  const currentSession = normalizeSession((flux.getState('user.session', {}) || {}) as Record<string, unknown>) as SessionType;
  if(isValidSession(currentSession as Record<string, unknown>)) {
    persistSession(flux, currentSession as Record<string, unknown>, key);
    return currentSession;
  }

  const storedSession = readStoredSession(flux, key);
  if(isValidSession(storedSession as Record<string, unknown>)) {
    flux.setState('user.session', storedSession);
    return storedSession;
  }

  clearPersistedSession(flux, key);
  return {};
};

export const isLoggedIn = (flux: FluxFramework, key?: string): boolean => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  if(isValidSession(currentSession)) {
    return true;
  }

  const storedSession = readStoredSession(flux, key);
  return isValidSession(storedSession as Record<string, unknown>);
};
