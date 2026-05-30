# MetropolisJS Actions Reference

This reference documents every action family exposed by MetropolisJS, how to access it, and where to find the full TypeScript interface.

## Access Patterns

Use specialized hooks in React components:

```tsx
import {useUserActions, usePostActions, useMessageActions, useRestActions} from '@nlabs/metropolisjs';

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

## Action Families

Each row links to:
- source implementation (`src/actions/...`)
- hook exposure (`src/utils/useMetropolis.ts`)
- common method names (full signatures live in the interface in each source file)

### Hook and Factory Actions

These action families are available through specialized hooks when present, `useMetropolis([...])`, `createAction(...)`, `createActions(...)`, and direct creators.

| Family | Hook | Factory Key | Creator | Typical Methods | Source |
| --- | --- | --- | --- | --- |
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
| User | `useUserActions` | `user` | `createUserActions` | `signIn`, `signUp`, `session`, `refreshSession`, `itemById`, `listByLatest`, `updateUser` | [userActions.ts](../src/actions/userActions/userActions.ts) |
| Video | `useVideoActions` | `video` | `createVideoActions` | `add`, `itemById`, `list`, `update`, `delete` | [videoActions.ts](../src/actions/videoActions/videoActions.ts) |
| Websocket | `useWebsocketActions` | `websocket` | `createWebsocketActions` | `wsInit`, `wsSend`, `onOpen`, `onReceive`, `onClose`, `onError` | [websocketActions.ts](../src/actions/websocketActions/websocketActions.ts) |

### Direct Creator Actions

These creators are exported directly from MetropolisJS, but are not currently part of the `createAction(...)`/`useMetropolis([...])` factory key union.

| Family | Creator | Typical Methods | Source |
| --- | --- | --- | --- |
| App | `createAppActions` | `add`, `itemById`, `list`, `update`, `delete` | [appActions.ts](../src/actions/appActions/appActions.ts) |
| Connection | `createConnectionActions` | `addConnection`, `getConnections`, `removeConnection` | [connectionActions.ts](../src/actions/connectionActions/connectionActions.ts) |
| Conversation | `createConversationActions` | `add`, `itemById`, `list`, `update`, `delete` | [conversationActions.ts](../src/actions/conversationActions/conversationActions.ts) |

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

All specialized hooks are exposed from:

- [src/utils/useMetropolis.ts](../src/utils/useMetropolis.ts)
