import { describe, expect, it } from '@jest/globals';
import http from 'http';

export const startSimpleServer = async (port = 3002) => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && req.url === '/graphql') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        res.writeHead(200);
        res.end(JSON.stringify({
          request: {
            method: req.method,
            url: req.url,
            body: body
          },
          response: {
            message: 'OK'
          }
        }));
      });
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({error: 'not found'}));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({server, port});
    });
  });
};

export const stopServer = (server) => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
};

// Sanity check for Jest so this helper file has at least one test
describe('testGraphQLServerSimple helper', () => {
  it('exports startSimpleServer and stopServer', () => {
    expect(typeof startSimpleServer).toBe('function');
    expect(typeof stopServer).toBe('function');
  });
});
