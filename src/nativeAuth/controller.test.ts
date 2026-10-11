import {FluxFramework} from '@nlabs/arkhamjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {createNativeAuthController, NativeAuthError} from './controller.js';
import {parseCredentialEnvelope} from './envelope.js';

import type {NativeApi, ApiOperation} from '../api/index.js';
import type {NativeCredentialEnvelope} from './envelope.js';

const now = 1800000000000;
const envelope = (userId = 'one', issued = now, life = 900000): NativeCredentialEnvelope => ({
  environment: 'dev',
  expires: issued + life,
  issued,
  schemaVersion: 1,
  sid: 'family',
  token: `a.${btoa(JSON.stringify({
    exp: (issued + life) / 1000,
    iat: issued / 1000
  }))}.c`,
  userId,
  username: 'Alias'
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {
    promise,
    reject,
    resolve
  };
};
const fixture = async () => {
  const flux = new FluxFramework();
  await flux.init({
    state: {}
  });
  let time = now;
  const storage = {
    available: vi.fn(async () => true),
    clear: vi.fn(async () => {}),
    clearMarker: vi.fn(async () => {}),
    read: vi.fn(async (): Promise<unknown> => null),
    readMarker: vi.fn(async (): Promise<unknown> => null),
    write: vi.fn(async (_value: NativeCredentialEnvelope) => {}),
    writeMarker: vi.fn(async () => {})
  };
  const request = vi.fn(async (operation: {
    operationName: string;
  }): Promise<unknown> => {
    if(operation.operationName === 'MetropolisSignIn') {
      return {
        users: {
          signIn: envelope()
        }
      };
    }
    if(operation.operationName === 'MetropolisRefresh') {
      return {
        users: {
          refreshSession: envelope('one', time)
        }
      };
    }
    return {
      users: {
        signOut: true
      }
    };
  });
  const api: NativeApi = {
    request: async <T,>(operation: ApiOperation): Promise<T> => request(operation) as Promise<T>
  };
  const invalidateAccount = vi.fn();
  const controller = createNativeAuthController({
    api,
    environment: 'dev',
    flux,
    invalidateAccount,
    mode: 'hosted',
    now: () => time,
    storage
  });
  return {
    api,
    controller,
    flux,
    invalidateAccount,
    request,
    storage,
    tick: (value: number) => {
      time = value;
    }
  };
};
const user = {
  email: 'test@example.invalid',
  password: 'synthetic'
};

beforeEach(() => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('fetch', () => {
    throw new Error('Unexpected network');
  });
});

