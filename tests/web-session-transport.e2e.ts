import {expect, test} from '@playwright/test';

import type {httpRequest} from '@nlabs/rip-hunter/http';
import type {Page} from '@playwright/test';
import type {WebSessionActions} from '../src/utils/webSessionRuntime.js';

interface ControllerFixture {
  activity: Promise<string>;
  bind: () => WebSessionActions;
  controller: WebSessionActions;
  signin: Promise<unknown>;
}
interface BrowserBinding {
  controller: AbortController;
  httpRequest: typeof httpRequest;
  outcome: Promise<string>;
}

const initialize = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.waitForFunction('typeof window.httpRequest === "function"');
};
const mutate = async (page: Page, path: string): Promise<unknown> => page.evaluate(async (url) => {
  const binding = window as unknown as BrowserBinding;
  return binding.httpRequest(url, {credentials: 'same-origin', method: 'POST', timeout: 30_000}, (response) => response.json());
}, path);

test('actual 30-second native timeout discards late old Set-Cookie before fresh sign-in', async ({context, page, request}, testInfo) => {
  await initialize(page);
  const id = `${testInfo.project.name}-timeout-activity`;
  const started = Date.now();
  const outcome = await page.evaluate(async (url) => {
    const binding = window as unknown as BrowserBinding;
    try {
      await binding.httpRequest(url, {credentials: 'same-origin', method: 'POST', timeout: 30_000}, (response) => response.json());
      return 'unexpected-success';
    } catch(error) {
      return (error as {kind: string}).kind;
    }
  }, `/mutation/${id}?held=headers&cookie=old-activity`);

  expect(outcome).toBe('timeout');
  expect(Date.now() - started).toBeGreaterThanOrEqual(29_900);

  await mutate(page, `/mutation/${id}-signin?cookie=fresh-signin`);
  await request.post(`/release/${id}`);

  await expect.poll(async () => (await context.cookies()).find(({name}) => name === 'fixture_session')?.value).toBe('fresh-signin');

  const events = await (await request.get('/events')).json() as Array<{event: string; id: string; destroyed?: boolean}>;

  expect(events).toContainEqual({destroyed: true, event: 'late-response-attempt', id});

  await testInfo.attach('native-timeout-cookie-receipt', {
    body: JSON.stringify({browser: testInfo.project.name, elapsed: Date.now() - started,
      events: events.filter((event) => event.id.startsWith(id)), outcome}), contentType: 'application/json'
  });
});

for(const operation of ['activity', 'signin', 'signout']) {
  test(`native successful and canceled ${operation} cannot replace a newer cookie`, async ({context, page, request}, testInfo) => {
    await initialize(page);
    const id = `${testInfo.project.name}-${operation}`;
    await mutate(page, `/mutation/${id}-success?cookie=${operation === 'signout' ? 'clear' : operation}`);

    expect((await context.cookies()).find(({name}) => name === 'fixture_session')?.value).toBe(operation === 'signout' ? undefined : operation);

    await page.evaluate((url) => {
      const binding = window as unknown as BrowserBinding;
      binding.controller = new AbortController();
      binding.outcome = binding.httpRequest(url, {credentials: 'same-origin', method: 'POST', signal: binding.controller.signal, timeout: 30_000}, (response) => response.json()).then(() => 'success', (error: {kind: string}) => error.kind);
    }, `/mutation/${id}-held?held=headers&cookie=${operation === 'signout' ? 'clear' : 'old'}`);

    await expect.poll(async () => ((await (await request.get('/events')).json()) as Array<{id: string}>).some((event) => event.id === `${id}-held`)).toBe(true);
    expect(await page.evaluate(async () => {
      const binding = window as unknown as BrowserBinding;
      binding.controller.abort();
      return binding.outcome;
    })).toBe('abort');

    await mutate(page, `/mutation/${id}-new?cookie=fresh`);
    await request.post(`/release/${id}-held`);

    expect((await context.cookies()).find(({name}) => name === 'fixture_session')?.value).toBe('fresh');

    const events = await (await request.get('/events')).json() as Array<{event: string; id: string; destroyed?: boolean}>;

    expect(events).toContainEqual({destroyed: true, event: 'late-response-attempt', id: `${id}-held`});
  });
}

test('abort during native response body preserves newer sign-in cookie', async ({context, page, request}, testInfo) => {
  await initialize(page);
  const id = `${testInfo.project.name}-body`;
  await page.evaluate((url) => {
    const binding = window as unknown as BrowserBinding;
    binding.controller = new AbortController();
    binding.outcome = binding.httpRequest(url, {credentials: 'same-origin', method: 'POST', signal: binding.controller.signal, timeout: 30_000}, (response) => response.json()).then(() => 'success', (error: {kind: string}) => error.kind);
  }, `/mutation/${id}?held=body&cookie=old-body`);

  await expect.poll(async () => (await context.cookies()).find(({name}) => name === 'fixture_session')?.value).toBe('old-body');
  expect(await page.evaluate(async () => {
    const binding = window as unknown as BrowserBinding;
    binding.controller.abort();
    return binding.outcome;
  })).toBe('abort');

  await mutate(page, `/mutation/${id}-signin?cookie=fresh-body-signin`);
  await request.post(`/release/${id}`);

  expect((await context.cookies()).find(({name}) => name === 'fixture_session')?.value).toBe('fresh-body-signin');
});

test('actual controller disposal/rebind preserves the native cookie mutation tail', async ({context, page, request}, testInfo) => {
  const id = `${testInfo.project.name}-controller`;
  await page.goto(`/tests/web-session-controller-harness.html?id=${id}`);
  await page.waitForFunction('Boolean(window.fixture)');
  await page.evaluate(async () => {
    const {fixture} = window as unknown as {fixture: ControllerFixture};
    await fixture.controller.restore();
    fixture.activity = fixture.controller.recordActivity().then(() => 'success', (error: Error) => error.message);
  });

  await expect.poll(async () => ((await (await request.get('/events')).json()) as Array<{id: string}>).some((event) => event.id === `${id}-activity`)).toBe(true);

  await page.evaluate(async () => {
    const {fixture} = window as unknown as {fixture: ControllerFixture};
    fixture.controller.dispose();
    fixture.controller = fixture.bind();
    fixture.signin = fixture.controller.signIn({email: 'synthetic@example.test', password: 'synthetic'});
    // Complete the local clear/publish startup before inspecting wire dispatch.
    await Promise.resolve();
    await Promise.resolve();
  });
  await page.waitForFunction('window.fixture.flux.getState("webSession.status") === "anonymous"');
  const beforeRelease = await (await request.get('/events')).json() as Array<{event: string; id: string; method?: string}>;
  // Foreground/pageshow may add legitimate read-only restores, never writers.

  expect(beforeRelease.filter(({event, id: eventId, method}) => event === 'received' && method === 'POST' && eventId.startsWith(id)).map(({id: eventId}) => eventId)).toEqual([`${id}-activity`]);

  await request.post(`/release/${id}-activity`);
  const outcomes = await page.evaluate(async () => {
    const {fixture} = window as unknown as {fixture: ControllerFixture};
    const activity = await fixture.activity;
    await fixture.signin;
    return {activity, identity: await fixture.controller.ensureSession()};
  });

  expect(outcomes.activity).toBe('web_session_disposed');
  expect(outcomes.identity.sid).toBe('fixture-session');
  expect((await context.cookies()).find(({name}) => name === 'fixture_session')?.value).toBe('fresh-controller');
});
