/**
 * Example: Using the Factory Pattern in MetropolisJS
 *
 * This file demonstrates how to use the new consolidated action factory
 * instead of individual createXxxActions functions.
 */

import {createAction, createActions, createAllActions} from '../src/utils/actionFactory.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {PostType} from '../src/adapters/postAdapter/postAdapter.js';
import type {User} from '../src/adapters/userAdapter/userAdapter.js';

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : 'An unknown error occurred'
);

// Example 1: Basic Usage
export const basicUsage = (flux: FluxFramework) => {
  // Create actions using consolidated factory functions
  const userActions = createAction('user', flux);
  const postActions = createAction('post', flux);

  // Use actions normally
  const addUser = async () => {
    const user = await userActions.addUser({
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      username: 'john_doe'
    });
    return user;
  };

  const createPost = async () => {
    const post = await postActions.add({
      content: 'Hello, world!',
      name: 'My First Post'
    });
    return post;
  };

  return {addUser, createPost};
};

// Example 2: Custom Adapter with Business Logic
export const customAdapterUsage = (flux: FluxFramework) => {
  // Custom user adapter that adds business logic
  const businessUserAdapter = (input: unknown): User => {
    const user = input as User;
    const email = user.email || '';

    // Business validation
    if(email && !email.includes('@company.com')) {
      throw new Error('Only company emails are allowed');
    }

    // Add computed fields
    return {
      ...user,
      department: email.split('@')[0]?.split('.')[1] || 'general',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      isAdmin: (user.userAccess || 0) >= 3
    };
  };

  // Create actions with custom adapter
  const userActions = createAction('user', flux, {
    userAdapter: businessUserAdapter,
    userAdapterOptions: {
      environment: 'production',
      strict: true
    }
  });

  return userActions;
};

// Example 3: Runtime Adapter Updates
export const runtimeUpdates = (flux: FluxFramework) => {
  const userActions = createAction('user', flux);

  // Update adapter at runtime
  const updateToStrictMode = () => {
    userActions.updateUserAdapterOptions({
      environment: 'production',
      strict: true
    });
  };

  // Add custom validation at runtime
  const addCustomValidation = () => {
    userActions.updateUserAdapter((input) => {
      const user = input as User;

      // Additional runtime validation
      if(user.age && user.age < 18) {
        throw new Error('User must be 18 or older');
      }

      return user;
    });
  };

  return {addCustomValidation, updateToStrictMode, userActions};
};

// Example 4: Testing with Mock Adapters
export const testingExample = (flux: FluxFramework) => {
  // Mock adapter for testing
  const calls: unknown[] = [];
  const mockUserAdapter = (input: unknown) => {
    calls.push(input);
    return {
      ...(input as Record<string, unknown>),
      id: 'mock-user-id',
      timestamp: new Date().toISOString(),
      validated: true
    };
  };

  const userActions = createAction('user', flux, {
    userAdapter: mockUserAdapter
  });

  // Test that adapter was called
  const testUserCreation = async () => {
    const user = await userActions.addUser({
      email: 'test@example.com',
      username: 'test_user'
    });

    if(calls.length === 0 || user.id !== 'mock-user-id' || user.validated !== true) {
      throw new Error('Mock adapter validation failed');
    }
  };

  return {testUserCreation, userActions};
};

// Example 5: Multiple Adapters with Different Configurations
export const multipleAdapters = (flux: FluxFramework) => {
  // User adapter with strict validation
  const strictUserAdapter = (input: unknown) => {
    const user = input as User;
    if(!user.username || !user.email) {
      throw new Error('Username and email are required');
    }
    return user;
  };

  // Post adapter with content validation
  const contentPostAdapter = (input: unknown) => {
    const post = input as PostType;
    if(post.content && post.content.length > 1000) {
      throw new Error('Post content too long');
    }
    return post;
  };

  // Create actions with different adapters
  const userActions = createAction('user', flux, {
    userAdapter: strictUserAdapter,
    userAdapterOptions: {strict: true}
  });

  const postActions = createAction('post', flux, {
    postAdapter: contentPostAdapter,
    postAdapterOptions: {environment: 'development'}
  });

  return {postActions, userActions};
};

// Example 6: Error Handling
export const errorHandling = (flux: FluxFramework) => {
  const userActions = createAction('user', flux, {
    userAdapterOptions: {
      customValidation: (input) => {
        const user = input as User;

        // Custom error handling
        if(user.username && user.username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }

        if(user.email && !user.email.includes('@')) {
          throw new Error('Invalid email format');
        }

        return user;
      },
      strict: true
    }
  });

  const createUserWithErrorHandling = async (userData: Partial<User>) => {
    try {
      const user = await userActions.addUser(userData);
      return {success: true, user};
    } catch(error) {
      return {error: getErrorMessage(error), success: false};
    }
  };

  return {createUserWithErrorHandling};
};

// Example 7: Multiple Actions Creation
export const multipleActionsExample = (flux: FluxFramework) => {
  // Create multiple actions at once
  const actions = createActions(['user', 'post', 'message'], flux, {
    post: {
      postAdapter: (input: unknown) => {
        const post = input as PostType;
        if(post.content && post.content.length > 1000) {
          throw new Error('Post content too long');
        }
        return post;
      }
    },
    user: {
      userAdapterOptions: {strict: true}
    }
  });

  const createUserAndPost = async (userData: Partial<User>, postData: Partial<PostType>) => {
    const user = await actions.user.addUser(userData);
    const post = await actions.post.add({
      ...postData,
      userId: user.userId
    });
    return {post, user};
  };

  return {actions, createUserAndPost};
};

// Example 8: All Actions Creation
export const allActionsExample = (flux: FluxFramework) => {
  // Create all available actions
  const allActions = createAllActions(flux, {
    image: {imageAdapterOptions: {allowPartial: true}},
    post: {postAdapterOptions: {environment: 'production'}},
    user: {userAdapterOptions: {strict: true}}
  });

  const comprehensiveWorkflow = async () => {
    // Create user
    const user = await allActions.user.addUser({
      email: 'jane@example.com',
      username: 'jane_doe'
    });

    // Create post
    const post = await allActions.post.add({
      content: 'Hello world!',
      name: 'My Post'
    });

    // Upload image
    const image = await allActions.image.add({
      base64: 'data:image/jpeg;base64,...',
      description: 'Profile picture'
    });

    // Send message
    await allActions.message.sendMessage({
      content: 'Welcome!',
      recipientId: user.userId
    });

    return {image, post, user};
  };

  return {allActions, comprehensiveWorkflow};
};
