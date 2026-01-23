/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 * 
 * Comprehensive CRUD Operations Examples for MetropolisJS
 * 
 * This file demonstrates complete Create, Read, Update, Delete operations
 * for all major collections in MetropolisJS with React components showing
 * real-world usage patterns, error handling, and state management.
 */

import React, {useEffect, useState} from 'react';
import {useFlux} from '@nlabs/arkhamjs-utils-react';
import {
  usePostActions,
  useGroupActions,
  useMessageActions,
  createConversationActions,
  useEventActions,
  useUserActions,
  type PostType,
  type GroupType,
  type MessageType,
  type ConversationType,
  type EventType
} from '@nlabs/metropolisjs';

// =============================================================================
// Posts CRUD Operations
// =============================================================================

export const PostCreatorExample = () => {
  const flux = useFlux();
  const postActions = usePostActions();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePost = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const newPost = await postActions.add({
        content,
        type: 'post',
        privacy: 'public'
      }, ['postId', 'content', 'userId', 'createdAt']);

      console.log('Post created:', newPost);
      setContent('');
    } catch(err: any) {
      setError(err.message || 'Failed to create post');
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="post-creator">
      <h2>Create Post</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        disabled={isSubmitting}
      />
      {error && <div className="error">{error}</div>}
      <button 
        onClick={handleCreatePost}
        disabled={!content || isSubmitting}
      >
        {isSubmitting ? 'Posting...' : 'Create Post'}
      </button>
    </div>
  );
};

