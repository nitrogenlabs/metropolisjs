/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 * 
 * Extensibility and Custom Field Examples for MetropolisJS
 * 
 * This file demonstrates how to use extensible fields and custom adapters
 * to extend MetropolisJS functionality with:
 * - Custom data validation and transformation
 * - Type-safe extensible fields
 * - Custom business logic in adapters
 * - Advanced validation patterns
 * - Metadata and custom field management
 */

import React, {useEffect, useState} from 'react';
import {useFlux} from '@nlabs/arkhamjs-utils-react';
import {
  createPostActions,
  createEventActions,
  createGroupActions,
  createUserActions,
  type PostType,
  type EventType,
  type GroupType,
  type PostActionsOptions,
  type EventActionsOptions,
  type GroupActionsOptions,
  type BaseAdapterOptions
} from '@nlabs/metropolisjs';

// =============================================================================
// Custom Type Extensions
// =============================================================================

interface ExtendedPostType extends PostType {
  metadata?: {
    isSponsored?: boolean;
    sponsorName?: string;
    priority?: 'low' | 'medium' | 'high';
    views?: number;
    engagement?: {
      likes?: number;
      comments?: number;
      shares?: number;
    };
  };
  customFields?: {
    campaign?: string;
    targetAudience?: string[];
    expiresAt?: number;
  };
}

interface ExtendedEventType extends EventType {
  metadata?: {
    venue?: {
      name: string;
      address: string;
      capacity: number;
    };
    ticketing?: {
      price: number;
      currency: string;
      available: number;
    };
    categories?: string[];
  };
  customFields?: {
    ageRestriction?: number;
    dresscode?: string;
    accessibility?: string[];
  };
}

interface ExtendedGroupType extends GroupType {
  metadata?: {
    settings?: {
      requiresApproval?: boolean;
      allowInvites?: boolean;
      isVerified?: boolean;
    };
    stats?: {
      totalPosts?: number;
      activeMembers?: number;
      created?: number;
    };
  };
  customFields?: {
    industryTags?: string[];
    companySize?: string;
    website?: string;
  };
}

// =============================================================================
// Custom Adapter Examples
// =============================================================================

