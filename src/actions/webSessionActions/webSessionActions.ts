import {httpRequest} from '@nlabs/rip-hunter/http';

import {observeWebSession, webSessionNeedsVerification} from '../../session/webSessionPolicy.js';
import {APP_CONSTANTS} from '../../stores/appStore.js';
import {USER_CONSTANTS} from '../../stores/userStore.js';
import {WEB_SESSION_CONSTANTS, webSession} from '../../stores/webSessionStore.js';
import {
  bindWebSessionRuntime, captureWebSessionOptions, createWebSessionMarker, getWebSessionRuntime,
  mutateWebSession, removeWebSessionRuntime, sameWebSessionOptions, webSessionRequestOptions
} from '../../utils/webSessionRuntime.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {WebSessionEndReason, WebSessionIdentity, WebSessionObservation} from '../../session/webSessionPolicy.js';
import type {WebSessionActions, WebSessionOptions, WebSessionRuntime} from '../../utils/webSessionRuntime.js';

export type {WebSessionEndReason, WebSessionIdentity, WebSessionScope} from '../../session/webSessionPolicy.js';
export type {WebSessionActions, WebSessionOptions} from '../../utils/webSessionRuntime.js';

const denied = (error: unknown): boolean => {
  const value = error as {errors?: string[]; message?: string; status?: number};
  return value?.status === 401 || value?.status === 400 || value?.status === 403 || value?.status === 405
    || value?.message === 'invalid_session' || value?.errors?.some((code) => ['invalid_session', 'expired_session'].includes(code)) === true;
};

