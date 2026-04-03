import type {FluxFramework} from '@nlabs/arkhamjs';

export interface ActionRequestOptions {
  readonly cacheTimeout?: number;
}

interface RequestCacheEntry<T = unknown> {
  readonly cacheTimeout: number;
  readonly cacheTimestamp: number;
  readonly data: T;
  readonly payloadKey: string;
}

const REQUEST_CACHE_PATH = 'app.requestCache';

const normalizePayload = (value: unknown): unknown => {
  if(Array.isArray(value)) {
    return value.map(normalizePayload);
  }

  if(value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((result: Record<string, unknown>, key) => {
        result[key] = normalizePayload((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
};

const getPayloadKey = (payload: Record<string, unknown> = {}): string =>
  JSON.stringify(normalizePayload(payload));

const getCachePath = (scope: string): string => `${REQUEST_CACHE_PATH}.${scope}`;

export const getCachedRequest = <T>(
  flux: FluxFramework,
  scope: string,
  payload: Record<string, unknown> = {},
  options: ActionRequestOptions = {}
): T | undefined => {
  const cacheTimeout = Number(options?.cacheTimeout || 0);

  if(cacheTimeout <= 0) {
    return undefined;
  }

  const entry = flux.getState<RequestCacheEntry<T> | undefined>(getCachePath(scope));

  if(!entry) {
    return undefined;
  }

  const payloadKey = getPayloadKey(payload);
  const timeoutMinutes = Number(entry.cacheTimeout || 0);
  const expiresAt = entry.cacheTimestamp + (timeoutMinutes * 60 * 1000);

  if(entry.payloadKey !== payloadKey || Date.now() > expiresAt) {
    return undefined;
  }

  return entry.data;
};

export const setCachedRequest = async <T>(
  flux: FluxFramework,
  scope: string,
  payload: Record<string, unknown> = {},
  data: T,
  options: ActionRequestOptions = {}
): Promise<T> => {
  const cacheTimeout = Number(options?.cacheTimeout || 0);

  if(cacheTimeout <= 0 || typeof flux?.setState !== 'function') {
    return data;
  }

  await flux.setState(getCachePath(scope), {
    cacheTimeout,
    cacheTimestamp: Date.now(),
    data,
    payloadKey: getPayloadKey(payload)
  } as RequestCacheEntry<T>);

  return data;
};

export const clearCachedRequest = async (flux: FluxFramework, scope: string): Promise<void> => {
  if(typeof flux?.setState !== 'function') {
    return;
  }

  await flux.setState(getCachePath(scope), undefined);
};
