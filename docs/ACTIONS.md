# MetropolisJS Actions Reference

This reference documents every action family exposed by MetropolisJS, how to access it, and where to find the full TypeScript interface.

## Access Patterns

Use specialized hooks in React components:

```tsx
import {useAwsRum, useUserActions, usePostActions, useMessageActions, useRestActions} from '@nlabs/metropolisjs';

const rum = useAwsRum();
const userActions = useUserActions();
const postActions = usePostActions();
const messageActions = useMessageActions();
const restActions = useRestActions();
```

Or create actions directly with a Flux instance:

```ts
import {createUserActions, createPostActions, createRestActions} from '@nlabs/metropolisjs';

const userActions = createUserActions(flux);
const postActions = createPostActions(flux);
const restActions = createRestActions(flux);
```

### Typed Consolidated Factories

The consolidated factories preserve the selected action types without casts:

```ts
import {createAction, createActions, createAllActions} from '@nlabs/metropolisjs';

const userActions = createAction('user', flux);
await userActions.addUser({username: 'ada'});

const actions = createActions(['user', 'post', 'message'], flux);
await actions.post.add({content: 'Hello!'});
await actions.message.sendMessage({content: 'Welcome!'});

const allActions = createAllActions(flux);
await allActions.permission.list();
```

`createAction()` maps its key to the corresponding action interface, `createActions()` returns exactly the requested keys, and `createAllActions()` returns the complete exported `ActionMap`.

## Action Families

Each row links to:
- source implementation (`src/actions/...`)
- hook exposure (`src/utils/useMetropolis.ts`)
- common method names (full signatures live in the interface in each source file)

### Hook and Factory Actions

These action families are available through specialized hooks when present, `useMetropolis([...])`, `createAction(...)`, `createActions(...)`, and direct creators.

