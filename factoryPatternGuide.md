# MetropolisJS Factory Pattern Guide

MetropolisJS exposes typed factory functions for creating action families with an ArkhamJS `FluxFramework` instance. Use a direct creator when you need one known family, `createActions()` for a selected set, or `createAllActions()` when an integration genuinely needs every family.

## Create One Action Family

Use `createAction()` when the family is selected dynamically or when you want the consolidated factory API:

```typescript
import {createAction} from '@nlabs/metropolisjs';

const userActions = createAction('user', flux);
const user = await userActions.addUser({
  email: 'ada@example.com',
  username: 'ada'
});
```

The factory key determines the return type. In this example, `userActions` is inferred as `UserActions`; no cast or manual type annotation is required.

Direct creators provide the same action interface:

```typescript
import {createUserActions} from '@nlabs/metropolisjs';

const userActions = createUserActions(flux);
const user = await userActions.itemById('user-1');
```

## Create a Selected Set

`createActions()` returns an object whose keys and values are inferred from the requested tuple:

```typescript
import {createActions} from '@nlabs/metropolisjs';

const actions = createActions(['user', 'post', 'message'], flux);

const user = await actions.user.addUser({username: 'ada'});
const post = await actions.post.add({
  content: 'Hello, Metropolis!',
  userId: user.userId
});

await actions.message.sendMessage({
  content: `Created post ${post.postId}`,
  recipientId: user.userId
});
```

Only requested keys exist on the returned type. A call such as `actions.video` is therefore a TypeScript error unless `video` was included in the input tuple.

## Create Every Action Family

`createAllActions()` returns the complete `ActionMap`:

```typescript
import {createAllActions} from '@nlabs/metropolisjs';

const actions = createAllActions(flux);

const user = await actions.user.itemById('user-1');
const posts = await actions.post.listByLatest();
```

Prefer `createAction()` or `createActions()` when only a few families are needed.

## Custom Adapters

Factory options let an application add validation or transformation rules while retaining the standard action interface:

```typescript
import {createUserActions, type User} from '@nlabs/metropolisjs';

const companyUserAdapter = (input: unknown): User => {
  const user = input as User;

  if(user.email && !user.email.endsWith('@company.com')) {
    throw new Error('A company email is required');
  }

  return {
    ...user,
    isAdmin: (user.userAccess || 0) >= 3
  };
};

const userActions = createUserActions(flux, {
  userAdapter: companyUserAdapter,
  userAdapterOptions: {
    environment: 'production',
    strict: true
  }
});
```

Adapters can also be replaced at runtime:

```typescript
userActions.updateUserAdapter(companyUserAdapter);
userActions.updateUserAdapterOptions({strict: true});
```

## Request Caching

Read actions that accept `ActionRequestOptions` can cache responses for a number of minutes:

```typescript
const user = await userActions.itemById(
  'user-1',
  ['email', 'username'],
  {cacheTimeout: 5}
);
```

Mutations clear the related request caches after successful updates.

## Testing

Create actions with a test Flux instance and inject adapters when a test needs to observe validation:

```typescript
import {createUserActions, type UserActions} from '@nlabs/metropolisjs';

describe('user actions', () => {
  let userActions: UserActions;

  beforeEach(() => {
    userActions = createUserActions(createMockFlux());
  });

  it('creates a user', async () => {
    const user = await userActions.addUser({
      email: 'test@example.com',
      username: 'test'
    });

    expect(user.userId).toBeDefined();
  });
});
```

The complete runnable examples are in [`examples/factory-pattern-usage.ts`](./examples/factory-pattern-usage.ts).

## Development Checks

Run all source, test, lint-input, and example TypeScript configurations with:

```bash
npm run typecheck
```

Before publishing a change, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
