# Generation actions, bearer sessions, and events

Use the existing factories from `@nlabs/metropolisjs`. They share Metropolis configuration, Rip-Hunter transport, and ArkhamJS state/event behavior.

| Factory method | Providers | Reaktor GraphQL mutation | State before success event |
| --- | --- | --- | --- |
| `createContentActions(flux).generateContent` | `claude`, `gemini`, `openai` | `contents.generateContent` | `content.generation` |
| `createImageActions(flux).generateImage` | `gemini`, `higgsfield`, `openai` | `images.generateImage` | `image.generation` |
| `createVideoActions(flux).generateVideo` | `gemini`, `higgsfield` | `videos.generateVideo` | `video.generation` |

Select a provider explicitly in the input or supported factory configuration. There is no implicit provider, and explicit input overrides factory configuration. Keys and provider-specific HTTP calls belong in Reaktor on the server.

```ts
import {createContentActions, createImageActions, createVideoActions} from '@nlabs/metropolisjs';

await createContentActions(flux).generateContent({prompt: 'Write a scene', provider: 'claude'});
await createImageActions(flux).generateImage({prompt: 'A paper moon', provider: 'openai'});
await createVideoActions(flux).generateVideo({
  aspectRatio: '16:9', duration: 8, prompt: 'Clouds above a quiet ocean',
  provider: 'gemini', resolution: '720p'
});
```

A successful queued result means the server accepted the request; completion arrives later through the application's job/event flow. Gemini's initial media support is text-to-image and text-to-video. Veo accepts 4/6/8 seconds and 720p/1080p (1080p requires 8 seconds). Higgsfield supports image/reference-to-video. Server validation is authoritative.

## Durable application transport

Each method accepts `{transport}` as its second argument. The callback receives the complete application input, including provider and application-specific idempotency fields, and returns its job result. Use it to route to an authorized durable job endpoint instead of immediate provider submission. Keep the same request key for explicit retries; the server must enforce ownership, concurrent idempotency, credits, and reconciliation.

Default generation requests disable offline replay. Custom transports should also set `queueOffline: false` when using the Metropolis API/REST helpers. Reconnection must refresh state rather than replay a paid request.

## ArkhamJS lifecycle

Successful results are stored before `CONTENT_GENERATION_CONSTANTS.SUCCESS`, `IMAGE_GENERATE_SUCCESS`, or `VIDEO_GENERATE_SUCCESS` is dispatched. Errors dispatch the matching error event. Subscribe to these events using the application's existing Flux listeners; read persistent state from Flux and event-specific payload from the event. Several listeners can observe the same result. Do not assume a success event means an asynchronous provider job has completed.

## Bearer sessions and WebSockets

Use the existing `storeSession` and `clearPersistedSession` helpers for Flux session state. For opaque, nonrenewable server sessions, configure `app.session.autoRefresh: false` to avoid invoking JWT refresh behavior. Configure Arkham storage according to the application's session policy; Reactorbox uses session storage and clears it on sign-out.

```ts
const sockets = createWebsocketActions(flux, {
  authenticateMessage: (token) => ({token}),
  authentication: 'message',
  url: 'wss://api.example.com/events'
});
```

Import `createWebsocketActions` from the package root. Match `authenticateMessage` to the server's first-frame protocol. Message authentication omits tokens from the URL; query authentication remains the compatibility default for existing integrations. A policy close (1008) stops reconnection and dispatches the close code. Use the existing socket events to refresh an account-scoped snapshot after committed server changes and after reconnecting.

The client does not implement server revocation or private-media authorization. Reaktor supplies opaque-token, media-grant, and Node realtime primitives; applications wire those to their own session store and ownership checks.

## Release policy

Use only plain `major.minor.patch` versions. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`, then inspect the package contents before publishing. The `publish:*` scripts push Git branches/tags; an audited tarball can be published directly without pushing unrelated working-tree changes.
