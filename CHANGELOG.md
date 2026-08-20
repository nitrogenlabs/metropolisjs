# Changelog

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
