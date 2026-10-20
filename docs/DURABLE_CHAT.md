# Shared durable chat protocol

`@nlabs/metropolisjs/actions` exports `createDurableChatActions`,
`createDurableChatDocuments`, `createDurableChatVariables`, `DurableChatError`,
and the associated public types. These are opt-in factories for the shared
top-level durable-chat GraphQL schema, including Reaktor's chat API. They do not
require a separate chat package or a frontend renderer.

The 26 operations cover conversations, invitations and membership, message
history and mutations, reactions, receipts, typing, event replay, socket tickets,
and contacts. Existing collection-based message/conversation actions retain their
behavior. This factory is not a `createAction()` key or a React hook.

## Application adapter

```ts
import {createDurableChatActions} from '@nlabs/metropolisjs/actions';
import {restRequest} from '@nlabs/metropolisjs/utils';

import {chatFields, projectChatResult} from './chatContracts';
import type {ChatProtocol} from './chatContracts';
import type {FluxFramework} from '@nlabs/arkhamjs';

// ChatProtocol supplies each operation's {input, result}; projectChatResult
// validates unknown responses and returns that operation's application type.
const chat = createDurableChatActions<ChatProtocol, FluxFramework>({
  endpoint: 'https://api.example.com/chat',
  fields: chatFields,
  project: projectChatResult,
  request: (endpoint, body, flux) => restRequest(flux, endpoint, 'POST', body, {
    authenticate: true,
    cache: false,
    queueOffline: false
  })
});

// Call from an application action with its current transport context.
const loadHistory = (conversationId: string, flux: FluxFramework) =>
  chat.request('history', {conversationId}, flux);
```

Use trusted configuration for `endpoint` and selection overrides. The `fields`
option accepts `attachment`, `conversation`, `invite`, `membership`, `message`,
`reaction`, and `receipt` selection strings. A support inbox and a collaboration
app can use different selections and result types with the same operations.
Selection strings are GraphQL source; never construct them from user input.

The request adapter owns authentication, endpoint policy, HTTP headers, deadlines,
and cancellation through MetropolisJS/Rip-Hunter. Context is passed per call and
is not retained by the factory. The protocol forwards JSON `{query, variables}`;
it does not create another HTTP client or automatically retry mutations.

## Ownership and privacy

MetropolisJS constructs documents and variables, rejects unknown operations,
validates the GraphQL envelope, sanitizes transport/server errors, and invokes
the caller's required result projector. `DurableChatProtocol` preserves the
input/result mapping for each operation. `sendMessage` forwards only
`attachmentIds`, `clientMessageId`, `content`, `conversationId`, and
`replyToMessageId`; sender identity is derived and authorized by the server.

Applications retain their business contracts, response validation, moderation and
visibility rules, persona/audience headers, session-generation guards, and store
updates/events. The projector receives `unknown`, including valid `null` results,
and must validate before private data reaches a store. Its errors propagate
unchanged and should not expose private payloads. Server authorization remains
mandatory. Product-specific fields are opt-in, never shared defaults.

The factory does not persist results or credentials, dispatch Flux events, open
sockets, or manage outboxes. Application actions update ArkhamJS state before
dispatching events, suppress stale results, and retain idempotency keys for any
explicit retry. Browser/native lifecycle bindings stay in the application.

Network failures and malformed envelopes become `DurableChatError('unavailable')`.
Only `conflict`, `forbidden`, `invalid_request`, `rate_limited`, and `unavailable`
server codes are exposed. Raw provider messages are discarded. With private
operations, disable transport caching and offline queueing explicitly as above.

## Adoption

These APIs coexist with the web-session and cache integration. The combined
release version is assigned separately during release preparation. Consume the published package through `@nlabs/metropolisjs` and its
public entry points. Local archives are publication artifacts, not dependencies.