export const SponsoredPostAdapterExample = () => {
  const flux = useFlux();

  const customPostAdapter = (input: unknown, options?: BaseAdapterOptions): ExtendedPostType => {
    const post = input as ExtendedPostType;

    if(post.metadata?.isSponsored) {
      if(!post.metadata.sponsorName) {
        throw new Error('Sponsored posts must include sponsorName in metadata');
      }

      if(!post.customFields?.campaign) {
        throw new Error('Sponsored posts must include a campaign ID');
      }

      if(!post.metadata.priority) {
        post.metadata.priority = 'medium';
      }
    }

    if(post.customFields?.expiresAt) {
      if(post.customFields.expiresAt < Date.now()) {
        throw new Error('Expiration date must be in the future');
      }
    }

    return post;
  };

  const postActions = createPostActions(flux, {
    postAdapter: customPostAdapter
  });

  const [formData, setFormData] = useState<ExtendedPostType>({
    content: '',
    metadata: {
      isSponsored: false,
      sponsorName: '',
      priority: 'medium'
    },
    customFields: {
      campaign: '',
      targetAudience: [],
      expiresAt: undefined
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const newPost = await postActions.add(formData, [
        'postId',
        'content',
        'metadata',
        'customFields',
        'createdAt'
      ]);

      console.log('Sponsored post created:', newPost);
      setFormData({
        content: '',
        metadata: {isSponsored: false, sponsorName: '', priority: 'medium'},
        customFields: {campaign: '', targetAudience: [], expiresAt: undefined}
      });
    } catch(err: any) {
      setError(err.message || 'Failed to create sponsored post');
      console.error('Error creating sponsored post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sponsored-post-creator">
      <h2>Create Sponsored Post</h2>
      {error && <div className="error">{error}</div>}

      <textarea
        placeholder="Post content"
        value={formData.content}
        onChange={(e) => setFormData({...formData, content: e.target.value})}
        rows={4}
      />

      <label>
        <input
          type="checkbox"
          checked={formData.metadata?.isSponsored}
          onChange={(e) => setFormData({
            ...formData,
            metadata: {...formData.metadata, isSponsored: e.target.checked}
          })}
        />
        This is a sponsored post
      </label>

      {formData.metadata?.isSponsored && (
        <>
          <input
            type="text"
            placeholder="Sponsor name (required)"
            value={formData.metadata.sponsorName}
            onChange={(e) => setFormData({
              ...formData,
              metadata: {...formData.metadata, sponsorName: e.target.value}
            })}
          />

          <input
            type="text"
            placeholder="Campaign ID (required)"
            value={formData.customFields?.campaign}
            onChange={(e) => setFormData({
              ...formData,
              customFields: {...formData.customFields, campaign: e.target.value}
            })}
          />

          <select
            value={formData.metadata.priority}
            onChange={(e) => setFormData({
              ...formData,
              metadata: {...formData.metadata, priority: e.target.value as any}
            })}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>

          <input
            type="datetime-local"
            placeholder="Expires at"
            onChange={(e) => setFormData({
              ...formData,
              customFields: {
                ...formData.customFields,
                expiresAt: new Date(e.target.value).getTime()
              }
            })}
          />
        </>
      )}

      <button onClick={handleSubmit} disabled={isSubmitting || !formData.content}>
        {isSubmitting ? 'Creating...' : 'Create Post'}
      </button>
    </div>
  );
};

// =============================================================================
// Event Ticketing Adapter Example
// =============================================================================

export const EventTicketingAdapterExample = () => {
  const flux = useFlux();

  const customEventAdapter = (input: unknown, options?: BaseAdapterOptions): ExtendedEventType => {
    const event = input as ExtendedEventType;

    if(event.metadata?.ticketing) {
      const {price, available} = event.metadata.ticketing;

      if(price < 0) {
        throw new Error('Ticket price cannot be negative');
      }

      if(available < 0) {
        throw new Error('Available tickets cannot be negative');
      }

      if(event.metadata.venue?.capacity && available > event.metadata.venue.capacity) {
        throw new Error('Available tickets cannot exceed venue capacity');
      }

      if(!event.metadata.ticketing.currency) {
        event.metadata.ticketing.currency = 'USD';
      }
    }

    if(event.customFields?.ageRestriction) {
      if(event.customFields.ageRestriction < 0 || event.customFields.ageRestriction > 100) {
        throw new Error('Age restriction must be between 0 and 100');
      }
    }

    if(event.startDate && event.endDate && event.startDate > event.endDate) {
      throw new Error('Event start date must be before end date');
    }

    return event;
  };

  const eventActions = createEventActions(flux, {
    eventAdapter: customEventAdapter
  });

  const [formData, setFormData] = useState<ExtendedEventType>({
    name: '',
    content: '',
    startDate: undefined,
    endDate: undefined,
    metadata: {
      venue: {
        name: '',
        address: '',
        capacity: 0
      },
      ticketing: {
        price: 0,
        currency: 'USD',
        available: 0
      },
      categories: []
    },
    customFields: {
      ageRestriction: undefined,
      dresscode: '',
      accessibility: []
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const newEvent = await eventActions.addEvent(formData, [
        'eventId',
        'name',
        'content',
        'startDate',
        'endDate',
        'metadata',
        'customFields',
        'createdAt'
      ]);

      console.log('Ticketed event created:', newEvent);
    } catch(err: any) {
      setError(err.message || 'Failed to create event');
      console.error('Error creating event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ticketed-event-creator">
      <h2>Create Ticketed Event</h2>
      {error && <div className="error">{error}</div>}

      <input
        type="text"
        placeholder="Event name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />

      <textarea
        placeholder="Event description"
        value={formData.content}
        onChange={(e) => setFormData({...formData, content: e.target.value})}
        rows={4}
      />

      <div className="dates">
        <input
          type="datetime-local"
          onChange={(e) => setFormData({
            ...formData,
            startDate: new Date(e.target.value).getTime()
          })}
        />
        <input
          type="datetime-local"
          onChange={(e) => setFormData({
            ...formData,
            endDate: new Date(e.target.value).getTime()
          })}
        />
      </div>

      <h3>Venue Information</h3>
      <input
        type="text"
        placeholder="Venue name"
        value={formData.metadata?.venue?.name}
        onChange={(e) => setFormData({
          ...formData,
          metadata: {
            ...formData.metadata,
            venue: {...formData.metadata?.venue, name: e.target.value, address: '', capacity: 0}
          }
        })}
      />

      <input
        type="text"
        placeholder="Venue address"
        value={formData.metadata?.venue?.address}
        onChange={(e) => setFormData({
          ...formData,
          metadata: {
            ...formData.metadata,
            venue: {...formData.metadata?.venue, address: e.target.value, name: '', capacity: 0}
          }
        })}
      />

      <input
        type="number"
        placeholder="Venue capacity"
        value={formData.metadata?.venue?.capacity}
        onChange={(e) => setFormData({
          ...formData,
          metadata: {
            ...formData.metadata,
            venue: {...formData.metadata?.venue, capacity: parseInt(e.target.value), name: '', address: ''}
          }
        })}
      />

      <h3>Ticketing</h3>
      <input
        type="number"
        placeholder="Ticket price"
        value={formData.metadata?.ticketing?.price}
        onChange={(e) => setFormData({
          ...formData,
          metadata: {
            ...formData.metadata,
            ticketing: {...formData.metadata?.ticketing, price: parseFloat(e.target.value), currency: 'USD', available: 0}
          }
        })}
        step="0.01"
      />

      <select
        value={formData.metadata?.ticketing?.currency}
        onChange={(e) => setFormData({
          ...formData,
          metadata: {
            ...formData.metadata,
            ticketing: {...formData.metadata?.ticketing, currency: e.target.value, price: 0, available: 0}
          }
        })}
      >
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="JPY">JPY</option>
      </select>

      <input
        type="number"
        placeholder="Available tickets"
        value={formData.metadata?.ticketing?.available}
        onChange={(e) => setFormData({
          ...formData,
          metadata: {
            ...formData.metadata,
            ticketing: {...formData.metadata?.ticketing, available: parseInt(e.target.value), price: 0, currency: 'USD'}
          }
        })}
      />

      <h3>Additional Information</h3>
      <input
        type="number"
        placeholder="Age restriction (optional)"
        value={formData.customFields?.ageRestriction || ''}
        onChange={(e) => setFormData({
          ...formData,
          customFields: {...formData.customFields, ageRestriction: parseInt(e.target.value)}
        })}
      />

      <input
        type="text"
        placeholder="Dress code (optional)"
        value={formData.customFields?.dresscode}
        onChange={(e) => setFormData({
          ...formData,
          customFields: {...formData.customFields, dresscode: e.target.value}
        })}
      />

      <button onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
        {isSubmitting ? 'Creating...' : 'Create Event'}
      </button>
    </div>
  );
};

// =============================================================================
// Group Settings Adapter Example
// =============================================================================

export const GroupSettingsAdapterExample = () => {
  const flux = useFlux();

  const customGroupAdapter = (input: unknown, options?: BaseAdapterOptions): ExtendedGroupType => {
    const group = input as ExtendedGroupType;

    if(group.metadata?.settings) {
      const {requiresApproval, allowInvites, isVerified} = group.metadata.settings;

      if(isVerified && group.privacy !== 'public') {
        throw new Error('Verified groups must be public');
      }

      if(!allowInvites && requiresApproval) {
        console.warn('Group does not allow invites but requires approval - may limit growth');
      }
    }

    if(group.customFields?.industryTags) {
      if(group.customFields.industryTags.length > 10) {
        throw new Error('Cannot have more than 10 industry tags');
      }
    }

    if(group.customFields?.website) {
      try {
        new URL(group.customFields.website);
      } catch {
        throw new Error('Invalid website URL format');
      }
    }

    if(!group.metadata) {
      group.metadata = {
        settings: {
          requiresApproval: false,
          allowInvites: true,
          isVerified: false
        },
        stats: {
          totalPosts: 0,
          activeMembers: 0,
          created: Date.now()
        }
      };
    }

    return group;
  };

  const groupActions = createGroupActions(flux, {
    groupAdapter: customGroupAdapter
  });

  const [formData, setFormData] = useState<ExtendedGroupType>({
    name: '',
    description: '',
    privacy: 'public',
    metadata: {
      settings: {
        requiresApproval: false,
        allowInvites: true,
        isVerified: false
      }
    },
    customFields: {
      industryTags: [],
      companySize: '',
      website: ''
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const newGroup = await groupActions.add(formData, [
        'groupId',
        'name',
        'description',
        'privacy',
        'metadata',
        'customFields',
        'createdAt'
      ]);

      console.log('Group with custom settings created:', newGroup);
    } catch(err: any) {
      setError(err.message || 'Failed to create group');
      console.error('Error creating group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="group-settings-creator">
      <h2>Create Professional Group</h2>
      {error && <div className="error">{error}</div>}

      <input
        type="text"
        placeholder="Group name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />

      <textarea
        placeholder="Group description"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        rows={3}
      />

      <select
        value={formData.privacy}
        onChange={(e) => setFormData({...formData, privacy: e.target.value})}
      >
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>

      <h3>Group Settings</h3>
      <label>
        <input
          type="checkbox"
          checked={formData.metadata?.settings?.requiresApproval}
          onChange={(e) => setFormData({
            ...formData,
            metadata: {
              ...formData.metadata,
              settings: {...formData.metadata?.settings, requiresApproval: e.target.checked, allowInvites: true, isVerified: false}
            }
          })}
        />
        Requires approval to join
      </label>

      <label>
        <input
          type="checkbox"
          checked={formData.metadata?.settings?.allowInvites}
          onChange={(e) => setFormData({
            ...formData,
            metadata: {
              ...formData.metadata,
              settings: {...formData.metadata?.settings, allowInvites: e.target.checked, requiresApproval: false, isVerified: false}
            }
          })}
        />
        Allow member invites
      </label>

      <label>
        <input
          type="checkbox"
          checked={formData.metadata?.settings?.isVerified}
          onChange={(e) => setFormData({
            ...formData,
            metadata: {
              ...formData.metadata,
              settings: {...formData.metadata?.settings, isVerified: e.target.checked, requiresApproval: false, allowInvites: true}
            }
          })}
          disabled={formData.privacy !== 'public'}
        />
        Verified group (public only)
      </label>

      <h3>Professional Information</h3>
      <input
        type="text"
        placeholder="Industry tags (comma-separated)"
        onChange={(e) => setFormData({
          ...formData,
          customFields: {
            ...formData.customFields,
            industryTags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
          }
        })}
      />

      <select
        value={formData.customFields?.companySize}
        onChange={(e) => setFormData({
          ...formData,
          customFields: {...formData.customFields, companySize: e.target.value}
        })}
      >
        <option value="">Select company size</option>
        <option value="1-10">1-10 employees</option>
        <option value="11-50">11-50 employees</option>
        <option value="51-200">51-200 employees</option>
        <option value="201-500">201-500 employees</option>
        <option value="501+">501+ employees</option>
      </select>

      <input
        type="url"
        placeholder="Website URL (optional)"
        value={formData.customFields?.website}
        onChange={(e) => setFormData({
          ...formData,
          customFields: {...formData.customFields, website: e.target.value}
        })}
      />

      <button onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
        {isSubmitting ? 'Creating...' : 'Create Group'}
      </button>
    </div>
  );
};

// =============================================================================
// Dynamic Adapter Switching Example
// =============================================================================

export const DynamicAdapterExample = () => {
  const flux = useFlux();

  const [adapterMode, setAdapterMode] = useState<'strict' | 'lenient'>('strict');

  const strictAdapter = (input: unknown): PostType => {
    const post = input as PostType;

    if(!post.content || post.content.trim().length === 0) {
      throw new Error('Content is required and cannot be empty');
    }

    if(post.content.length > 5000) {
      throw new Error('Content cannot exceed 5000 characters');
    }

    if(post.content.includes('<script>')) {
      throw new Error('Content contains disallowed HTML');
    }

    return post;
  };

  const lenientAdapter = (input: unknown): PostType => {
    const post = input as PostType;

    if(!post.content) {
      post.content = '[No content]';
    }

    if(post.content.length > 5000) {
      post.content = post.content.substring(0, 5000) + '...';
    }

    return post;
  };

  const postActions = createPostActions(flux, {
    postAdapter: adapterMode === 'strict' ? strictAdapter : lenientAdapter
  });

  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const newPost = await postActions.add({content}, ['postId', 'content', 'createdAt']);

      console.log('Post created with', adapterMode, 'validation:', newPost);
      setContent('');
    } catch(err: any) {
      setError(err.message || 'Failed to create post');
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dynamic-adapter-example">
      <h2>Dynamic Adapter Switching</h2>

      <div className="mode-selector">
        <label>
          <input
            type="radio"
            value="strict"
            checked={adapterMode === 'strict'}
            onChange={() => setAdapterMode('strict')}
          />
          Strict Mode (Throws errors)
        </label>
        <label>
          <input
            type="radio"
            value="lenient"
            checked={adapterMode === 'lenient'}
            onChange={() => setAdapterMode('lenient')}
          />
          Lenient Mode (Auto-corrects)
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      <textarea
        placeholder="Post content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
      />

      <div className="info">
        <small>
          Current mode: {adapterMode === 'strict' ? 'Strict validation' : 'Auto-correction enabled'}
        </small>
        <small>Characters: {content.length}</small>
      </div>

      <button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Post'}
      </button>
    </div>
  );
};

// =============================================================================
// Complete Extensibility Example
// =============================================================================

export const CompleteExtensibilityExample = () => {
  const [activeExample, setActiveExample] = useState<'sponsored' | 'ticketing' | 'settings' | 'dynamic'>('sponsored');

  return (
    <div className="extensibility-examples">
      <h1>MetropolisJS Extensibility Examples</h1>

      <nav>
        <button onClick={() => setActiveExample('sponsored')}>Sponsored Posts</button>
        <button onClick={() => setActiveExample('ticketing')}>Event Ticketing</button>
        <button onClick={() => setActiveExample('settings')}>Group Settings</button>
        <button onClick={() => setActiveExample('dynamic')}>Dynamic Adapters</button>
      </nav>

      <main>
        {activeExample === 'sponsored' && <SponsoredPostAdapterExample />}
        {activeExample === 'ticketing' && <EventTicketingAdapterExample />}
        {activeExample === 'settings' && <GroupSettingsAdapterExample />}
        {activeExample === 'dynamic' && <DynamicAdapterExample />}
      </main>

      <section className="documentation">
        <h2>Key Concepts</h2>
        <ul>
          <li>
            <strong>Custom Adapters:</strong> Transform and validate data before API calls
          </li>
          <li>
            <strong>Extensible Fields:</strong> Use metadata and customFields for domain-specific data
          </li>
          <li>
            <strong>Type Safety:</strong> Extend base types for compile-time validation
          </li>
          <li>
            <strong>Business Logic:</strong> Implement complex validation rules in adapters
          </li>
          <li>
            <strong>Dynamic Behavior:</strong> Switch adapters at runtime for different modes
          </li>
        </ul>
      </section>
    </div>
  );
};

export default CompleteExtensibilityExample;
