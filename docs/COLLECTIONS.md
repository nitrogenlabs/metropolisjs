# MetropolisJS Collections Reference

Comprehensive reference for all MetropolisJS collection types, including available fields, CRUD operations, and specific examples.

## Table of Contents

- [Collection Overview](#collection-overview)
- [Users](#users)
- [Posts](#posts)
- [Groups](#groups)
- [Messages](#messages)
- [Conversations](#conversations)
- [Videos](#videos)
- [Images](#images)
- [Files](#files)
- [Apps](#apps)
- [Profiles](#profiles)
- [Tags](#tags)
- [Content](#content)

## Collection Overview

All collections in MetropolisJS share common patterns and base fields through the `BaseDocument` and `ExtensibleFields` interfaces.

### Common Base Fields

All collection types include these base fields:

```typescript
interface BaseDocument {
  _id?: string;       // ArangoDB internal ID (e.g., 'posts/123')
  _key?: string;      // ArangoDB key (e.g., '123')
  _rev?: string;      // ArangoDB revision
  added?: number;     // Creation timestamp (Unix epoch)
  id?: string;        // External ID reference
  modified?: number;  // Last modification timestamp
  type?: string;      // Item type/category
  updated?: number;   // Last update timestamp
}

interface ExtensibleFields {
  [key: string]: any; // Custom fields for application-specific data
}
```

### Collections Constant

```typescript
import {COLLECTIONS} from '@nlabs/metropolisjs';

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
```

## Users

User accounts and authentication.

### User Fields

```typescript
interface UserType extends BaseDocument, ExtensibleFields {
  birthdate?: number;      // Birth date (Unix timestamp)
  email?: string;          // User email
  imageUrl?: string;       // Profile image URL
  locale?: string;         // User locale (e.g., 'en-US')
  name?: string;           // Display name
  phoneNumber?: string;    // Phone number
  thumbUrl?: string;       // Thumbnail image URL
  userId?: string;         // Unique user identifier
  username?: string;       // Unique username
}
```

### User Actions

```typescript
import {createUserActions} from '@nlabs/metropolisjs';

const userActions = createUserActions(flux);

interface UserActions {
  signIn: (credentials, expires?) => Promise<Session>;
  signOut: () => Promise<boolean>;
  signUp: (userData) => Promise<User>;
  itemById: (userId, props?) => Promise<User>;
  update: (userData, props?) => Promise<User>;
  delete: (userId, props?) => Promise<User>;
  refreshSession: () => Promise<Session>;
  updateUserAdapter: (adapter) => void;
  updateUserAdapterOptions: (options) => void;
}
```

### User Examples

```typescript
// Sign up new user
const newUser = await userActions.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  username: 'johndoe',
  name: 'John Doe',
  birthdate: Date.parse('1990-01-01')
});

// Sign in
const session = await userActions.signIn({
  username: 'johndoe',
  password: 'securePassword123'
}, 86400); // Expires in 24 hours

// Get user profile
const user = await userActions.itemById('user123', [
  'email',
  'imageUrl',
  'thumbUrl'
]);

// Update profile
const updatedUser = await userActions.update({
  userId: 'user123',
  name: 'John Smith',
  locale: 'en-US',
  bio: 'Software developer' // Extensible field
});

// Refresh session
const refreshedSession = await userActions.refreshSession();

// Sign out
await userActions.signOut();
```

## Posts

User-generated content including text, events, and media.

### Post Fields

```typescript
interface PostType extends BaseDocument, ExtensibleFields {
  content?: string;        // Post content/body
  endDate?: number;        // Event end date (Unix timestamp)
  files?: any[];           // Attached files
  groupId?: string;        // Parent group ID
  latitude?: number;       // Location latitude
  location?: string;       // Location name
  longitude?: number;      // Location longitude
  name?: string;           // Post title
  parentId?: string;       // Parent post ID (for comments)
  postId?: string;         // Unique post identifier
  privacy?: string;        // Privacy setting ('public', 'private', etc.)
  startDate?: number;      // Event start date (Unix timestamp)
  tags?: any[];           // Associated tags
  userId?: string;         // Author user ID
}
```

### Post Actions

```typescript
import {createPostActions} from '@nlabs/metropolisjs';

const postActions = createPostActions(flux);

interface PostActions {
  add: (postData, props?) => Promise<Post>;
  itemById: (postId, props?) => Promise<Post>;
  listByLatest: (from?, to?, props?) => Promise<Post[]>;
  listByLocation: (lat, lng, from?, to?, props?) => Promise<Post[]>;
  listByReactions: (reactions, lat, lng, from?, to?, props?) => Promise<Post[]>;
  listByTags: (tags, lat, lng, from?, to?, props?) => Promise<Post[]>;
  delete: (postId, props?) => Promise<Post>;
  update: (postData, props?) => Promise<Post>;
  updatePostAdapter: (adapter) => void;
  updatePostAdapterOptions: (options) => void;
}
```

### Post Examples

```typescript
// Create text post
const textPost = await postActions.add({
  name: 'Announcement',
  content: 'Important update for everyone!',
  type: 'text',
  privacy: 'public'
});

// Create event post
const eventPost = await postActions.add({
  name: 'Community Meetup',
  content: 'Join us for our monthly meetup',
  type: 'event',
  startDate: Date.parse('2024-06-15T18:00:00'),
  endDate: Date.parse('2024-06-15T21:00:00'),
  location: 'San Francisco',
  latitude: 37.7749,
  longitude: -122.4194
});

// Create post with tags
const taggedPost = await postActions.add({
  name: 'Tech News',
  content: 'Latest developments in AI',
  tags: [
    {name: 'technology'},
    {name: 'ai'},
    {name: 'news'}
  ]
});

// Get post with nested data
const post = await postActions.itemById('post123', [
  'tags {name, tagId}',
  'user {username, imageUrl, thumbUrl}',
  'files {fileId, fileName, fileType}',
  'viewCount',
  'likeCount'
]);

// List recent posts
const recentPosts = await postActions.listByLatest(0, 20, [
  'name',
  'content',
  'user {username}',
  'viewCount'
]);

// List posts by location
const nearbyPosts = await postActions.listByLocation(
  37.7749,    // latitude
  -122.4194,  // longitude
  0,          // from
  10,         // to
  ['name', 'location', 'distance']
);

// List popular posts by reactions
const popularPosts = await postActions.listByReactions(
  ['like', 'view'],  // reaction types
  37.7749,
  -122.4194,
  0,
  20
);

// List posts by tags
const techPosts = await postActions.listByTags(
  ['technology', 'programming'],
  37.7749,
  -122.4194,
  0,
  20
);

// Update post
await postActions.update({
  postId: 'post123',
  content: 'Updated content',
  edited: Date.now() // Extensible field
});

// Delete post
await postActions.delete('post123');
```

## Groups

Communities and organizational units.

### Group Fields

```typescript
interface GroupType extends BaseDocument, ExtensibleFields {
  description?: string;           // Group description
  groupId?: string;               // Unique group identifier
  imageUrl?: string;              // Group image URL
  isPrivate?: boolean;            // Privacy flag
  memberCount?: number;           // Number of members
  name?: string;                  // Group name
  ownerId?: string;               // Owner user ID
  settings?: Record<string, any>; // Group settings
  tags?: any[];                   // Associated tags
  thumbUrl?: string;              // Thumbnail image URL
  userId?: string;                // Associated user ID
}
```

### Group Actions

```typescript
import {createGroupActions} from '@nlabs/metropolisjs';

const groupActions = createGroupActions(flux);

interface GroupActions {
  add: (groupData, props?) => Promise<Group>;
  itemById: (groupId, props?) => Promise<Group>;
  listByLatest: (from?, to?, props?) => Promise<Group[]>;
  delete: (groupId, props?) => Promise<Group>;
  update: (groupData, props?) => Promise<Group>;
  updateGroupAdapter: (adapter) => void;
  updateGroupAdapterOptions: (options) => void;
}
```

### Group Examples

```typescript
// Create public group
const publicGroup = await groupActions.add({
  name: 'JavaScript Developers',
  description: 'Community for JS developers',
  type: 'community',
  isPrivate: false,
  settings: {
    allowInvites: true,
    requireApproval: false,
    allowPublicPosts: true
  }
});

// Create private group
const privateGroup = await groupActions.add({
  name: 'Project Team',
  description: 'Internal project team',
  type: 'team',
  isPrivate: true,
  settings: {
    allowInvites: false,
    requireApproval: true
  }
});

// Get group details
const group = await groupActions.itemById('group123', [
  'memberCount',
  'tags {name}',
  'settings'
]);

// List groups
const groups = await groupActions.listByLatest(0, 20, [
  'name',
  'description',
  'memberCount',
  'isPrivate'
]);

// Update group settings
await groupActions.update({
  groupId: 'group123',
  settings: {
    allowInvites: true,
    requireApproval: false,
    maxMembers: 100
  }
});

// Delete group
await groupActions.delete('group123');
```

## Messages

Direct messages and group chat messages.

### Message Fields

```typescript
interface MessageType extends BaseDocument, ExtensibleFields {
  content?: string;           // Message content
  conversationId?: string;    // Parent conversation ID
  files?: any[];             // Attached files
  messageId?: string;        // Unique message identifier
  metadata?: Record<string, any>; // Additional metadata
  parentId?: string;         // Parent message ID (for threads)
  status?: string;           // Message status
  userId?: string;           // Sender user ID
}
```

### Message Actions

```typescript
import {createMessageActions} from '@nlabs/metropolisjs';

const messageActions = createMessageActions(flux);

interface MessageActions {
  add: (messageData, props?) => Promise<Message>;
  itemById: (messageId, props?) => Promise<Message>;
  listByConversation: (conversationId, from?, to?, props?) => Promise<Message[]>;
  delete: (messageId, props?) => Promise<Message>;
  update: (messageData, props?) => Promise<Message>;
  updateMessageAdapter: (adapter) => void;
  updateMessageAdapterOptions: (options) => void;
}
```

### Message Examples

```typescript
// Send message
const message = await messageActions.add({
  conversationId: 'conv123',
  content: 'Hello, how are you?',
  type: 'text'
});

// Send message with attachments
const messageWithFiles = await messageActions.add({
  conversationId: 'conv123',
  content: 'Check out these files',
  files: [
    {fileId: 'file1', fileName: 'document.pdf'},
    {fileId: 'file2', fileName: 'image.jpg'}
  ]
});

// Get message
const msg = await messageActions.itemById('msg123', [
  'user {username, imageUrl}',
  'files {fileId, fileName, fileUrl}'
]);

// List conversation messages
const messages = await messageActions.listByConversation(
  'conv123',
  0,
  50,
  ['content', 'user {username}', 'added']
);

// Update message (edit)
await messageActions.update({
  messageId: 'msg123',
  content: 'Updated message content',
  editedAt: Date.now() // Extensible field
});

// Delete message
await messageActions.delete('msg123');
```

## Conversations

Chat threads and message containers.

### Conversation Fields

```typescript
interface ConversationType extends BaseDocument, ExtensibleFields {
  conversationId?: string;   // Unique conversation identifier
  isGroup?: boolean;         // Group conversation flag
  lastMessage?: string;      // Last message preview
  lastMessageTime?: number;  // Last message timestamp
  name?: string;             // Conversation name
  participants?: any[];      // Participant user IDs
  settings?: Record<string, any>; // Conversation settings
}
```

### Conversation Actions

```typescript
import {createConversationActions} from '@nlabs/metropolisjs';

const conversationActions = createConversationActions(flux);

interface ConversationActions {
  add: (conversationData, props?) => Promise<Conversation>;
  itemById: (conversationId, props?) => Promise<Conversation>;
  listByUser: (userId, from?, to?, props?) => Promise<Conversation[]>;
  delete: (conversationId, props?) => Promise<Conversation>;
  update: (conversationData, props?) => Promise<Conversation>;
  updateConversationAdapter: (adapter) => void;
  updateConversationAdapterOptions: (options) => void;
}
```

### Conversation Examples

```typescript
// Create direct conversation
const directConversation = await conversationActions.add({
  participants: ['user1', 'user2'],
  isGroup: false,
  type: 'direct'
});

// Create group conversation
const groupConversation = await conversationActions.add({
  name: 'Team Chat',
  participants: ['user1', 'user2', 'user3'],
  isGroup: true,
  type: 'group',
  settings: {
    allowInvites: true,
    muteNotifications: false
  }
});

// Get conversation
const conversation = await conversationActions.itemById('conv123', [
  'participants {userId, username, imageUrl}',
  'lastMessage',
  'lastMessageTime'
]);

// List user conversations
const conversations = await conversationActions.listByUser(
  'user123',
  0,
  20,
  ['name', 'lastMessage', 'lastMessageTime']
);

// Update conversation settings
await conversationActions.update({
  conversationId: 'conv123',
  settings: {
    muteNotifications: true
  }
});

// Delete conversation
await conversationActions.delete('conv123');
```

## Videos

Video content and metadata.

### Video Fields

```typescript
interface VideoType extends BaseDocument, ExtensibleFields {
  description?: string;     // Video description
  duration?: number;        // Duration in seconds
  format?: string;         // Video format (mp4, webm, etc.)
  height?: number;         // Video height in pixels
  name?: string;           // Video title
  size?: number;           // File size in bytes
  thumbnailUrl?: string;   // Thumbnail image URL
  url?: string;            // Video URL
  userId?: string;         // Owner user ID
  videoId?: string;        // Unique video identifier
  width?: number;          // Video width in pixels
}
```

### Video Actions

```typescript
import {createVideoActions} from '@nlabs/metropolisjs';

const videoActions = createVideoActions(flux);

interface VideoActions {
  add: (videoData, props?) => Promise<Video>;
  itemById: (videoId, props?) => Promise<Video>;
  listByLatest: (from?, to?, props?) => Promise<Video[]>;
  delete: (videoId, props?) => Promise<Video>;
  update: (videoData, props?) => Promise<Video>;
  updateVideoAdapter: (adapter) => void;
  updateVideoAdapterOptions: (options) => void;
}
```

### Video Examples

```typescript
// Upload video metadata
const video = await videoActions.add({
  name: 'Tutorial Video',
  description: 'Learn TypeScript basics',
  url: 'https://cdn.example.com/videos/tutorial.mp4',
  thumbnailUrl: 'https://cdn.example.com/thumbnails/tutorial.jpg',
  duration: 600,
  width: 1920,
  height: 1080,
  format: 'mp4',
  size: 52428800 // 50MB in bytes
});

// Get video
const vid = await videoActions.itemById('video123', [
  'url',
  'thumbnailUrl',
  'duration',
  'user {username}'
]);

// List videos
const videos = await videoActions.listByLatest(0, 20, [
  'name',
  'thumbnailUrl',
  'duration'
]);

// Update video
await videoActions.update({
  videoId: 'video123',
  description: 'Updated description',
  tags: ['tutorial', 'typescript'] // Extensible field
});

// Delete video
await videoActions.delete('video123');
```

## Images

Image content and metadata.

### Image Fields

```typescript
interface ImageType extends BaseDocument, ExtensibleFields {
  alt?: string;            // Alt text
  description?: string;    // Image description
  format?: string;         // Image format (jpg, png, webp, etc.)
  height?: number;         // Image height in pixels
  imageId?: string;        // Unique image identifier
  name?: string;           // Image name
  size?: number;           // File size in bytes
  thumbUrl?: string;       // Thumbnail URL
  url?: string;            // Image URL
  userId?: string;         // Owner user ID
  width?: number;          // Image width in pixels
}
```

### Image Actions

```typescript
import {createImageActions} from '@nlabs/metropolisjs';

const imageActions = createImageActions(flux);

interface ImageActions {
  add: (imageData, props?) => Promise<Image>;
  itemById: (imageId, props?) => Promise<Image>;
  listByLatest: (from?, to?, props?) => Promise<Image[]>;
  delete: (imageId, props?) => Promise<Image>;
  update: (imageData, props?) => Promise<Image>;
  updateImageAdapter: (adapter) => void;
  updateImageAdapterOptions: (options) => void;
}
```

### Image Examples

```typescript
// Upload image metadata
const image = await imageActions.add({
  name: 'Profile Picture',
  alt: 'User profile photo',
  url: 'https://cdn.example.com/images/profile.jpg',
  thumbUrl: 'https://cdn.example.com/images/profile_thumb.jpg',
  width: 1024,
  height: 1024,
  format: 'jpg',
  size: 204800 // 200KB
});

// Get image
const img = await imageActions.itemById('image123', [
  'url',
  'thumbUrl',
  'width',
  'height'
]);

// List images
const images = await imageActions.listByLatest(0, 20, [
  'name',
  'thumbUrl',
  'user {username}'
]);

// Update image
await imageActions.update({
  imageId: 'image123',
  alt: 'Updated alt text',
  tags: ['profile', 'avatar'] // Extensible field
});

// Delete image
await imageActions.delete('image123');
```

## Files

Generic file storage and metadata.

### File Fields

```typescript
interface FileType extends BaseDocument, ExtensibleFields {
  description?: string;    // File description
  fileId?: string;         // Unique file identifier
  fileName?: string;       // File name
  fileType?: string;       // MIME type
  mimeType?: string;       // MIME type (alternative)
  name?: string;           // Display name
  size?: number;           // File size in bytes
  url?: string;            // File URL
  userId?: string;         // Owner user ID
}
```

### File Examples

```typescript
// Upload file metadata
const file = await fileActions.add({
  fileName: 'document.pdf',
  name: 'Project Proposal',
  description: 'Q4 2024 proposal',
  fileType: 'application/pdf',
  url: 'https://cdn.example.com/files/proposal.pdf',
  size: 1048576 // 1MB
});

// Get file
const f = await fileActions.itemById('file123', [
  'url',
  'fileName',
  'fileType',
  'size'
]);

// List files
const files = await fileActions.listByLatest(0, 20);

// Update file
await fileActions.update({
  fileId: 'file123',
  description: 'Updated description'
});

// Delete file
await fileActions.delete('file123');
```

## Apps

Application integrations and third-party connections.

### App Fields

```typescript
interface AppType extends BaseDocument, ExtensibleFields {
  appId?: string;            // Unique app identifier
  apiKey?: string;           // API key
  credentials?: Record<string, any>; // App credentials
  description?: string;      // App description
  isActive?: boolean;        // Active status
  name?: string;             // App name
  settings?: Record<string, any>; // App settings
  userId?: string;           // Owner user ID
  webhookUrl?: string;       // Webhook URL
}
```

### App Examples

```typescript
// Register app
const app = await appActions.add({
  name: 'Slack Integration',
  description: 'Connect with Slack workspace',
  apiKey: 'sk_live_...',
  webhookUrl: 'https://hooks.slack.com/services/...',
  isActive: true,
  settings: {
    channel: '#general',
    notifications: true
  }
});

// Get app
const application = await appActions.itemById('app123', [
  'name',
  'isActive',
  'settings'
]);

// List apps
const apps = await appActions.listByLatest(0, 20);

// Update app settings
await appActions.update({
  appId: 'app123',
  settings: {
    channel: '#announcements',
    notifications: false
  }
});

// Delete app
await appActions.delete('app123');
```

## Profiles

Extended user profiles with additional information.

### Profile Fields

```typescript
interface ProfileType extends BaseDocument, ExtensibleFields {
  bio?: string;              // User biography
  company?: string;          // Company name
  location?: string;         // Location string
  profileId?: string;        // Unique profile identifier
  social?: Record<string, string>; // Social media links
  title?: string;            // Job title
  userId?: string;           // Associated user ID
  website?: string;          // Website URL
}
```

### Profile Examples

```typescript
// Create profile
const profile = await profileActions.add({
  userId: 'user123',
  bio: 'Software engineer passionate about web technologies',
  title: 'Senior Developer',
  company: 'Tech Corp',
  location: 'San Francisco, CA',
  website: 'https://example.com',
  social: {
    twitter: 'https://twitter.com/username',
    linkedin: 'https://linkedin.com/in/username',
    github: 'https://github.com/username'
  }
});

// Get profile
const prof = await profileActions.itemById('profile123');

// Update profile
await profileActions.update({
  profileId: 'profile123',
  bio: 'Updated bio',
  title: 'Lead Developer'
});

// Delete profile
await profileActions.delete('profile123');
```

## Tags

Categorization and organization tags.

### Tag Fields

```typescript
interface TagType extends BaseDocument, ExtensibleFields {
  color?: string;          // Tag color (hex)
  description?: string;    // Tag description
  name?: string;           // Tag name
  tagId?: string;          // Unique tag identifier
  usageCount?: number;     // Number of times used
}
```

### Tag Examples

```typescript
// Create tag
const tag = await tagActions.add({
  name: 'javascript',
  description: 'JavaScript programming language',
  color: '#f7df1e'
});

// Get tag
const t = await tagActions.itemById('tag123', [
  'usageCount'
]);

// List tags
const tags = await tagActions.listByLatest(0, 50);

// Update tag
await tagActions.update({
  tagId: 'tag123',
  description: 'Updated description'
});

// Delete tag
await tagActions.delete('tag123');
```

## Content

CMS content and localized strings.

### Content Fields

```typescript
interface ContentType extends BaseDocument, ExtensibleFields {
  category?: string;       // Content category
  content?: string;        // Content body
  contentId?: string;      // Unique content identifier
  description?: string;    // Content description
  isActive?: boolean;      // Active status
  key?: string;            // Content key (unique per locale)
  locale?: string;         // Locale (e.g., 'en', 'es', 'fr')
}
```

### Content Actions

```typescript
import {createContentActions} from '@nlabs/metropolisjs';

const contentActions = createContentActions(flux);

interface ContentActions {
  add: (contentData, props?) => Promise<Content>;
  itemById: (contentId, props?) => Promise<Content>;
  itemByKey: (key, locale?, props?) => Promise<Content>;
  listByCategory: (category, props?) => Promise<Content[]>;
  list: (props?) => Promise<Content[]>;
  delete: (contentId, props?) => Promise<Content>;
  update: (contentData, props?) => Promise<Content>;
  updateContentAdapter: (adapter) => void;
  updateContentAdapterOptions: (options) => void;
}
```

### Content Examples

```typescript
// Create content
const content = await contentActions.add({
  key: 'welcome_message',
  locale: 'en',
  content: 'Welcome to our platform!',
  category: 'onboarding',
  description: 'Welcome message for new users',
  isActive: true
});

// Create localized content
const spanishContent = await contentActions.add({
  key: 'welcome_message',
  locale: 'es',
  content: '¡Bienvenido a nuestra plataforma!',
  category: 'onboarding',
  isActive: true
});

// Get content by key
const welcomeMsg = await contentActions.itemByKey('welcome_message', 'en');

// Get content by ID
const contentById = await contentActions.itemById('content123');

// List by category
const onboardingContent = await contentActions.listByCategory('onboarding', [
  'key',
  'locale',
  'content'
]);

// List all content
const allContent = await contentActions.list(['key', 'locale', 'category']);

// Update content
await contentActions.update({
  contentId: 'content123',
  content: 'Updated welcome message'
});

// Delete content
await contentActions.delete('content123');
```

## Best Practices by Collection

### Posts
- Always include `tags` and `user` relations when listing
- Use location queries for location-based features
- Implement pagination for large lists
- Use `parentId` for comment threading

### Groups
- Store group permissions in `settings`
- Use `memberCount` for display purposes
- Implement connection checks for private groups
- Use extensible fields for group-specific features

### Messages
- Always include `conversationId`
- Load messages in batches (pagination)
- Use `parentId` for message threads
- Store read receipts in extensible fields

### Videos/Images/Files
- Store CDN URLs, not binary data
- Include dimensions for responsive layouts
- Use thumbnails for list views
- Validate file types and sizes client-side

### Users
- Never expose sensitive fields (passwords, tokens)
- Use separate profile collection for extended data
- Implement proper authentication checks
- Store preferences in extensible fields

## Next Steps

- [CRUD Integration Guide](./CRUD_INTEGRATION.md) - Learn CRUD patterns
- [Connections Guide](./CONNECTIONS.md) - Manage relationships
- [MetropolisJS Documentation](../README.md) - Main library docs
