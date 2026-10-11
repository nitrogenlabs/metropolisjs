import {getSessionRefreshDecision} from '../session/sessionPolicy.js';
import {createSingleFlight} from '../session/singleFlight.js';
import {parseCredentialEnvelope} from './envelope.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {NativeApi} from '../api/index.js';
import type {NativeCredentialEnvelope} from './envelope.js';

export type NativeAuthErrorCode = 'configuration' | 'disposed' | 'stale' | 'invalid_session' | 'storage' | 'durable_cleanup';
export class NativeAuthError extends Error {
  readonly code: NativeAuthErrorCode;
  constructor(code: NativeAuthErrorCode) {
    super(`Native authentication: ${code}`);
    this.name = 'NativeAuthError';
    this.code = code;
  }
}
/** Both ports must use Arkham ordered storage; promises reject on failure. No plaintext credential projection. */
export interface NativeSessionPersistence {
  available(): Promise<boolean>;
  read(): Promise<unknown>;
  write(envelope: NativeCredentialEnvelope): Promise<void>;
  clear(): Promise<void>;
  readMarker(): Promise<unknown>;
  writeMarker(marker: {
    readonly schemaVersion: 1; readonly environment: string; readonly userId?: string;
  }): Promise<void>;
  clearMarker(): Promise<void>;
}
export interface NativeAuthOptions {
  readonly api: NativeApi;
  readonly environment: string;
  readonly mode: 'hosted';
  readonly flux: FluxFramework;
  readonly storage: NativeSessionPersistence;
  /** Synchronously removes account-scoped caches and active outbox binding before events. */
  readonly invalidateAccount: () => void;
  readonly now?: () => number;
}
export interface SignOutResult {
  readonly durable: boolean;
  readonly remote: 'revoked' | 'may_remain_active' | 'no_session';
}
export interface NativeAuthController {
  signIn(user: {readonly email: string; readonly password: string}): Promise<NativeCredentialEnvelope>;
  restore(): Promise<NativeCredentialEnvelope | undefined>;
  ensureAccessToken(): Promise<string>;
  onForeground(): Promise<string>;
  signOut(): Promise<SignOutResult>;
  dispose(): Promise<void>;
}
const selection = 'schemaVersion environment token userId username issued expires sid';
const signInQuery = `mutation MetropolisSignIn($user: UserInput!) { users { signIn(user: $user) { ${selection} } } }`;
const refreshQuery = `mutation MetropolisRefresh($token: String!) { users { refreshSession(token: $token) { ${selection} } } }`;
const signOutQuery = 'mutation MetropolisSignOut($token: String!) { users { signOut(token: $token) } }';
const isTransient = (error: unknown): boolean => {
  if(!error || typeof error !== 'object') {
    return false;
  }
  const kind = 'kind' in error ? error.kind : undefined;
  return kind === 'network' || kind === 'timeout' || kind === 'abort';
};
export const createNativeAuthController = (options: NativeAuthOptions): NativeAuthController => {
  const {api, environment, flux, invalidateAccount, storage, now = Date.now} = options;
  if(options.mode !== 'hosted' || !environment || environment.length > 128) {
    throw new NativeAuthError('configuration');
  }
  let generation = 0;
  let disposed = false;
  let closing = false;
  let session: NativeCredentialEnvelope | undefined;
  let flight = createSingleFlight<string>();
  let cleanupBarrier = Promise.resolve(true);
  const current = (g: number, token?: string): boolean =>
    !disposed && g === generation && (!token || session?.token === token);
  const gate = (g: number, token?: string): void => {
    if(!current(g, token)) {
      throw new NativeAuthError(disposed ? 'disposed' : 'stale');
    }
  };
  const begin = (): number => {
    if(disposed || closing) {
      throw new NativeAuthError('disposed');
    }
    generation++;
    session = undefined;
    flight = createSingleFlight<string>();
    invalidateAccount();
    return generation;
  };
  const publish = async (g: number, envelope?: NativeCredentialEnvelope): Promise<void> => {
    gate(g);
    session = envelope;
    await flux.setState('nativeAuth', envelope ? {
      environment, expires: envelope.expires, generation: g, sid: envelope.sid, status: 'authenticated',
      userId: envelope.userId, username: envelope.username
    } : {environment, generation: g, status: 'anonymous'});
    gate(g);
    await flux.dispatch({generation: g, type: envelope ? 'nativeAuth.AUTHENTICATED' : 'nativeAuth.SIGNED_OUT'});
    gate(g);
  };
  const cleanup = (g: number, userId?: string): Promise<boolean> => {
    gate(g);
    // Schedule on both Arkham queues before yielding. This authentication admission barrier
    // awaits every invalidation, even after its visibility generation is superseded.
    const invoke = (operation: () => Promise<void>): Promise<void> => {
      try {
        return operation();
      } catch(error) {
        return Promise.reject(error);
      }
    };
    const marker = invoke(() => storage.writeMarker({environment, schemaVersion: 1, ...(userId ? {userId} : {})}));
    const removal = invoke(() => storage.clear());
    const completion = Promise.allSettled([marker, removal]);
    cleanupBarrier = Promise.all([cleanupBarrier, completion]).then(([, results]) =>
      results.some((result) => result.status === 'fulfilled'));
    return cleanupBarrier;
  };
  const admission = async (g: number): Promise<void> => {
    const durable = await cleanupBarrier;
    gate(g);
    if(!durable) {
      throw new NativeAuthError('durable_cleanup');
    }
  };
  const commit = async (g: number, envelope: NativeCredentialEnvelope, token?: string): Promise<void> => {
    gate(g, token);
    try {
      await storage.write(envelope);
      gate(g, token);
      await storage.clearMarker();
      gate(g, token);
    } catch{
      gate(g, token);
      session = undefined;
      invalidateAccount();
      const suppression = cleanup(g, envelope.userId);
      await publish(g);
      const durable = await suppression;
      throw new NativeAuthError(durable ? 'storage' : 'durable_cleanup');
    }
    if(envelope.expires <= now()) {
      invalidateAccount();
      const suppression = cleanup(g, envelope.userId);
      await publish(g);
      if(!await suppression) {
        throw new NativeAuthError('durable_cleanup');
      }
      throw new NativeAuthError('invalid_session');
    }
    await publish(g, envelope);
  };
  const readCurrent = async (g: number, read: () => Promise<unknown>): Promise<unknown> => {
    try {
      const value = await read();
      gate(g);
      return value;
    } catch{
      gate(g);
      throw new NativeAuthError('storage');
    }
  };
  const available = async (g: number): Promise<void> => {
    const ready = await readCurrent(g, () => storage.available());
    if(ready !== true) {
      throw new NativeAuthError('storage');
    }
  };
  const signIn: NativeAuthController['signIn'] = async (user) => {
    const g = begin();
    // Invalidation queues must start before any awaited publish or listener can supersede us.
    cleanup(g);
    await publish(g);
    await admission(g);
    await available(g);
    let response: {users: {signIn: unknown}};
    try {
      response = await api.request<{users: {signIn: unknown}}>({
        operationName: 'MetropolisSignIn', query: signInQuery, variables: {user: {email: user.email, password: user.password}}
      }, {authenticated: false});
      gate(g);
    } catch(error) {
      gate(g);
      throw error;
    }
    const envelope = parseCredentialEnvelope(response?.users?.signIn, environment, now());
    if(!envelope) {
      throw new NativeAuthError('invalid_session');
    }
    await commit(g, envelope);
    return envelope;
  };
  const restore: NativeAuthController['restore'] = async () => {
    const g = begin();
    await publish(g);
    await admission(g);
    await available(g);
    const marker = await readCurrent(g, () => storage.readMarker());
    // Any value is a fail-closed marker, including malformed data.
    if(marker !== undefined && marker !== null) {
      if(!await cleanup(g)) {
        throw new NativeAuthError('durable_cleanup');
      }
      return undefined;
    }
    const data = await readCurrent(g, () => storage.read());
    const envelope = parseCredentialEnvelope(data, environment, now());
    if(!envelope) {
      if(data !== undefined && data !== null && !await cleanup(g)) {
        throw new NativeAuthError('durable_cleanup');
      }
      return undefined;
    }
    await publish(g, envelope);
    return envelope;
  };
  const ensureAccessToken: NativeAuthController['ensureAccessToken'] = () => {
    const g = generation;
    gate(g);
    return flight(async () => {
      gate(g);
      const captured = session;
      if(!captured) {
        throw new NativeAuthError('invalid_session');
      }
      const decision = getSessionRefreshDecision({active: true, expiresAt: captured.expires,
        mode: 'milliseconds', now: now(), refreshWindowMs: 300000});
      if(decision === 'healthy') {
        return captured.token;
      }
      if(decision === 'expired') {
        invalidateAccount();
        const suppression = cleanup(g, captured.userId);
        await publish(g);
        if(!await suppression) {
          throw new NativeAuthError('durable_cleanup');
        }
        throw new NativeAuthError('invalid_session');
      }
      try {
        const response = await api.request<{users: {refreshSession: unknown}}>({operationName: 'MetropolisRefresh',
          query: refreshQuery, variables: {token: captured.token}}, {authenticated: false, token: captured.token});
        gate(g, captured.token);
        const renewed = parseCredentialEnvelope(response?.users?.refreshSession, environment, now());
        if(!renewed || renewed.userId !== captured.userId || renewed.sid !== captured.sid ||
          renewed.issued < captured.issued) {
          throw new NativeAuthError('invalid_session');
        }
        await commit(g, renewed, captured.token);
        return renewed.token;
      } catch(error) {
        gate(g);
        if(session?.token === captured.token && isTransient(error) && captured.expires > now()) {
          return captured.token;
        }
        if(session?.token === captured.token) {
          invalidateAccount();
          const suppression = cleanup(g, captured.userId);
          await publish(g);
          if(!await suppression) {
            throw new NativeAuthError('durable_cleanup');
          }
        }
        throw error;
      }
    });
  };
  const signOut: NativeAuthController['signOut'] = async () => {
    const captured = session;
    const g = begin();
    const suppression = cleanup(g, captured?.userId);
    const publication = publish(g).catch((error: unknown) => {
      if(current(g)) {
        throw error;
      }
    });
    const [durability, notification] = await Promise.allSettled([suppression, publication]);
    const durable = durability.status === 'fulfilled' && durability.value;
    let remote: SignOutResult['remote'] = captured ? 'may_remain_active' : 'no_session';
    if(captured) {
      try {
        const response = await api.request<{users: {signOut: boolean}}>({operationName: 'MetropolisSignOut',
          query: signOutQuery, variables: {token: captured.token}}, {authenticated: false, token: captured.token});
        if(response?.users?.signOut === true) {
          remote = 'revoked';
        }
      } catch{
        // Revocation of the captured family is independent of current local visibility.
      }
    }
    if(!durable) {
      throw new NativeAuthError('durable_cleanup');
    }
    if(notification.status === 'rejected') {
      throw notification.reason;
    }
    return {durable, remote};
  };
  let disposal: Promise<void> | undefined;
  const dispose = (): Promise<void> => {
    disposal ??= (async () => {
      try {
        const pending = signOut();
        closing = true;
        await pending;
      } finally {
        disposed = true;
        generation++;
        session = undefined;
        invalidateAccount();
      }
    })();
    return disposal;
  };
  return {dispose, ensureAccessToken, onForeground: ensureAccessToken, restore, signIn, signOut};
};
