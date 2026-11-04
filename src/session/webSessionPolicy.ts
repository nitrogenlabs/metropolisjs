/** Nonsecret browser projection of the Reaktor opaque-session HTTP identity. */
export interface WebSessionIdentity {
  readonly idleExpiresAt: number;
  readonly observedAt: number;
  readonly sid: string;
  readonly userId: string;
  readonly username: string;
}

export interface WebSessionScope {
  readonly appId: string;
  readonly environment: string;
  readonly ownerUserId: string;
}

export type WebSessionEndReason = 'expired' | 'rejected' | 'replaced' | 'signout';

export interface WebSessionObservation {
  readonly deadline: number;
  readonly identity: WebSessionIdentity;
}

export const DEFAULT_WEB_SESSION_IDLE_MS = 3_600_000;
export const MAX_WEB_SESSION_IDLE_MS = 86_400_000;
export const validWebSessionIdleMs = (value: unknown): value is number => typeof value === 'number'
  && Number.isSafeInteger(value) && value >= 60_000 && value <= MAX_WEB_SESSION_IDLE_MS;

const boundedString = (value: unknown): value is string => typeof value === 'string'
  && value.trim().length > 0 && value.length <= 256;

/** Database time defines the budget; monotonic elapsed time can only shorten it. */
export const observeWebSession = (
  value: unknown,
  ownerUserId: string,
  started: number,
  received: number,
  previous?: WebSessionObservation,
  idleMs: number = DEFAULT_WEB_SESSION_IDLE_MS
): WebSessionObservation => {
  if(!validWebSessionIdleMs(idleMs) || !value || typeof value !== 'object') {
    throw new Error('invalid_session');
  }
  const {idleExpiresAt, observedAt, sid, userId, username} = value as Partial<WebSessionIdentity>;
  if(typeof idleExpiresAt !== 'number' || typeof observedAt !== 'number'
    || !Number.isSafeInteger(idleExpiresAt) || !Number.isSafeInteger(observedAt) || observedAt < 0
    || idleExpiresAt <= observedAt || idleExpiresAt - observedAt > idleMs
    || !boundedString(sid) || !boundedString(userId) || !boundedString(username) || userId !== ownerUserId
    || !Number.isFinite(started) || !Number.isFinite(received) || started < 0 || received < started
    || (previous && (observedAt < previous.identity.observedAt || sid !== previous.identity.sid))) {
    throw new Error('invalid_session');
  }
  const remaining = idleExpiresAt - observedAt - (received - started);
  if(remaining <= 0) {
    throw new Error('invalid_session');
  }
  return {
    deadline: received + remaining,
    identity: Object.freeze({idleExpiresAt, observedAt, sid, userId, username})
  };
};

export const webSessionNeedsVerification = (deadline: number, now: number, resumed: boolean): boolean =>
  resumed || !Number.isFinite(now) || now >= deadline;