| Family | Hook | Factory Key | Creator | Typical Methods | Source |
| --- | --- | --- | --- | --- | --- |
| AWS RUM | `useAwsRum` | `awsRum` | `createAwsRumActions` | `track`, `flush`, `destroy` | [awsRumActions.ts](../src/actions/awsRumActions/awsRumActions.ts) |
| Content | `useContentActions` | `content` | `createContentActions` | `add`, `itemById`, `itemByKey`, `listByCategory`, `list`, `update`, `delete` | [contentActions.ts](../src/actions/contentActions/contentActions.ts) |
| CRM | `useCrmActions` | `crm` | `createCrmActions` | `mailingLists`, `createMailingList`, `createSupportTicket`, `supportTickets`, `customerOrdersByUser` | [crmActions.ts](../src/actions/crmActions/crmActions.ts) |
| Event | `useEventActions` | `event` | `createEventActions` | `addEvent`, `getEvent`, `getEventsByTags`, `getEventsByReactions`, `updateEvent`, `deleteEvent` | [eventActions.ts](../src/actions/eventActions/eventActions.ts) |
| Group | `useGroupActions` | `group` | `createGroupActions` | `add`, `itemById`, `listByLatest`, `update`, `delete` | [groupActions.ts](../src/actions/groupActions/groupActions.ts) |
| Image | `useImageActions` | `image` | `createImageActions` | `add`, `update`, `delete`, `upload`, `countByItem`, `listByItem`, `listByReactions` | [imageActions.ts](../src/actions/imageActions/imageActions.ts) |
| Location | `useLocationActions` | `location` | `createLocationActions` | `autocompleteLocation`, `add`, `getLocation`, `getCurrentLocation`, `listByItem`, `update`, `delete` | [locationActions.ts](../src/actions/locationActions/locationActions.ts) |
| Message | `useMessageActions` | `message` | `createMessageActions` | `sendMessage`, `getMessages`, `getConversations`, `getDirectConversation` | [messageActions.ts](../src/actions/messageActions/messageActions.ts) |
| Permission | `usePermissionActions` | `permission` | `createPermissionActions` | `add`, `check`, `itemById`, `list`, `listByUser`, `update`, `remove` | [permissionActions.ts](../src/actions/permissionActions/permissionActions.ts) |
| Post | `usePostActions` | `post` | `createPostActions` | `add`, `itemById`, `listByLatest`, `listByLocation`, `listByReactions`, `listByTags`, `update`, `delete` | [postActions.ts](../src/actions/postActions/postActions.ts) |
| Persona | `usePersonaActions` | `persona` | `createPersonaActions` | `addPersona`, `getPersona`, `getPersonas`, `updatePersona`, `deletePersona` | [personaActions.ts](../src/actions/personaActions/personaActions.ts) |
| Reaction | `useReactionActions` | `reaction` | `createReactionActions` | `addReaction`, `deleteReaction`, `getReactionCount`, `hasReaction`, `abbreviateCount` | [reactionActions.ts](../src/actions/reactionActions/reactionActions.ts) |
| REST | `useRestActions` | `rest` | `createRestActions` | `get`, `post`, `put`, `delete`, `request` | [restActions.ts](../src/actions/restActions/restActions.ts) |
| SSE | `useMetropolis(['sse'])` | `sse` | `createSSEActions` | `connect`, `disconnect`, `reconnect`, `isConnected`, `sendMessage`, `addEventListener`, `removeEventListener` | [sseActions.ts](../src/actions/sseActions/sseActions.ts) |
| Subscription | `useSubscriptionActions` | `subscription` | `createSubscriptionActions` | `addPlan`, `getPlanByItem`, `addSubscription`, `getSubscriptionByItem`, `getSubscriptionListByUser`, `deleteSubscription` | [subscriptionActions.ts](../src/actions/subscriptionActions/subscriptionActions.ts) |
| Tag | `useTagActions` | `tag` | `createTagActions` | `addTag`, `addTagToItem`, `getTags`, `updateTag`, `deleteTag`, `deleteTagFromItem` | [tagActions.ts](../src/actions/tagActions/tagActions.ts) |
| Translation | `useTranslationActions` | `translation` | `createTranslationActions` | `addTranslations`, `getTranslation`, `getTranslations`, `hasTranslation`, `queueTranslationKey`, `processPendingTranslations` | [translationActions.ts](../src/actions/translationActions/translationActions.ts) |
| User | `useUserActions` | `user` | `createUserActions` | `signIn`, `signUp`, `session`, `createBillingSetupSession`, `completeBillingSetupSession`, `deleteBillingCard`, `itemById`, `updateUser` | [userActions.ts](../src/actions/userActions/userActions.ts) |
| Video | `useVideoActions` | `video` | `createVideoActions` | `add`, `itemById`, `list`, `update`, `delete` | [videoActions.ts](../src/actions/videoActions/videoActions.ts) |
| Websocket | `useWebsocketActions` | `websocket` | `createWebsocketActions` | `wsInit`, `wsSend`, `onOpen`, `onReceive`, `onClose`, `onError` | [websocketActions.ts](../src/actions/websocketActions/websocketActions.ts) |

### Direct Creator Actions

These creators are exported directly from MetropolisJS, but are not currently part of the `createAction(...)`/`useMetropolis([...])` factory key union.

