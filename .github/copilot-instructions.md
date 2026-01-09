# MetropolisJS AI Coding Assistant Instructions

## Project Overview
MetropolisJS is a React library that provides seamless frontend-backend integration for applications using Reaktor backend services and ArkhamJS state management. It handles authentication, real-time messaging, content management, and social features through a unified API.

## Architecture Patterns

### Core Components
- **Stores**: ArkhamJS-based state management with domain-specific stores (`users`, `posts`, `messages`, etc.)
- **Actions**: Factory function pattern using `createUserActions(flux)`, `createPostActions(flux)`, etc.
- **Adapters**: Zod-validated data parsers for API responses (`parseUser`, `parsePost`, etc.)
- **Configuration**: Environment-specific config objects with API endpoints, WebSocket URLs, and session settings

### Key Conventions

#### 1. Action Creation Pattern
```typescript
// Correct: Use factory functions
import {createUserActions} from '@nlabs/metropolisjs';
const userActions = createUserActions(flux);

// Avoid: Direct instantiation
const userActions = new UserActions(flux);
```

#### 2. GraphQL Mutation Structure
All GraphQL mutations are wrapped in domain fields:
```graphql
mutation UsersSignIn($password: String!, $username: String!) {
  users {
    signIn(password: $password, username: $username) {
      token
      expires
    }
  }
}
```

#### 3. Store Constants Pattern
Each store defines action type constants:
```typescript
export const USER_CONSTANTS = {
  SIGN_IN_SUCCESS: 'USER_SIGN_IN_SUCCESS',
  SIGN_IN_ERROR: 'USER_SIGN_IN_ERROR',
  // ... etc
};
```

#### 4. Adapter Validation
Use Zod schemas for data validation in adapters:
```typescript
import {z} from 'zod';
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  // ...
});
```

## Development Workflow

### Build Commands
- `npm run build` - Compile TypeScript to `lib/` using @nlabs/lex
- `npm run dev` - Development build with watch mode
- `npm run test` - Run Jest tests with @nlabs/lex configuration
- `npm run lint` - ESLint with auto-fix using @nlabs/lex

### Testing Setup
- Uses Jest with jsdom environment
- Tests located in `__tests__/` directories alongside source
- Mock setup in `__mocks__/` for external dependencies

### TypeScript Configuration
- Strict mode disabled (`"strict": false`)
- ESNext modules with bundler resolution
- Declaration files emitted to `lib/` directory

## Integration Points

### External Dependencies
- **@nlabs/arkhamjs**: State management framework
- **@nlabs/arkhamjs-utils-react**: React hooks for ArkhamJS
- **i18next**: Internationalization
- **sockette**: WebSocket client
- **zod**: Schema validation

### Real-time Features
- WebSocket connections via `websocketStore`
- Server-Sent Events (SSE) for notifications
- Automatic reconnection and state synchronization

### Authentication Flow
- Session management through `user.session` state
- Token refresh via `refreshSession()` API calls
- Environment-specific auth checks via config

## Code Organization

### Directory Structure
```
src/
├── actions/          # Factory-based action creators
├── adapters/         # Data parsing and validation
├── stores/           # ArkhamJS store definitions
├── config/           # Environment configuration
├── utils/            # Shared utilities (API, i18n, etc.)
└── constants/        # Application constants
```

### File Naming
- Actions: `userActions.ts`, `postActions.ts`
- Stores: `userStore.ts`, `postStore.ts`
- Adapters: `userAdapter.ts`, `postAdapter.ts`
- Tests: `userActions.test.ts` alongside implementation

## Common Patterns

### Error Handling
```typescript
try {
  const result = await userActions.signIn({username, password});
  // Handle success
} catch (error) {
  // Error dispatched to store with *_ERROR constant
  console.error('Sign in failed:', error);
}
```

### State Access
```typescript
import {useFlux} from '@nlabs/arkhamjs-utils-react';

const MyComponent = () => {
  const flux = useFlux();
  const user = flux.getState('user.item', {});
  // ...
};
```

### Custom Adapters
```typescript
const customUserAdapter = (input: unknown) => {
  const user = parseUser(input); // Use default parser first
  // Add custom business logic
  return {...user, computedField: 'value'};
};

const userActions = createUserActions(flux, {
  userAdapter: customUserAdapter
});
```

## Key Files to Reference
- `src/index.tsx` - Main library exports and Metropolis component
- `src/stores/index.ts` - All store exports
- `src/actions/index.ts` - All action exports
- `src/adapters/index.ts` - All adapter exports
- `src/utils/api.ts` - GraphQL API utilities
- `factoryPatternGuide.md` - Detailed factory pattern documentation