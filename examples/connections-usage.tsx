/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 * 
 * Connection and Relationship Management Examples for MetropolisJS
 * 
 * This file demonstrates how to manage relationships between collections using:
 * - Connection edges (followers, members, admins, etc.)
 * - Reactions (likes, pins, views, RSVPs, etc.)
 * - Tags (categorization and labeling)
 * - File attachments (images, videos, documents)
 * - Conversation associations (linking items to discussions)
 */

import React, {useEffect, useState} from 'react';
import {useFlux} from '@nlabs/arkhamjs-utils-react';
import {
  createConnectionActions,
  useReactionActions,
  useTagActions,
  useImageActions,
  usePostActions,
  COLLECTIONS,
  CONNECTION_TYPES,
  REACTION_TYPES,
  type ConnectionEdge,
  type ReactionType,
  type TagType
} from '@nlabs/metropolisjs';

// =============================================================================
// Connection Management Examples
// =============================================================================

export const FollowSystemExample = () => {
  const flux = useFlux();
  const connectionActions = createConnectionActions(flux);
  const [followers, setFollowers] = useState<ConnectionEdge[]>([]);
  const [following, setFollowing] = useState<ConnectionEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = 'user-123';

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const followerList = await connectionActions.getConnections(
        COLLECTIONS.USERS,
        currentUserId,
        COLLECTIONS.USERS,
        {connectionType: CONNECTION_TYPES.FOLLOWER}
      );

      const followingList = await connectionActions.getConnections(
        COLLECTIONS.USERS,
        currentUserId,
        COLLECTIONS.USERS,
        {connectionType: CONNECTION_TYPES.FOLLOWING}
      );

      setFollowers(followerList);
      setFollowing(followingList);
    } catch(err: any) {
      setError(err.message || 'Failed to load connections');
      console.error('Error loading connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUser = async (targetUserId: string) => {
    try {
      setError(null);

      await connectionActions.addConnection(
        COLLECTIONS.USERS,
        currentUserId,
        COLLECTIONS.USERS,
        targetUserId,
        CONNECTION_TYPES.FOLLOWING
      );

      await loadConnections();
    } catch(err: any) {
      setError(err.message || 'Failed to follow user');
      console.error('Error following user:', err);
    }
  };

  const handleUnfollowUser = async (targetUserId: string) => {
    try {
      setError(null);

      await connectionActions.removeConnection(
        COLLECTIONS.USERS,
        currentUserId,
        COLLECTIONS.USERS,
        targetUserId
      );

      await loadConnections();
    } catch(err: any) {
      setError(err.message || 'Failed to unfollow user');
      console.error('Error unfollowing user:', err);
    }
  };

  if(isLoading) return <div>Loading connections...</div>;

  return (
    <div className="follow-system">
      <h2>Follow System</h2>
      {error && <div className="error">{error}</div>}

      <div className="stats">
        <div>
          <strong>Followers:</strong> {followers.length}
        </div>
        <div>
          <strong>Following:</strong> {following.length}
        </div>
      </div>

      <div className="follow-button-example">
        <button onClick={() => handleFollowUser('user-456')}>
          Follow User
        </button>
        <button onClick={() => handleUnfollowUser('user-456')}>
          Unfollow User
        </button>
      </div>

      <div className="followers-list">
        <h3>Followers</h3>
        <ul>
          {followers.map(connection => (
            <li key={connection._from}>
              User: {connection.fromId}
            </li>
          ))}
        </ul>
      </div>

      <div className="following-list">
        <h3>Following</h3>
        <ul>
          {following.map(connection => (
            <li key={connection._to}>
              User: {connection.toId}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const GroupMembershipExample = () => {
  const flux = useFlux();
  const connectionActions = createConnectionActions(flux);
  const [members, setMembers] = useState<ConnectionEdge[]>([]);
  const [admins, setAdmins] = useState<ConnectionEdge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const groupId = 'group-123';
  const currentUserId = 'user-123';

  useEffect(() => {
    loadGroupMembers();
  }, []);

  const loadGroupMembers = async () => {
    try {
      setError(null);

      const allConnections = await connectionActions.getConnections(
        COLLECTIONS.GROUPS,
        groupId,
        COLLECTIONS.USERS
      );

      const memberList = allConnections.filter(c => c.connectionType === CONNECTION_TYPES.MEMBER);
      const adminList = allConnections.filter(c => c.connectionType === CONNECTION_TYPES.ADMIN);

      setMembers(memberList);
      setAdmins(adminList);
    } catch(err: any) {
      setError(err.message || 'Failed to load group members');
      console.error('Error loading group members:', err);
    }
  };

  const handleJoinGroup = async () => {
    try {
      setError(null);

      await connectionActions.addConnection(
        COLLECTIONS.GROUPS,
        groupId,
        COLLECTIONS.USERS,
        currentUserId,
        CONNECTION_TYPES.MEMBER
      );

      await loadGroupMembers();
    } catch(err: any) {
      setError(err.message || 'Failed to join group');
      console.error('Error joining group:', err);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      setError(null);

      await connectionActions.removeConnection(
        COLLECTIONS.GROUPS,
        groupId,
        COLLECTIONS.USERS,
        currentUserId
      );

      await loadGroupMembers();
    } catch(err: any) {
      setError(err.message || 'Failed to leave group');
      console.error('Error leaving group:', err);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      setError(null);

      await connectionActions.removeConnection(
        COLLECTIONS.GROUPS,
        groupId,
        COLLECTIONS.USERS,
        userId
      );

      await connectionActions.addConnection(
        COLLECTIONS.GROUPS,
        groupId,
        COLLECTIONS.USERS,
        userId,
        CONNECTION_TYPES.ADMIN
      );

      await loadGroupMembers();
    } catch(err: any) {
      setError(err.message || 'Failed to promote user');
      console.error('Error promoting user:', err);
    }
  };

  return (
    <div className="group-membership">
      <h2>Group Membership</h2>
      {error && <div className="error">{error}</div>}

      <div className="stats">
        <div><strong>Members:</strong> {members.length}</div>
        <div><strong>Admins:</strong> {admins.length}</div>
      </div>

      <div className="actions">
        <button onClick={handleJoinGroup}>Join Group</button>
        <button onClick={handleLeaveGroup}>Leave Group</button>
      </div>

      <div className="member-lists">
        <div>
          <h3>Admins</h3>
          <ul>
            {admins.map(admin => (
              <li key={admin.toId}>{admin.toId}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Members</h3>
          <ul>
            {members.map(member => (
              <li key={member.toId}>
                {member.toId}
                <button onClick={() => handlePromoteToAdmin(member.toId)}>
                  Promote to Admin
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const BlockingExample = () => {
  const flux = useFlux();
  const connectionActions = createConnectionActions(flux);
  const [blockedUsers, setBlockedUsers] = useState<ConnectionEdge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = 'user-123';

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setError(null);

      const blocked = await connectionActions.getConnections(
        COLLECTIONS.USERS,
        currentUserId,
        COLLECTIONS.USERS,
        {connectionType: CONNECTION_TYPES.BLOCKED}
      );

      setBlockedUsers(blocked);
    } catch(err: any) {
      setError(err.message || 'Failed to load blocked users');
      console.error('Error loading blocked users:', err);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    try {
      setError(null);

      await connectionActions.addConnection(
        COLLECTIONS.USERS,
        currentUserId,
        COLLECTIONS.USERS,
        targetUserId,
        CONNECTION_TYPES.BLOCKED,
        {blockedAt: Date.now(), reason: 'User preference'}
      );

      await loadBlockedUsers();
    } catch(err: any) {
      setError(err.message || 'Failed to block user');
      console.error('Error blocking user:', err);
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    try {
      setError(null);

      await connectionActions.removeConnection(
        COLLECTIONS.USERS,
        currentUserId,
        COLLECTIONS.USERS,
        targetUserId
      );

      await loadBlockedUsers();
    } catch(err: any) {
      setError(err.message || 'Failed to unblock user');
      console.error('Error unblocking user:', err);
    }
  };

  return (
    <div className="blocking-example">
      <h2>Blocked Users</h2>
      {error && <div className="error">{error}</div>}

      <p>You have blocked {blockedUsers.length} user(s)</p>

      <ul>
        {blockedUsers.map(blocked => (
          <li key={blocked.toId}>
            User: {blocked.toId}
            {blocked.metadata?.reason && <span> (Reason: {blocked.metadata.reason})</span>}
            <button onClick={() => handleUnblockUser(blocked.toId)}>
              Unblock
            </button>
          </li>
        ))}
      </ul>

      <div className="block-form">
        <button onClick={() => handleBlockUser('user-789')}>
          Block Example User
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Reaction Management Examples
// =============================================================================

export const LikeSystemExample = ({postId}: {postId: string}) => {
  const reactionActions = useReactionActions();
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReactionState();
  }, [postId]);

  const loadReactionState = async () => {
    try {
      setError(null);

      const count = await reactionActions.getReactionCount(
        postId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.LIKE
      );

      const liked = await reactionActions.hasReaction(
        postId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.LIKE,
        'inbound'
      );

      setLikeCount(count);
      setHasLiked(liked);
    } catch(err: any) {
      setError(err.message || 'Failed to load reaction state');
      console.error('Error loading reaction state:', err);
    }
  };

  const handleToggleLike = async () => {
    try {
      setError(null);

      if(hasLiked) {
        await reactionActions.deleteReaction(
          postId,
          COLLECTIONS.POSTS,
          REACTION_TYPES.LIKE
        );
      } else {
        await reactionActions.addReaction(
          postId,
          COLLECTIONS.POSTS,
          {
            name: REACTION_TYPES.LIKE,
            value: 1
          }
        );
      }

      await loadReactionState();
    } catch(err: any) {
      setError(err.message || 'Failed to toggle like');
      console.error('Error toggling like:', err);
    }
  };

  return (
    <div className="like-system">
      {error && <div className="error">{error}</div>}
      <button 
        onClick={handleToggleLike}
        className={hasLiked ? 'liked' : ''}
      >
        {hasLiked ? '❤️ Liked' : '🤍 Like'} ({reactionActions.abbreviateCount(likeCount)})
      </button>
    </div>
  );
};

export const PinSystemExample = ({postId}: {postId: string}) => {
  const reactionActions = useReactionActions();
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPinStatus();
  }, [postId]);

  const checkPinStatus = async () => {
    try {
      setError(null);

      const pinned = await reactionActions.hasReaction(
        postId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.PIN,
        'inbound'
      );

      setIsPinned(pinned);
    } catch(err: any) {
      setError(err.message || 'Failed to check pin status');
      console.error('Error checking pin status:', err);
    }
  };

  const handleTogglePin = async () => {
    try {
      setError(null);

      if(isPinned) {
        await reactionActions.deleteReaction(
          postId,
          COLLECTIONS.POSTS,
          REACTION_TYPES.PIN
        );
      } else {
        await reactionActions.addReaction(
          postId,
          COLLECTIONS.POSTS,
          {
            name: REACTION_TYPES.PIN,
            value: 1
          }
        );
      }

      await checkPinStatus();
    } catch(err: any) {
      setError(err.message || 'Failed to toggle pin');
      console.error('Error toggling pin:', err);
    }
  };

  return (
    <div className="pin-system">
      {error && <div className="error">{error}</div>}
      <button onClick={handleTogglePin}>
        {isPinned ? '📌 Unpin' : '📍 Pin'}
      </button>
    </div>
  );
};

export const RSVPSystemExample = ({eventId}: {eventId: string}) => {
  const reactionActions = useReactionActions();
  const [rsvpStatus, setRsvpStatus] = useState<'none' | 'going' | 'maybe' | 'not-going'>('none');
  const [goingCount, setGoingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRSVPState();
  }, [eventId]);

  const loadRSVPState = async () => {
    try {
      setError(null);

      const hasRsvp = await reactionActions.hasReaction(
        eventId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.RSVP,
        'inbound'
      );

      const count = await reactionActions.getReactionCount(
        eventId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.RSVP
      );

      setGoingCount(count);
    } catch(err: any) {
      setError(err.message || 'Failed to load RSVP state');
      console.error('Error loading RSVP state:', err);
    }
  };

  const handleRSVP = async (status: 'going' | 'maybe' | 'not-going') => {
    try {
      setError(null);

      if(rsvpStatus !== 'none') {
        await reactionActions.deleteReaction(
          eventId,
          COLLECTIONS.POSTS,
          REACTION_TYPES.RSVP
        );
      }

      if(status !== 'not-going') {
        await reactionActions.addReaction(
          eventId,
          COLLECTIONS.POSTS,
          {
            name: REACTION_TYPES.RSVP,
            value: status === 'going' ? 1 : 0.5
          }
        );
      }

      setRsvpStatus(status);
      await loadRSVPState();
    } catch(err: any) {
      setError(err.message || 'Failed to RSVP');
      console.error('Error RSVP:', err);
    }
  };

  return (
    <div className="rsvp-system">
      <h3>RSVP to Event</h3>
      {error && <div className="error">{error}</div>}

      <div className="rsvp-count">
        {goingCount} people going
      </div>

      <div className="rsvp-buttons">
        <button 
          onClick={() => handleRSVP('going')}
          className={rsvpStatus === 'going' ? 'active' : ''}
        >
          ✅ Going
        </button>
        <button 
          onClick={() => handleRSVP('maybe')}
          className={rsvpStatus === 'maybe' ? 'active' : ''}
        >
          🤔 Maybe
        </button>
        <button 
          onClick={() => handleRSVP('not-going')}
          className={rsvpStatus === 'not-going' ? 'active' : ''}
        >
          ❌ Can't Go
        </button>
      </div>
    </div>
  );
};

export const ViewCountExample = ({postId}: {postId: string}) => {
  const reactionActions = useReactionActions();
  const [viewCount, setViewCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackView();
  }, [postId]);

  const trackView = async () => {
    try {
      setError(null);

      await reactionActions.addReaction(
        postId,
        COLLECTIONS.POSTS,
        {
          name: REACTION_TYPES.VIEW,
          value: 1
        }
      );

      const count = await reactionActions.getReactionCount(
        postId,
        COLLECTIONS.POSTS,
        REACTION_TYPES.VIEW
      );

      setViewCount(count);
    } catch(err: any) {
      setError(err.message || 'Failed to track view');
      console.error('Error tracking view:', err);
    }
  };

  return (
    <div className="view-count">
      {error && <div className="error">{error}</div>}
      <span>👁️ {reactionActions.abbreviateCount(viewCount)} views</span>
    </div>
  );
};

// =============================================================================
// Tag Management Examples
// =============================================================================

export const TaggingExample = ({postId}: {postId: string}) => {
  const tagActions = useTagActions();
  const [tags, setTags] = useState<TagType[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, [postId]);

  const loadTags = async () => {
    try {
      setError(null);

      const loadedTags = await tagActions.getTags(['tagId', 'name', 'category']);
      const postTags = loadedTags.filter((tag: any) => tag.itemId === postId);
      setTags(postTags);
    } catch(err: any) {
      setError(err.message || 'Failed to load tags');
      console.error('Error loading tags:', err);
    }
  };

  const handleAddTag = async () => {
    try {
      setError(null);

      await tagActions.addTag({
        itemId: postId,
        itemType: COLLECTIONS.POSTS,
        name: newTag,
        category: 'general'
      }, ['tagId', 'name', 'category']);

      setNewTag('');
      await loadTags();
    } catch(err: any) {
      setError(err.message || 'Failed to add tag');
      console.error('Error adding tag:', err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      setError(null);

      await tagActions.deleteTag(tagId);
      await loadTags();
    } catch(err: any) {
      setError(err.message || 'Failed to remove tag');
      console.error('Error removing tag:', err);
    }
  };

  return (
    <div className="tagging-system">
      <h3>Tags</h3>
      {error && <div className="error">{error}</div>}

      <div className="tags">
        {tags.map(tag => (
          <span key={tag.tagId} className="tag">
            #{tag.name}
            <button onClick={() => handleRemoveTag(tag.tagId!)}>×</button>
          </span>
        ))}
      </div>

      <div className="add-tag">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add tag..."
        />
        <button onClick={handleAddTag} disabled={!newTag}>
          Add Tag
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// File Attachment Examples
// =============================================================================

export const ImageAttachmentExample = ({postId}: {postId: string}) => {
  const imageActions = useImageActions();
  const postActions = usePostActions();
  const [images, setImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, [postId]);

  const loadImages = async () => {
    try {
      setError(null);

      const post = await postActions.itemById(postId, ['postId', 'files']);
      const imageFiles = post.files?.filter((f: any) => f.type === 'image') || [];
      setImages(imageFiles);
    } catch(err: any) {
      setError(err.message || 'Failed to load images');
      console.error('Error loading images:', err);
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      const uploadedImage = await imageActions.add({
        name: file.name,
        type: 'image',
        fileType: file.type,
        size: file.size
      });

      await postActions.update({
        postId,
        files: [...images, uploadedImage]
      });

      await loadImages();
    } catch(err: any) {
      setError(err.message || 'Failed to upload image');
      console.error('Error uploading image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    try {
      setError(null);

      await imageActions.delete(imageId);

      const updatedImages = images.filter(img => img.imageId !== imageId);
      await postActions.update({
        postId,
        files: updatedImages
      });

      await loadImages();
    } catch(err: any) {
      setError(err.message || 'Failed to remove image');
      console.error('Error removing image:', err);
    }
  };

  return (
    <div className="image-attachment">
      <h3>Attached Images</h3>
      {error && <div className="error">{error}</div>}

      <div className="image-grid">
        {images.map(image => (
          <div key={image.imageId} className="image-item">
            <img src={image.url} alt={image.name} />
            <button onClick={() => handleRemoveImage(image.imageId)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if(file) handleUploadImage(file);
          }}
          disabled={isUploading}
        />
        {isUploading && <span>Uploading...</span>}
      </div>
    </div>
  );
};

// =============================================================================
// Complete Connection Example
// =============================================================================

export const CompleteConnectionExample = ({itemId, itemType}: {itemId: string; itemType: string}) => {
  return (
    <div className="complete-connection-example">
      <h2>All Connection Types</h2>

      <section>
        <h3>Reactions</h3>
        <LikeSystemExample postId={itemId} />
        <PinSystemExample postId={itemId} />
        <ViewCountExample postId={itemId} />
      </section>

      <section>
        <h3>Tags</h3>
        <TaggingExample postId={itemId} />
      </section>

      <section>
        <h3>Attachments</h3>
        <ImageAttachmentExample postId={itemId} />
      </section>
    </div>
  );
};

export default CompleteConnectionExample;
