# Assistant actions

Use `createAction('assistant', flux)` for Reaktor assistant chat, FAQs and support. The host supplies knowledge and connectivity; this action is independent of the Alfred UI package.

Configure `app.api.public` in the Metropolis environment configuration to your Reaktor GraphQL URL (for NitrogenX, `https://api.reaktor.io`). Configure allowed origins and knowledge authorization on the server. Never include provider credentials in browser code.

```ts
import {createAction} from '@nlabs/metropolisjs/utils';
import {ASSISTANT_CONSTANTS} from '@nlabs/metropolisjs/stores';

const assistant = createAction('assistant', flux, {instanceId: 'product-help'});
flux.on(ASSISTANT_CONSTANTS.CHAT_SUCCESS, ({instanceId, result}) => {
  // ArkhamJS has updated assistant.instances[instanceId] before this listener runs.
  console.log(instanceId, result.answer);
});
await assistant.chat({
  context: 'your-product', history: [], knowledge: {collection: 'public-docs'},
  language: 'en-US', name: 'Alfred', question: 'What can you help with?'
});
const {items} = await assistant.faqs({context: 'your-product'});
// Only after the user reviews and confirms their message:
await assistant.submitSupport({
  confirmed: true, context: 'your-product', email: 'caller@example.com',
  message: 'Please help with my order.', requestId: 'stable-unique-submission-id'
});
```

The methods return typed results and dispatch `CHAT_SUCCESS/ERROR`, `FAQS_SUCCESS/ERROR`, and `SUPPORT_SUCCESS/ERROR` events with `instanceId`. Without an explicit instance ID, the context is used, falling back to `default`. The built-in assistant store retains the latest result per instance; it does not retain support input/contact details. Requests are not cached or queued offline, and support preserves `requestId` for server idempotency.

GraphQL is encapsulated in MetropolisJS, using Rip-Hunter through the standard public query/mutation helpers. The Reaktor schema exposes `assistant.faqs` on Query and `assistant.chat` / `assistant.submitSupport` on Mutation with `JSONObject!` input and results. Alfred adapters only map callbacks to these actions.