export const createWebSessionActions = (flux: FluxFramework, input: WebSessionOptions): WebSessionActions => {
  const options = captureWebSessionOptions(input);
  const existing = getWebSessionRuntime(flux);
  if(existing) {
    if(!sameWebSessionOptions(existing.options, options)) {
      throw new Error('web_session_configuration');
    }
    return existing.actions;
  }
  const marker = createWebSessionMarker(options.scope);
  let generation = 0;
  let disposed = false;
  let paused = false;
  let leases = 0;
  let leaseRevision = 0;
  let suppressed = false;
  let blocked = false;
  let needsVerification = false;
  let observation: WebSessionObservation | undefined;
  let restoreFlight: Promise<WebSessionIdentity | undefined> | undefined;
  let activityFlight: Promise<WebSessionIdentity> | undefined;
  let activityPending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const storesReady = flux.getStore(webSession.name) ? Promise.resolve() : flux.addStores([webSession]);
  const gate = (captured: number): void => {
    if(disposed || paused || generation !== captured) {
      throw new Error(disposed || paused ? 'web_session_disposed' : 'web_session_stale');
    }
  };
  const clearTimer = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };
  const advanceGeneration = (): number => {
    generation++;
    restoreFlight = undefined;
    activityFlight = undefined;
    activityPending = false;
    return generation;
  };
  const publish = async (captured: number, status: 'anonymous' | 'authenticated' | 'blocked'): Promise<void> => {
    await storesReady;
    gate(captured);
    await flux.setState('webSession', {
      generation: captured, ...(observation ? {identity: observation.identity} : {}), scope: options.scope, status
    });
    gate(captured);
  };
  const clear = async (reason: WebSessionEndReason): Promise<boolean> => {
    const previous = observation?.identity;
    observation = undefined;
    blocked = true;
    clearTimer();
    let preservationFailed = false;
    if(previous) {
      try {
        options.onBeforeSessionClear?.(reason, previous, options.scope);
      } catch{
        preservationFailed = true;
      }
    }
    await flux.dispatch({session: {}, type: USER_CONSTANTS.SIGN_OUT_SUCCESS});
    return preservationFailed;
  };
  const invalidate = async (reason: WebSessionEndReason): Promise<void> => {
    const captured = advanceGeneration();
    const failed = await clear(reason);
    await publish(captured, 'anonymous');
    await flux.dispatch({reason, scope: options.scope, type: WEB_SESSION_CONSTANTS.SIGNED_OUT});
    if(failed) {
      throw new Error('preservation_failed');
    }
  };
  const request = async (endpoint: string, method: 'GET' | 'POST', params?: unknown): Promise<unknown> => {
    if(flux.getState('app.networkType') === 'none') {
      throw new Error('network_unavailable');
    }
    const {headers} = webSessionRequestOptions(endpoint, method);
    // This browser-only API requires native fetch cancellation semantics. The
    // public transport aborts request/body at 30s; cancellation is not rollback.
    const requestOptions = {
      cache: 'no-store' as const, credentials: 'same-origin' as const, headers, method, timeout: 30_000
    };
    const value = await httpRequest(endpoint, method === 'POST' ? {...requestOptions, json: params} : requestOptions,
      async (response) => {
        if(!response.ok) {
          throw {status: response.status};
        }
        return response.json();
      });
    await flux.dispatch({type: APP_CONSTANTS.API_NETWORK_SUCCESS});
    return value;
  };
  const mutate = (operation: () => Promise<unknown>): Promise<unknown> => mutateWebSession(flux, operation);
  const accept = async (
    value: unknown, captured: number, started: number, signingIn = false
  ): Promise<WebSessionIdentity> => {
    gate(captured);
    const next = observeWebSession(value, options.scope.ownerUserId, started, performance.now(),
      signingIn ? undefined : observation);
    if(!observation) {
      await flux.dispatch({session: {}, type: USER_CONSTANTS.SIGN_OUT_SUCCESS});
      gate(captured);
    }
    if(signingIn) {
      await marker.write(false);
      gate(captured);
      suppressed = false;
    }
    observation = next;
    blocked = false;
    needsVerification = false;
    await publish(captured, 'authenticated');
    gate(captured);
    clearTimer();
    timer = setTimeout(() => {
      needsVerification = true;
      void restore().catch(() => {});
    }, Math.max(0, next.deadline - performance.now()));
    await flux.dispatch({identity: next.identity, scope: options.scope, type: WEB_SESSION_CONSTANTS.AUTHENTICATED});
    gate(captured);
    return next.identity;
  };
  const restore: WebSessionActions['restore'] = () => {
    const captured = generation;
    gate(captured);
    if(restoreFlight) {
      return restoreFlight;
    }
    const operation = (async () => {
      if(suppressed || await marker.read()) {
        gate(captured);
        suppressed = true;
        blocked = true;
        await publish(captured, 'anonymous');
        return undefined;
      }
      gate(captured);
      const started = performance.now();
      try {
        const value = await request(options.endpoints.restore, 'GET');
        gate(captured);
        // A later accepted activity must not be undone by an older read.
        if(observation && typeof value === 'object' && value && 'observedAt' in value
          && typeof value.observedAt === 'number' && value.observedAt < observation.identity.observedAt) {
          throw new Error('web_session_stale');
        }
        return await accept(value, captured, started);
      } catch(error) {
        gate(captured);
        if((error as Error)?.message === 'web_session_stale') {
          throw error;
        }
        if(denied(error)) {
          await invalidate(needsVerification ? 'expired' : 'rejected');
          return undefined;
        }
        blocked = true;
        needsVerification = false;
        await publish(captured, 'blocked');
        await flux.dispatch({scope: options.scope, type: WEB_SESSION_CONSTANTS.BLOCKED});
        gate(captured);
        throw new Error('web_session_unavailable');
      }
    })();
    restoreFlight = operation;
    void operation.finally(() => {
      if(restoreFlight === operation) {
        restoreFlight = undefined;
      }
    }).catch(() => {});
    return operation;
  };
  const ensureSession: WebSessionActions['ensureSession'] = async () => {
    gate(generation);
    if(suppressed) {
      throw new Error('invalid_session');
    }
    if(!observation || webSessionNeedsVerification(observation.deadline, performance.now(), needsVerification)) {
      if(blocked && !needsVerification) {
        throw new Error('invalid_session');
      }
      const restored = await restore();
      if(!restored) {
        throw new Error('invalid_session');
      }
    }
    if(blocked || !observation) {
      throw new Error('invalid_session');
    }
    return observation.identity;
  };
  const recordActivity: WebSessionActions['recordActivity'] = () => {
    const captured = generation;
    gate(captured);
    activityPending = true;
    if(activityFlight) {
      return activityFlight;
    }
    const operation = (async () => {
      let result: WebSessionIdentity;
      // A subsequent real input needs a new server touch after the current one.
      /* eslint-disable no-await-in-loop */
      do {
        activityPending = false;
        await ensureSession();
        gate(captured);
        let started = 0;
        try {
          const value = await mutate(() => {
            gate(captured);
            started = performance.now();
            return request(options.endpoints.activity, 'POST', {});
          });
          gate(captured);
          const accepted = observeWebSession(value, options.scope.ownerUserId, started, performance.now());
          if(observation && accepted.identity.sid === observation.identity.sid
            && accepted.identity.observedAt < observation.identity.observedAt) {
            // The explicit touch succeeded, but its older metadata cannot replace
            // a newer same-session read, deadline, or private cache admission.
            result = accepted.identity;
          } else {
            result = await accept(value, captured, started);
          }
        } catch(error) {
          gate(captured);
          if(denied(error)) {
            await invalidate('rejected');
          }
          throw new Error('invalid_session');
        }
      } while(activityPending);
      /* eslint-enable no-await-in-loop */
      return result;
    })();
    activityFlight = operation;
    void operation.finally(() => {
      if(activityFlight === operation) {
        activityFlight = undefined;
      }
    }).catch(() => {});
    return operation;
  };
  const signIn: WebSessionActions['signIn'] = async (user) => {
    gate(generation);
    const captured = advanceGeneration();
    const failed = await clear('replaced');
    await publish(captured, 'anonymous');
    if(failed) {
      throw new Error('preservation_failed');
    }
    let started = 0;
    const value = await mutate(() => {
      gate(captured);
      started = performance.now();
      return request(options.endpoints.signIn, 'POST', {email: user.email, password: user.password});
    });
    gate(captured);
    return accept(value, captured, started, true);
  };
  const signOut: WebSessionActions['signOut'] = async () => {
    gate(generation);
    const captured = advanceGeneration();
    suppressed = true;
    const cleanup = clear('signout');
    const persistence = marker.write(true).then(() => true, () => false);
    const remote = mutate(() => {
      gate(captured);
      return request(options.endpoints.signOut, 'POST', {});
    }).then((value) =>
      ((value as {authenticated?: unknown})?.authenticated === false ? 'revoked' as const : 'unknown' as const), () => 'unknown' as const);
    const preservationFailed = await cleanup;
    await publish(captured, 'anonymous');
    const durable = await persistence;
    const result = await remote;
    gate(captured);
    if(!durable) {
      throw new Error('marker_persistence');
    }
    await flux.dispatch({remote: result, scope: options.scope, type: WEB_SESSION_CONSTANTS.SIGNED_OUT});
    if(preservationFailed) {
      throw new Error('preservation_failed');
    }
    return {remote: result};
  };
  const resume = (): void => {
    needsVerification = true;
    void restore().catch(() => {});
  };
  const visibility = (): void => {
    if(document.visibilityState === 'visible') {
      resume();
    }
  };
  window.addEventListener('focus', resume);
  window.addEventListener('pageshow', resume);
  document.addEventListener('visibilitychange', visibility);
  const dispose = (): void => {
    if(disposed) {
      return;
    }
    disposed = true;
    generation++;
    clearTimer();
    window.removeEventListener('focus', resume);
    window.removeEventListener('pageshow', resume);
    document.removeEventListener('visibilitychange', visibility);
    removeWebSessionRuntime(flux, runtime);
  };
  const actions: WebSessionActions = {dispose, ensureSession, recordActivity, restore, signIn, signOut};
  const runtime: WebSessionRuntime = {
    acquire: () => {
      paused = false;
      leases++;
      leaseRevision++;
      return () => {
        leases--;
        if(leases === 0) {
          paused = true;
          const revision = ++leaseRevision;
          void Promise.resolve().then(() => {
            if(leaseRevision === revision) {
              dispose();
            }
          });
        }
      };
    },
    actions, generation: () => generation,
    isAuthenticated: () => !disposed && !paused && !blocked && !suppressed && !!observation
      && !webSessionNeedsVerification(observation.deadline, performance.now(), needsVerification),
    options, rejectSession: () => invalidate('rejected')
  };
  bindWebSessionRuntime(flux, runtime);
  return actions;
};
