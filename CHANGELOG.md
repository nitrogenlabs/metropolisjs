# Changelog

## 1.0.3

- Send the public RUM `analyticsId` to Reaktor in the JSON mutation payload.
- Use `app.rum.analyticsId` as the RUM configuration field.
- Require explicit action selection when using `useMetropolis(actionTypes)`.
- Require hooks to run within the `<Metropolis>` context.
- Remove obsolete parser aliases, action aliases, and response handling.
