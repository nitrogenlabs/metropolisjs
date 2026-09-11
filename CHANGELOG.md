# Changelog

## Unreleased

- Register missing stores on each Flux instance instead of trusting a persisted initialization flag.
- Deeply ingest partial records before success notifications; support explicit replacement, null clearing, and authoritative list membership.
- Resolve memoized entities from current cache records and keep image/video query lists separate.
- Keep the signed-in session isolated from other users' records and synchronize token aliases.
- Preserve valid credentials on temporary refresh failures; clear account caches on logout/expiry while retaining app configuration.
- Reject delayed requests, refreshes, and uploads from previous logins.
- Await session persistence in user actions and dispatch reactions through the injected Flux instance.
- Requires the companion ArkhamJS cache fixes for consistent reads, React snapshots, and awaited immediate storage writes.

## 1.0.7

- Flush pending RUM analytics with the Beacon API when a page is hidden or unloaded.
- Fall back to the normal unauthenticated RUM request when beacon delivery is unavailable or declined.
- Expose `flush({useBeacon: true})` and `rumBeaconRequest(...)` for explicit terminal delivery.
- Document RUM endpoint configuration, beacon lifecycle behavior, fallback semantics, and `useAwsRum()` usage.

## 1.0.3

- Send the public RUM `analyticsId` to Reaktor in the JSON mutation payload.
- Use `app.rum.analyticsId` as the RUM configuration field.
- Require explicit action selection when using `useMetropolis(actionTypes)`.
- Require hooks to run within the `<Metropolis>` context.
- Remove obsolete parser aliases, action aliases, and response handling.
