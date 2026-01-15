# Vault GraphQL API - Schema and Mutations Analysis

## Overview
This document contains the actual GraphQL schema definitions from the Vault server located at `/Users/nitrog7/Development/vault/api/src/graphql/`.

---

## 1. MUTATION TYPE DEFINITIONS

The actual mutations available in the Vault GraphQL API are defined across two key places:

### Root Mutations (rootSchema.ts)
```graphql
type Mutation {
  # Projects
  createProject(input: ProjectInput!): Project!
  updateProjectConfig(id: ID!, config: ProjectConfigInput!): Project!

  # Chapters
  createChapter(projectId: ID!, input: ChapterInput!): Chapter!

  # Files & Git
  writeFile(projectId: ID!, input: FileWriteInput!): Boolean!

  # Proposals & AI
  proposeEdit(projectId: ID!, input: EditProposalInput!): Proposal!
  acceptProposal(projectId: ID!, proposalId: ID!): Boolean!
  rejectProposal(projectId: ID!, proposalId: ID!): Boolean!

  # Context
  createContextProfile(projectId: ID!, input: ContextProfileInput!): ContextProfile!
  updateContextProfile(projectId: ID!, profileId: ID!, input: ContextProfileInput!): ContextProfile!
  deleteContextProfile(projectId: ID!, profileId: ID!): Boolean!
  buildContext(projectId: ID!, input: ContextBuildInput!): ContextBuildResult!

  # Midjourney
  compilePrompts(projectId: ID!, input: MidjourneyCompileInput!): MidjourneyCompileResult!

  # Auth (User Operations)
  signUp(input: SignUpInput!): AuthResponse!
  signIn(user: User!, password: String!, expires: Int): AuthToken!
  signOut: Boolean!
  forgotPassword(username: String!): AuthResponse!
  resetPassword(input: ResetPasswordInput!): AuthResponse!
}
```

---

## 2. USER INPUT TYPES

### **UserInput Type** (DEFINED)
**Location:** `schema.ts` (old schema, not currently used)

```graphql
input UserInput {
  username: String!
  email: String!
  name: String!
  password: String!
}
```

**Status:** This type is defined but **NOT used** in any current mutations. It appears to be a legacy definition.

---

### **SignUpInput Type** (ACTUAL - authSchema.ts)
```graphql
input SignUpInput {
  email: String!
  password: String!
  name: String
}
```

**Used in mutation:**
```graphql
signUp(input: SignUpInput!): AuthResponse!
```

**Implementation Details (authResolvers.ts):**
- Email is required
- Password is required
- Name is optional
- Username is automatically set to email
- Calls `addUser()` from `@nlabs/reaktor`

---

### **SignInInput Type** (ACTUAL - authSchema.ts)
```graphql
input SignInInput {
  email: String!
  password: String!
}
```

**Current Mutation Signature (Different):**
```graphql
signIn(user: User!, password: String!, expires: Int): AuthToken!
```

⚠️ **NOTE:** The mutation signature doesn't match the `SignInInput` type. It directly takes:
- `user: User!` (not `email`, but a full User object)
- `password: String!`
- `expires: Int` (optional, in seconds)

---

### **ResetPasswordInput Type** (ACTUAL - authSchema.ts)
```graphql
input ResetPasswordInput {
  username: String!
  code: Int!
  password: String!
  type: String!
}
```

**Used in mutation:**
```graphql
resetPassword(input: ResetPasswordInput!): AuthResponse!
```

---

## 3. USER MUTATIONS SUMMARY

### Available User Mutations:

| Mutation | Input Type | Purpose |
|----------|-----------|---------|
| `signUp` | `SignUpInput` | Register a new user account |
| `signIn` | Direct params (not input type) | Authenticate user and get session token |
| `signOut` | None | Logout/terminate session |
| `forgotPassword` | Direct param: `username: String!` | Request password reset code |
| `resetPassword` | `ResetPasswordInput` | Reset password with verification code |

### User Query:
```graphql
type Query {
  me: User  # Get current authenticated user
}
```

---

## 4. USER TYPE DEFINITION

The User type is defined in the auth schema:

```graphql
type User {
  _key: ID!
  email: String!
  username: String
  name: String
  createdAt: String!
  updatedAt: String!
}
```

