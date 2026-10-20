import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createServer as createViteServer} from 'vite';

const httpEntry = import.meta.resolve('@nlabs/rip-hunter/http');
// Existing repository E2E workflow uses Vite; no new runner or dependency.
const vite = await createViteServer({appType: 'custom', configFile: false, server: {middlewareMode: true}});
const pending = new Map();
const events = [];
const cookie = (value) => (value === 'clear'
  ? 'fixture_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  : `fixture_session=${value}; Path=/; HttpOnly; SameSite=Strict`);
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:63721');
  if(url.pathname === '/tests/web-session-controller-harness.html' && !url.searchParams.has('html-proxy')) {
    response.setHeader('Content-Type', 'text/html');
    response.end(await vite.transformIndexHtml(url.pathname,
      await readFile(new URL('./web-session-controller-harness.html', import.meta.url), 'utf8')));
    return;
  }
  if(url.pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Native cookie transport qualification</title><h1>Native cookie transport qualification</h1><script type="module">import {httpRequest} from "/rip/http.js"; window.httpRequest = httpRequest;</script>');
    return;
  }
  if(['/rip/http.js', '/rip/deadline.js', '/rip/binaryResponse.js'].includes(url.pathname)) {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(await readFile(new URL(url.pathname.slice(5), httpEntry)));
    return;
  }
  if(url.pathname === '/events') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(events));
    return;
  }
  if(url.pathname.startsWith('/release/')) {
    const id = url.pathname.slice(9);
    pending.get(id)?.();
    pending.delete(id);
    response.end('released');
    return;
  }
  if(url.pathname.startsWith('/mutation/')) {
    const id = url.pathname.slice(10);
    const value = url.searchParams.get('cookie') ?? id;
    const held = url.searchParams.get('held');
    const json = url.searchParams.has('identity') ? JSON.stringify({
      idleExpiresAt: Date.now() + 3_600_000, observedAt: Date.now(), sid: 'fixture-session', userId: 'owner', username: 'fixture'
    }) : '{"ok":true}';
    events.push({event: 'received', id, method: request.method});
    response.on('close', () => events.push({event: 'closed', id}));
    const headers = () => {
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Set-Cookie', cookie(value));
    };
    const finish = () => {
      events.push({destroyed: response.destroyed, event: 'late-response-attempt', id});
      if(!response.headersSent) {
        headers();
      }
      response.end(held === 'body' ? 'true}' : json);
    };
    if(held === 'body') {
      headers();
      response.write('{"ok":');
      pending.set(id, finish);
    } else if(held) {
      pending.set(id, finish);
    } else {
      headers();
      response.end(json);
    }
    return;
  }
  vite.middlewares(request, response, () => response.writeHead(404).end());
});
server.listen(63721, '127.0.0.1');
process.on('SIGTERM', () => {
  server.closeAllConnections();
  void vite.close();
});
