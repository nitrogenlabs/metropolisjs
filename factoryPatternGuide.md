# MetropolisJS Factory Pattern Guide

## Overview

MetropolisJS has been refactored to use a **factory function pattern** for actions instead of class-based approaches. This provides better functional programming practices, improved testability, and enhanced flexibility through dependency injection.

## Key Benefits

1. **Functional Programming**: Pure functions instead of classes with side effects
2. **Better Testability**: Easier to mock and test individual functions
3. **Composability**: Actions can be easily combined and extended
4. **Dependency Injection**: Custom adapters can be injected and merged with defaults
5. **Backward Compatibility**: Legacy class wrappers maintain existing API compatibility

## Basic Usage

### Before (Class-based)

```typescript
import {userActions} from '../actions/userActions';

const userActions = new userActions(flux);
const user = await userActions.add(userData);
```

### After (Factory Pattern)

```typescript
import {createUserActions} from '../actions/userActions';

const userActions = createUserActions(flux);
const user = await userActions.add(userData);
```

## Advanced Usage with Custom Adapters

### Custom Validation Adapter

```typescript
// Custom adapter that extends default behavior
const customUserAdapter = (input: unknown, options?: UserAdapterOptions) => {
  // input is already validated by default adapter
  const user = input as any;

  // Add business-specific validation
  if (user.email && !user.email.includes('@company.com')) {
    throw new Error('Only company emails allowed');
  }

  // Add computed fields
  return {
    ...user,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    isAdmin: user.userAccess >= 3
  };
};

const userActions = createUserActions(flux, {
  userAdapter: customUserAdapter
});
```

### Configuration-based Adapters

```typescript
const userActions = createUserActions(flux, {
  userAdapterOptions: {
    strict: true,
    environment: 'production',
    customValidation: (input) => {
      // Additional validation logic
      return input;
    }
  }
});
```

### Runtime Adapter Updates

```typescript
const userActions = createUserActions(flux);

// Update adapter at runtime
userActions.updateUserAdapter(customUserAdapter);

// Update options at runtime
userActions.updateUserAdapterOptions({
  strict: true,
  environment: 'production'
});
```

## Available Actions

All action files now export factory functions:

- `createUserActions(flux, options?)` - User management
- `createPostActions(flux, options?)` - Post management
- `createEventActions(flux, options?)` - Event management
- `createMessageActions(flux, options?)` - Messaging
- `createImageActions(flux, options?)` - Image handling
- `createLocationActions(flux, options?)` - Location services
- `createReactionActions(flux, options?)` - Reactions
- `createTagActions(flux, options?)` - Tag management
- `createWebsocketActions(flux)` - WebSocket connections

## Adapter Options Interface

All adapters support the same options interface:

```typescript
interface AdapterOptions {
  strict?: boolean;                    // Enable strict validation
  allowPartial?: boolean;              // Allow partial data
  environment?: 'development' | 'production' | 'test';
  customValidation?: (input: unknown) => unknown;
}
```

## Migration Guide

### Step 1: Update Imports

```typescript
// Old
import {userActions} from '../actions/userActions';

// New
import {createUserActions} from '../actions/userActions';
```

### Step 2: Update Instantiation

```typescript
// Old
const userActions = new userActions(flux, customAdapter);

// New
const userActions = createUserActions(flux, {
  userAdapter: customAdapter
});
```

### Step 3: Update useMetropolis Hook

The `useMetropolis` hook has been updated to use the factory pattern:

```typescript
// Old
return useMemo(() => ({
  userActions: new userActions(flux, UserAdapter),
  postActions: new PostActions(flux, PostAdapter),
  // ...
}), [flux, UserAdapter, PostAdapter]);

// New
return useMemo(() => ({
  userActions: createUserActions(flux, {
    userAdapter: UserAdapter
  }),
  postActions: createPostActions(flux, {
    postAdapter: PostAdapter
  }),
  // ...
}), [flux, UserAdapter, PostAdapter]);
```

## Backward Compatibility

Legacy class wrappers are provided for backward compatibility:

```typescript
// Still works
import {userActionsClass} from '../actions/userActions';
const userActions = new userActionsClass(flux, options);
```

## Testing Examples

### Unit Testing Actions

```typescript
import {createUserActions} from '../actions/userActions';

describe('userActions', () => {
  let flux: FluxFramework;
  let userActions: userActions;

  beforeEach(() => {
    flux = createMockFlux();
    userActions = createUserActions(flux);
  });

  it('should add user with validation', async () => {
    const userData = {username: 'test', email: 'test@example.com'};
    const result = await userActions.add(userData);
    expect(result).toBeDefined();
  });
});
```

### Testing with Custom Adapters

```typescript
const mockAdapter = jest.fn((input) => ({
  ...input,
  validated: true
}));

const userActions = createUserActions(flux, {
  userAdapter: mockAdapter
});

expect(mockAdapter).toHaveBeenCalled();
```

## Best Practices

1. **Use Factory Functions**: Prefer `createXxxActions()` over class constructors
2. **Leverage Adapter Injection**: Use custom adapters for business logic
3. **Runtime Updates**: Use update methods for dynamic behavior changes
4. **Type Safety**: Always use TypeScript interfaces for better type checking
5. **Error Handling**: Custom adapters should throw meaningful errors

## Performance Considerations

- Factory functions are lightweight and create minimal overhead
- Adapter validation is only performed when needed
- Options are merged efficiently without deep cloning
- Legacy wrappers have minimal performance impact

## Future Enhancements

The factory pattern enables future enhancements:

- **Middleware Support**: Chain multiple adapters
- **Plugin System**: Load adapters dynamically
- **Caching**: Cache validated results
- **Async Adapters**: Support async validation logic
- **Schema Evolution**: Handle multiple adapter versions

## Conclusion

The factory pattern provides a more functional, testable, and flexible approach to action management in MetropolisJS. While maintaining backward compatibility, it opens up new possibilities for customization and extension.
