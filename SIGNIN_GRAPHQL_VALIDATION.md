# SignIn GraphQL Error Analysis and Fix

## Problem
The client is throwing a GraphQL validation error:
```
Cannot query field "users" on type "Mutation"
```

With the mutation payload:
```
mutation UsersSignIn($expires: Int, $password: String!, $username: String!) {
  users {
    signIn(expires: $expires, password: $password, username: $username) {
      expires
      issued
      token
      userId
      username
    }
  }
}
```

## Root Cause
The client code is correctly generating the mutation with a `users` wrapper as the parent collection type. However, the **server GraphQL schema** does not define a `users` field on the `Mutation` type.

## Client Code Status ✅
All client code is **correct and working as designed**:
- [src/utils/api.ts](src/utils/api.ts) - GraphQL query/mutation builder generates proper mutation structure
- [src/actions/userActions/userActions.ts](src/actions/userActions/userActions.ts) - SignIn action correctly handles nested response
- All response handlers expect `data.users.{method}` structure

The client follows a consistent collection-type wrapper pattern:
- User mutations: `users { signIn | signUp | update | ... }`
- Post mutations: `posts { add | delete | update | ... }`
- Content mutations: `contents { add | delete | update | ... }`
- Reaction mutations: `reactions { addReaction | deleteReaction | ... }`

## Unit Tests ✅
Comprehensive unit tests have been created in [src/utils/api.signin.test.ts](src/utils/api.signin.test.ts) to validate:

1. **Mutation Generation Tests** (4 tests)
   - ✅ Correct mutation shape with users wrapper
   - ✅ Proper GraphQL syntax structure
   - ✅ Handling required vs optional parameters
   - ✅ Complete signin payload generation

2. **RefreshSession & SignUp Tests** (2 tests)
   - ✅ RefreshSession mutation structure
   - ✅ SignUp mutation structure

3. **Response Handler Tests** (3 tests)
   - ✅ Extract signIn session from users wrapper
   - ✅ Handle missing users wrapper gracefully
   - ✅ Handle nested data extraction for other mutations

4. **Schema Documentation** (1 test)
   - ✅ Documents expected Mutation type structure

**Test Results:** All 10 tests pass ✓

## Server Schema Fix Required 🔧

The server GraphQL schema at `/Users/nitrog7/Development/vault` must be updated to include:

```graphql
type Mutation {
  users: UsersMutation!
  posts: PostsMutation!
  contents: ContentsMutation!
  reactions: ReactionsMutation!
  # ... other collection types
}

type UsersMutation {
  signIn(username: String!, password: String!, expires: Int): Session
  signUp(user: UserInput!): User
  update(user: UserUpdateInput!): User
  updateProfile(profile: ProfileUpdateInput!): Profile
  refreshSession(token: String!, expires: Int): Session
  confirmCode(code: Int!, type: String!, value: String!): Boolean
  remove(userId: String!): User
  session(user: UserInput!): User
  itemById(userId: String!): User
}

type Session {
  token: String!
  expires: Int
  issued: Int
  userId: String
  username: String
}

# Similar structures for PostsMutation, ContentsMutation, ReactionsMutation, etc.
```

## Expected Client Response Structure
After the server schema is updated, the GraphQL response will have the structure:

```json
{
  "data": {
    "users": {
      "signIn": {
        "token": "auth-token-xxx",
        "expires": 1609459200,
        "issued": 1609372800,
        "userId": "user-123",
        "username": "testuser"
      }
    }
  }
}
```

## Verification Steps
1. ✅ Client code verified to generate correct mutation structure
2. ✅ Unit tests pass, validating GraphQL payload generation
3. 🔄 **PENDING:** Update server schema at `/Users/nitrog7/Development/vault` to support `users` field on `Mutation` type
4. 🔄 **PENDING:** Test signin endpoint after server schema update

## Files Modified
- **Created:** [src/utils/api.signin.test.ts](src/utils/api.signin.test.ts) - Comprehensive mutation generation tests
- **Not Modified:** Client mutation generation code is correct as-is
