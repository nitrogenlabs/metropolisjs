# Shared session refresh

The `@nlabs/metropolisjs/session` public entry is platform-neutral. It imports no React, DOM event bindings, Flux store initialization, or transport runtime. Use it for session decisions and a refresh lock; supply platform lifecycle events, storage, domain refresh actions, and failure handling from the app.

```ts
import {createSingleFlight, getSessionRefreshDecision} from '@nlabs/metropolisjs/session';

const runRefresh = createSingleFlight();

const checkSession = (expiresAt: number | null, now = Date.now()): Promise<void> =>
  runRefresh(async () => {
    const decision = getSessionRefreshDecision({
      active: true,
      expiresAt,
      mode: 'milliseconds',
      now,
      refreshWindowMs: 600_000
    });
    // Handle missing/invalid/expired/due/healthy states with the app's own actions.
  });
```

Use `mode: 'roundedMinutes'` for callers that intentionally round the remaining time; use `mode: 'milliseconds'` for exact thresholds. Expiry at `now` is expired. Inactive sessions are classified before expiry, null/undefined expiry is missing, and nonfinite expiry is invalid. No signout, refresh request, retry, or storage write occurs inside the decision helper.

`shouldRefreshSession(session, config, now?)` preserves the existing Metropolis-shaped foreground policy: JWT expiry affects validity; raw stored expiry/lifetime determine the rounded refresh window. It intentionally does not consult `autoRefresh`. Authenticated request handling retains its own `autoRefresh` and positive-remaining-minute conditions.

`createSingleFlight<T = void>()` returns a function that coalesces overlapping calls to the same promise, invokes only the first callback, and releases after success or failure. Instances belong to one authentication context. Capture any session snapshot synchronously at the call site when moving an existing operation behind its promise boundary. Failures reject; the caller decides whether to retain valid state or sign out.

Existing `utils` exports for normalization, JWT parsing, validity, and refresh-window calculation remain available. The legacy `utils.isValidSession(session)` keeps its one-argument semantics, including array callback use. The lean entry's `isValidSession(session, now?)` supports explicit-clock decisions.

Phantaze keeps DOM events, its 30-second throttle, and valid-session retention on refresh network failure. Pulsify keeps AppState events, SecureStore credentials, demo renewal, snapshot checks, signout on refresh failure, and product reconciliation. Pulsify production renewal is still unfinished; this shared entry does not supply that missing request.

This implementation is validated as an unpublished 1.7.0 candidate. Consumers use repository-relative archives with manifest/lockfile integrity verification until a registry release is authorized.