| Family | Creator | Typical Methods | Source |
| --- | --- | --- | --- |
| App | `createAppActions` | `add`, `itemById`, `list`, `update`, `delete` | [appActions.ts](../src/actions/appActions/appActions.ts) |
| Connection | `createConnectionActions` | `addConnection`, `getConnections`, `removeConnection` | [connectionActions.ts](../src/actions/connectionActions/connectionActions.ts) |
| Conversation | `createConversationActions` | `add`, `itemById`, `list`, `update`, `delete` | [conversationActions.ts](../src/actions/conversationActions/conversationActions.ts) |
| Durable chat (1.2.0+) | `createDurableChatActions` | `request(operation, input, context)` for 26 operations | [Durable chat guide](../README.md#durable-chat-protocol-opt-in) |

`createDurableChatActions` is imported from `@nlabs/metropolisjs/actions`. It accepts endpoint, selection, projection, and transport options instead of a Flux instance. Its caller owns authentication, response validation, state updates, and event dispatch; existing message/conversation creators remain unchanged.

## AWS RUM Actions

Use `useAwsRum()` to queue sanitized analytics events and flush them to the configured RUM endpoint:

```tsx
import {useAwsRum} from '@nlabs/metropolisjs';

const AnalyticsExample = () => {
  const rum = useAwsRum();

  const trackCheckout = () => {
    rum.track({
      name: 'checkout_started',
      path: '/checkout',
      properties: {source: 'cart'},
      type: 'click'
    });
  };

  return <button onClick={trackCheckout}>Checkout</button>;
};
```

Configure the action through the `Metropolis` provider:

```tsx
<Metropolis
  config={{
    production: {
      app: {
        api: {
          endpoints: {
            rum: 'https://events.example.com/track'
          }
        },
        rum: {
          analyticsId: 'my-public-analytics-id',
          enabled: true
        }
      }
    }
  }}
>
  <App />
</Metropolis>
```

`flush()` uses the normal asynchronous request path. `flush({useBeacon: true})` first asks the browser to queue the JSON batch with `navigator.sendBeacon()`, then falls back to the normal request if the Beacon API is unavailable or declines the payload.

The `Metropolis` provider requests beacon delivery automatically on `pagehide` and when `document.visibilityState` changes to `hidden`. A batch accepted by the Beacon API is not submitted a second time. All RUM delivery remains subject to `enabled`, `respectPrivacySignals`, batching, throttling, deduplication, and event sanitization.

## User Billing Setup Sessions

Use the authenticated user actions to collect a billing method through the hosted setup flow:

```ts
import {createUserActions} from '@nlabs/metropolisjs';

const userActions = createUserActions(flux);
const checkoutUrl = await userActions.createBillingSetupSession(
  'https://app.example.com/settings/billing/complete'
);

window.location.assign(checkoutUrl);
```

After the billing provider redirects back, complete the session with its identifier:

```ts
const user = await userActions.completeBillingSetupSession(
  setupSessionId,
  ['stripeCardBrand', 'stripeCardLast4']
);
```

`createBillingSetupSession(returnUrl)` validates the return URL and resolves to the hosted checkout URL. `completeBillingSetupSession(sessionId, userProps?, requestOptions?)` validates the identifier, returns the updated user, synchronizes the active session when it belongs to that user, dispatches `USER_UPDATE_ITEM_SUCCESS`, and clears related request caches. `deleteBillingCard(userProps?, requestOptions?)` removes the stored method through the same authenticated action family.

These APIs exchange setup-session identifiers and sanitized billing metadata only. They do not accept raw card details.

## REST Actions

Use REST actions for external APIs that are not represented in Reaktor. REST actions delegate to `@nlabs/rip-hunter`, share Metropolis network/session handling, and can target either a configured endpoint key or an absolute URL.

Configure named endpoints under `app.api.endpoints`:

```tsx
<Metropolis
  config={{
    development: {
      app: {
        api: {
          endpoints: {
            weather: 'https://api.example.com/weather'
          },
          public: 'http://localhost:3000/public',
          url: 'http://localhost:3000/app'
        }
      }
    }
  }}
>
  <YourApp />
</Metropolis>
```

Call the endpoint through `useRestActions()`:

```ts
const restActions = useRestActions();

const weather = await restActions.get('weather', {zip: '60601'}, {cache: true});
const created = await restActions.post('https://api.example.com/items', {name: 'Item'});
```

Pass `authenticate: true` only when the endpoint should receive the current Metropolis session token:

```ts
const profile = await restActions.request(
  'https://api.example.com/profile',
  'PATCH',
  {displayName: 'Ada'},
  {authenticate: true}
);
```

## Full Exports

All action creators are re-exported from:

- [src/actions/index.ts](../src/actions/index.ts)

The package root also exports every creator, action interface, `ActionMap`, and the consolidated factory functions.

All specialized hooks are exposed from:

- [src/utils/useMetropolis.ts](../src/utils/useMetropolis.ts)

## Development Type Checks

Run the complete TypeScript gate with:

```bash
npm run typecheck
```

This validates the production source, tests, lint inputs, and examples. Run `npm run lint`, `npm test`, and `npm run build` before publishing.
