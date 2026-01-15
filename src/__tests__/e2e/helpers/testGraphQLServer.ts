import { describe, expect, it } from '@jest/globals';
import { buildSchema, graphql } from 'graphql';
import http from 'http';

/**
 * E2E Test GraphQL Server
 * Mocks only the database/resolver layer while keeping real GraphQL execution
 * Uses minimal HTTP + graphql-core
 */

const typeDefs = `
  type Query {
    health: String!
  }

  type Mutation {
    users: UsersMutation!
  }

  type UsersMutation {
    signIn(username: String!, password: String!, expires: Int): Session
    addUser(user: UserInput!): User
    refreshSession(token: String!, expires: Int): Session
  }

  type Session {
    token: String!
    expires: Int
    issued: Int
    userId: String!
    username: String!
  }

  type User {
    userId: String!
    username: String!
    email: String
  }

  input UserInput {
    username: String!
    email: String
    password: String!
  }
`;

// Mock database
export const MOCK_USER = {
  userId: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
};

export const MOCK_SESSION = {
  token: 'auth-token-xyz-123',
  expires: Math.floor(Date.now() / 1000) + 86400,
  issued: Math.floor(Date.now() / 1000),
  userId: MOCK_USER.userId,
  username: MOCK_USER.username
};

/**
 * Start test GraphQL server
 */
export const startTestServer = async (port = 3001) => {
  const schema = buildSchema(typeDefs);

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/graphql' && req.method === 'POST') {
      // Handle GraphQL requests
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const {query, variables} = JSON.parse(body);
          console.log('GraphQL request received', {query, variables});

          // Create root value with proper resolver structure
          const rootValue = {
            health: () => 'ok',
            users: (_parent, args, context, info) => {
              // Return an object that resolves the UsersMutation fields
              return {
                signIn: (args) => {
                  const {username, password, expires} = args;

                  if (username === MOCK_USER.username && password === MOCK_USER.password) {
                    return {
                      token: MOCK_SESSION.token,
                      expires: expires || MOCK_SESSION.expires,
                      issued: MOCK_SESSION.issued,
                      userId: MOCK_USER.userId,
                      username: MOCK_USER.username
                    };
                  }
                  throw new Error('Invalid credentials');
                },
                addUser: (args) => {
                  const {user} = args;

                  return {
                    userId: `user-${Date.now()}`,
                    username: user.username,
                    email: user.email
                  };
                },
                refreshSession: (args) => {
                  const {token, expires} = args;

                  if (token === MOCK_SESSION.token) {
                    return {
                      token: MOCK_SESSION.token,
                      expires: expires || MOCK_SESSION.expires,
                      issued: Math.floor(Date.now() / 1000),
                      userId: MOCK_USER.userId,
                      username: MOCK_USER.username
                    };
                  }
                  throw new Error('Invalid token');
                }
              };
            }
          };

          const result = await graphql({
            schema,
            source: query,
            rootValue,
            variableValues: variables || {}
          });

          console.log('GraphQL result', JSON.stringify(result, null, 2));

          res.writeHead(200);
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error('GraphQL server error', error);
          res.writeHead(500);
          const errorMessage = error instanceof Error ? error.message : String(error);
          res.end(JSON.stringify({
            errors: [{message: errorMessage}]
          }));
        }
      });
    } else if (req.url === '/upload' && req.method === 'POST') {
      // Handle file upload requests
      console.log('Upload request received');

      // Mock successful upload response
      res.writeHead(200);
      res.end(JSON.stringify({
        data: {
          success: true,
          url: 'https://example.com/uploaded-image.jpg'
        }
      }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({error: 'Not found'}));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Test GraphQL server running on http://localhost:${port}/graphql`);
      resolve({server, port});
    });
  });
};

// Sanity check for Jest so this helper file is treated as a test module without failing
describe('testGraphQLServer helper', () => {
  it('exports startTestServer and stopTestServer', () => {
    expect(typeof startTestServer).toBe('function');
    expect(typeof stopTestServer).toBe('function');
  });
});

/**
 * Stop test server
 */
export const stopTestServer = (server) => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
};