**Note:** Password is never returned in responses.

---

## 5. AUTHENTICATION RESPONSE TYPES

### AuthResponse (for signUp, forgotPassword, resetPassword)
```graphql
type AuthResponse {
  success: Boolean!
  message: String
  token: String
  expires: Float
  userId: String
  username: String
}
```

### AuthToken (for signIn)
```graphql
type AuthToken {
  token: String!
  expires: Float!
  userId: String!
  username: String!
}
```

---

## 6. ALL INPUT TYPES IN THE VAULT API

### Project-related:
- `ProjectInput` - Create/update project
- `ProjectConfigInput` - Project configuration

### Chapter-related:
- `ChapterInput` - Create chapter

### File-related:
- `FileWriteInput` - Write/create file

### Context-related:
- `ContextProfileInput` - Create/update context profile
- `ContextBuildInput` - Build context

### Proposal-related:
- `EditProposalInput` - Propose edit

### Midjourney-related:
- `MidjourneyCompileInput` - Compile prompts

### Auth-related:
- **`SignUpInput`** - User registration
- **`SignInInput`** - (defined but not used in mutation)
- **`ResetPasswordInput`** - Password reset

### Legacy (not used):
- `UserInput` - Old definition, not used in any current mutations

---

## 7. IMPLEMENTATION NOTES

### Sign Up Flow (authResolvers.ts):
```typescript
signUp: async (_: any, { input }: any) => {
  // Input: { email, password, name }
  // Sets username = email
  // Calls @nlabs/reaktor addUser()
  // Returns AuthResponse (without token initially)
}
```

### Sign In Flow (authResolvers.ts):
```typescript
signIn: async (_: any, { email, password, expires }: any) => {
  // Calls @nlabs/reaktor signIn()
  // Returns AuthToken with token, userId, username, expires
  // Default expires: 15 minutes (in seconds)
}
```

### Sign Out Flow:
```typescript
signOut: async (_: any, __: any, context: any) => {
  // Requires authenticated context
  // Calls @nlabs/reaktor signOut()
  // Returns Boolean
}
```

### Password Reset Flow:
```typescript
forgotPassword: async (_: any, { username }: any) => {
  // Sends reset code via email using @nlabs/reaktor
  // Returns success message (doesn't reveal if user exists)
}

resetPassword: async (_: any, { input }: any) => {
  // Validates code
  // Updates password
  // Returns success response
}
```

---

## 8. KEY FINDINGS

✅ **YES - UserInput Type IS Defined**
- Location: `schema.ts` (line ~200)
- Fields: `username`, `email`, `name`, `password`
- Status: **Not used in any current mutations**

✅ **Actual User Mutation Input Types:**
- `SignUpInput` - email, password, name
- `SignInInput` - email, password (defined but not used in mutation)
- `ResetPasswordInput` - username, code, password, type

✅ **User Mutations Available:**
1. `signUp(input: SignUpInput!): AuthResponse!`
2. `signIn(user: User!, password: String!, expires: Int): AuthToken!`
3. `signOut: Boolean!`
4. `forgotPassword(username: String!): AuthResponse!`
5. `resetPassword(input: ResetPasswordInput!): AuthResponse!`

⚠️ **Discrepancy:**
- `SignInInput` type is defined but the actual `signIn` mutation doesn't use it
- The mutation takes `user: User!` object directly instead of email/password inputs

---

## 9. SCHEMA FILE LOCATIONS

All schema definitions are in: `/Users/nitrog7/Development/vault/api/src/graphql/schema/`

- `index.ts` - Main composite schema
- `rootSchema.ts` - Root Query and Mutation definitions
- `authSchema.ts` - Auth types and inputs
- `projectSchema.ts` - Project types and inputs
- `chapterSchema.ts` - Chapter types and inputs
- `fileSchema.ts` - File types and inputs
- `contextSchema.ts` - Context types and inputs
- `diffSchema.ts` - Diff/Proposal types and inputs
- `midjourneySchema.ts` - Midjourney types and inputs

Resolvers are in: `/Users/nitrog7/Development/vault/api/src/graphql/resolvers/authResolvers.ts`

