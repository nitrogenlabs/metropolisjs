/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {rumRequest} from '../../utils/api.js';

import type {FluxFramework} from '@nlabs/arkhamjs';

export const AWS_RUM_CONSTANTS = {
  TRACK_ERROR: 'AWS_RUM_TRACK_ERROR',
  TRACK_QUEUED: 'AWS_RUM_TRACK_QUEUED',
  TRACK_SUCCESS: 'AWS_RUM_TRACK_SUCCESS'
} as const;

export type AwsRumEventType = 'click' | 'page_view' | (string & {});
export type AwsRumProperty = boolean | number | string;

export interface AwsRumTrackInput {
  readonly name: string;
  readonly path?: string;
  readonly properties?: Record<string, AwsRumProperty>;
  readonly type: AwsRumEventType;
}

export interface AwsRumEvent extends AwsRumTrackInput {
  readonly eventId: string;
  readonly journeyId: string;
  readonly sequence: number;
  readonly timestamp: number;
}

export interface AwsRumActionsOptions {
  readonly analyticsId?: string;
  readonly debounceMs?: number;
  readonly dedupeMs?: number;
  readonly enabled?: boolean;
  readonly respectPrivacySignals?: boolean;
  readonly throttleMs?: number;
}

export interface AwsRumActions {
  readonly destroy: () => Promise<void>;
  readonly flush: () => Promise<void>;
  readonly track: (event: AwsRumTrackInput) => void;
}

const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_DEDUPE_MS = 1000;
const DEFAULT_THROTTLE_MS = 1000;
const MAX_BATCH_SIZE = 50;
const MAX_PROPERTIES = 20;
const MAX_SEEN_EVENTS = 500;
const BLOCKED_PROPERTY_KEYS = new Set([
  'accountid',
  'address',
  'email',
  'firstname',
  'fullname',
  'geolocation',
  'ip',
  'ipaddress',
  'lastname',
  'latitude',
  'longitude',
  'name',
  'phone',
  'referrer',
  'token',
  'useragent',
  'userid'
]);
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;

interface PrivacyNavigator extends Navigator {
  readonly globalPrivacyControl?: boolean;
}