describe('native authentication', () => {
  it('commits before state/event and keeps secrets out of Flux', async () => {
    const f = await fixture();
    const disk = deferred<undefined>();
    f.storage.write.mockReturnValueOnce(disk.promise);
    const events: unknown[] = [];
    const signedOut: unknown[] = [];
    f.flux.on('nativeAuth.SIGNED_OUT', () => signedOut.push(f.flux.getState('nativeAuth')));
    f.flux.on('nativeAuth.AUTHENTICATED', () => events.push(f.flux.getState('nativeAuth')));
    const pending = f.controller.signIn(user);
    await vi.waitFor(() => expect(f.storage.write).toHaveBeenCalled());

    expect(events).toEqual([]);

    disk.resolve(undefined);
    await pending;

    expect(events).toHaveLength(1);
    expect(JSON.stringify(f.flux.getState())).not.toContain(envelope().token);
    expect(await f.controller.ensureAccessToken()).toBe(envelope().token);
    expect(f.request).toHaveBeenCalledTimes(1);
    expect(await f.controller.signOut()).toEqual({
      durable: true,
      remote: 'revoked'
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
    expect(signedOut.at(-1)).toMatchObject({
      generation: 2,
      status: 'anonymous'
    });
  });

  it('renews once and retains a valid token on transient errors without extending it', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.tick(now + 610000);
    const renewed = await Promise.all([f.controller.ensureAccessToken(), f.controller.onForeground()]);

    expect(renewed[0]).toBe(renewed[1]);
    expect(f.request).toHaveBeenCalledTimes(2);

    f.tick(now + 1220000);
    f.request.mockRejectedValueOnce({
      kind: 'network'
    });

    expect(await f.controller.ensureAccessToken()).toBe(renewed[0]);

    f.request.mockRejectedValueOnce({
      kind: 'timeout'
    });

    expect(await f.controller.ensureAccessToken()).toBe(renewed[0]);

    f.request.mockRejectedValueOnce({
      kind: 'abort'
    });

    expect(await f.controller.ensureAccessToken()).toBe(renewed[0]);
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      expires: now + 1510000
    });
  });

  it('never renews expired credentials', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.tick(now + 900000);

    await expect(f.controller.ensureAccessToken()).rejects.toMatchObject({
      code: 'invalid_session'
    });
    expect(f.request).toHaveBeenCalledTimes(1);
    await expect(f.controller.ensureAccessToken()).rejects.toMatchObject({
      code: 'invalid_session'
    });
  });

  it.each(['graphql', 'http', 'invalid_response', 'missing_data'])('clears on %s renewal errors', async (kind) => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.tick(now + 610000);
    f.request.mockRejectedValueOnce({
      kind
    });

    await expect(f.controller.ensureAccessToken()).rejects.toMatchObject({
      kind
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
  });

  it.each([null, {}, {
    ...envelope(),
    userId: 'other'
  }, {
    ...envelope(),
    sid: 'other'
  }, {
    ...envelope(),
    issued: now - 1000
  }])('rejects mismatched renewal %j', async (bad) => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.tick(now + 610000);
    f.request.mockResolvedValueOnce({
      users: {
        refreshSession: bad
      }
    });

    await expect(f.controller.ensureAccessToken()).rejects.toMatchObject({
      code: 'invalid_session'
    });
  });

  it('blocks stale sign-in requests after signout', async () => {
    const f = await fixture();
    const response = deferred<unknown>();
    f.request.mockReturnValueOnce(response.promise);
    const pending = f.controller.signIn(user);
    const failure = pending.catch((error: unknown) => error);
    await vi.waitFor(() => expect(f.request).toHaveBeenCalled());
    await f.controller.signOut();
    response.resolve({
      users: {
        signIn: envelope()
      }
    });

    expect(await failure).toMatchObject({
      code: 'stale'
    });
    expect(f.storage.write).not.toHaveBeenCalled();
  });

  it('signout schedules both cleanup ports synchronously and restore waits for them', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.storage.clear.mockClear();
    f.storage.writeMarker.mockClear();
    const deletion = deferred<undefined>();
    const marker = deferred<undefined>();
    f.storage.clear.mockReturnValueOnce(deletion.promise);
    f.storage.writeMarker.mockReturnValueOnce(marker.promise);
    f.storage.readMarker.mockResolvedValueOnce(true);
    const seen: unknown[] = [];
    f.flux.on('nativeAuth.AUTHENTICATED', () => seen.push(f.flux.getState('nativeAuth')));
    const out = f.controller.signOut();

    expect(f.storage.clear).toHaveBeenCalledTimes(1);
    expect(f.storage.writeMarker).toHaveBeenCalledTimes(1);

    const restored = f.controller.restore();
    await Promise.resolve();

    expect(f.storage.readMarker).not.toHaveBeenCalled();

    marker.resolve(undefined);
    await Promise.resolve();

    expect(f.storage.readMarker).not.toHaveBeenCalled();

    deletion.resolve(undefined);

    expect(await out).toEqual({
      durable: true,
      remote: 'revoked'
    });
    expect(await restored).toBeUndefined();
    expect(seen).toEqual([]);
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
  });

  it('finishes overlapping signouts despite superseded visibility', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    const one = f.controller.signOut();
    const two = f.controller.signOut();

    expect(await one).toEqual({
      durable: true,
      remote: 'revoked'
    });
    expect(await two).toEqual({
      durable: true,
      remote: 'no_session'
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
  });

  it('reports synchronous cleanup binding errors while keeping restoration blocked', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.storage.clear.mockImplementationOnce(() => {
      throw new Error('Synthetic clear binding error');
    });
    f.storage.writeMarker.mockImplementationOnce(() => {
      throw new Error('Synthetic marker binding error');
    });
    const out = f.controller.signOut().catch((error: unknown) => error);
    const restored = f.controller.restore().catch((error: unknown) => error);

    expect(await out).toMatchObject({
      code: 'durable_cleanup'
    });
    expect(await restored).toMatchObject({
      code: 'durable_cleanup'
    });
  });

  it('suppresses a stale sign-in failure', async () => {
    const f = await fixture();
    const response = deferred<unknown>();
    f.request.mockReturnValueOnce(response.promise);
    const pending = f.controller.signIn(user).catch((error: unknown) => error);
    await vi.waitFor(() => expect(f.request).toHaveBeenCalled());
    await f.controller.signOut();
    response.reject({
      kind: 'network'
    });

    expect(await pending).toMatchObject({
      code: 'stale'
    });
  });

  it('blocks stale secure writes and account switch completions', async () => {
    const f = await fixture();
    const disk = deferred<undefined>();
    f.storage.write.mockReturnValueOnce(disk.promise);
    const pending = f.controller.signIn(user);
    const failure = pending.catch((error: unknown) => error);
    await vi.waitFor(() => expect(f.storage.write).toHaveBeenCalled());
    f.request.mockResolvedValueOnce({
      users: {
        signIn: envelope('two')
      }
    });
    await f.controller.signIn(user);
    disk.resolve(undefined);

    expect(await failure).toMatchObject({
      code: 'stale'
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      userId: 'two'
    });
    expect(f.storage.clearMarker).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('blocks stale renewal success and failure %s', async (fails) => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.tick(now + 610000);
    const response = deferred<unknown>();
    f.request.mockReturnValueOnce(response.promise);
    const pending = f.controller.ensureAccessToken();
    const failure = pending.catch((error: unknown) => error);
    await vi.waitFor(() => expect(f.request).toHaveBeenCalledTimes(2));
    await f.controller.signOut();
    if(fails) {
      response.reject({
        kind: 'network'
      });
    } else {
      response.resolve({
        users: {
          refreshSession: envelope('one', now + 610000)
        }
      });
    }

    expect(await failure).toMatchObject({
      code: 'stale'
    });
  });

  it('restore checks markers, environment, expiry and secure availability', async () => {
    const f = await fixture();
    f.storage.read.mockResolvedValueOnce(envelope());

    expect(await f.controller.restore()).toEqual(envelope());

    f.storage.readMarker.mockResolvedValueOnce({
      environment: 'dev'
    });

    expect(await f.controller.restore()).toBeUndefined();

    f.storage.read.mockResolvedValueOnce({
      ...envelope(),
      environment: 'prod'
    });

    expect(await f.controller.restore()).toBeUndefined();

    f.storage.read.mockResolvedValueOnce(envelope());
    f.tick(now + 900000);

    expect(await f.controller.restore()).toBeUndefined();
    expect(await f.controller.restore()).toBeUndefined();

    f.storage.available.mockResolvedValueOnce(false);

    await expect(f.controller.restore()).rejects.toMatchObject({
      code: 'storage'
    });

    f.storage.read.mockRejectedValueOnce(new Error('disk'));

    await expect(f.controller.restore()).rejects.toMatchObject({
      code: 'storage'
    });
  });

  it.each(['write', 'clearMarker'] as const)('storage failure %s never publishes authentication', async (field) => {
    const f = await fixture();
    f.storage[field].mockRejectedValueOnce(new Error('disk'));

    await expect(f.controller.signIn(user)).rejects.toMatchObject({
      code: 'storage'
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
  });

  it('signout accepts either durable path and reports remote uncertainty', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.storage.clear.mockRejectedValueOnce(new Error('disk'));
    f.request.mockRejectedValueOnce({
      kind: 'network'
    });

    expect(await f.controller.signOut()).toEqual({
      durable: true,
      remote: 'may_remain_active'
    });

    f.storage.writeMarker.mockRejectedValueOnce(new Error('disk'));

    expect(await f.controller.signOut()).toMatchObject({
      durable: true,
      remote: 'no_session'
    });

    f.storage.clear.mockRejectedValueOnce(new Error('disk'));
    f.storage.writeMarker.mockRejectedValueOnce(new Error('disk'));

    await expect(f.controller.signOut()).rejects.toMatchObject({
      code: 'durable_cleanup'
    });
  });

  it('dispose prevents new work and is idempotent', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    await Promise.all([f.controller.dispose(), f.controller.dispose()]);
    await f.controller.dispose();

    await expect(f.controller.signIn(user)).rejects.toMatchObject({
      code: 'disposed'
    });
    expect(() => f.controller.ensureAccessToken()).toThrow(NativeAuthError);
  });

  it.each(['signin', 'marker', 'malformed', 'expired', 'renewal', 'commit'] as const)('reports durable cleanup failure at %s', async (phase) => {
    const f = await fixture();
    if(phase === 'expired' || phase === 'renewal') {
      await f.controller.signIn(user);
    }
    if(phase === 'commit') {
      f.storage.write.mockImplementationOnce(async () => {
        f.storage.clear.mockRejectedValueOnce(new Error('delete'));
        f.storage.writeMarker.mockRejectedValueOnce(new Error('marker'));
        throw new Error('write');
      });
    } else {
      f.storage.clear.mockRejectedValueOnce(new Error('delete'));
      f.storage.writeMarker.mockRejectedValueOnce(new Error('marker'));
    }
    let result: Promise<unknown>;
    if(phase === 'marker' || phase === 'malformed') {
      if(phase === 'marker') {
        f.storage.readMarker.mockResolvedValueOnce(true);
      } else {
        f.storage.read.mockResolvedValueOnce({
          bad: true
        });
      }
      result = f.controller.restore();
    } else if(phase === 'expired' || phase === 'renewal') {
      f.tick(now + (phase === 'expired' ? 900000 : 610000));
      f.request.mockRejectedValueOnce({
        kind: 'graphql'
      });
      result = f.controller.ensureAccessToken();
    } else {
      result = f.controller.signIn(user);
    }

    await expect(result).rejects.toMatchObject({
      code: 'durable_cleanup'
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
  });

  it('expires while secure commit is pending', async () => {
    const f = await fixture();
    f.storage.write.mockImplementationOnce(async () => {
      f.tick(now + 900000);
    });

    await expect(f.controller.signIn(user)).rejects.toMatchObject({
      code: 'invalid_session'
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
  });

  it('a stale restore cannot publish another account', async () => {
    const f = await fixture();
    const read = deferred<unknown>();
    f.storage.read.mockReturnValueOnce(read.promise);
    const pending = f.controller.restore().catch((error: unknown) => error);
    await vi.waitFor(() => expect(f.storage.read).toHaveBeenCalled());
    f.request.mockResolvedValueOnce({
      users: {
        signIn: envelope('two')
      }
    });
    await f.controller.signIn(user);
    read.resolve(envelope());

    expect(await pending).toMatchObject({
      code: 'stale'
    });
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      userId: 'two'
    });
  });

  it('does not claim remote revocation from a false acknowledgement', async () => {
    const f = await fixture();
    await f.controller.signIn(user);
    f.request.mockResolvedValueOnce({
      users: {
        signOut: false
      }
    });

    expect(await f.controller.signOut()).toMatchObject({
      remote: 'may_remain_active'
    });
  });

  it('rejects invalid sign-in envelopes and configuration', async () => {
    const f = await fixture();
    f.request.mockResolvedValueOnce({
      users: {
        signIn: {}
      }
    });

    await expect(f.controller.signIn(user)).rejects.toMatchObject({
      code: 'invalid_session'
    });
    expect(() => createNativeAuthController({
      api: f.api,
      environment: '',
      flux: f.flux,
      invalidateAccount: f.invalidateAccount,
      mode: 'hosted',
      storage: f.storage
    })).toThrow(NativeAuthError);
  });
});

describe('strict hosted JWT claims', () => {
  it.each([{
    exp: '1800000900',
    iat: '1800000000'
  }, {
    exp: 1800000900000,
    iat: 1800000000000
  }, {
    exp: 1800000900.25,
    iat: 1800000000.25
  }, {
    exp: null,
    iat: 1800000000
  }, {
    exp: 1800000900,
    iat: false
  }])('never commits or restores malformed hint %j', async (claims) => {
    const f = await fixture();
    const malformed = {
      ...envelope(),
      token: `a.${btoa(JSON.stringify(claims))}.c`
    };
    f.request.mockResolvedValueOnce({
      users: {
        signIn: malformed
      }
    });

    await expect(f.controller.signIn(user)).rejects.toMatchObject({
      code: 'invalid_session'
    });
    expect(f.storage.write).not.toHaveBeenCalled();

    f.storage.read.mockResolvedValueOnce(malformed);

    expect(await f.controller.restore()).toBeUndefined();
    expect(f.flux.getState('nativeAuth')).toMatchObject({
      status: 'anonymous'
    });
  });
});

describe('coherent hosted time boundaries', () => {
  it('rejects a JWT issue hint beyond the future allowance even when metadata is within it', () => {
    const issued = now + 31000;
    const value = {...envelope('one', issued), expires: issued + 899500, issued: issued - 500};

    expect(parseCredentialEnvelope(value, 'dev', now + 500)).toBeUndefined();
  });

  it('rejects zero JWT lifetime even if metadata supplies a positive interval', () => {
    const at = now + 10000;
    const value = {...envelope(), expires: at + 500, issued: at - 500,
      token: `a.${btoa(JSON.stringify({exp: at / 1000, iat: at / 1000}))}.c`};

    expect(parseCredentialEnvelope(value, 'dev', now)).toBeUndefined();
  });
});

describe('safe envelope', () => {
  it.each([null, [], {}, {
    ...envelope(),
    password: 'secret'
  }, {
    ...envelope(),
    schemaVersion: 2
  }, {
    ...envelope(),
    issued: 1.5
  }, {
    ...envelope(),
    expires: Infinity
  }, {
    ...envelope(),
    username: ''
  }, {
    ...envelope(),
    sid: '\n'
  }, {
    ...envelope(),
    token: 'broken'
  }, {
    ...envelope(),
    expires: now + 1000
  }, envelope('one', now + 31000), envelope('one', now, 901000), envelope('one', now, -1000)])('rejects unsafe %j', (value) => {
    expect(parseCredentialEnvelope(value, 'dev', now)).toBeUndefined();
  });
});
