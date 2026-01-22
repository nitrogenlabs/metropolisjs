# Permission System GraphQL Integration

This document describes how the MetropolisJS permission system integrates with the Reaktor backend via GraphQL.

## GraphQL Schema

The Reaktor backend should implement the following GraphQL schema for permissions:

### Types

```graphql
type Permission {
  permissionId: ID!
  userId: ID
  roleId: ID
  name: String!
  description: String
  level: Int!
  resource: String
  type: String
  added: Float
  updated: Float
}

input PermissionInput {
  permissionId: ID
  userId: ID
  roleId: ID
  name: String
  description: String
  level: Int!
  resource: String
  type: String
}
```

### Queries

```graphql
type Query {
  permissions: PermissionQueries!
}

type PermissionQueries {
  # Check if a user has permission for a resource
  check(userId: ID!, resource: String!, requiredLevel: Int!): Boolean!
  
  # Get a specific permission by ID
  itemById(permissionId: ID!): Permission
  
  # List all permissions with pagination
  list(from: Int, to: Int): [Permission!]!
  
  # List all permissions for a specific user
  listByUser(userId: ID!): [Permission!]!
}
```

### Mutations

```graphql
type Mutation {
  permissions: PermissionMutations!
}

type PermissionMutations {
  # Grant a new permission
  add(permission: PermissionInput!): Permission!
  
  # Update an existing permission
  update(permission: PermissionInput!): Permission!
  
  # Revoke a permission
  remove(permissionId: ID!): Permission!
}
```

## Implementation Notes

### Permission Levels

The backend should enforce the following permission levels:

- **0** - Guest: Unauthenticated users
- **1** - User: Authenticated users
- **2** - Moderator: Content moderators
- **3** - Admin: Application administrators
- **4** - Super Admin: System administrators

### Permission Checking

When implementing the `check` query, the backend should:

1. First check if the user has a specific permission for the resource
2. If no resource-specific permission exists, fall back to the user's `userAccess` level
3. Return `true` if the user's level is >= the required level

Example backend logic:

```typescript
async check(userId: string, resource: string, requiredLevel: number): Promise<boolean> {
  // Check resource-specific permission
  const permission = await db.permissions.findOne({
    userId,
    resource
  });
  
  if (permission) {
    return permission.level >= requiredLevel;
  }
  
  // Fall back to user's userAccess level
  const user = await db.users.findOne({ userId });
  return (user?.userAccess ?? 0) >= requiredLevel;
}
```

### Backward Compatibility

The permission system is designed to work with the existing `userAccess` field in the User model:

```graphql
type User {
  userId: ID!
  username: String!
  userAccess: Int  # 0-4, maps to PermissionLevel
  # ... other fields
}
```

Users without explicit permission records will use their `userAccess` value as their default permission level.

## GraphQL Mutation Examples

### Grant Permission

```graphql
mutation GrantModeratorPermission {
  permissions {
    add(permission: {
      userId: "user123"
      name: "Moderator Role"
      level: 2
      resource: "posts"
      description: "Can moderate posts and comments"
    }) {
      permissionId
      name
      level
      resource
      userId
    }
  }
}
```

### Check Permission

```graphql
query CheckUserPermission {
  permissions {
    check(
      userId: "user123"
      resource: "posts"
      requiredLevel: 2
    )
  }
}
```

### List User Permissions

```graphql
query GetUserPermissions {
  permissions {
    listByUser(userId: "user123") {
      permissionId
      name
      level
      resource
      description
      added
      updated
    }
  }
}
```

### Update Permission

```graphql
mutation UpdatePermission {
  permissions {
    update(permission: {
      permissionId: "perm123"
      level: 3
      description: "Upgraded to admin level"
    }) {
      permissionId
      level
      description
    }
  }
}
```

### Revoke Permission

```graphql
mutation RevokePermission {
  permissions {
    remove(permissionId: "perm123") {
      permissionId
      name
    }
  }
}
```

## Database Schema

The backend should store permissions in a collection/table with the following structure:

```typescript
interface PermissionRecord {
  _id: string;           // ArangoDB ID
  _key: string;          // ArangoDB key
  permissionId: string;  // Unique permission ID
  userId?: string;       // User this permission is granted to
  roleId?: string;       // Optional role-based permission
  name: string;          // Human-readable name
  description?: string;  // Optional description
  level: number;         // Permission level (0-4)
  resource?: string;     // Optional resource scope
  type?: string;         // Optional type classifier
  added: number;         // Timestamp when granted
  updated: number;       // Timestamp when last updated
}
```

### Indexes

Recommended indexes for optimal performance:

- `userId` - For quick lookup of user permissions
- `resource` - For resource-specific queries
- `level` - For level-based filtering
- Composite index on `(userId, resource)` - For permission checking

## Security Considerations

1. **Authorization**: Only admins (level >= 3) should be able to grant/revoke permissions
2. **Validation**: Backend should validate that permission levels are within 0-4 range
3. **Audit Trail**: Consider logging all permission changes for security auditing
4. **Resource Validation**: Validate that resource names match expected values
5. **Self-Service**: Users should not be able to grant themselves higher permissions

## Error Handling

The backend should return appropriate errors:

```graphql
type PermissionError {
  code: String!
  message: String!
  field: String
}

# Example error responses
{
  "errors": [
    {
      "message": "Insufficient permissions to grant admin access",
      "extensions": {
        "code": "FORBIDDEN",
        "field": "level"
      }
    }
  ]
}
```

## Testing

The backend should include tests for:

1. Granting permissions to users
2. Checking permissions with and without resource scope
3. Listing user permissions
4. Updating and revoking permissions
5. Permission inheritance from userAccess field
6. Authorization checks (only admins can manage permissions)
7. Edge cases (invalid levels, non-existent users, etc.)
