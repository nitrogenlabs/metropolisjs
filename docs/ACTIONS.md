# MetropolisJS Actions Reference

This reference documents every action family exposed by MetropolisJS, how to access it, and where to find the full TypeScript interface.

## Access Patterns

Use specialized hooks in React components:

```tsx
import {useUserActions, usePostActions, useMessageActions} from '@nlabs/metropolisjs';

const userActions = useUserActions();
const postActions = usePostActions();
const messageActions = useMessageActions();
```

Or create actions directly with a Flux instance:

```ts
import {createUserActions, createPostActions} from '@nlabs/metropolisjs';

const userActions = createUserActions(flux);
const postActions = createPostActions(flux);
```

## Action Families

Each row links to:
- source implementation (`src/actions/...`)
- hook exposure (`src/utils/useMetropolis.ts`)
- common method names (full signatures live in the interface in each source file)

| Family | Hook | Creator | Typical Methods | Source |
| --- | --- | --- | --- | --- |
| App | `useMetropolis(['app'])` | `createAppActions` | `add`, `itemById`, `list`, `update`, `delete` | [appActions.ts](../src/actions/appActions/appActions.ts) |
| Connection | `useMetropolis(['connection'])` | `createConnectionActions` | `addConnection`, `getConnections`, `removeConnection` | [connectionActions.ts](../src/actions/connectionActions/connectionActions.ts) |
| Content | `useContentActions` | `createContentActions` | `add`, `itemById`, `itemByKey`, `listByCategory`, `list`, `update`, `delete` | [contentActions.ts](../src/actions/contentActions/contentActions.ts) |
| Conversation | `useMetropolis(['conversation'])` | `createConversationActions` | `add`, `itemById`, `list`, `update`, `delete` | [conversationActions.ts](../src/actions/conversationActions/conversationActions.ts) |
| Event | `useEventActions` | `createEventActions` | `addEvent`, `getEvent`, `getEventsByTags`, `getEventsByReactions`, `updateEvent`, `deleteEvent` | [eventActions.ts](../src/actions/eventActions/eventActions.ts) |
| Group | `useGroupActions` | `createGroupActions` | `add`, `itemById`, `listByLatest`, `update`, `delete` | [groupActions.ts](../src/actions/groupActions/groupActions.ts) |
| Image | `useImageActions` | `createImageActions` | `add`, `update`, `delete`, `upload`, `countByItem`, `listByItem`, `listByReactions` | [imageActions.ts](../src/actions/imageActions/imageActions.ts) |
| Location | `useLocationActions` | `createLocationActions` | `autocompleteLocation`, `add`, `getLocation`, `getCurrentLocation`, `listByItem`, `update`, `delete` | [locationActions.ts](../src/actions/locationActions/locationActions.ts) |
| Message | `useMessageActions` | `createMessageActions` | `sendMessage`, `getMessages`, `getConversations`, `getDirectConversation` | [messageActions.ts](../src/actions/messageActions/messageActions.ts) |
| Permission | `usePermissionActions` | `createPermissionActions` | `add`, `check`, `itemById`, `list`, `listByUser`, `update`, `remove` | [permissionActions.ts](../src/actions/permissionActions/permissionActions.ts) |
| Post | `usePostActions` | `createPostActions` | `add`, `itemById`, `listByLatest`, `listByLocation`, `listByReactions`, `listByTags`, `update`, `delete` | [postActions.ts](../src/actions/postActions/postActions.ts) |
| Profile | `useProfileActions` | `createProfileActions` | `addProfile`, `getProfile`, `getProfiles`, `updateProfile`, `deleteProfile` | [profileActions.ts](../src/actions/profileActions/profileActions.ts) |
| Reaction | `useReactionActions` | `createReactionActions` | `addReaction`, `deleteReaction`, `getReactionCount`, `hasReaction`, `abbreviateCount` | [reactionActions.ts](../src/actions/reactionActions/reactionActions.ts) |
| SSE | `useMetropolis(['sse'])` | `createSSEActions` | `connect`, `disconnect`, `reconnect`, `isConnected`, `sendMessage`, `addEventListener`, `removeEventListener` | [sseActions.ts](../src/actions/sseActions/sseActions.ts) |
| Tag | `useTagActions` | `createTagActions` | `addTag`, `addTagToProfile`, `getTags`, `updateTag`, `deleteTag`, `deleteTagFromProfile` | [tagActions.ts](../src/actions/tagActions/tagActions.ts) |
| Translation | `useTranslationActions` | `createTranslationActions` | `addTranslations`, `getTranslation`, `getTranslations`, `hasTranslation`, `queueTranslationKey`, `processPendingTranslations` | [translationActions.ts](../src/actions/translationActions/translationActions.ts) |
| User | `useUserActions` | `createUserActions` | `signIn`, `signUp`, `session`, `refreshSession`, `itemById`, `listByLatest`, `updateUser`, `updateProfile` | [userActions.ts](../src/actions/userActions/userActions.ts) |
| Video | `useMetropolis(['video'])` | `createVideoActions` | `add`, `itemById`, `list`, `update`, `delete` | [videoActions.ts](../src/actions/videoActions/videoActions.ts) |
| Websocket | `useWebsocketActions` | `createWebsocketActions` | `wsInit`, `wsSend`, `onOpen`, `onReceive`, `onClose`, `onError` | [websocketActions.ts](../src/actions/websocketActions/websocketActions.ts) |

## Full Exports

All action creators are re-exported from:

- [src/actions/index.ts](../src/actions/index.ts)

All specialized hooks are exposed from:

- [src/utils/useMetropolis.ts](../src/utils/useMetropolis.ts)

