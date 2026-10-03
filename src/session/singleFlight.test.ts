import {describe, expect, it} from 'vitest';

import {createSingleFlight} from './singleFlight.js';

describe('single-flight operations', () => {
  it('defaults to a void operation without an explicit type argument', async () => {
    const run = createSingleFlight();
    let calls = 0;
    const pending: Promise<void> = run(() => {
      calls++;
    });
    await pending;

    expect(calls).toBe(1);
  });

  it('shares one promise and result between concurrent callers', async () => {
    const run = createSingleFlight<number>();
    let calls = 0;
    let resolve!: (value: number) => void;
    const pending = new Promise<number>((done) => {
      resolve = done;
    });
    const first = run(() => {
      calls++;
      return pending;
    });
    const second = run(() => {
      calls++;
      return 9;
    });

    expect(first).toBe(second);

    await Promise.resolve();

    expect(calls).toBe(1);

    resolve(7);

    await expect(first).resolves.toBe(7);
    await expect(run(() => 10)).resolves.toBe(10);
  });

  it('does not lock another authentication context', async () => {
    const run = createSingleFlight<number>();
    const other = createSingleFlight<number>();
    const first = run(() => new Promise<number>(() => {}));

    expect(other(() => 3)).not.toBe(first);
    await expect(other(() => 4)).resolves.toBe(3);
  });

  it.each(['sync', 'async'])('releases after a %s failure', async (mode) => {
    const run = createSingleFlight<number>();
    const error = new Error('offline');
    const failed = run(() => {
      if(mode === 'sync') {
        throw error;
      }
      return Promise.reject(error);
    });

    expect(run(() => 8)).toBe(failed);
    await expect(failed).rejects.toBe(error);
    await expect(run(() => 8)).resolves.toBe(8);
  });
});
