/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {isValidSession as isValidSessionAt, normalizeSession} from '../session/sessionPolicy.js';
import {USER_CONSTANTS} from '../stores/userStore.js';
import {mergeCachedRecord} from './cacheIngestion.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {SessionType} from './api.js';

export {getRefreshWindowMinutes, normalizeSession, parseJwtExpiryMs, parseJwtIssuedMs} from '../session/sessionPolicy.js';

// Keep the established one-argument utility safe when used as an array callback.
export const isValidSession = (session: Record<string, unknown> = {}): boolean => isValidSessionAt(session);

export const storeSession = (
  flux: FluxFramework,
  session: Record<string, unknown> = {}
): Promise<SessionType> => (async () => {
  const previous = flux.getState<Record<string, unknown>>('user.session', {});
  const sameUser = !session.userId || !previous.userId || session.userId === previous.userId;
  const merged = Object.keys(session).length && sameUser ? mergeCachedRecord(previous, session) : session;
  const normalizedSession: SessionType = normalizeSession(merged);

  if(!Object.keys(normalizedSession as Record<string, unknown>).length) {
    await clearPersistedSession(flux);
    return {};
  }

  await Promise.resolve(flux.setState('user.session', normalizedSession));
  return normalizedSession;
})();

export const readStoredSession = async (flux: FluxFramework): Promise<SessionType> =>
  normalizeSession(flux.getState<Record<string, unknown>>('user.session', {}) || {});

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
  await flux.dispatch({session: {}, type: USER_CONSTANTS.SIGN_OUT_SUCCESS});
  return {};
};

export const isLoggedIn = (flux: FluxFramework): boolean => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;

  return isValidSession(currentSession);
};
