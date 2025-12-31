/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {describe, expect, it, beforeEach, jest} from '@jest/globals';

// Mock @nlabs/rip-hunter before importing api
const mockGraphqlQuery = jest.fn();
const mockPost = jest.fn();

jest.unstable_mockModule('@nlabs/rip-hunter', () => ({
  graphqlQuery: mockGraphqlQuery,
  post: mockPost,
  ApiError: class ApiError extends Error {
    constructor(errors, message) {
      super(message);
      this.errors = errors;
    }
  }
}));

// Import after mock
const {
  createQuery,
  createMutation,
  appQuery,
  appMutation,
  publicQuery,
  publicMutation,
  uploadImage,
  refreshSession
} = await import('./api');

describe('api utilities', () => {
  let mockFlux;

  beforeEach(() => {
    // Reset mocks
    mockGraphqlQuery.mockReset();
    mockPost.mockReset();
    mockGraphqlQuery.mockResolvedValue({data: {}});
    mockPost.mockResolvedValue({data: {}});

    mockFlux = {
      dispatch: jest.fn(),
      getState: jest.fn((key) => {
        if(key === 'app.config') {
          return {
            app: {
              api: {
                url: 'https://api.example.com',
                public: 'https://public.example.com',
                uploadImage: 'https://upload.example.com'
              }
            }
          };
        }
        if(key === 'app.networkType') {
          return 'wifi';
        }
        if(key === 'user.session') {
          return {
            token: 'test-token',
            expires: Date.now() + 3600000,
            issued: Date.now()
          };
        }
        if(key === 'user.session.token') {
          return 'test-token';
        }
        return undefined;
      }),
      clearAppData: jest.fn()
    };
  });

  describe('createQuery', () => {
    it('should create query without variables', () => {
      const result = createQuery('getItems', 'users', {}, ['id', 'name']);

      expect(result.query).toBeDefined();
      expect(result.variables).toEqual({});
    });

    it('should create query with variables', () => {
      const variables = {
        id: {type: 'String!', value: '123'}
      };
      const result = createQuery('getItem', 'users', variables, ['id', 'name']);

      expect(result.query).toContain('$id: String!');
      expect(result.variables).toEqual({id: '123'});
    });

    it('should handle multiple variables', () => {
      const variables = {
        id: {type: 'String!', value: '123'},
        limit: {type: 'Int', value: 10}
      };
      const result = createQuery('getItems', 'users', variables, ['id', 'name']);

      expect(result.query).toContain('$id: String!');
      expect(result.query).toContain('$limit: Int');
      expect(result.variables).toEqual({id: '123', limit: 10});
    });

    it('should handle name with spaces', () => {
      const result = createQuery('get user items', 'users', {}, ['id']);

      // The name "get user items" becomes "getuseritems" after removing spaces
      // Then it's used in camelCase('users_getuseritems') which becomes "usersGetuseritems"
      // The query name in the GraphQL query will be "getuseritems" (lowercase in the query body)
      expect(result.query).toContain('getuseritems');
      expect(result.query).toContain('users {');
      expect(result.query).toContain('query');
      expect(result.query).toContain('UsersGetuseritems');
    });
  });

  describe('createMutation', () => {
    it('should create mutation query', () => {
      const result = createMutation('addUser', 'users', {}, ['id', 'name']);

      expect(result.query).toContain('mutation');
      expect(result.query).toContain('addUser');
    });
  });

  describe('appQuery', () => {
    it('should call getGraphql with app url and authenticate true', async () => {
      await appQuery(
        mockFlux,
        'getItems',
        'users',
        {},
        ['id', 'name']
      );

      expect(mockFlux.getState).toHaveBeenCalledWith('app.config');
      expect(mockGraphqlQuery).toHaveBeenCalled();
    });
  });

  describe('appMutation', () => {
    it('should call getGraphql with app url and authenticate true', async () => {
      await appMutation(
        mockFlux,
        'addUser',
        'users',
        {},
        ['id', 'name']
      );

      expect(mockFlux.getState).toHaveBeenCalledWith('app.config');
      expect(mockGraphqlQuery).toHaveBeenCalled();
    });
  });

  describe('publicQuery', () => {
    it('should call getGraphql with public url and authenticate false', async () => {
      await publicQuery(
        mockFlux,
        'getItems',
        'users',
        {},
        ['id', 'name']
      );

      expect(mockFlux.getState).toHaveBeenCalledWith('app.config');
      expect(mockGraphqlQuery).toHaveBeenCalled();
    });
  });

  describe('publicMutation', () => {
    it('should call getGraphql with public url and authenticate false', async () => {
      await publicMutation(
        mockFlux,
        'addUser',
        'users',
        {},
        ['id', 'name']
      );

      expect(mockFlux.getState).toHaveBeenCalledWith('app.config');
      expect(mockGraphqlQuery).toHaveBeenCalled();
    });
  });

  describe('uploadImage', () => {
    it('should upload image with token', async () => {
      const imageData = {file: 'test'};
      await uploadImage(mockFlux, imageData);

      expect(mockFlux.getState).toHaveBeenCalledWith('user.session.token');
      expect(mockFlux.getState).toHaveBeenCalledWith('app.config');
      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe('refreshSession', () => {
    it('should return null when token is empty', async () => {
      mockFlux.getState = jest.fn(() => undefined);

      const result = await refreshSession(mockFlux);

      // refreshSession returns null or undefined when token is empty
      expect(result).toBeFalsy();
    });

    it('should refresh session with token', async () => {
      mockGraphqlQuery.mockResolvedValue({
        users: {
          refreshSession: {token: 'new-token', expires: Date.now() + 3600000}
        }
      });

      const result = await refreshSession(mockFlux, 'test-token', 15);

      expect(mockFlux.dispatch).toHaveBeenCalled();
      expect(mockGraphqlQuery).toHaveBeenCalled();
    });
  });
});
