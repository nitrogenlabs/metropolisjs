# Assistant actions

Use the existing MetropolisJS assistant action to connect Alfred, or your own UI, to Reaktor GraphQL. MetropolisJS handles Rip-Hunter transport, typed results and ArkhamJS state/events. Configure `app.api.public` to the Reaktor GraphQL URL: NitrogenX uses `https://api.reaktor.io` (POST to the root URL, not `/api/assistant` or `/graphql`). Register the application's allowed origins and knowledge profile on the server first.

## Chat and Flux events

```ts
import {createAction} from '@nlabs/metropolisjs/utils';
import {ASSISTANT_CONSTANTS} from '@nlabs/metropolisjs/stores';

// flux is your application's initialized ArkhamJS Flux instance.
// Configure app.api.public as 'https://api.reaktor.io'.
const assistant = createAction('assistant', flux, {instanceId: 'site-help'});
flux.on(ASSISTANT_CONSTANTS.CHAT_SUCCESS, ({instanceId, result}) => {
  // assistant.instances[instanceId] is updated before this event.
  console.log(result.answer, result.sources);
});
flux.on(ASSISTANT_CONSTANTS.CHAT_ERROR, ({error}) => {
  console.error(error.message);
});

void assistant.chat({
  context: 'nitrogen',
  history: [],
  language: 'en-US',
  name: 'Alfred',
  question: 'What does Nitrogen build?'
}).catch(() => { /* The error event handles presentation. */ });
```

`flux` is your initialized ArkhamJS Flux instance, shared with the Metropolis provider. If you already have an assistant instance, reuse it. Without `instanceId`, state/events use `input.context`, then `default`. The store updates before success/error events; read persistent results from `assistant.instances[instanceId]` and event-specific results from the listener. Requests also return promises; handle rejections even when presentation uses events. Dispose your listeners when their owning view is removed.

| Method | Reaktor operation | Result | Events |
| --- | --- | --- | --- |
| `chat(input)` | Mutation `assistant.chat` | `answer`, `sources?`, `supportSuggested?` | `CHAT_SUCCESS`, `CHAT_ERROR` |
| `faqs(input)` | Query `assistant.faqs` | `items: {id, question, answer, sources}[]` | `FAQS_SUCCESS`, `FAQS_ERROR` |
| `submitSupport(input)` | Mutation `assistant.submitSupport` | `ticketNumber?`, `queued?` | `SUPPORT_SUCCESS`, `SUPPORT_ERROR` |

Event payloads contain `instanceId` and either `result` or `error`. All constants are exported through `ASSISTANT_CONSTANTS` from `@nlabs/metropolisjs/stores`. The store retains the latest result/error per instance; it does not retain the support input/contact details. Assistant calls are not queued offline.

## Inputs and server validation

All methods accept optional `context`, `knowledge`, `language` and `name`. The host UI normally supplies `name: 'Alfred'` and `language: 'en-US'`. Reaktor bounds chat name to 80 characters and language to 35; these are presentation metadata, not permissions. Its trusted profile validates the context. NitrogenX defaults to `nitrogen` and supports its configured public product contexts.

Chat requires `question` (1–1,200 trimmed characters). `history` defaults to `[]`, with at most six `{role: 'user' | 'assistant', text}` turns of at most 2,500 characters each. Only retrieved, approved published sources can support an answer. Unsupported answers suggest the explicit support handoff.

For FAQs, call `assistant.faqs({context: 'nitrogen'})` and listen for `FAQS_SUCCESS`. The current Nitrogen backend returns the public FAQ list for its server-selected corpus revision; passing a context does not select another tenant or guarantee product filtering.

`knowledge` is host-defined metadata, for example `{collection: 'public-docs'}`. The current Nitrogen profile ignores this object when selecting storage. It cannot grant access, choose a bucket/database or upload a corpus. Register another trusted server profile for a different knowledge focus. Provider credentials, source ingestion and ticket/email delivery belong on the backend.

## Confirmed support and retries

```ts
// Run only after the user has reviewed and confirmed these details.
// Preserve this ID and the same payload for retries of this submission.
const requestId = 'web-' + crypto.randomUUID();
void assistant.submitSupport({
  confirmed: true,
  context: 'nitrogen',
  email: 'ada@example.com',
  firstName: 'Ada',
  message: 'Please help with my project.',
  requestId
}).catch(() => { /* Listen for SUPPORT_ERROR to display failures. */ });
```

Nitrogen's endpoint requires `confirmed: true`, `firstName` (up to 160 characters), a valid `email`, `message` (up to 4,000 characters), an approved context, and `requestId` in `web-UUID` form. `company`, `lastName` (up to 160 characters each), and `phone` (up to 24 characters) are optional. The action's shared TypeScript interface permits optional contact fields for other host backends; Nitrogen's server validation is stricter.

Listen for `SUPPORT_SUCCESS`: `ticketNumber` means the ticket and support notification were confirmed; `queued: true` means the payload is durably saved for server retry, not that an email has already arrived. A matching retry returns the original receipt; different details with the same ID cause `payload_conflict`. Keep the same ID and payload for retries. Generate a fresh ID only for a new submission.

Listen for error events to display validation, usage-limit or availability failures. Reaktor exposes controlled errors such as `invalid_request`, `confirmation_required`, `rate_limited`, `payload_conflict`, and `assistant_unavailable` through GraphQL `errors`; MetropolisJS converts their message into an `Error`. An HTTP 200 response may still contain GraphQL errors.

## Backend and Alfred integration

Alfred's `chat`, `loadFaqs` and `submitSupport` callbacks map to `assistant.chat`, `assistant.faqs` and `assistant.submitSupport`. Keep the knowledge/connectivity adapter in the host app. No frontend import of the Reaktor server package is needed. See the [Reaktor assistant guide](https://github.com/nitrogenlabs/reaktor/blob/main/packages/reaktor/docs/ASSISTANT.md) for server configuration and rollout. The new shared backend subpath requires its containing Reaktor release to be published/deployed; this guide does not imply a deployment has occurred.
