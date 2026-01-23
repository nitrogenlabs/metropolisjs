# MetropolisJS CRUD Integration Guide

This guide covers CRUD (Create, Read, Update, Delete) operations in MetropolisJS, including state management with ArkhamJS, extensible fields, and best practices.

## Table of Contents

- [Overview](#overview)
- [Basic Concepts](#basic-concepts)
- [CRUD Operations](#crud-operations)
- [Extensible Fields](#extensible-fields)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

MetropolisJS provides a unified interface for performing CRUD operations on all collection types. Each collection follows consistent patterns through factory-based actions, Zod validation, and ArkhamJS state management.

### Available Collections

All collections are defined in `COLLECTIONS` constant:

```typescript
import {COLLECTIONS} from '@nlabs/metropolisjs';

const {
  APPS,          // 'apps'
  CONVERSATIONS, // 'conversations'
  FILES,         // 'files'
  GROUPS,        // 'groups'
  IMAGES,        // 'images'
  MESSAGES,      // 'messages'
  POSTS,         // 'posts'
  PROFILES,      // 'profiles'
  TAGS,          // 'tags'
  USERS,         // 'users'
  VIDEOS         // 'videos'
} = COLLECTIONS;
```

## Basic Concepts

### Factory Pattern

All actions are created using factory functions:

```typescript
import {Flux} from '@nlabs/arkhamjs';
import {createPostActions, createGroupActions, createUserActions} from '@nlabs/metropolisjs';

const flux = new Flux();

const postActions = createPostActions(flux);
const groupActions = createGroupActions(flux);
const userActions = createUserActions(flux);
```

### Action Interface

Most collections provide standard CRUD methods:

```typescript
interface CollectionActions {
  add: (data, props?) => Promise<Item>;
  itemById: (id, props?) => Promise<Item>;
  list: (filters?, props?) => Promise<Item[]>;
  delete: (id, props?) => Promise<Item>;
  update: (data, props?) => Promise<Item>;
  updateAdapter: (adapter) => void;
  updateAdapterOptions: (options) => void;
}
```

### Field Selection

All CRUD methods accept an optional `props` parameter to specify additional fields to retrieve:

```typescript
const post = await postActions.itemById('post123', [
  'viewCount',
  'likeCount',
  'comments {commentId, content, user {username}}'
]);
```

## CRUD Operations

### Create (Add)

Add new items to a collection:

```typescript
// Add a post
const newPost = await postActions.add({
  name: 'My First Post',
  content: 'Hello, World!',
  type: 'text',
  tags: [{name: 'introduction'}]
});

// Add a group
const newGroup = await groupActions.add({
  name: 'My Group',
  description: 'A group for discussion',
  isPrivate: false,
  type: 'community'
});

// Add with extensible fields
const postWithMetadata = await postActions.add({
  name: 'Custom Post',
  content: 'Post with metadata',
  metadata: {
    priority: 'high',
    category: 'announcement'
  }
});
```

### Read (Retrieve)

Retrieve items by ID or using list methods:

```typescript
// Get single item by ID
const post = await postActions.itemById('post123', [
  'tags {name, tagId}',
  'user {username, imageUrl}'
]);

// List items with pagination
const recentPosts = await postActions.listByLatest(0, 20);

// List by location
const nearbyPosts = await postActions.listByLocation(
  37.7749,  // latitude
  -122.4194, // longitude
  0,         // from
  10         // to
);

// List by tags
const taggedPosts = await postActions.listByTags(
  ['technology', 'news'],
  37.7749,
  -122.4194,
  0,
  10
);

// List by reactions
const popularPosts = await postActions.listByReactions(
  ['like', 'view'],
  37.7749,
  -122.4194,
  0,
  10
);
```

### Update

Update existing items:

```typescript
// Update post
const updatedPost = await postActions.update({
  postId: 'post123',
  content: 'Updated content',
  name: 'Updated Title'
});

// Update group
const updatedGroup = await groupActions.update({
  groupId: 'group456',
  description: 'New description',
  settings: {
    allowInvites: true,
    requireApproval: false
  }
});

// Partial updates with extensible fields
const partialUpdate = await postActions.update({
  postId: 'post123',
  customField: 'new value'
});
```

### Delete

Remove items from collections:

```typescript
// Delete post
const deletedPost = await postActions.delete('post123');

// Delete group
const deletedGroup = await groupActions.delete('group456');

// Delete returns the deleted item
console.log(`Deleted post: ${deletedPost.name}`);
```

## Extensible Fields

All collection types support extensible fields through the `ExtensibleFields` interface, allowing custom properties beyond the predefined schema.

### Using Extensible Fields

```typescript
// Add custom fields to posts
const post = await postActions.add({
  name: 'Event Announcement',
  content: 'Join us for the meetup',
  eventDate: '2024-06-15',
  eventLocation: 'San Francisco',
  capacity: 50,
  registrationUrl: 'https://example.com/register'
});

// Query with custom fields
const postWithCustomFields = await postActions.itemById('post123', [
  'eventDate',
  'eventLocation',
  'capacity'
]);

// Update custom fields
await postActions.update({
  postId: 'post123',
  capacity: 75,
  soldOut: true
});
```

### Common Use Cases

**1. Metadata Storage:**
```typescript
const post = await postActions.add({
  name: 'Article',
  content: 'Content...',
  metadata: {
    author: 'John Doe',
    category: 'Tech',
    readTime: 5
  }
});
```

**2. Feature Flags:**
```typescript
const group = await groupActions.add({
  name: 'Beta Group',
  description: 'Testing new features',
  features: {
    chatEnabled: true,
    videoEnabled: false,
    pollsEnabled: true
  }
});
```

**3. Custom Timestamps:**
```typescript
const post = await postActions.add({
  name: 'Scheduled Post',
  content: 'Future content',
  scheduledPublishDate: Date.now() + 86400000,
  lastReviewedDate: Date.now()
});
```

## State Management

MetropolisJS uses ArkhamJS for state management, automatically dispatching actions on CRUD operations.

### Store Structure

Each collection has its own store with consistent structure:

```typescript
{
  [collectionName]: {
    item: {},        // Single item from get/add/update
    list: [],        // List of items from list queries
    error: null,     // Last error if any
    loading: false   // Loading state
  }
}
```

### Accessing State

```typescript
import {useFlux} from '@nlabs/arkhamjs-utils-react';

const MyComponent = () => {
  const flux = useFlux();
  
  // Get single post
  const post = flux.getState('posts.item', {});
  
  // Get list of posts
  const postList = flux.getState('posts.list', []);
  
  // Get error state
  const error = flux.getState('posts.error', null);
  
  // Access nested state
  const user = flux.getState('users.item', {});
  
  return (
    <div>
      {post.name && <h1>{post.name}</h1>}
      {postList.map(p => <div key={p.postId}>{p.name}</div>)}
    </div>
  );
};
```

### Store Constants

Each collection defines action constants for state updates:

```typescript
import {POST_CONSTANTS, GROUP_CONSTANTS} from '@nlabs/metropolisjs';

// Listen for specific actions
flux.on(POST_CONSTANTS.ADD_ITEM_SUCCESS, (state) => {
  const newPost = state.posts.item;
  console.log('Post created:', newPost);
});

flux.on(GROUP_CONSTANTS.GET_LIST_SUCCESS, (state) => {
  const groups = state.groups.list;
  console.log('Groups loaded:', groups.length);
});
```

### Manual State Updates

```typescript
// Dispatch custom actions
flux.dispatch({
  type: POST_CONSTANTS.ADD_ITEM_SUCCESS,
  post: customPostData
});

// Clear state
flux.dispatch({
  type: POST_CONSTANTS.GET_LIST_SUCCESS,
  list: []
});
```

## Error Handling

### Try-Catch Pattern

```typescript
import {PostValidationError} from '@nlabs/metropolisjs';

try {
  const post = await postActions.add({
    name: 'New Post',
    content: 'Content here'
  });
  console.log('Post created:', post.postId);
} catch (error) {
  if (error instanceof PostValidationError) {
    console.error('Validation error:', error.message);
    console.error('Failed field:', error.field);
  } else {
    console.error('API error:', error);
  }
}
```

### Error State

Errors are automatically stored in the state:

```typescript
const MyComponent = () => {
  const flux = useFlux();
  const error = flux.getState('posts.error', null);
  
  React.useEffect(() => {
    if (error) {
      console.error('Post operation failed:', error);
      // Show error notification
    }
  }, [error]);
  
  return <div>{error && <ErrorMessage error={error} />}</div>;
};
```

### Validation Errors

Collections use Zod schemas for validation:

```typescript
try {
  await postActions.add({
    // Missing required fields or invalid data
    content: null
  });
} catch (error) {
  // Error message includes field-level details
  // "Post validation failed: content: Expected string, received null"
}
```

## Best Practices

### 1. Use Factory Functions

Always create actions using factory functions:

```typescript
// ✅ Correct
const postActions = createPostActions(flux);

// ❌ Incorrect - direct instantiation not supported
const postActions = new PostActions(flux);
```

### 2. Request Only Needed Fields

Minimize data transfer by requesting only required fields:

```typescript
// ✅ Efficient
const posts = await postActions.listByLatest(0, 10, [
  'viewCount',
  'likeCount'
]);

// ❌ Inefficient - retrieves all nested data
const posts = await postActions.listByLatest(0, 10, [
  'user {*}',
  'tags {*}',
  'comments {*}'
]);
```

### 3. Handle Pagination

Always implement pagination for large datasets:

```typescript
const PAGE_SIZE = 20;

const loadMore = async (page: number) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  return await postActions.listByLatest(from, to);
};
```

### 4. Validate Before Submission

Pre-validate data before API calls:

```typescript
import {validatePostInput} from '@nlabs/metropolisjs';

const handleSubmit = async (formData) => {
  try {
    // Validate locally first
    const validatedData = validatePostInput(formData);
    
    // Submit to API
    const post = await postActions.add(validatedData);
  } catch (error) {
    // Handle validation errors before API call
    showValidationErrors(error);
  }
};
```

### 5. Use Custom Adapters for Business Logic

Implement custom validation or transformation:

```typescript
const customPostAdapter = (input: unknown) => {
  const post = validatePostInput(input);
  
  // Add business logic
  return {
    ...post,
    processedContent: sanitizeHtml(post.content),
    contentPreview: post.content?.substring(0, 200)
  };
};

const postActions = createPostActions(flux, {
  postAdapter: customPostAdapter
});
```

### 6. Leverage Extensible Fields

Use extensible fields for application-specific data:

```typescript
// Store application state
const post = await postActions.add({
  name: 'Post',
  content: 'Content',
  // Custom fields for your app
  isDraft: true,
  publishDate: Date.now(),
  analytics: {
    impressions: 0,
    clicks: 0
  }
});
```

### 7. Clean Up State

Clear state when unmounting components:

```typescript
React.useEffect(() => {
  return () => {
    // Clear post list on unmount
    flux.dispatch({
      type: POST_CONSTANTS.GET_LIST_SUCCESS,
      list: []
    });
  };
}, []);
```

### 8. Batch Operations

Perform multiple operations efficiently:

```typescript
const createPostsInGroup = async (groupId: string, postData: any[]) => {
  const posts = await Promise.all(
    postData.map(data => postActions.add({
      ...data,
      groupId
    }))
  );
  
  // Connect all posts to group
  await Promise.all(
    posts.map(post => connectionActions.addConnection(
      COLLECTIONS.POSTS,
      post.postId,
      COLLECTIONS.GROUPS,
      groupId
    ))
  );
  
  return posts;
};
```

### 9. Type Safety

Use TypeScript interfaces for type safety:

```typescript
import type {PostType, GroupType} from '@nlabs/metropolisjs';

const processPost = (post: PostType): string => {
  return `${post.name}: ${post.content}`;
};

const createGroupPost = async (
  group: GroupType,
  postData: Partial<PostType>
): Promise<PostType> => {
  return await postActions.add({
    ...postData,
    groupId: group.groupId
  });
};
```

### 10. Error Recovery

Implement retry logic for failed operations:

```typescript
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

// Usage
const post = await retryOperation(() => 
  postActions.itemById('post123')
);
```

## Examples by Collection

### Posts

```typescript
const postActions = createPostActions(flux);

// Create
const post = await postActions.add({
  name: 'Post Title',
  content: 'Post content',
  type: 'text',
  tags: [{name: 'tech'}]
});

// Read
const post = await postActions.itemById('post123');
const posts = await postActions.listByLatest(0, 10);

// Update
await postActions.update({
  postId: 'post123',
  content: 'Updated content'
});

// Delete
await postActions.delete('post123');
```

### Groups

```typescript
const groupActions = createGroupActions(flux);

// Create
const group = await groupActions.add({
  name: 'Tech Group',
  description: 'Discuss technology',
  isPrivate: false
});

// Read
const group = await groupActions.itemById('group123');
const groups = await groupActions.listByLatest(0, 10);

// Update
await groupActions.update({
  groupId: 'group123',
  settings: {allowInvites: true}
});

// Delete
await groupActions.delete('group123');
```

### Content

```typescript
const contentActions = createContentActions(flux);

// Create
const content = await contentActions.add({
  key: 'welcome_message',
  locale: 'en',
  content: 'Welcome to our app!',
  category: 'onboarding'
});

// Read
const content = await contentActions.itemByKey('welcome_message', 'en');
const contents = await contentActions.listByCategory('onboarding');

// Update
await contentActions.update({
  contentId: 'content123',
  content: 'Updated welcome message'
});

// Delete
await contentActions.delete('content123');
```

## Next Steps

- [Collections Reference](./COLLECTIONS.md) - Detailed field information for each collection
- [Connections Guide](./CONNECTIONS.md) - Managing relationships between collections
- [MetropolisJS Documentation](../README.md) - Main library documentation