export const PostListExample = () => {
  const postActions = usePostActions();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const from = page * pageSize;
        const to = from + pageSize;

        const loadedPosts = await postActions.listByLatest(
          from,
          to,
          ['postId', 'content', 'userId', 'createdAt', 'tags']
        );

        setPosts(loadedPosts);
      } catch(err: any) {
        setError(err.message || 'Failed to load posts');
        console.error('Error loading posts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [page, postActions]);

  const handleNextPage = () => setPage(p => p + 1);
  const handlePrevPage = () => setPage(p => Math.max(0, p - 1));

  if(isLoading) return <div>Loading posts...</div>;
  if(error) return <div className="error">Error: {error}</div>;

  return (
    <div className="post-list">
      <h2>Recent Posts</h2>
      {posts.length === 0 ? (
        <p>No posts found</p>
      ) : (
        <ul>
          {posts.map(post => (
            <li key={post.postId}>
              <p>{post.content}</p>
              <small>Posted at: {post.createdAt}</small>
            </li>
          ))}
        </ul>
      )}
      <div className="pagination">
        <button onClick={handlePrevPage} disabled={page === 0}>Previous</button>
        <span>Page {page + 1}</span>
        <button onClick={handleNextPage}>Next</button>
      </div>
    </div>
  );
};

export const PostDetailExample = ({postId}: {postId: string}) => {
  const postActions = usePostActions();
  const [post, setPost] = useState<PostType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedPost = await postActions.itemById(postId, [
          'postId',
          'content',
          'userId',
          'createdAt',
          'updatedAt',
          'tags',
          'files'
        ]);

        setPost(loadedPost);
        setEditContent(loadedPost.content || '');
      } catch(err: any) {
        setError(err.message || 'Failed to load post');
        console.error('Error loading post:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [postId, postActions]);

  const handleUpdatePost = async () => {
    if(!post) return;

    try {
      setError(null);

      const updatedPost = await postActions.update({
        postId: post.postId,
        content: editContent
      }, ['postId', 'content', 'updatedAt']);

      setPost(updatedPost);
      setIsEditing(false);
    } catch(err: any) {
      setError(err.message || 'Failed to update post');
      console.error('Error updating post:', err);
    }
  };

  const handleDeletePost = async () => {
    if(!post || !confirm('Are you sure you want to delete this post?')) return;

    try {
      setError(null);
      await postActions.delete(post.postId);
      console.log('Post deleted successfully');
    } catch(err: any) {
      setError(err.message || 'Failed to delete post');
      console.error('Error deleting post:', err);
    }
  };

  if(isLoading) return <div>Loading post...</div>;
  if(error) return <div className="error">Error: {error}</div>;
  if(!post) return <div>Post not found</div>;

  return (
    <div className="post-detail">
      <h2>Post Details</h2>
      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
          />
          <button onClick={handleUpdatePost}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div>
          <p>{post.content}</p>
          <small>Created: {post.createdAt}</small>
          {post.updatedAt && <small> | Updated: {post.updatedAt}</small>}
          <div>
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={handleDeletePost}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Groups CRUD Operations
// =============================================================================

export const GroupManagerExample = () => {
  const groupActions = useGroupActions();
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setError(null);
      const loadedGroups = await groupActions.listByLatest(0, 20, [
        'groupId',
        'name',
        'description',
        'privacy',
        'createdAt'
      ]);
      setGroups(loadedGroups);
    } catch(err: any) {
      setError(err.message || 'Failed to load groups');
      console.error('Error loading groups:', err);
    }
  };

  const handleCreateGroup = async () => {
    try {
      setError(null);

      const newGroup = await groupActions.add({
        name: newGroupName,
        description: newGroupDescription,
        privacy: 'public'
      }, ['groupId', 'name', 'description', 'createdAt']);

      setGroups([newGroup, ...groups]);
      setNewGroupName('');
      setNewGroupDescription('');
      setIsCreating(false);
    } catch(err: any) {
      setError(err.message || 'Failed to create group');
      console.error('Error creating group:', err);
    }
  };

  const handleUpdateGroup = async (groupId: string, updates: Partial<GroupType>) => {
    try {
      setError(null);

      const updatedGroup = await groupActions.update(
        {groupId, ...updates},
        ['groupId', 'name', 'description', 'updatedAt']
      );

      setGroups(groups.map(g => g.groupId === groupId ? updatedGroup : g));
    } catch(err: any) {
      setError(err.message || 'Failed to update group');
      console.error('Error updating group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if(!confirm('Are you sure you want to delete this group?')) return;

    try {
      setError(null);
      await groupActions.delete(groupId);
      setGroups(groups.filter(g => g.groupId !== groupId));
    } catch(err: any) {
      setError(err.message || 'Failed to delete group');
      console.error('Error deleting group:', err);
    }
  };

  return (
    <div className="group-manager">
      <h2>Group Management</h2>
      {error && <div className="error">{error}</div>}

      {isCreating ? (
        <div className="create-group-form">
          <input
            type="text"
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <textarea
            placeholder="Description"
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
            rows={3}
          />
          <button onClick={handleCreateGroup} disabled={!newGroupName}>
            Create
          </button>
          <button onClick={() => setIsCreating(false)}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setIsCreating(true)}>Create New Group</button>
      )}

      <div className="group-list">
        {groups.map(group => (
          <div key={group.groupId} className="group-item">
            <h3>{group.name}</h3>
            <p>{group.description}</p>
            <button onClick={() => handleUpdateGroup(group.groupId!, {
              description: prompt('New description:', group.description) || group.description
            })}>
              Edit
            </button>
            <button onClick={() => handleDeleteGroup(group.groupId!)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// Conversations & Messages CRUD Operations
// =============================================================================

export const ConversationListExample = () => {
  const flux = useFlux();
  const conversationActions = createConversationActions(flux);
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedConversations = await conversationActions.list(0, 50, [
          'conversationId',
          'name',
          'participantIds',
          'lastMessageAt',
          'createdAt'
        ]);

        setConversations(loadedConversations);
      } catch(err: any) {
        setError(err.message || 'Failed to load conversations');
        console.error('Error loading conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [conversationActions]);

  const handleCreateConversation = async (participantId: string) => {
    try {
      setError(null);

      const newConversation = await conversationActions.add({
        participantIds: [participantId],
        type: 'direct'
      }, ['conversationId', 'name', 'participantIds', 'createdAt']);

      setConversations([newConversation, ...conversations]);
    } catch(err: any) {
      setError(err.message || 'Failed to create conversation');
      console.error('Error creating conversation:', err);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if(!confirm('Delete this conversation?')) return;

    try {
      setError(null);
      await conversationActions.delete(conversationId);
      setConversations(conversations.filter(c => c.conversationId !== conversationId));
    } catch(err: any) {
      setError(err.message || 'Failed to delete conversation');
      console.error('Error deleting conversation:', err);
    }
  };

  if(isLoading) return <div>Loading conversations...</div>;
  if(error) return <div className="error">Error: {error}</div>;

  return (
    <div className="conversation-list">
      <h2>Conversations</h2>
      {conversations.length === 0 ? (
        <p>No conversations yet</p>
      ) : (
        <ul>
          {conversations.map(conversation => (
            <li key={conversation.conversationId}>
              <div>
                <h4>{conversation.name || 'Unnamed Conversation'}</h4>
                <small>Last activity: {conversation.lastMessageAt}</small>
              </div>
              <button onClick={() => handleDeleteConversation(conversation.conversationId!)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const MessageThreadExample = ({conversationId}: {conversationId: string}) => {
  const messageActions = useMessageActions();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedMessages = await messageActions.getMessages(conversationId, [
          'messageId',
          'content',
          'senderId',
          'conversationId',
          'createdAt'
        ]);

        setMessages(loadedMessages);
      } catch(err: any) {
        setError(err.message || 'Failed to load messages');
        console.error('Error loading messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId, messageActions]);

  const handleSendMessage = async () => {
    try {
      setIsSending(true);
      setError(null);

      const message = await messageActions.sendMessage({
        conversationId,
        content: newMessage,
        type: 'text'
      }, ['messageId', 'content', 'senderId', 'createdAt']);

      setMessages([...messages, message]);
      setNewMessage('');
    } catch(err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if(isLoading) return <div>Loading messages...</div>;
  if(error) return <div className="error">Error: {error}</div>;

  return (
    <div className="message-thread">
      <h2>Messages</h2>
      <div className="messages">
        {messages.map(message => (
          <div key={message.messageId} className="message">
            <p>{message.content}</p>
            <small>{message.createdAt}</small>
          </div>
        ))}
      </div>
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={isSending}
        />
        <button onClick={handleSendMessage} disabled={!newMessage || isSending}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Events CRUD Operations
// =============================================================================

export const EventManagerExample = () => {
  const eventActions = useEventActions();
  const [events, setEvents] = useState<EventType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    startDate: '',
    endDate: '',
    location: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setError(null);
      const latitude = 37.7749;
      const longitude = -122.4194;

      const loadedEvents = await eventActions.getEventsByTags(
        [],
        latitude,
        longitude,
        ['eventId', 'name', 'content', 'startDate', 'endDate', 'location']
      );

      setEvents(loadedEvents);
    } catch(err: any) {
      setError(err.message || 'Failed to load events');
      console.error('Error loading events:', err);
    }
  };

  const handleCreateEvent = async () => {
    try {
      setError(null);

      const newEvent = await eventActions.addEvent({
        name: formData.name,
        content: formData.content,
        startDate: new Date(formData.startDate).getTime(),
        endDate: new Date(formData.endDate).getTime(),
        location: formData.location,
        type: 'event'
      }, ['eventId', 'name', 'content', 'startDate', 'endDate', 'location']);

      setEvents([newEvent, ...events]);
      setFormData({name: '', content: '', startDate: '', endDate: '', location: ''});
      setIsCreating(false);
    } catch(err: any) {
      setError(err.message || 'Failed to create event');
      console.error('Error creating event:', err);
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<EventType>) => {
    try {
      setError(null);

      const updatedEvent = await eventActions.updateEvent(
        {eventId, ...updates},
        ['eventId', 'name', 'content', 'startDate', 'endDate', 'location']
      );

      setEvents(events.map(e => e.eventId === eventId ? updatedEvent : e));
    } catch(err: any) {
      setError(err.message || 'Failed to update event');
      console.error('Error updating event:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if(!confirm('Delete this event?')) return;

    try {
      setError(null);
      await eventActions.deleteEvent(eventId);
      setEvents(events.filter(e => e.eventId !== eventId));
    } catch(err: any) {
      setError(err.message || 'Failed to delete event');
      console.error('Error deleting event:', err);
    }
  };

  return (
    <div className="event-manager">
      <h2>Event Management</h2>
      {error && <div className="error">{error}</div>}

      {isCreating ? (
        <div className="create-event-form">
          <input
            type="text"
            placeholder="Event name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <textarea
            placeholder="Description"
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            rows={3}
          />
          <input
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
          />
          <input
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
          />
          <input
            type="text"
            placeholder="Location"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
          />
          <button onClick={handleCreateEvent} disabled={!formData.name || !formData.startDate}>
            Create Event
          </button>
          <button onClick={() => setIsCreating(false)}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setIsCreating(true)}>Create New Event</button>
      )}

      <div className="event-list">
        {events.map(event => (
          <div key={event.eventId} className="event-item">
            <h3>{event.name}</h3>
            <p>{event.content}</p>
            <p>
              {new Date(event.startDate!).toLocaleString()} - {new Date(event.endDate!).toLocaleString()}
            </p>
            <p>Location: {event.location}</p>
            <button onClick={() => handleDeleteEvent(event.eventId!)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// User Management Example
// =============================================================================

export const UserProfileExample = ({userId}: {userId: string}) => {
  const userActions = useUserActions();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    bio: '',
    location: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError(null);
        const user = await userActions.itemById(userId, [
          'userId',
          'username',
          'displayName',
          'email',
          'bio',
          'location',
          'avatarUrl'
        ]);

        setProfile(user);
        setEditData({
          displayName: user.displayName || '',
          bio: user.bio || '',
          location: user.location || ''
        });
      } catch(err: any) {
        setError(err.message || 'Failed to load profile');
        console.error('Error loading profile:', err);
      }
    };

    loadProfile();
  }, [userId, userActions]);

  const handleUpdateProfile = async () => {
    try {
      setError(null);

      const updatedUser = await userActions.update({
        userId,
        ...editData
      });

      setProfile(updatedUser);
      setIsEditing(false);
    } catch(err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  if(!profile) return <div>Loading profile...</div>;
  if(error) return <div className="error">Error: {error}</div>;

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      {isEditing ? (
        <div>
          <input
            type="text"
            placeholder="Display name"
            value={editData.displayName}
            onChange={(e) => setEditData({...editData, displayName: e.target.value})}
          />
          <textarea
            placeholder="Bio"
            value={editData.bio}
            onChange={(e) => setEditData({...editData, bio: e.target.value})}
            rows={3}
          />
          <input
            type="text"
            placeholder="Location"
            value={editData.location}
            onChange={(e) => setEditData({...editData, location: e.target.value})}
          />
          <button onClick={handleUpdateProfile}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Display Name:</strong> {profile.displayName}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Bio:</strong> {profile.bio}</p>
          <p><strong>Location:</strong> {profile.location}</p>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Complete Application Example
// =============================================================================

export const CompleteCRUDExample = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'groups' | 'events' | 'conversations'>('posts');

  return (
    <div className="crud-example-app">
      <nav>
        <button onClick={() => setActiveTab('posts')}>Posts</button>
        <button onClick={() => setActiveTab('groups')}>Groups</button>
        <button onClick={() => setActiveTab('events')}>Events</button>
        <button onClick={() => setActiveTab('conversations')}>Conversations</button>
      </nav>

      <main>
        {activeTab === 'posts' && (
          <>
            <PostCreatorExample />
            <PostListExample />
          </>
        )}
        {activeTab === 'groups' && <GroupManagerExample />}
        {activeTab === 'events' && <EventManagerExample />}
        {activeTab === 'conversations' && <ConversationListExample />}
      </main>
    </div>
  );
};

export default CompleteCRUDExample;
