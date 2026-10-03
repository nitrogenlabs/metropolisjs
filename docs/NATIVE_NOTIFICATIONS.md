# Native notifications

Core: `@nlabs/metropolisjs/native-notifications`. Optional injected Expo adapter:
`@nlabs/metropolisjs/native-notifications/expo`. Neither entry imports Expo or RN.
The app passes `import * as Notifications from 'expo-notifications'` and
`Platform.OS` to `createExpoNativeNotificationAdapter`. Supported native transport
is APNs on iOS and FCM on Android, not Expo's hosted push tokens.

See `examples/native-notifications.ts` for a typed setup. Add the notification and
native lifecycle stores once, then start after authenticated app startup. Permission
checks never prompt; `requestPermission()` is an explicit user action. Configure
`setNotificationHandler` in the app, not in the library. Do not schedule a second
local OS notification for an incoming remote push.

Persist a cryptographically random installation ID using the app's secure storage.
Keep it across token rotation and login; reset it on a fresh install. Some iOS
keychain values survive reinstall: choose an app-install marker if a fresh ID is
required. Do not use an account ID or raw token as the installation ID.

Stop before clearing/replacing credentials when using the default actions. For
overlapping accounts, supply `actionsForBinding`, capturing each old account's
authorization. The backend revision prevents a delayed unregister disabling a
new binding. Offline logout still clears local state; backend session revocation
is the delivery safety net. Never retain a token in offline retry queues.

Listen to `NATIVE_NOTIFICATION_CONSTANTS.RECEIVED` and `.OPENED`. Inbox state is
updated first. Receipt dedup and opened dedup are separate (500 IDs / 24 hours).
WebSocket `notification.created` frames carry `data.envelope` and use the same
ingress. Scoped envelope recipient, app and environment must match the active
binding. Legacy unscoped WebSocket notifications keep existing behavior.
Opened events are requests to resolve a target, not authorization to navigate:
recheck chat/Pulse access and fall back to the authorized inbox if unavailable.

Native push is best-effort, not authoritative chat history. Reconnect/resume must
backfill from the app API. SNS acceptance does not prove device receipt/display.
No durable outbox, guaranteed delivery, scheduled campaigns or unlimited retries
are provided. Apps can add an outbox around the shared backend service.

## Another app and rollout

Use its own bundle/package IDs, database, appId/environment and SNS platform
applications. Reaktor receives trusted server scope and a live session verifier;
clients never choose user/session identity or endpoint ARNs. Supply APNs sandbox
or production credentials matching the signed iOS entitlement, and FCM v1 service
account credentials only to AWS/backend secrets. No Firebase auth/database is used.
Configure Android Google services and the Expo notification plugin in the app.
Use Android channel `messages` consistently if overriding the default channel.

IAM must allow SNS CreatePlatformEndpoint/GetEndpointAttributes/SetEndpointAttributes
and Publish only for the configured platform applications/endpoints. Apply
`migrateNativePushRegistry` explicitly before enabling registration. Legacy device
rows are not trusted; users re-register through authentication. Rollback disables
the feature/mutation without deleting inbox data; old APIs remain available.

Reference: [Expo notification APIs](https://docs.expo.dev/versions/latest/sdk/notifications/).
Run tests and the provider-neutral Playwright harness before rollout. Then signed
physical iOS and Android builds must verify foreground/background/terminated taps,
denied/granted permissions, token rotation, offline logout and account switching.
Simulated tests/bundles do not establish live push readiness. Credentials, cloud
provisioning, deployment and publication need separate authorization.
