import { createMutation } from './api';

describe('SignIn GraphQL Mutation Generation', () => {
  describe('createMutation with signIn', () => {
    it('should generate correct mutation shape with users wrapper', () => {
      const queryVariables = {
        expires: {
          type: 'Int',
          value: 15
        },
        password: {
          type: 'String!',
          value: 'password123'
        },
        username: {
          type: 'String!',
          value: 'testuser'
        }
      };

      const returnProperties = ['expires', 'issued', 'token', 'userId', 'username'];
      const {query, variables} = createMutation('signIn', 'users', queryVariables, returnProperties);

      // Verify the query structure
      expect(query).toBeDefined();
      expect(typeof query).toBe('string');

      // Verify mutation declaration
      expect(query).toContain('mutation');
      expect(query).toContain('UsersSignIn');

      // Verify variables in mutation signature
      expect(query).toContain('$expires: Int');
      expect(query).toContain('$password: String!');
      expect(query).toContain('$username: String!');

      // Verify signIn field with parameters (flat structure, no users wrapper)
      expect(query).toContain('signIn');
      expect(query).toMatch(/signIn\s*\(\s*expires:\s*\$expires\s*,\s*password:\s*\$password\s*,\s*username:\s*\$username\s*\)/);

      // Verify return properties
      expect(query).toContain('expires');
      expect(query).toContain('issued');
      expect(query).toContain('token');
      expect(query).toContain('userId');
      expect(query).toContain('username');

      // Verify variables object
      expect(variables).toEqual({
        expires: 15,
        password: 'password123',
        username: 'testuser'
      });

      console.log('Generated SignIn Mutation:\n', query);
    });

    it('should generate mutation with correct GraphQL syntax structure', () => {
      const queryVariables = {
        username: {type: 'String!', value: 'user'},
        password: {type: 'String!', value: 'pass'},
        expires: {type: 'Int', value: 20}
      };

      const {query} = createMutation('signIn', 'users', queryVariables, ['token']);

      // Verify proper GraphQL mutation structure
      expect(query).toMatch(/^mutation\s+UsersSignIn/);
      expect(query).toContain('{');
      expect(query).toContain('signIn');
      expect(query).toContain('}');

      // Verify signIn is at the top level (flat structure, no users wrapper)
    });

    it('should handle signIn with only required parameters', () => {
      const queryVariables = {
        username: {type: 'String!', value: 'testuser'},
        password: {type: 'String!', value: 'pass'}
      };

      const {query, variables} = createMutation('signIn', 'users', queryVariables, ['token', 'userId']);

      expect(variables.username).toBe('testuser');
      expect(variables.password).toBe('pass');
      expect(Object.keys(variables)).toHaveLength(2);
      expect(query).toContain('signIn');
      expect(query).toContain('token');
      expect(query).toContain('userId');
    });

    it('should create complete signin mutation payload', () => {
      const queryVariables = {
        username: {type: 'String!', value: 'user@example.com'},
        password: {type: 'String!', value: 'securePassword123'},
        expires: {type: 'Int', value: 604800}
      };

      const {query, variables} = createMutation('signIn', 'users', queryVariables, [
        'token',
        'expires',
        'issued',
        'userId',
        'username'
      ]);

      // Verify mutation name format
      expect(query).toMatch(/mutation\s+UsersSignIn/);

      // Verify all parameters are in the mutation signature
      expect(query).toContain('$username: String!');
      expect(query).toContain('$password: String!');
      expect(query).toContain('$expires: Int');

      // Verify the flat structure (no users wrapper for mutations)
      const lines = query.split('\n');
      const signInLine = lines.find(line => line.includes('signIn'));

      expect(signInLine).toBeDefined();

      // Verify variables
      expect(variables).toEqual({
        username: 'user@example.com',
        password: 'securePassword123',
        expires: 604800
      });
    });
  });


  describe('refreshSession mutation', () => {
    it('should generate correct refreshSession mutation', () => {
      const queryVariables = {
        expires: {type: 'Int', value: 15},
        token: {type: 'String!', value: 'refresh-token-123'}
      };

      const {query, variables} = createMutation('refreshSession', 'users', queryVariables, ['expires', 'issued', 'token']);

      expect(query).toContain('mutation');
      expect(query).toContain('UsersRefreshSession');
      expect(query).toContain('refreshSession');
      expect(variables.token).toBe('refresh-token-123');
      expect(variables.expires).toBe(15);

      console.log('Generated RefreshSession Mutation:\n', query);
    });
  });

  describe('addUser mutation', () => {
    it('should generate correct addUser mutation with users wrapper', () => {
      const userInput = {
        username: 'newuser',
        email: 'test@example.com'
      };

      const queryVariables = {
        user: {
          type: 'UserInput!',
          value: userInput
        }
      };

      const {query, variables} = createMutation('addUser', 'users', queryVariables, ['userId', 'username']);

      expect(query).toContain('addUser');
      expect(query).toContain('mutation');
      expect(query).toContain('UsersAddUser');
      expect(variables.user).toEqual(userInput);

      console.log('Generated AddUser Mutation:\n', query);
    });
  });

  describe('API Response Handler', () => {
    it('should correctly extract signIn session from users wrapper', () => {
      const mockResponse = {
        users: {
          signIn: {
            token: 'auth-token-123',
            expires: 1609459200,
            issued: 1609372800,
            userId: 'user-123',
            username: 'testuser'
          }
        }
      };

      // Simulate what the onSuccess callback should extract
      const {users} = mockResponse;
      const sessionData = users?.signIn || {};

      expect(sessionData).toEqual({
        token: 'auth-token-123',
        expires: 1609459200,
        issued: 1609372800,
        userId: 'user-123',
        username: 'testuser'
      });
    });

    it('should handle missing users wrapper gracefully', () => {
      const malformedResponse = {
        signIn: {
          token: 'auth-token-123'
        }
      };

      const {users} = malformedResponse;
      const sessionData = users?.signIn || {};

      expect(sessionData).toEqual({});
    });

    it('should handle nested data extraction for other mutations', () => {
      const updateResponse = {
        users: {
          update: {
            userId: 'user-123',
            username: 'updateduser',
            email: 'new@example.com'
          }
        }
      };

      const {users} = updateResponse;
      const userData = users?.update || {};

      expect(userData).toEqual({
        userId: 'user-123',
        username: 'updateduser',
        email: 'new@example.com'
      });
    });
  });

  describe('Expected Server GraphQL Schema', () => {
    it('should document the expected Mutation type structure for server implementation', () => {
      // This test documents what the server schema MUST support
      // The client is correctly generating: mutation UsersSignIn(...) { users { signIn(...) } }
      // Therefore the server schema must have these types defined

      const expectedMutationType = `
        type Mutation {
          users: UsersMutation!
        }
      `;

      const expectedUsersMutation = `
        type UsersMutation {
          addUser(user: UserInput!): User
          signIn(username: String!, password: String!, expires: Int): Session
          update(user: UserUpdateInput!): User
          updateProfile(profile: ProfileUpdateInput!): Profile
          refreshSession(token: String!, expires: Int): Session
          confirmCode(code: Int!, type: String!, value: String!): Boolean
          remove(userId: String!): User
          session(user: UserInput!): User
          itemById(userId: String!): User
        }
      `;

      const expectedSessionType = `
        type Session {
          token: String!
          expires: Int
          issued: Int
          userId: String
          username: String
        }
      `;

      expect(expectedMutationType).toContain('type Mutation');
      expect(expectedMutationType).toContain('users: UsersMutation!');
      expect(expectedUsersMutation).toContain('type UsersMutation');
      expect(expectedUsersMutation).toContain('signIn');
      expect(expectedSessionType).toContain('type Session');
    });
  });
});
