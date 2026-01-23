# MetropolisJS Connections Guide

Comprehensive guide for managing relationships between collections using connections, reactions, tags, conversations, and file associations.

## Table of Contents

- [Overview](#overview)
- [Connection Types](#connection-types)
- [Edge Types](#edge-types)
- [Connection Actions](#connection-actions)
- [Reaction Management](#reaction-management)
- [Tag Management](#tag-management)
- [File Associations](#file-associations)
- [Conversation Links](#conversation-links)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)

## Overview

MetropolisJS uses ArangoDB's edge collections to model relationships between documents. These relationships are managed through specialized actions that create, query, and remove edges between collections.

### Core Concepts

**Collections**: Documents like users, posts, groups (vertices in graph database)
**Edges**: Relationships between collections (edges in graph database)
**Connection Types**: Semantic meaning of relationships (admin, member, follower, etc.)

### Constants

```typescript
import {COLLECTIONS, EDGES, CONNECTION_TYPES, REACTION_TYPES} from '@nlabs/metropolisjs';

// Collection types
const collections = {
  APPS: 'apps',
  CONVERSATIONS: 'conversations',
  FILES: 'files',
  GROUPS: 'groups',
  IMAGES: 'images',
  MESSAGES: 'messages',
  POSTS: 'posts',
  PROFILES: 'profiles',
  TAGS: 'tags',
  USERS: 'users',
  VIDEOS: 'videos'
};

// Edge types
const edges = {
  HAS_CONNECTION: 'hasConnection',
  HAS_CONVERSATION: 'hasConversation',
  HAS_FILE: 'hasFile',
  HAS_REACTION: 'hasReaction',
  IS_TAGGED: 'isTagged'
};

// Connection types
const connectionTypes = {
  ADMIN: 'admin',
  BLOCKED: 'blocked',
  FOLLOWER: 'follower',
  FOLLOWING: 'following',
  MEMBER: 'member'
};

// Reaction types
const reactionTypes = {
  DISLIKE: 'dislike',
  LIKE: 'like',
  PIN: 'pin',
  RSVP: 'rsvp',
  VIEW: 'view'
};
```

## Connection Types

Connection types define the semantic meaning of relationships between collections.

### ADMIN

Administrative privileges and ownership.

```typescript
import {CONNECTION_TYPES, COLLECTIONS} from '@nlabs/metropolisjs';

// User is admin of group
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.GROUPS,
  'group456',
  CONNECTION_TYPES.ADMIN,
  {
    permissions: ['manage_members', 'edit_settings', 'delete_posts'],
    grantedAt: Date.now()
  }
);

// Check if user is admin
const connections = await connectionActions.getConnections(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.GROUPS,
  {connectionType: CONNECTION_TYPES.ADMIN}
);

const isAdmin = connections.some(conn => conn.toId === 'group456');
```

### MEMBER

Standard membership in groups or organizations.

```typescript
// Add user to group
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.GROUPS,
  'group456',
  CONNECTION_TYPES.MEMBER,
  {
    joinedAt: Date.now(),
    role: 'contributor'
  }
);

// List group members
const members = await connectionActions.getConnections(
  COLLECTIONS.GROUPS,
  'group456',
  COLLECTIONS.USERS,
  {connectionType: CONNECTION_TYPES.MEMBER}
);

console.log(`Group has ${members.length} members`);
```

### FOLLOWER / FOLLOWING

Social following relationships.

```typescript
// User follows another user
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  'user123',      // follower
  COLLECTIONS.USERS,
  'user456',      // following
  CONNECTION_TYPES.FOLLOWING
);

// This creates complementary relationship
// user123 FOLLOWING user456
// user456 has FOLLOWER user123

// Get users I'm following
const following = await connectionActions.getConnections(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.USERS,
  {connectionType: CONNECTION_TYPES.FOLLOWING}
);

// Get my followers
const followers = await connectionActions.getConnections(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.USERS,
  {connectionType: CONNECTION_TYPES.FOLLOWER}
);

console.log(`Following ${following.length}, Followers ${followers.length}`);
```

### BLOCKED

Block relationships for moderation.

```typescript
// Block a user
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.USERS,
  'user456',
  CONNECTION_TYPES.BLOCKED,
  {
    reason: 'spam',
    blockedAt: Date.now()
  }
);

// Check if blocked
const blockedUsers = await connectionActions.getConnections(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.USERS,
  {connectionType: CONNECTION_TYPES.BLOCKED}
);

const isBlocked = blockedUsers.some(conn => conn.toId === 'user456');
```

## Edge Types

Edge types define different categories of relationships in the system.

### HAS_CONNECTION (hasConnection)

General connections between any collections.

```typescript
import {EDGES, COLLECTIONS, CONNECTION_TYPES} from '@nlabs/metropolisjs';

const connectionActions = createConnectionActions(flux);

// User connects to group
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.GROUPS,
  'group456',
  CONNECTION_TYPES.MEMBER
);

// Post connects to group
await connectionActions.addConnection(
  COLLECTIONS.POSTS,
  'post789',
  COLLECTIONS.GROUPS,
  'group456',
  CONNECTION_TYPES.MEMBER,
  {publishedAt: Date.now()}
);

// Get all group connections
const groupConnections = await connectionActions.getConnections(
  COLLECTIONS.GROUPS,
  'group456'
);
```

### HAS_REACTION (hasReaction)

Reactions like likes, views, pins, etc.

```typescript
import {REACTION_TYPES} from '@nlabs/metropolisjs';

const reactionActions = createReactionActions(flux);

// Add like to post
await reactionActions.addReaction(
  'post123',
  COLLECTIONS.POSTS,
  {
    name: REACTION_TYPES.LIKE
  }
);

// Add view count
await reactionActions.addReaction(
  'post123',
  COLLECTIONS.POSTS,
  {
    name: REACTION_TYPES.VIEW,
    value: 1
  }
);

// Get reaction count
const likeCount = await reactionActions.getReactionCount(
  'post123',
  COLLECTIONS.POSTS,
  REACTION_TYPES.LIKE
);

// Check if user has reacted
const hasLiked = await reactionActions.hasReaction(
  'post123',
  COLLECTIONS.POSTS,
  REACTION_TYPES.LIKE,
  'outbound'
);
```

### IS_TAGGED (isTagged)

Tag associations for categorization.

```typescript
const tagActions = createTagActions(flux);

// Tag a post
await tagActions.tagItem(
  'post123',
  COLLECTIONS.POSTS,
  ['javascript', 'tutorial', 'beginner']
);

// Get items by tag
const taggedPosts = await tagActions.itemsByTag(
  'javascript',
  COLLECTIONS.POSTS
);

// Get tags for item
const postTags = await tagActions.tagsByItem(
  'post123',
  COLLECTIONS.POSTS
);

// Remove tag
await tagActions.untagItem(
  'post123',
  COLLECTIONS.POSTS,
  'beginner'
);
```

### HAS_FILE (hasFile)

File attachments to any collection.

```typescript
// Attach files to post
await connectionActions.addConnection(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.FILES,
  'file456',
  CONNECTION_TYPES.MEMBER,
  {
    order: 1,
    caption: 'Screenshot'
  }
);

// Attach image
await connectionActions.addConnection(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.IMAGES,
  'image789',
  CONNECTION_TYPES.MEMBER,
  {
    order: 2,
    caption: 'Header image'
  }
);

// Get post files
const files = await connectionActions.getConnections(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.FILES
);

// Get post images
const images = await connectionActions.getConnections(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.IMAGES
);
```

### HAS_CONVERSATION (hasConversation)

Links items to conversations for commenting/discussion.

```typescript
// Create conversation for post
const conversation = await conversationActions.add({
  type: 'post_comments',
  isGroup: true
});

// Link post to conversation
await connectionActions.addConnection(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.CONVERSATIONS,
  conversation.conversationId,
  CONNECTION_TYPES.MEMBER,
  {
    purpose: 'comments',
    createdAt: Date.now()
  }
);

// Get post conversation
const postConversations = await connectionActions.getConnections(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.CONVERSATIONS
);
```

## Connection Actions

### Creating Connections

```typescript
import {createConnectionActions} from '@nlabs/metropolisjs';

const connectionActions = createConnectionActions(flux);

interface ConnectionActions {
  addConnection: (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string,
    connectionType?: ConnectionType,
    metadata?: Record<string, any>
  ) => Promise<ConnectionEdge>;
  
  getConnections: (
    fromType: CollectionType,
    fromId: string,
    toType?: CollectionType,
    filters?: Record<string, any>
  ) => Promise<ConnectionEdge[]>;
  
  removeConnection: (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string
  ) => Promise<boolean>;
}
```

### Connection Edge Structure

```typescript
interface ConnectionEdge {
  _from?: string;                    // Source document ID (e.g., 'users/123')
  _to?: string;                      // Target document ID (e.g., 'groups/456')
  fromId?: string;                   // Source ID ('123')
  fromType?: CollectionType;         // Source collection ('users')
  toId?: string;                     // Target ID ('456')
  toType?: CollectionType;           // Target collection ('groups')
  connectionType?: ConnectionType;   // Connection type ('member', 'admin', etc.)
  status?: string;                   // Connection status
  metadata?: Record<string, any>;    // Additional data
}
```

### Examples

```typescript
// Add connection with metadata
const connection = await connectionActions.addConnection(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.GROUPS,
  'group456',
  CONNECTION_TYPES.MEMBER,
  {
    joinedAt: Date.now(),
    invitedBy: 'user789',
    role: 'contributor',
    permissions: ['post', 'comment']
  }
);

console.log('Connection created:', connection);

// Query connections with filters
const adminConnections = await connectionActions.getConnections(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.GROUPS,
  {
    connectionType: CONNECTION_TYPES.ADMIN,
    status: 'active'
  }
);

// Remove connection
await connectionActions.removeConnection(
  COLLECTIONS.USERS,
  'user123',
  COLLECTIONS.GROUPS,
  'group456'
);
```

## Reaction Management

Reactions provide engagement metrics for content.

### Reaction Types

```typescript
const reactionTypes = {
  LIKE: 'like',         // Positive feedback
  DISLIKE: 'dislike',   // Negative feedback
  VIEW: 'view',         // View count
  PIN: 'pin',           // Pin/bookmark
  RSVP: 'rsvp'         // Event RSVP
};
```

### Reaction Actions

```typescript
import {createReactionActions} from '@nlabs/metropolisjs';

const reactionActions = createReactionActions(flux);

interface ReactionActions {
  addReaction: (itemId, itemType, reaction, props?) => Promise<Reaction>;
  deleteReaction: (itemId, itemType, reactionName, props?) => Promise<Reaction>;
  getReactionCount: (itemId, itemType, reactionName) => Promise<number>;
  hasReaction: (itemId, itemType, reactionName, direction) => Promise<boolean>;
  abbreviateCount: (count) => string;
  updateReactionAdapter: (adapter) => void;
  updateReactionAdapterOptions: (options) => void;
}
```

### Reaction Examples

```typescript
// Like a post
await reactionActions.addReaction(
  'post123',
  COLLECTIONS.POSTS,
  {name: REACTION_TYPES.LIKE}
);

// Unlike a post
await reactionActions.deleteReaction(
  'post123',
  COLLECTIONS.POSTS,
  REACTION_TYPES.LIKE
);

// Track view
await reactionActions.addReaction(
  'post123',
  COLLECTIONS.POSTS,
  {
    name: REACTION_TYPES.VIEW,
    value: 1
  }
);

// Pin content
await reactionActions.addReaction(
  'post123',
  COLLECTIONS.POSTS,
  {name: REACTION_TYPES.PIN}
);

// RSVP to event
await reactionActions.addReaction(
  'event456',
  COLLECTIONS.POSTS,
  {
    name: REACTION_TYPES.RSVP,
    value: 'attending'
  }
);

// Get reaction counts
const likes = await reactionActions.getReactionCount(
  'post123',
  COLLECTIONS.POSTS,
  REACTION_TYPES.LIKE
);

const views = await reactionActions.getReactionCount(
  'post123',
  COLLECTIONS.POSTS,
  REACTION_TYPES.VIEW
);

// Check if current user has liked
const hasLiked = await reactionActions.hasReaction(
  'post123',
  COLLECTIONS.POSTS,
  REACTION_TYPES.LIKE,
  'outbound'
);

// Display abbreviated counts
console.log(reactionActions.abbreviateCount(1234));    // "1.2k"
console.log(reactionActions.abbreviateCount(1500000)); // "1.5m"
```

### Reaction Component Example

```typescript
const PostReactions: React.FC<{postId: string}> = ({postId}) => {
  const [likes, setLikes] = React.useState(0);
  const [hasLiked, setHasLiked] = React.useState(false);
  
  React.useEffect(() => {
    const loadReactions = async () => {
      const count = await reactionActions.getReactionCount(
        postId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.LIKE
      );
      setLikes(count);
      
      const liked = await reactionActions.hasReaction(
        postId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.LIKE,
        'outbound'
      );
      setHasLiked(liked);
    };
    
    loadReactions();
  }, [postId]);
  
  const handleLike = async () => {
    if (hasLiked) {
      await reactionActions.deleteReaction(
        postId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.LIKE
      );
      setLikes(likes - 1);
      setHasLiked(false);
    } else {
      await reactionActions.addReaction(
        postId,
        COLLECTIONS.POSTS,
        {name: REACTION_TYPES.LIKE}
      );
      setLikes(likes + 1);
      setHasLiked(true);
    }
  };
  
  return (
    <button onClick={handleLike}>
      {hasLiked ? '❤️' : '🤍'} {reactionActions.abbreviateCount(likes)}
    </button>
  );
};
```

## Tag Management

Tags provide flexible categorization across collections.

### Tag Actions

```typescript
import {createTagActions} from '@nlabs/metropolisjs';

const tagActions = createTagActions(flux);

// Tag operations
await tagActions.tagItem(itemId, collectionType, tags);
await tagActions.untagItem(itemId, collectionType, tagName);
const items = await tagActions.itemsByTag(tagName, collectionType);
const tags = await tagActions.tagsByItem(itemId, collectionType);
```

### Tag Examples

```typescript
// Tag a post
await tagActions.tagItem(
  'post123',
  COLLECTIONS.POSTS,
  ['javascript', 'tutorial', 'react']
);

// Tag a group
await tagActions.tagItem(
  'group456',
  COLLECTIONS.GROUPS,
  ['technology', 'programming', 'web-dev']
);

// Get all posts with tag
const jsPosts = await tagActions.itemsByTag(
  'javascript',
  COLLECTIONS.POSTS
);

// Get all tags for post
const postTags = await tagActions.tagsByItem(
  'post123',
  COLLECTIONS.POSTS
);

console.log('Tags:', postTags.map(t => t.name).join(', '));

// Remove specific tag
await tagActions.untagItem(
  'post123',
  COLLECTIONS.POSTS,
  'tutorial'
);

// Update tags (remove all and add new)
const currentTags = await tagActions.tagsByItem('post123', COLLECTIONS.POSTS);
await Promise.all(
  currentTags.map(tag => 
    tagActions.untagItem('post123', COLLECTIONS.POSTS, tag.name)
  )
);
await tagActions.tagItem('post123', COLLECTIONS.POSTS, ['updated', 'tags']);
```

### Tag Search Component

```typescript
const TagSearch: React.FC = () => {
  const [selectedTag, setSelectedTag] = React.useState('');
  const [posts, setPosts] = React.useState([]);
  
  const searchByTag = async (tagName: string) => {
    setSelectedTag(tagName);
    const results = await tagActions.itemsByTag(
      tagName,
      COLLECTIONS.POSTS
    );
    setPosts(results);
  };
  
  return (
    <div>
      <input
        type="text"
        placeholder="Search by tag"
        onChange={(e) => searchByTag(e.target.value)}
      />
      <div>
        {posts.map(post => (
          <div key={post.postId}>{post.name}</div>
        ))}
      </div>
    </div>
  );
};
```

## File Associations

Link files, images, and videos to any collection.

### Attaching Files

```typescript
// Attach file to post
await connectionActions.addConnection(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.FILES,
  'file456',
  CONNECTION_TYPES.MEMBER,
  {
    order: 1,
    caption: 'Project document',
    fileType: 'application/pdf'
  }
);

// Attach multiple images
const imageIds = ['img1', 'img2', 'img3'];
await Promise.all(
  imageIds.map((imageId, index) =>
    connectionActions.addConnection(
      COLLECTIONS.POSTS,
      'post123',
      COLLECTIONS.IMAGES,
      imageId,
      CONNECTION_TYPES.MEMBER,
      {
        order: index,
        caption: `Image ${index + 1}`
      }
    )
  )
);

// Attach video
await connectionActions.addConnection(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.VIDEOS,
  'video789',
  CONNECTION_TYPES.MEMBER,
  {
    order: 0,
    caption: 'Tutorial video',
    isFeatured: true
  }
);
```

### Retrieving Files

```typescript
// Get all post files
const files = await connectionActions.getConnections(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.FILES
);

// Get images ordered by metadata
const images = await connectionActions.getConnections(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.IMAGES
);
const sortedImages = images.sort((a, b) => 
  (a.metadata?.order || 0) - (b.metadata?.order || 0)
);

// Get all media (images + videos)
const allFiles = await connectionActions.getConnections(
  COLLECTIONS.POSTS,
  'post123'
);
const media = allFiles.filter(conn => 
  conn.toType === COLLECTIONS.IMAGES || 
  conn.toType === COLLECTIONS.VIDEOS
);
```

### File Upload Example

```typescript
const uploadAndAttach = async (
  file: File,
  postId: string
): Promise<void> => {
  // 1. Upload file (implement your upload logic)
  const uploadedFile = await uploadFileToServer(file);
  
  // 2. Create file metadata
  const fileMetadata = await fileActions.add({
    fileName: file.name,
    fileType: file.type,
    size: file.size,
    url: uploadedFile.url
  });
  
  // 3. Attach to post
  await connectionActions.addConnection(
    COLLECTIONS.POSTS,
    postId,
    COLLECTIONS.FILES,
    fileMetadata.fileId,
    CONNECTION_TYPES.MEMBER,
    {
      uploadedAt: Date.now(),
      caption: ''
    }
  );
};
```

## Conversation Links

Link conversations for comments, discussions, and messaging.

### Creating Conversation Links

```typescript
// Create conversation for post comments
const conversation = await conversationActions.add({
  type: 'post_comments',
  isGroup: true,
  name: 'Post Discussion'
});

// Link to post
await connectionActions.addConnection(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.CONVERSATIONS,
  conversation.conversationId,
  CONNECTION_TYPES.MEMBER,
  {
    purpose: 'comments',
    createdAt: Date.now()
  }
);

// Get post conversation
const postConversations = await connectionActions.getConnections(
  COLLECTIONS.POSTS,
  'post123',
  COLLECTIONS.CONVERSATIONS
);

const commentConversation = postConversations[0];
```

### Comment System Example

```typescript
const CommentSection: React.FC<{postId: string}> = ({postId}) => {
  const [conversationId, setConversationId] = React.useState('');
  const [messages, setMessages] = React.useState([]);
  
  React.useEffect(() => {
    const loadComments = async () => {
      // Get post conversation
      const conversations = await connectionActions.getConnections(
        COLLECTIONS.POSTS,
        postId,
        COLLECTIONS.CONVERSATIONS
      );
      
      if (conversations.length === 0) {
        // Create conversation if doesn't exist
        const conv = await conversationActions.add({
          type: 'post_comments',
          isGroup: true
        });
        
        await connectionActions.addConnection(
          COLLECTIONS.POSTS,
          postId,
          COLLECTIONS.CONVERSATIONS,
          conv.conversationId,
          CONNECTION_TYPES.MEMBER
        );
        
        setConversationId(conv.conversationId);
      } else {
        setConversationId(conversations[0].toId);
      }
    };
    
    loadComments();
  }, [postId]);
  
  React.useEffect(() => {
    if (conversationId) {
      const loadMessages = async () => {
        const msgs = await messageActions.listByConversation(
          conversationId,
          0,
          50
        );
        setMessages(msgs);
      };
      loadMessages();
    }
  }, [conversationId]);
  
  const addComment = async (content: string) => {
    await messageActions.add({
      conversationId,
      content,
      type: 'text'
    });
    // Reload messages
  };
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.messageId}>{msg.content}</div>
      ))}
      <textarea onBlur={(e) => addComment(e.target.value)} />
    </div>
  );
};
```

## Advanced Patterns

### Multi-hop Relationships

```typescript
// Get all posts from groups user is member of
const getUserGroupPosts = async (userId: string) => {
  // 1. Get user's groups
  const userGroups = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.GROUPS,
    {connectionType: CONNECTION_TYPES.MEMBER}
  );
  
  // 2. Get posts from each group
  const groupPosts = await Promise.all(
    userGroups.map(group =>
      connectionActions.getConnections(
        COLLECTIONS.GROUPS,
        group.toId,
        COLLECTIONS.POSTS
      )
    )
  );
  
  // 3. Flatten results
  return groupPosts.flat();
};
```

### Permission Checking

```typescript
const hasPermission = async (
  userId: string,
  groupId: string,
  permission: 'admin' | 'member'
): Promise<boolean> => {
  const connections = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.GROUPS
  );
  
  const groupConnection = connections.find(
    conn => conn.toId === groupId
  );
  
  if (!groupConnection) return false;
  
  if (permission === 'admin') {
    return groupConnection.connectionType === CONNECTION_TYPES.ADMIN;
  }
  
  return groupConnection.connectionType === CONNECTION_TYPES.ADMIN ||
         groupConnection.connectionType === CONNECTION_TYPES.MEMBER;
};

// Usage
const canManageGroup = await hasPermission('user123', 'group456', 'admin');
const canViewGroup = await hasPermission('user123', 'group456', 'member');
```

### Social Feed

```typescript
const getSocialFeed = async (userId: string) => {
  // Get users I'm following
  const following = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USERS,
    {connectionType: CONNECTION_TYPES.FOLLOWING}
  );
  
  // Get posts from followed users
  const followedUserIds = following.map(conn => conn.toId);
  const feedPosts = await Promise.all(
    followedUserIds.map(async (followedUserId) => {
      // Query posts by user
      const userPosts = await postActions.listByLatest(0, 10);
      return userPosts.filter(post => post.userId === followedUserId);
    })
  );
  
  // Combine and sort by date
  return feedPosts
    .flat()
    .sort((a, b) => (b.added || 0) - (a.added || 0));
};
```

### Recommendation Engine

```typescript
const getRecommendedGroups = async (userId: string) => {
  // Get user's current groups
  const userGroups = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.GROUPS,
    {connectionType: CONNECTION_TYPES.MEMBER}
  );
  
  const userGroupIds = new Set(userGroups.map(g => g.toId));
  
  // Get tags from user's groups
  const groupTags = await Promise.all(
    Array.from(userGroupIds).map(groupId =>
      tagActions.tagsByItem(groupId, COLLECTIONS.GROUPS)
    )
  );
  
  const allTags = groupTags.flat().map(t => t.name);
  const uniqueTags = [...new Set(allTags)];
  
  // Find groups with similar tags
  const similarGroups = await Promise.all(
    uniqueTags.map(tag =>
      tagActions.itemsByTag(tag, COLLECTIONS.GROUPS)
    )
  );
  
  // Filter out groups user is already in
  return similarGroups
    .flat()
    .filter(group => !userGroupIds.has(group.groupId))
    .slice(0, 10);
};
```

## Best Practices

### 1. Use Appropriate Connection Types

```typescript
// ✅ Correct - semantic connection types
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  userId,
  COLLECTIONS.GROUPS,
  groupId,
  CONNECTION_TYPES.ADMIN  // Clear meaning
);

// ❌ Incorrect - generic connection type
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  userId,
  COLLECTIONS.GROUPS,
  groupId,
  CONNECTION_TYPES.MEMBER  // Too generic for admin
);
```

### 2. Store Relevant Metadata

```typescript
// ✅ Good - meaningful metadata
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  userId,
  COLLECTIONS.GROUPS,
  groupId,
  CONNECTION_TYPES.MEMBER,
  {
    joinedAt: Date.now(),
    invitedBy: inviterUserId,
    role: 'contributor',
    permissions: ['post', 'comment']
  }
);

// ❌ Bad - missing context
await connectionActions.addConnection(
  COLLECTIONS.USERS,
  userId,
  COLLECTIONS.GROUPS,
  groupId,
  CONNECTION_TYPES.MEMBER
);
```

### 3. Clean Up Orphaned Connections

```typescript
// When deleting a post, remove all connections
const deletePostWithConnections = async (postId: string) => {
  // Remove reactions
  // Remove tags
  // Remove file connections
  // Remove conversation links
  
  // Finally delete the post
  await postActions.delete(postId);
};
```

### 4. Implement Bidirectional Checks

```typescript
// Check both directions for symmetric relationships
const areUsersFriends = async (userId1: string, userId2: string) => {
  const user1Following = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId1,
    COLLECTIONS.USERS,
    {connectionType: CONNECTION_TYPES.FOLLOWING}
  );
  
  const user2Following = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId2,
    COLLECTIONS.USERS,
    {connectionType: CONNECTION_TYPES.FOLLOWING}
  );
  
  const user1FollowsUser2 = user1Following.some(c => c.toId === userId2);
  const user2FollowsUser1 = user2Following.some(c => c.toId === userId1);
  
  return user1FollowsUser2 && user2FollowsUser1;
};
```

### 5. Batch Connection Operations

```typescript
// ✅ Efficient - batch operations
const addUserToGroups = async (userId: string, groupIds: string[]) => {
  await Promise.all(
    groupIds.map(groupId =>
      connectionActions.addConnection(
        COLLECTIONS.USERS,
        userId,
        COLLECTIONS.GROUPS,
        groupId,
        CONNECTION_TYPES.MEMBER
      )
    )
  );
};

// ❌ Inefficient - sequential operations
const addUserToGroupsSequential = async (userId: string, groupIds: string[]) => {
  for (const groupId of groupIds) {
    await connectionActions.addConnection(
      COLLECTIONS.USERS,
      userId,
      COLLECTIONS.GROUPS,
      groupId,
      CONNECTION_TYPES.MEMBER
    );
  }
};
```

### 6. Cache Connection Queries

```typescript
// Cache frequently accessed connections
const connectionCache = new Map<string, ConnectionEdge[]>();

const getCachedConnections = async (
  fromType: CollectionType,
  fromId: string,
  toType?: CollectionType
): Promise<ConnectionEdge[]> => {
  const cacheKey = `${fromType}:${fromId}:${toType || 'all'}`;
  
  if (connectionCache.has(cacheKey)) {
    return connectionCache.get(cacheKey)!;
  }
  
  const connections = await connectionActions.getConnections(
    fromType,
    fromId,
    toType
  );
  
  connectionCache.set(cacheKey, connections);
  
  // Clear cache after 5 minutes
  setTimeout(() => connectionCache.delete(cacheKey), 300000);
  
  return connections;
};
```

### 7. Validate Before Creating Connections

```typescript
const addMemberToGroup = async (userId: string, groupId: string) => {
  // Check if already member
  const existing = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.GROUPS,
    {connectionType: CONNECTION_TYPES.MEMBER}
  );
  
  if (existing.some(conn => conn.toId === groupId)) {
    throw new Error('User is already a member');
  }
  
  // Check if blocked
  const blocked = await connectionActions.getConnections(
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.GROUPS,
    {connectionType: CONNECTION_TYPES.BLOCKED}
  );
  
  if (blocked.some(conn => conn.toId === groupId)) {
    throw new Error('User is blocked from this group');
  }
  
  // Add connection
  return await connectionActions.addConnection(
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.GROUPS,
    groupId,
    CONNECTION_TYPES.MEMBER
  );
};
```

### 8. Use Transactions for Complex Operations

```typescript
// Atomic operation to transfer group ownership
const transferGroupOwnership = async (
  groupId: string,
  currentOwnerId: string,
  newOwnerId: string
) => {
  try {
    // Remove current owner's admin status
    await connectionActions.removeConnection(
      COLLECTIONS.USERS,
      currentOwnerId,
      COLLECTIONS.GROUPS,
      groupId
    );
    
    // Add current owner as regular member
    await connectionActions.addConnection(
      COLLECTIONS.USERS,
      currentOwnerId,
      COLLECTIONS.GROUPS,
      groupId,
      CONNECTION_TYPES.MEMBER
    );
    
    // Remove new owner's member status
    await connectionActions.removeConnection(
      COLLECTIONS.USERS,
      newOwnerId,
      COLLECTIONS.GROUPS,
      groupId
    );
    
    // Add new owner as admin
    await connectionActions.addConnection(
      COLLECTIONS.USERS,
      newOwnerId,
      COLLECTIONS.GROUPS,
      groupId,
      CONNECTION_TYPES.ADMIN,
      {
        grantedAt: Date.now(),
        grantedBy: currentOwnerId
      }
    );
  } catch (error) {
    // Rollback logic if needed
    console.error('Transfer failed:', error);
    throw error;
  }
};
```

## Next Steps

- [CRUD Integration Guide](./CRUD_INTEGRATION.md) - Learn CRUD patterns
- [Collections Reference](./COLLECTIONS.md) - Collection field details
- [MetropolisJS Documentation](../README.md) - Main library docs
