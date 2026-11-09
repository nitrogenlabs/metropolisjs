import {FluxFramework} from '@nlabs/arkhamjs';
import {restRequest} from '@nlabs/metropolisjs';
import {ApiError} from '@nlabs/rip-hunter/errors';
import assert from 'node:assert/strict';

const original = globalThis.fetch;
const qualify = async (status: number): Promise<void> => {
  const flux = new FluxFramework();
  await flux.setState('app.networkType', 'wifi');
  let requests = 0;
  const body = {error: 'Synthetic domain refusal', state: 'frozen'};
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://fixture.invalid/domain');
    assert.equal(options?.method, 'POST');
    requests++;
    return Response.json(body, {status});
  };
  await assert.rejects(restRequest(flux, 'https://fixture.invalid/domain', 'POST', {value: 'synthetic'},
    {cache: false, queueOffline: false, timeout: 0}), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, status);
    assert.deepEqual(error.responseBody, body);
    return true;
  });
  assert.equal(requests, 1);
};
try {
  await qualify(400);
  await qualify(403);
  await qualify(409);
  await qualify(413);
  await qualify(429);
  await qualify(503);
} finally {
  globalThis.fetch = original;
}
process.stdout.write('Installed REST transport preserves public ApiError identity, status and JSON refusals with one request.\n');