const createId = (): string => {
  if(typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const normalizeText = (value: unknown, maxLength: number): string =>
  String(value || '').trim().slice(0, maxLength);

const normalizePropertyKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const sanitizeProperties = (
  properties: Record<string, AwsRumProperty> = {}
): Record<string, AwsRumProperty> => Object.entries(properties)
  .slice(0, MAX_PROPERTIES)
  .reduce<Record<string, AwsRumProperty>>((result, [key, value]) => {
    const propertyKey = normalizeText(key, 64);
    const normalizedPropertyKey = normalizePropertyKey(propertyKey);

    if(
      !propertyKey ||
      BLOCKED_PROPERTY_KEYS.has(normalizedPropertyKey) ||
      !['boolean', 'number', 'string'].includes(typeof value)
    ) {
      return result;
    }

    if(typeof value === 'string') {
      const textValue = normalizeText(value, 256);

      if(textValue && !EMAIL_PATTERN.test(textValue)) {
        result[propertyKey] = textValue;
      }
    } else if(typeof value === 'boolean' || Number.isFinite(value)) {
      result[propertyKey] = value;
    }

    return result;
  }, {});

const sanitizeEvent = (event: AwsRumTrackInput): AwsRumTrackInput | null => {
  const name = normalizeText(event.name, 128);
  const type = normalizeText(event.type, 64);

  if(!name || !type) {
    return null;
  }

  const path = normalizeText(event.path, 256).split('?')[0].split('#')[0];

  return {
    name,
    ...(path ? {path} : {}),
    properties: sanitizeProperties(event.properties),
    type
  };
};

const eventFingerprint = (event: AwsRumTrackInput): string => {
  const properties = Object.entries(event.properties || {}).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([event.type, event.name, event.path || '', properties]);
};

export const createAwsRumActions = (
  flux: FluxFramework,
  options: AwsRumActionsOptions = {}
): AwsRumActions => {
  const analyticsId = normalizeText(options.analyticsId, 128);
  const debounceMs = Math.max(0, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  const dedupeMs = Math.max(0, options.dedupeMs ?? DEFAULT_DEDUPE_MS);
  const enabled = options.enabled !== false;
  const respectPrivacySignals = options.respectPrivacySignals !== false;
  const throttleMs = Math.max(0, options.throttleMs ?? DEFAULT_THROTTLE_MS);
  const journeyId = createId();
  const pendingEvents = new Map<string, AwsRumEvent>();
  const seenEvents = new Map<string, number>();
  let flushPromise: Promise<void> | undefined;
  let lastFlushAt = 0;
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const hasPrivacySignal = (): boolean => {
    if(!respectPrivacySignals || typeof globalThis.navigator === 'undefined') {
      return false;
    }

    const navigatorState = globalThis.navigator as PrivacyNavigator;

    return navigatorState.doNotTrack === '1' || navigatorState.globalPrivacyControl === true;
  };

  const pruneSeenEvents = (): void => {
    if(seenEvents.size <= MAX_SEEN_EVENTS) {
      return;
    }

    const cutoff = Date.now() - dedupeMs;
    seenEvents.forEach((timestamp, fingerprint) => {
      if(timestamp < cutoff) {
        seenEvents.delete(fingerprint);
      }
    });

    while(seenEvents.size > MAX_SEEN_EVENTS) {
      const oldestFingerprint = seenEvents.keys().next().value;

      if(!oldestFingerprint) {
        break;
      }

      seenEvents.delete(oldestFingerprint);
    }
  };

  const flush = async (): Promise<void> => {
    if(flushPromise) {
      return flushPromise;
    }

    if(!enabled || !analyticsId || hasPrivacySignal() || pendingEvents.size === 0) {
      return;
    }

    if(timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    const events = [...pendingEvents.values()];
    pendingEvents.clear();
    lastFlushAt = Date.now();

    flushPromise = (async () => {
      for(let index = 0; index < events.length; index += MAX_BATCH_SIZE) {
        const batchEvents = events.slice(index, index + MAX_BATCH_SIZE);

        try {
          await rumRequest(flux, {analyticsId, events: batchEvents});
          await flux.dispatch({analyticsId, events: batchEvents, type: AWS_RUM_CONSTANTS.TRACK_SUCCESS});
        } catch(error) {
          events.slice(index).forEach((event) => pendingEvents.set(eventFingerprint(event), event));
          await flux.dispatch({analyticsId, error, events: batchEvents, type: AWS_RUM_CONSTANTS.TRACK_ERROR});
          return;
        }
      }
    })()
      .finally(() => {
        flushPromise = undefined;
      });

    return flushPromise;
  };

  const scheduleFlush = (): void => {
    if(timer) {
      clearTimeout(timer);
    }

    const throttleRemaining = Math.max(0, throttleMs - (Date.now() - lastFlushAt));
    timer = setTimeout(() => void flush(), Math.max(debounceMs, throttleRemaining));
  };

  const track = (input: AwsRumTrackInput): void => {
    if(!enabled || !analyticsId || hasPrivacySignal()) {
      return;
    }

    const event = sanitizeEvent(input);

    if(!event) {
      return;
    }

    const fingerprint = eventFingerprint(event);
    const now = Date.now();
    const lastSeenAt = seenEvents.get(fingerprint) || 0;

    if(seenEvents.has(fingerprint) && now - lastSeenAt < dedupeMs) {
      return;
    }

    seenEvents.set(fingerprint, now);
    pruneSeenEvents();
    sequence += 1;

    const queuedEvent: AwsRumEvent = {
      ...event,
      eventId: createId(),
      journeyId,
      sequence,
      timestamp: now
    };

    pendingEvents.set(fingerprint, queuedEvent);
    void flux.dispatch({analyticsId, event: queuedEvent, type: AWS_RUM_CONSTANTS.TRACK_QUEUED});
    scheduleFlush();
  };

  const destroy = async (): Promise<void> => {
    if(timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    await flush();
    seenEvents.clear();
  };

  return {destroy, flush, track};
};
