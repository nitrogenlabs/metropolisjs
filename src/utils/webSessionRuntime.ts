import {FluxFramework} from '@nlabs/arkhamjs';
import {BrowserStorage} from '@nlabs/arkhamjs-storage-browser';

import {webSessionSuppression} from '../stores/webSessionStore.js';

import type {HunterOptionsType} from '@nlabs/rip-hunter';
import type {WebSessionEndReason, WebSessionIdentity, WebSessionScope} from '../session/webSessionPolicy.js';

export interface WebSessionOptions {
  readonly endpoints: {
    readonly activity: string;
    readonly restore: string;
    readonly signIn: string;
    readonly signOut: string;
  };
  readonly onBeforeSessionClear?: (
    reason: WebSessionEndReason, previous: WebSessionIdentity, scope: WebSessionScope
  ) => void;
  readonly scope: WebSessionScope;
}

export interface WebSessionActions {
  dispose(): void;
  ensureSession(): Promise<WebSessionIdentity>;
  recordActivity(): Promise<WebSessionIdentity>;
  restore(): Promise<WebSessionIdentity | undefined>;
  signIn(user: {readonly email: string; readonly password: string}): Promise<WebSessionIdentity>;
  signOut(): Promise<{readonly remote: 'revoked' | 'unknown'}>;
}

export interface WebSessionRuntime {
  readonly acquire: () => () => void;
  readonly actions: WebSessionActions;
  readonly generation: () => number;
  readonly isAuthenticated: () => boolean;
  readonly options: WebSessionOptions;
  readonly rejectSession: () => Promise<void>;
}

const bindings = new WeakMap<FluxFramework, WebSessionRuntime>();
// Cookie writers outlive a disposed UI binding, but never the owning Flux.
// Only the settled tail is retained: no identity, credentials, or callbacks.
const mutationTails = new WeakMap<FluxFramework, Promise<unknown>>();
export const mutateWebSession = (flux: FluxFramework, operation: () => Promise<unknown>): Promise<unknown> => {
  const result = (mutationTails.get(flux) ?? Promise.resolve()).then(operation);
  mutationTails.set(flux, result.then(() => undefined, () => undefined));
  return result;
};
export const getWebSessionRuntime = (flux: FluxFramework): WebSessionRuntime | undefined => bindings.get(flux);
export const bindWebSessionRuntime = (flux: FluxFramework, runtime: WebSessionRuntime): void => {
  bindings.set(flux, runtime);
};
export const removeWebSessionRuntime = (flux: FluxFramework, runtime: WebSessionRuntime): void => {
  if(bindings.get(flux) === runtime) {
    bindings.delete(flux);
  }
};

/** Capture configuration once. URL authority comes from the browser, never input. */
export const captureWebSessionOptions = (options: WebSessionOptions): WebSessionOptions => {
  const scope = options?.scope;
  if(!scope || [scope.appId, scope.environment, scope.ownerUserId].some((value) =>
    typeof value !== 'string' || !value.trim() || value.length > 256)
    || (options.onBeforeSessionClear !== undefined && typeof options.onBeforeSessionClear !== 'function')) {
    throw new Error('web_session_configuration');
  }
  const {endpoints} = options;
  for(const endpoint of [endpoints?.activity, endpoints?.restore, endpoints?.signIn, endpoints?.signOut]) {
    assertWebSessionEndpoint(endpoint);
  }
  return Object.freeze({
    endpoints: Object.freeze({...endpoints}),
    ...(options.onBeforeSessionClear ? {onBeforeSessionClear: options.onBeforeSessionClear} : {}),
    scope: Object.freeze({appId: scope.appId, environment: scope.environment, ownerUserId: scope.ownerUserId})
  });
};

export const assertWebSessionEndpoint = (endpoint: string): void => {
  try {
    const base = globalThis.window.location;
    const url = new URL(endpoint, base.href);
    if(typeof endpoint !== 'string' || !endpoint.trim() || (!endpoint.startsWith('/') && !/^https?:\/\//i.test(endpoint))
      || !['http:', 'https:'].includes(url.protocol)
      || url.origin !== base.origin || url.username || url.password || url.hash) {
      throw new Error();
    }
  } catch{
    throw new Error('web_session_configuration');
  }
};

export const sameWebSessionOptions = (left: WebSessionOptions, right: WebSessionOptions): boolean =>
  left.scope.appId === right.scope.appId && left.scope.environment === right.scope.environment
  && left.scope.ownerUserId === right.scope.ownerUserId
  && left.onBeforeSessionClear === right.onBeforeSessionClear
  && (Object.keys(left.endpoints) as Array<keyof WebSessionOptions['endpoints']>)
    .every((key) => left.endpoints[key] === right.endpoints[key]);

/** Overwrite credential policy, preserving unrelated caller headers only. */
export const webSessionRequestOptions = (
  url: string, method: string, options: HunterOptionsType = {}
): HunterOptionsType => {
  assertWebSessionEndpoint(url);
  const headers = new Headers(options.headers);
  for(const name of ['Authorization', 'Origin', 'Referer', 'Sec-Fetch-Site', 'Cookie']) {
    headers.delete(name);
  }
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if(method !== 'GET' && method !== 'HEAD') {
    headers.set('X-Reaktor-CSRF', '1');
  } else {
    headers.delete('X-Reaktor-CSRF');
  }
  const {token: _token, ...rest} = options;
  return {...rest, cache: false, credentials: 'same-origin', headers, throwHttpErrors: true};
};

/** Known synchronous browser adapter, zero debounce, nonexpiring marker-only state. */
export const createWebSessionMarker = (scope: WebSessionScope) => {
  const flux = new FluxFramework();
  const prefix = `metropolis.web-session.${encodeURIComponent(JSON.stringify([scope.appId, scope.environment, scope.ownerUserId]))}.`;
  const storage = new BrowserStorage({compression: false, prefix, ttl: 0, type: 'local'});
  let ready: Promise<FluxFramework> | undefined;
  const initialize = (): Promise<FluxFramework> => {
    ready ??= flux.init({
      name: 'suppression', storage: {
        getStorageData: async (key) => {
          const saved: unknown = await storage.getStorageData(key);
          if(saved === null || saved === undefined) {
            return undefined;
          }
          const marker = saved as {webSessionSuppression?: {suppressed?: unknown}};
          return {webSessionSuppression: {suppressed: marker?.webSessionSuppression?.suppressed !== false}};
        },
        setStorageData: async (key, value) => {
          if(await storage.setStorageData(key, value) !== true) {
            throw new Error('marker_persistence');
          }
          return true;
        }
      },
      storageWait: 0, stores: [webSessionSuppression]
    });
    return ready;
  };
  const write = async (suppressed: boolean): Promise<void> => {
    try {
      await initialize();
      if(await flux.setState('webSessionSuppression', {suppressed}) !== true) {
        throw new Error();
      }
    } catch{
      throw new Error('marker_persistence');
    }
  };
  return {
    read: async (): Promise<boolean> => {
      try {
        await initialize();
      } catch{
        throw new Error('marker_persistence');
      }
      // Any malformed nonempty record suppresses admission too.
      return flux.getState('webSessionSuppression.suppressed', false) !== false;
    },
    write
  };
};
