/**
 * Example: Using the Factory Pattern in MetropolisJS
 * 
 * This file demonstrates how to use the new consolidated action factory
 * instead of individual createXxxActions functions.
 */

import type { FluxFramework } from '@nlabs/arkhamjs';
import { createAction, createActions, createAllActions } from '../src/utils/actionFactory';

// Example 1: Basic Usage
export const basicUsage = (flux: FluxFramework) => {
  // Create actions using consolidated factory functions
  const userActions = createAction('user', flux) as any;
  const postActions = createAction('post', flux) as any;
  const eventActions = createAction('event', flux) as any;

  // Use actions normally
  const addUser = async () => {
    const user = await userActions.add({
      username: 'john_doe',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe'
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
  const businessUserAdapter = (input: unknown, options?: any) => {
    const user = input as any;
    
    // Business validation
    if (user.email && !user.email.includes('@company.com')) {
      throw new Error('Only company emails are allowed');
    }
    
    // Add computed fields
    return {
      ...user,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      isAdmin: user.userAccess >= 3,
      department: user.email?.split('@')[0]?.split('.')[1] || 'general'
    };
  };

  // Create actions with custom adapter
  const userActions = createAction('user', flux, {
    userAdapter: businessUserAdapter,
    userAdapterOptions: {
      strict: true,
      environment: 'production'
    }
  });

  return userActions;
};

// Example 3: Runtime Adapter Updates
export const runtimeUpdates = (flux: FluxFramework) => {
  const userActions = createAction('user', flux) as any;

  // Update adapter at runtime
  const updateToStrictMode = () => {
    userActions.updateUserAdapterOptions({
      strict: true,
      environment: 'production'
    });
  };

  // Add custom validation at runtime
  const addCustomValidation = () => {
    userActions.updateUserAdapter((input, options) => {
      const user = input as any;
      
      // Additional runtime validation
      if (user.age && user.age < 18) {
        throw new Error('User must be 18 or older');
      }
      
      return user;
    });
  };

  return {updateToStrictMode, addCustomValidation, userActions};
};

// Example 4: Testing with Mock Adapters
export const testingExample = (flux: FluxFramework) => {
  // Mock adapter for testing
  const mockUserAdapter = Object.assign((input: unknown) => {
    mockUserAdapter.calls.push(input);
    return {
      ...(input as Record<string, unknown>),
      id: 'mock-user-id',
      validated: true,
      timestamp: new Date().toISOString()
    };
  }, {
    calls: [] as unknown[]
  });

  const userActions = createAction('user', flux, {
    userAdapter: mockUserAdapter
  }) as any;

  // Test that adapter was called
  const testUserCreation = async () => {
    const user = await userActions.add({
      username: 'test_user',
      email: 'test@example.com'
    });

    if(mockUserAdapter.calls.length === 0 || user.id !== 'mock-user-id' || user.validated !== true) {
      throw new Error('Mock adapter validation failed');
    }
  };

  return {userActions, testUserCreation};
};

// Example 5: Multiple Adapters with Different Configurations
export const multipleAdapters = (flux: FluxFramework) => {
  // User adapter with strict validation
  const strictUserAdapter = (input: unknown) => {
    const user = input as any;
    if (!user.username || !user.email) {
      throw new Error('Username and email are required');
    }
    return user;
  };

  // Post adapter with content validation
  const contentPostAdapter = (input: unknown) => {
    const post = input as any;
    if (post.content && post.content.length > 1000) {
      throw new Error('Post content too long');
    }
    return post;
  };

  // Create actions with different adapters
  const userActions = createAction('user', flux, {
    userAdapter: strictUserAdapter,
    userAdapterOptions: {strict: true}
  }) as any;

  const postActions = createAction('post', flux, {
    postAdapter: contentPostAdapter,
    postAdapterOptions: {environment: 'development'}
  }) as any;

  return {userActions, postActions};
};

// Example 6: Error Handling
export const errorHandling = (flux: FluxFramework) => {
  const userActions = createAction('user', flux, {
    userAdapterOptions: {
      strict: true,
      customValidation: (input) => {
        const user = input as any;
        
        // Custom error handling
        if (user.username && user.username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }
        
        if (user.email && !user.email.includes('@')) {
          throw new Error('Invalid email format');
        }
        
        return user;
      }
    }
  }) as any;

  const createUserWithErrorHandling = async (userData: any) => {
    try {
      const user = await userActions.add(userData);
      return {success: true, user};
    } catch (error) {
      return {success: false, error: error.message};
    }
  };

  return {createUserWithErrorHandling};
};

// Example 7: Multiple Actions Creation
export const multipleActionsExample = (flux: FluxFramework) => {
  // Create multiple actions at once
  const actions = createActions(['user', 'post', 'message'], flux, {
    user: {
      userAdapterOptions: { strict: true }
    },
    post: {
      postAdapter: (input: any) => {
        if (input.content && input.content.length > 1000) {
          throw new Error('Post content too long');
        }
        return input;
      }
    }
  });

  const createUserAndPost = async (userData: any, postData: any) => {
    const user = await actions.user.add(userData);
    const post = await actions.post.add({
      ...postData,
      userId: user.userId
    });
    return { user, post };
  };

  return { actions, createUserAndPost };
};

// Example 8: All Actions Creation
export const allActionsExample = (flux: FluxFramework) => {
  // Create all available actions
  const allActions = createAllActions(flux, {
    user: { userAdapterOptions: { strict: true } },
    post: { postAdapterOptions: { environment: 'production' } },
    image: { imageAdapterOptions: { allowPartial: true } }
  });

  const comprehensiveWorkflow = async () => {
    // Create user
    const user = await allActions.user.add({
      username: 'jane_doe',
      email: 'jane@example.com'
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

    return { user, post, image };
  };

  return { allActions, comprehensiveWorkflow };
};

// Example 9: Migration from Old Pattern
export const migrationExample = (flux: FluxFramework) => {
  // New way (recommended)
  const userActions = createAction('user', flux) as any;
  const postActions = createAction('post', flux) as any;
  const eventActions = createAction('event', flux) as any;

  const createUser = async (userData: any) => {
    return await userActions.add(userData);
  };

  const createPost = async (postData: any) => {
    return await postActions.add(postData);
  };

  return { createUser, createPost };
}; 
